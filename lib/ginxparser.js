
/* Ginxparser
 * An nginx logs parser for node.js
 * @author Aziz Khoury
*/

//TODO add auto detection feature for the format based on an example log line.
//TODO add support for Error logs
//TODO add support for ipv6
//TODO create a command line tool with tail -f feature
//TODO use a logger with different levels (info, error, warning, debug, trace)
//TODO use a better hashing algorithm for tmp/ file names OR use a DB

var fs = require('fs'), path = require('path');

/**
 * GinxParser constructor, it sets the format (read below), and pull out the delimeters and the attributes used
 * @format specified in your nginx conf. If you haven't specified anything, it will use nginx's default
 * @persistent a boolean whether the parser should keep track of each file's cursor until fully read, as a way to recover from crash/kill, may impact performance if set to true, or default
 */
function GinxParser(persistent, format){
  var default_format = '$remote_addr - $remote_user [$time_local] ' +
                        '"$request" $status $body_bytes_sent ' +  
                        '"$http_referer" "$http_user_agent"';
  if (typeof persistent === "string"){
    format = persistent;
  } 
  this.persistent = typeof persistent === "boolean" ? persistent : true;
  this.format = format || default_format;
  this.delimsRegExp = new RegExp(/[^\$\w+]+/g);
  this.delimeters = this.format.match(this.delimsRegExp);
  this.attrs = this.format.match(/\$\w+/g);
  this.NL = 10; // newline ascii 10
  this.tmpStorageDir = path.normalize('./tmp');
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
GinxParser.prototype.parseDir = function (dir, rowCallback, fileCallback){
  var that = this;
  fs.readdir(dir, function(err, files){
      console.log("[DEBUG] " + files.length + " files/dirs found in " + dir );
      if (err){console.log("[ERROR]:" + err.message); throw err;}
      files.forEach(function(file) {
        file = path.join(dir,file);        
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
GinxParser.prototype.parseFile = function (file, rowCallback, fileCallback){
  var that = this, tmpCursor = 0;
  var cursor = that.getCursor(path.join(that.tmpStorageDir,getNewFileNamefromPath(file)), function (cursor){
    file = path.normalize(file);
    fs.stat(file, function(err, stats){
      if (err){console.log("[ERROR]:" + err.message); throw err;}
      if (stats.isFile()){
        var stream = fs.createReadStream(file),
            overflow = new Buffer(0);
        stream.on('data', function (data) {
        // add new data to the previous overflow, reset newline and i
          var buffer = Buffer.concat([overflow,data]), newline = 0, i = 0;
          for (;i < buffer.length; i++) {
            // slice when you see a newline(NL)
              if (buffer[i] === that.NL) {
                var newbuf = buffer.slice(newline, i); 
                newline = i + 1;
                tmpCursor += newline;
                // is it still behind the saved cursor?
                if(cursor <= tmpCursor){
                  // no, replace the cursor by the new one and parse the line 
                  cursor = tmpCursor;
                  if(!that.persistent){
                    that.parseLine(newbuf, rowCallback);
                  } else {
                    that.persistCursor(cursor, path.join(that.tmpStorageDir,getNewFileNamefromPath(file)));
                    that.parseLine(newbuf, rowCallback);
                  }            
                }
              }
           }
          //slice whatever is left out for the next 'data' event
          overflow = buffer.slice(newline);
      });
      stream.on('end', function () {
        if (overflow.length) {
          that.parseLine(overflow, rowCallback);
        }
        if(typeof fileCallback === 'function'){
          return fileCallback(file);
        } else {
          return ;
        } 
      });
      process.nextTick(function () {
        stream.resume();
      });}
    });
  });
};

/**
 * GinxParser.parseLine, parses a single line that matches the format
 * @line is a string
 * @callback is the callback function after each row being read
 * throws error if there is a missmatch with the format
 * @api public
 */
GinxParser.prototype.parseLine = function (line, callback){
  var err, needle, value, result = new Array();
  line = line.toString();
  this.delimeters.forEach(function(delim){  
     needle = line.indexOf(delim);
     value = line.substring(0,needle); 
     line = line.substr(needle+delim.length);
     //TODO augment a json object instead
     result.push(value);
    });    
  if(false){ //TODO really check for errors
    err = new Error("[WARN] Inconsitent values <=> delimeters");
  }
  if (typeof callback === 'function'){
    callback(err, result);
  } else {
    return result;
  }
};

GinxParser.prototype.persistCursor = function (cursor, file){
  this.notBusy = this.notBusy || true;
  this.nextToWrite = this.nextToWrite || 0;
  var that = this;
  if(this.notBusy){
    that.notBusy = false;
    fs.writeFile(file, cursor, function(err){
      if (err) {}
      that.notBusy = true;
      if(that.nextToWrite > 0){
        that.persistCursor(that.nextToWrite, file);
      }
    });
  } else {
    this.nextToWrite = cursor;
  }
};
GinxParser.prototype.getCursor = function (file, callback){
  var cursor = 0;
  if(!this.persistent){ 
    if (typeof callback === 'function'){
      callback(cursor); 
    }
    return cursor;
  }
  fs.exists(file, function(exists){
    if(exists){
      fs.readFile(file, function (err, data) {
        if (err) throw err;
        cursor = new Number(data);
        if (typeof callback === 'function'){
          callback(cursor); 
        }
        return cursor;
      });
    } else {
      if (typeof callback === 'function'){
        callback(cursor); 
      }
      return cursor;
    }
  });
};

// Helper functions

/*
 * augment an object by adding properties to it, and if available, their corresponding values
 * @obj to be augmented
 * @properties array of properties
 * @values array of values
 */
function stripStringArray(arr, unwanted){
  if (Array.isArray(arr)){
    for (var i = 0; i < arr.length; i++){
      if(typeof arr[i] === 'string'){
        arr[i] = arr[i].replace(unwanted,'');
      }
    }
    return arr;
  }else {
    return null;
  }
}
/*
 * augment an object by adding properties to it, and if available, their corresponding values
 * @obj to be augmented
 * @properties array of properties
 * @values array of values
 */
function augmentObject(obj, properties, values){ 
 // TODO helper method that augments a 'row' with the attributes specified in the format
 return obj;
}
function getNewFileNamefromPath(file){
  return file.replace(/\W/g, '');
}

module.exports = GinxParser;