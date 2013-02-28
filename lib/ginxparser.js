/* Ginxparser
 * ginxparser is an Nginx log parser written in Javascript - It can persist cursors of each file, to continue where it left off in case of a
 * shutdown, unexpected exception or Ctrl+D
 * @author Aziz Khoury, Feb 2013
 * tags: nginx parser, nginx log parser, log parser for nginx
 */
 
//TODO create a command line tool with tail -f feature, along with verbose flag
//TODO allow user to set storage file path
//TODO add Stop, Pause, Resume to the API 
//TODO add auto detection feature for the format based on an example log line.
//TODO add support for Error logs
//TODO use a logger with different levels (info, error, warning, debug, trace)
//TODO use a better hashing algorithm for cursors keys
//TODO refactor some of the big functions
//TODO support other encodings
//TODO optional DEBUG param flag
//TODO delete the storage if user chooses to run non-persistent
//TODO increase test coverage
var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    MEM_STORAGE = {};

/*
 * Defininf all Helper functions
 */
//converts each value to an appriopriate object based on the attribute
function convertValue(attr, value) {
    // I am not sure if that's gonna work for all values, most of them are good as strings, 
    // but I can probably parse the time for now and the integers
    switch (attr) {
        // that won't even work if you can customize your Nginx attributes, you will get back the same value passed it.
        case 'time_local':
            value = parseDate(value);
            break;
        case 'body_bytes_sent':
            value = parseInt(value, 10);
            break;
        case 'status':
            value = parseInt(value, 10);
            break;
        default:
    }
    return value;
}
//parses data from the default nginx date format
function parseDate(value) {
    var f = value.match(/(-*[^(\W+)]+)/g);
    if (f.length === 7) {
        value = new Date(f[0] + ' ' + f[1] + ' ' + f[2] + ' ' + f[3] + ':' + f[4] + ':' + f[5] + ' GMT' + f[6]);
    }
    return value;
}
// get file size passing its stats
function getFileSize(stats) {
    var str = util.inspect(stats),
        needle = ",\n  size: ",
        k, j;
    k = str.indexOf(needle);
    if (k !== -1) {
        str = str.substr(k + needle.length, str.length - 1);
        j = str.indexOf(',');
        str = str.substr(0, j);
        return parseInt(str, 10);
    }
    return -1;
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
};

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

//what to do when exiting
function onExit() {
    if (MEM_STORAGE.persistent) {
        persistAllCursors(MEM_STORAGE.cursors, MEM_STORAGE.tmpStorageFile);
    } else {
        console.log("[GINXPARSER-WARN] No records were stored since GinxParser was set to NOT-PERSISTENT");
    }
}
// synchronous, blocks, but ONLY RUNS ONCE in begining of the program, get all the stored cursors if there's any
function getAllCursors() {
    var cursors = {}, data, exists, file = MEM_STORAGE.tmpStorageFile;
    exists = fs.existsSync(file);
    if (!exists) {
        return {};
    } else {
        data = fs.readFileSync(file, 'utf8');
        try {
            cursors = JSON.parse(data);
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.log("[GINXPARSER-WARN] cursors storage file " + file + " is a malformed JSON, ignoring all stored cursors");
            }
        }
    }
    return cursors;
}
//synchronous, blocks, blocks but ONLY RUNS ONCE at the end of the program, persistAllCursors to a file called only onExit(),
function persistAllCursors(obj, strgFile) {
    var cursors = JSON.stringify(obj);
    console.log("[GINXPARSER-DEBUG] " + Object.keys(obj).length + " {file:cursor} record was stored in " + strgFile);
    fs.writeFileSync(strgFile, cursors);
};
/*
 * END OF HELPER FUNCTIONS DEFINITIONS
 */

//loading existing storage into memory if there is any, happens once in the creation of the module
(function () {
    MEM_STORAGE.tmpStorageFile = path.join(__dirname + '/../tmp/stored.cursors');
    MEM_STORAGE.cursors = getAllCursors();
})();

/**
 * GinxParser constructor, it sets the format (read below), and pull out the delimeters and the attributes used
 * @format specified in your nginx conf. If you haven't specified anything, it will use nginx's default
 * @persistent a boolean whether the parser should keep track of each file's cursor until fully read, as a way to recover from crash/kill, may impact performance if set to true, or default
 */
function GinxParser(persistent, format) {
    var default_format = '$remote_addr - $remote_user [$time_local] ' +
        '"$request" $status $body_bytes_sent ' +
        '"$http_referer" "$http_user_agent"';
    if (typeof persistent === "string") {
        format = persistent;
    }
    MEM_STORAGE.persistent = typeof persistent === "boolean" ? persistent : true;
    if (!MEM_STORAGE.persistent) {
        MEM_STORAGE.cursors = {};
    }

    this.format = format || default_format;
    this.delimsRegExp = new RegExp(/[^\$\w+]+/g);
    this.delimeters = this.format.match(this.delimsRegExp);
    this.attrs = stripStringArray(this.format.match(/\$\w+/g), '$');
    this.NL = 10; // newline ascii 10
    this.__mem = MEM_STORAGE;
}

/**
 * GinxParser.parseDir, parses all files (isFile() == true) at the first level of a directory, 
 * it is not recursive. That could be a future enhancement to add a flag if recursive or not, along with extension options
 * @dir the directory to look in
 * @rowCallback is the callback function after each row being read
 * @fileCallback is the callback function after each file being parsed
 * @api public
 * throws error if dir is not found or not readable
 */
GinxParser.prototype.parseDir = function (dir, rowCallback, fileCallback) {
    var that = this;
    dir = path.normalize(dir);
    fs.readdir(dir, function (err, files) {
        console.log("[GINXPARSER-DEBUG] " + files.length + " files/dirs found in " + dir);
        if (err) {
            console.log("[GINXPARSER-ERROR]:" + err.message);
            throw err;
        }
        files.forEach(function (file) {
            file = path.join(dir, file);
            //TODO fork a process for each file? Don't think that's very useful since the bottleneck here is disk i/o not CPU
            that.parseFile(file, rowCallback, fileCallback);
        });
    });
};

/**
 * GinxParser.parseFile, parses a file (isFile() == true)
 * @file is the file path, you can use any platform path, (Windows, Linux, Mac), the path will get normalized
 * @rowCallback is the callback function after each row being read
 * @fileCallback is the callback function after each file being parsed
 * @api public
 * throws error if a file is not readable on fs.stat
 */
GinxParser.prototype.parseFile = function (file, rowCallback, fileCallback) {
    var that = this,
        cursor, meta,
        strgKey = path.normalize(that.getStorageKeyfromPath(file));
    cursor = getCursor(strgKey); // fast, from memory
    file = path.normalize(file);
    fs.stat(file, function (err, stats) {
        if (err) {
            console.log("[GINXPARSER-ERROR]:" + err.message);
            throw err;
        }
        if (stats.isFile()) {
            var stream = fs.createReadStream(file, {
                'start': cursor
            }),
                overflow = new Buffer(0),
                size = getFileSize(stats);
            console.log("[GINXPARSER-DEBUG] File Size: " + size + " bytes -- File Cursor stored at position: " + cursor);
            if (size - 1 > cursor || size === -1) {
                stream.on('data', function (data) {
                    // add new data to the previous overflow, reset newline and i
                    var buffer = Buffer.concat([overflow, data]),
                        nl = 0,
                        i = 0,
                        diff = 0;
                    for (; i < buffer.length; i++) {
                        // slice when you see a newline(nl)
                        if (buffer[i] === that.NL) {
                            var newbuf = buffer.slice(nl, i);
                            // add the difference to the cursor, update the nl
                            diff = nl;
                            nl = i + 1;
                            cursor += nl - diff;
                            saveCursorInCache(cursor, strgKey); // fast, in memory
                            meta = {
                                '__file': file,
                                '__lastCharAt': cursor - 1,
                                '__originalText': newbuf.toString()
                            };
                            that.parseLine(newbuf, rowCallback, meta);
                        }
                    }
                    //slice whatever is left out for the next 'data' event
                    overflow = buffer.slice(nl);
                });

                stream.on('end', function () {
                    if (overflow.length) {
                        saveCursorInCache(cursor + (overflow.length - 1), strgKey);
                        meta = {
                            '__file': file,
                            '__lastCharAt': cursor - 1,
                            '__originalText': overflow.toString()
                        };
                        that.parseLine(overflow, rowCallback, meta);
                    }
                    if (typeof fileCallback === 'function') {
                        return fileCallback(file);
                    } else {
                        return;
                    }
                });

                process.nextTick(function () {
                    stream.resume();
                });
            } else {
                console.log('[GINXPARSER-WARN]: file ' + file + ' already been fully parsed, either delete its record or wait until more data appends on it and try again');
            }
        }
    });
};

/**
 * GinxParser.parseLine, parses a single line that matches the format
 * @line is a string
 * @callback is the callback function after each row being read
 * throws error if there is a missmatch with the format
 * @api public
 */
GinxParser.prototype.parseLine = function (line, callback, result) {
    var that = this,
        err, needle, attr, value, i = 0;
    line = line.toString();
    this.delimeters.forEach(function (delim) {
        needle = line.indexOf(delim);
        if (needle === -1) {
            err = new Error("[GINXPARSER-ERROR] Inconsitent values <=> delimeters," + "are you sure you have the right nginx log format? if not match it with your nginx.conf");
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
        result[attr] = value === '-' ? null : convertValue(attr, value);
    });
    if (typeof callback === 'function') {
        callback(err, result);
    } else {
        return result;
    }
};

//get a key for each file path, stripped out from all non-words chars
GinxParser.prototype.getStorageKeyfromPath = function (file) {
    return file.replace(/\W/g, '');
}
// if the program ends
process.on('exit', function () {
    onExit();
})
// if an uncaughtException occurs
process.on('uncaughtException', function (err) {
    console.log("[ERROR] " + err.message);
    onExit();
    throw err;
});
// if Control+D occurs
process.on('SIGINT', function () {
    onExit();
});

module.exports = GinxParser;