// ginxparser
//An nginx logs parser for node.js
// @author Aziz Khoury

//TODO add auto detection feature for the format based on an example log line.
//TODO add support for Error logs
//TODO add support for ipv6

var fs = require('fs');

/**
 * GinxParser constructor
 *
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

GinxParser.prototype.parseDirFiles = function (dir, rowCallback, fileCallback){
  var that = this;
  fs.readdir(dir, function(err, files){
      if (err) throw err;
      files.forEach(file){
        //TODO get file cursor
        var cursor = 0;
        //TODO fork a process
        that.parseFile(file, cursor, rowCallback);
        if(typeof fileCallback === 'function'){
          fileCallback(file);
        }
      }
  });
}
GinxParser.prototype.parseFile = function (file, cursor, callback){
  var that = this;
  // read file at the begining of cursor
  // split by line
  //parseEach line
}
GinxParser.prototype.parseLine = function (line, callback){
  var err, needle, value;
  this.delimeters.forEach(function(delim){  
     needle = line.indexOf(delim);
     value = line.substring(0,needle); 
     line = line.substr(needle+delim.length);
     //TODO augment a json object instead
     result.push(value);
    });    
  if(result.length !== this.delimeters.length + 1){
    err = "[WARN] Inconsitent values <=> delimeters";
  }
  if (typeof callback === 'function'){
    callback(err, result);
  } else {
    return result;
  }
}
// Helper functions
function augmentObject(obj, properties, values){ 
 // TODO helper method that augments a 'row' with the attributes specified in the format
 return obj;
}
function setCursor(file, cursor){
  
}
function getCursor(file){
  
}
function createTempFile(file){
  
}
function readTempFile(file){
  
}
function hashFileName(file){
  //TODO actually hashing the full path to a value
  var hash = file;
  return hash;
}
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
module.exports = GinxParser;