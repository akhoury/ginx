// ginxparser
//An nginx logs parser for node.js
// @author Aziz Khoury

var fs = require('fs');

function GinxParser(format){
  //TODO add auto detection feature for the format based on an example log line.
  var default_format = '$remote_addr - $remote_user [$time_local] ' +
                        '"$request" $status $body_bytes_sent ' +  
                        '"$http_referer" "$http_user_agent"';
  this.format = format || default_format;
  this.delimeters = this.format.match(/[^\$\w+]+/g);
}

GinxParser.prototype.readLine = function ()
GinxParser.prototype.parseLine = function (line, callback){
  var err;
  this.delimeters.forEach(function(delim){  
     var needle, value;
     needle = line.indexOf(delim);
     value = line.substring(0,needle); 
     line = line.substr(needle+delim.length);
     //TODO append to json object
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

module.exports = GinxParser;