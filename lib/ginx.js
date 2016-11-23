
/* Ginx
 * ginx is an Nginx log parser written in Javascript - It can persist cursors of each file, to continue where it left off in case of a
 * shutdown, unexpected exception or Ctrl+D
 * @author Aziz Khoury, Feb 2013
 * tags: nginx parser, nginx log parser, log parser for nginx
 */

'use strict';

/*
 * Module dependencies
 */

var fs = require('fs'),
    path = require('path'),
    EOL = require('os').EOL,
    cp = require('child_process'),
    //caches memory
    MEM_STORAGE = {};

/**
 * Ginx constructor, it sets the format (read below), and pull out the delimeters and the attributes used
 * @format specified in your nginx conf. If you haven't specified anything, it will use nginx's default
 * @params a hash {'persistent': true, 'fieldsToObjects': false} that contains 2 values
 *    'peristent' - default true, boolean whether the parser should keep track of each file's cursor until fully read, as a way to recover from crash/kill, may impact performance if set to true, or default
 *    'fieldsToObjects' - default false, boolean, where the parser will try to convert each column's field to its appropriate type, date, int, or null if '-', impacts performance if set to true.
 *    'storageFile' defaults to ./tmp/stored.cursors, which file you want to store the cursors in
 *    'originalText' - defaults to false, a boolean, if true, it will augment each row JSON object with its original text on an __originalText property
 */
function Ginx(format, options) {
    var default_format = '$remote_addr - $remote_user [$time_local] ' + '"$request" $status $body_bytes_sent ' + '"$http_referer" "$http_user_agent"';
    if (typeof format === "object" && typeof options === 'undefined') {
        options = format;
        format = default_format;
    }

    MEM_STORAGE.persistent = options && typeof options.persistent === "boolean" ? options.persistent : true;
    if (!MEM_STORAGE.persistent) {
        MEM_STORAGE.cursors = {};
    }

    this.format = format || default_format;
    this.delimsRegExp = new RegExp(/[^\$\w+]+/g);
    this.delimeters = this.format.match(this.delimsRegExp);
    this.attrs = stripStringArray(this.format.match(/\$\w+/g), '$');
    if (this.delimeters.length < this.attrs.length) {
        this.delimeters.push(EOL);
    }
    this.fieldsToObjects = options && typeof options.fieldsToObjects === "boolean" ? options.fieldsToObjects : false;
    this.originalText = options && typeof options.originalText === "boolean" ? options.originalText : false;

    //must happen after attrs match and originalText set to conserve CSV header row order
    if(this.originalText) this.attrs.push('__originalText');
    //must happen after original text, in the following order
    this.attrs.push('__file');this.attrs.push('__lastrow'); this.attrs.push('__fname');

    this.NL = 10;
    this.CR = 13;
    this.__mem = MEM_STORAGE;
    this.rstreams = {};
    this.files = 0;
    this.filesParsed = 0;
    this.inProcess = 0;
    //TODO pass this as param, or make a config
    this.inProcessMax = 50;
    this.pool = new Array();
    this.getAllCursors = getAllCursors;
    MEM_STORAGE.storageFile = options && options.storageFile ? options.storageFile : path.join(__dirname + '/../tmp/stored.cursors');
    MEM_STORAGE.cursors = getAllCursors();
    MEM_STORAGE.child = {};
    //doesn't work as expected :/
    MEM_STORAGE.interval = setInterval(function () {
        persistSomeCursors();
    }, 200);
    this.hardParseLine = generateParseLine(this, this.delimeters, this.attrs);
}

/**
 * Ginx.parseDir, parses all files (isFile() == true) at the first level of a directory,
 * it is not recursive. That could be a future enhancement to add a flag if recursive or not, along with extension options
 * @dir the directory to look in
 * @rowCallback is the callback function after each row being read
 * @fileCallback is the callback function after each file being parsed
 * @api public
 * throws error if dir is not found or not readable
 */
Ginx.prototype.parseDir = function (dir, rowCallback, fileCallback, dirCallback) {
    var that = this;
    dir = path.normalize(dir);
    fs.readdir(dir, function (err, files) {
        if (err) {
            console.log("[GINX-ERROR]:" + err.message);
            fileCallback(err);
            throw err;
            return;
        }
        console.log("[GINX-DEBUG] " + files.length + " files/dirs found in " + dir);
        that.files = files.length;
        files.forEach(function (file) {
            var fname = file;
            file = path.join(dir, file);
            //TODO fork a process for each file? 
            // Don't think that's very useful since the bottleneck here is disk i/o not CPU, testing will confirm if needed or not
            that.parseFile(file, rowCallback, fileCallback, dirCallback, {'fname':fname});
        });
    });
};

/**
 * Ginx.parseFile, parses a file (isFile() == true)
 * @file is the file path, you can use any platform path, (Windows, Linux, Mac), the path will get normalized
 * @rowCallback is the callback function after each row being read
 * @fileCallback is the callback function after each file being parsed
 * @api public
 * throws error if a file is not readable on fs.stat
 */
Ginx.prototype.parseFile = function (file, rowCallback, fileCallback, dirCallback, options) {
    var that = this,
        cursor = 0,
        persistTimer = 0,
        strgKey, fileStartTime;

    strgKey = path.normalize(file);
    fileStartTime = Date.now();
    var argz = [file, rowCallback ? rowCallback : null, fileCallback ? fileCallback : null, dirCallback ? dirCallback : null, options && options.isPool ? options.isPool : false];
    console.log("[GINX-DEBUG]  (1) InProcess: " + that.inProcess + " Pool: " + that.pool.length + " Files: " + that.files);
    if (that.inProcess >= that.inProcessMax) {
        if (!options || !options.isPool) {
            that.pool.push(argz);
        } else if (options && options.isPool){
            argz[4] = false;
            that.pool.unshift(argz);
        }
        return;
    }
    that.inProcess++;
    cursor = getCursor(strgKey); // fast, from memory
    file = path.normalize(file);
    fs.stat(file, function (err, stats) {
        if (err) {
            console.log("[GINX-ERROR]:" + err.message);
            throw err;
            fileCallback(err);
            return;
        }
        var overflow = "",
            size = stats.size,
            stream = fs.createReadStream(file, {'start': cursor});
        that.rstreams[file] = stream;
        console.log("[GINX-DEBUG] File Size: " + size + " bytes -- File Cursor stored at position: " + cursor);
        if (size - 1 > cursor || size === -1) {
            console.log("[GINX-DEBUG]  (2) InProcess: " + that.inProcess + " Pool: " + that.pool.length + " Files: " + that.files);
            stream.on('data', function (data) {
                var rtrn = streamData(data, that, {
                    'overflow': overflow,
                    'cursor': cursor,
                    'file': file,
                    'strgKey': strgKey,
                    'fname': options && options.fname
                }, rowCallback);
                overflow = rtrn.overflow;
                cursor = rtrn.cursor;
            });
            stream.on('end', function () {
                streamEnd(overflow, that, {
                    'cursor': cursor,
                    'file': file,
                    'strgKey': strgKey,
                    'fileStartTime': fileStartTime,
                    'fname': options && options.fname
                }, rowCallback, fileCallback, dirCallback);
            });
            process.nextTick(function () {
                stream.resume();
            });
        } else {
            handleAlreadyParsedFile(that, file, fileCallback, dirCallback);
        }
    });
};

// just another alias for hardParseLine - see function hardParseLine
Ginx.prototype.parseLine = function (line, callback, options) {
    return this.hardParseLine(line, callback, options);
};

/**
 * Ginx.parseLine_old, parses a single line that matches the format
 * @line is a string
 * @callback is the callback function after each row being read
 * throws error if there is a missmatch with the format
 */
Ginx.prototype.parseLine_old = function (line, callback, options) {
    var that = this,
        err, needle, attr, value, i = 0;
    that.delimeters.forEach(function (delim) {
        needle = line.indexOf(delim);
        if (needle === -1) {
            err = new Error("[GINX-WARN] Inconsitent values/delimeters with format: invalid Line: '" + line + "' in File: " + result['__file'] + " Delimeters: " + that.delimeters);
            if (typeof callback === 'function') {
                callback(err, result);
            } else {
                result['__error'] = err;
                return result;
            }
        }
        value = line.substring(0, needle);
        line = line.substr(needle + delim.length);
        attr = that.attrs[i++];
        result.__originalText = line;
        result.__file = options.file;
        result[attr] = value === '-' ? null : convertValue(attr, value);
    });
    if (typeof callback === 'function') {
        callback(err, result);
    } else {
        return result;
    }
};


/**
 * Ginx.pause, pauses a ReadStream of a file or all ReadStreams in memory
 * @file is the file path, Optional, if not passed, Ginx will try to pause all of them
 * @callback, optional, is the callback function after pauses finishes
 */
Ginx.prototype.pause = function(file, callback){
    var that = this;
    if (typeof file === 'function'){
        callback = file;
        file = null;
    }
    if(file
        && this.rstreams[file]
        && this.rstreams[file].pause){
        this.rstreams[file].pause();
    } else{
        Object.keys(this.rstreams).forEach(function(k){
            if(that.rstreams[k]
                && that.rstreams[k].pause){
                that.rstreams[k].pause();
            }
        });
    }
    if(typeof callback === 'function'){
        callback();
    }
};
/**
 * Ginx.resume, resume a ReadStream of a file OR all ReadStreams in memory
 * @file is the file path, Optional, if not passed, Ginx will try to resume all of them
 * @callback, optional, is the callback function after resumes finishes
 */
Ginx.prototype.resume = function(file, callback){
    var that = this;
    if (typeof file === 'function'){
        callback = file;
        file = null;
    }
    if(file
        && this.rstreams[file]
        && this.rstreams[file].readable
        && this.rstreams[file].resume){
        this.rstreams[file].resume();
    } else{
        Object.keys(this.rstreams).forEach(function(k){
            if(that.rstreams[k]
                && that.rstreams[k].readable
                && that.rstreams[k].resume){
                that.rstreams[k].resume();
            }
        });
    }
    if(typeof callback === 'function'){
        callback();
    }
};

/**
 * Ginx.stop, stops all ReadStreams, then persists all cursors in memory
 * @callback, optional, is the callback function after stop finishes
 */
Ginx.prototype.stop = function(callback){
    var that = this;
    Object.keys(this.rstreams).forEach(function(k){
        if(that.rstreams[k]
            && that.rstreams[k].pause){
            that.rstreams[k].pause();
        }
    });
    persistAllCursors(callback);
};

//converts each value to an appriopriate object based on the attribute
Ginx.prototype.convertValue = function (attr, value) {
    // I am not sure if that's gonna work for all values, most of them are good as strings, 
    // but I can probably parse the time for now and the integers
    // that won't work if you can customize your Nginx attributes, you will get back the same value passed it.  
    if ("-" === value) {
        return null;
    }
    if (attr === "time_local") {
        return this.parseDate(value);
    }
    if (attr === "body_bytes_sent" || attr === "status") {
        return parseInt(value, 10);
    }
    return value;
};

//parses data from the default nginx date format
Ginx.prototype.parseDate = function (value) {
    var f = value.match(/(-*[^(\W+)]+)/g);
    if (f.length === 7) {
        value = new Date(f[0] + ' ' + f[1] + ' ' + f[2] + ' ' + f[3] + ':' + f[4] + ':' + f[5] + ' GMT' + f[6]);
    }
    return value;
};

/*
 * Defining all Helper functions
 */

/*
 * Yes ! this is ugly , but this dynamically generated function
 * runs 5x faster; instead of looping through the delimeters, it dynamically creates 'if' statements for each one, this way, the delimeters code will be defined in memory
 *
 * May break if Nginx log uses single-quote (') instead of double-quote ("), nginx doesn't by default (issue #5)
 * //TODO - handle both ' and "
 */
function generateParseLine(ctx, delim, attrs) {
    var ln = delim.length,
        args = 'line, callback, options',
        funcode = '\noptions = options || {};';

    funcode += '\nvar that = this, a = 0, b = -1, result={}, errb = false;\n';
    for (var i = 0; i < ln; i++) {
        funcode += delim[i] == EOL ? 'b=line.length;\n' : 'b=line.indexOf(\'' + delim[i] + '\',a);\n';
        funcode += 'if(b > 0) {\n\tresult["' + attrs[i] + '"] = ';
        funcode += ctx.fieldsToObjects ? 'that.convertValue("' + attrs[i] + '", line.substring(a, b));' : 'line.substring(a, b);';
        funcode += '\n\ta = b + '+delim[i].length+';\n} else {\n\terrb = true;\n}\n';
    }
    funcode += ctx.originalText ? 'result.__originalText = line;\n':'';
    funcode += 'result.__file = options.file;\nresult.__lastrow = options.lastrow;\nresult.__fname=options.fname;';
    funcode += '\nif(!errb) {\n\tif(typeof callback === "function") {\n\t\tcallback(null, result);\n\t} else {\n\t\treturn result;\n\t}\n}';
    funcode += '\nelse {\n\tvar err = new Error("[GINX-WARN] Inconsitent values/delimeters with format: invalid Line: \'" + line + "\' in File: " + result.__file);';
    funcode += '\n\tif(typeof callback === "function") {\n\t\tcallback(err, result);\n\t} else {\n\t\tresult.__error = err;\n\t\treturn result;\n\t}\n}';
    //for the sake of Maintenance, uncomment this log statement and run a demo to see how this function would look like based on your nginx_access log format
    //console.log('\n\nfunction generatedParseLineFunction () {\n\t' + funcode.split('\n').join('\n\t') + '\n}');
    return Function.apply(ctx, [args, funcode]);
}

// save each file's current cursor in memory
function saveCursorInCache(cursor, strgKey) {
    MEM_STORAGE.cursors[strgKey] = cursor;
}

// get a file's current cursor either from memory then look in file .
function getCursor(strgKey) {
    var cursor = MEM_STORAGE.cursors[strgKey];
    if (typeof cursor === 'number' && cursor >= 0) {
        return cursor;
    } else {
        return 0;
    }
}

// strips an array of strings of an unwanted pattern or value
function stripStringArray(arr, unwanted) {
    if (Array.isArray(arr)) {
        for (var i = 0; i < arr.length; i++) {
            if (typeof arr[i] === 'string') {
                arr[i] = arr[i].replace(unwanted, '');
            }
        }
        return arr;
    } else {
        return null;
    }
}

//augment an object by adding properties to it, and if available, their corresponding values
function augmentObject(obj, properties, values) {
    // TODO helper method that augments a 'row' with the attributes specified in the format
    return obj;
}

//what to do when exiting, persist and kill your child
function onExit(persistNow) {
    if (MEM_STORAGE.persistent && persistNow) {
        persistAllCursors();
    } else if (persistNow) {
        console.log("[GINX-WARN] Exiting - No cursors were stored ");
    }
    clearInterval(MEM_STORAGE.interval);
    if (MEM_STORAGE.child && MEM_STORAGE.child.connected) {
        MEM_STORAGE.child.kill('SIGKILL');
    }
}

// synchronous, blocks, but ONLY RUNS ONCE in begining of the program, sort of like require() <- blocks too,
// get all the stored cursors if there's any
function getAllCursors() {
    var cursors = {},
        data, exists, file = MEM_STORAGE.storageFile;
    exists = fs.existsSync(file);
    if (!exists) {
        return {};
    } else {
        data = fs.readFileSync(file, 'utf8');
        try {
            cursors = JSON.parse(data);
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.log("[GINX-WARN] cursors storage file " + file + " is a malformed JSON, ignoring all stored cursors");
            }
        }
    }
    return cursors;
}

//persists All Cursors, blocks, but only gets called ONCE at the end
function persistAllCursors(callback) {
    fs.writeFileSync(MEM_STORAGE.storageFile, JSON.stringify(MEM_STORAGE.cursors));
    console.log("[GINX-DEBUG] All cursors persisted: " + Object.keys(MEM_STORAGE.cursors).length + " {file:cursor} record(s) stored in " + MEM_STORAGE.storageFile);
    if(typeof callback === 'function'){callback();}
}

//forks a child to persist the cursors
function persistSomeCursors(callback) {
    if (MEM_STORAGE.persistent) {
        if (!MEM_STORAGE.child || !MEM_STORAGE.child.connected) {
            MEM_STORAGE.child = cp.fork(path.join(__dirname, '/persistor.js'));
        }
        MEM_STORAGE.child.send({'cursors': MEM_STORAGE.cursors, 'file': MEM_STORAGE.storageFile});
    }
    if(typeof callback === 'function'){
        callback();
    }
}

//handle already parsed files if the size <= cursor
function handleAlreadyParsedFile(ctx, file, fileCallback, dirCallback) {
    ctx.inProcess--;
    ctx.files--;
    if (ctx.pool.length > 0 && ctx.inProcess < ctx.inProcessMax) {
        ctx.pool[0][4] = true;
        ctx.parseFile.apply(ctx, ctx.pool.shift());
    }
    console.log('[GINX-WARN]: file ' + file + ' already been fully parsed, either delete its record or wait until more data appends on it and try again');
    if (typeof fileCallback === 'function') {
        fileCallback(null, file);
    }
    if (ctx.files <= 0) {
        if (typeof dirCallback === 'function') {
            dirCallback(null, ctx.filesParsed);
        }
        onExit(false);
    }
}

// handles each chunk of data stream in on stream.'data' event
function streamData(data, ctx, params, rowCallback) {

    var str = params.overflow + data.toString(),
        a = 0,
        b = 0;
    b = str.indexOf('\n');
    while (b > -1) {
        ctx.hardParseLine(str.substring(a, b), rowCallback, {'file':params.file,'fname':params.fname});
        a = b + 1;
        b = str.indexOf('\n', a);
    }
    params.overflow = str.substr(a);
    params.cursor += a;
    saveCursorInCache(params.cursor, params.strgKey); // fast, in memory
    return {
        'overflow': params.overflow,
        'cursor': params.cursor,
        'file': params.file
    };
}

// handles last chunk of data stream in on stream.'end' event
function streamEnd(overflow, ctx, params, rowCallback, fileCallback, dirCallback) {
    params.cursor = params.cursor + (overflow.length);
    if (overflow.length) {
        saveCursorInCache(params.cursor, params.strgKey);
        ctx.hardParseLine(overflow.toString(), rowCallback, {'file':params.file, 'lastrow':true, 'fname':params.fname});
    }
    ctx.inProcess--;
    ctx.files--;
    if (ctx.pool.length > 0 && ctx.inProcess < ctx.inProcessMax) {
        ctx.pool[0][4] = true;
        ctx.parseFile.apply(ctx, ctx.pool.shift());
    }
    console.log("[GINX-DEBUG] (3) InProcess: " + ctx.inProcess + " Pool: " + ctx.pool.length + " Files: " + ctx.files);
    if (typeof fileCallback === 'function') {
        console.log("[GINX-DEBUG] file " + params.file + " [" + params.cursor + " bytes] ended parsing in: " + (Date.now() - params.fileStartTime) + " ms");
        persistSomeCursors(function(err){
            ctx.filesParsed++;
            fileCallback(null, params.file);
        });
    }
    if (ctx.files <= 0) {
        if (typeof dirCallback === 'function') {
            dirCallback(null, ctx.filesParsed);
        }
        onExit(false);
    }
}

// if the program ends
process.on('exit', function () {
    onExit(true);
});

// if an uncaughtException occurs
process.on('uncaughtException', function (err) {
    console.log("[GINX][ERROR][uncaughtException] " + err);
    onExit(true);
    throw err;
});

// Ctrl+D.
process.on('SIGINT', function () {
    onExit(true);
});

// exposing 
module.exports = Ginx;
