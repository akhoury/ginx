
/* Ginxparser
 * An nginx logs parser for node.js
 * @author Aziz Khoury
*/

//TODO add auto detection feature for the format based on an example log line.
//TODO add support for Error logs
//TODO add support for ipv6
//TODO create a command line tool with tail -f feature

var fs = require('fs'), path = require('path');

/**
 * GinxParser constructor, it sets the format (read below), and pull out the delimeters and the attributes used
 * @format specified in your nginx conf. If you haven't specified anything, it will use nginx's default
 */
function GinxParser(format){
  var default_format = '$remote_addr - $remote_user [$time_local] ' +
                        '"$request" $status $body_bytes_sent ' +  
                        '"$http_referer" "$http_user_agent"';
  this.format = format || default_format;
  this.delimeters = this.format.match(/[^\$\w+]+/g);
  this.attrs = this.format.match(/\$\w+/g);
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
        //TODO pass the file cursor      
        that.parseFile(file, rowCallback, fileCallback);    
      });
  });
};

/**
 * GinxParser.parseFile, parses a file (isFile() == true)
 * @file is the file path, you can use any platform path, (Windows, Linux, Mac), the path will get normalized
 * @cursor is a peristed cursor where the parser left off reading, this is used to continue after crash/stop
 * @rowCallback is the callback function after each row being read
 * @fileCallback is the callback function after each file being parsed
 * @api public
 * throws error if a file is not readable on fs.stat
 */
GinxParser.prototype.parseFile = function (file, cursor, rowCallback, fileCallback){
  if (typeof cursor === 'function'){
    fileCallback = rowCallback;
    rowCallback = cursor;
    cursor = 0;  
  }
  fs.stat(file, function(err, stats){
    if (err){console.log("[ERROR]:" + err.message); throw err;}
    if (stats.isFile()){
      //TODO read file at the cursor
       var that = this, 
           stream = fs.createReadStream(path.normalize(file)),
           overflow = new Buffer(0);
       stream.on('data', function (data) {
           var buffer = Buffer.concat([overflow,data]), newline = 0;
           for (var i = 0, len = buffer.length; i < len; i++) {
               if (buffer[i] === 10) {
                   that.parseLine(buffer.slice(newline, i), rowCallback);
                   newline = i + 1;
               }
           }
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
       });
    }
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

GinxParser.prototype.setFileCursor = function (file, cursor, callback){
};
GinxParser.prototype.getFileCursor = function (file, callback){
  var cursor = 0;
  //TODO read corresponding hash file if any, and get the cursor.
  return callback(file, cursor);
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
    return;
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
function createTempFile(file){}
function readTempFile(file){}
function hashFileName(file){}


module.exports = GinxParser;