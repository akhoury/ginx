Ginxparser
===================

Ginxparser is an Nginx log parser written in Javascript - It can persist cursors of each file, to continue where it left off in case of a
shutdown, unexpected exception or Ctrl+D

* TODO create a command line tool with tail -f feature, along with verbose flag
* TODO allow user to set storage file path
* TODO add Stop, Pause, Resume to the API 
* TODO add auto detection feature for the format based on an example log line.
* TODO add support for Error logs
* TODO use a logger with different levels (info, error, warning, debug, trace)
* TODO use a better hashing algorithm for cursors keys
* TODO refactor some of the big functions
* TODO support other encodings
* TODO optional DEBUG param flag
* TODO delete the storage if user chooses to run non-persistent
* TODO increase test coverage, seriously

API
---
 
GinxParser
---------
	
#Parser#

##parser.parseLine(line, rowCallback, filepath)##

Parse one line string
* Arguments
	* line - a string representing the line to be parsed
	* callback(err, row) - a callback function with the error if any, and the result row object which may contain custom attributes parsed from the format
	Also, the result object has three attributes __file which is the file parsed from, and __originalText which the original text before parsing.
	* filepath - optional, used internally


##parser.parseFile(filename, rowCallback, fileCallback, dirCallback, isPool)##

Parse a file
* Arguments
	* filename - a string representing the file to be parsed
	* rowCallback(err, row) - a callback function for each row's end of parse, with the error if any, and the result row object
	* fileCallback(file) - a callback function for file's end of parse
	* dirCallback(dir) - an Optional callback function for Dir's end of parse, if any
	* isPool, used internally

##parser.parseDir(directory, rowCallback, fileCallback, dirCallback)##

	Parse all parsable files in the first level of a directory
	* Arguments
		* directory - a string representing the directory that has the files to be parsed
		* rowCallback(err, row) - a callback function for each row's end of parse, with the error if any, and the result row object
		* fileCallback(file) - a callback function for file's end of parse
		* dirCallback(dir) - a callback function for Dir's end of parse

INSTALL
-------
  (It's not on NPM yet so you need to install manually)
  cp the ginxparser dir into your program's node_modules
  npm install

  you can 'node demo.js' to try it out quick, but please open demo.js and read the comments quickly.

EXAMPLE USAGE
-------------

	var GinxParser = require("./lib/ginxparser");
	
	// optionally you can pass in two arguments, a the format as a String of the the Nginx access_log format, and an options object {'persistent': true, 'fieldsToObjects': true} 
  // default is {'persistent': true, 'fieldsToObjects': true} and the default Nginx access_log, check ./lib/ginxparser.js source to see the default format
  // fieldsToObjects when true, it will try to convert each column's value to it's corresponding objects, so far i only parse dates to Date,  numbers to Number,and every '-' to null 
  // turning that off will impact performance positively as well, but of course everything depends on what you're trying to do with the logs,
	var parser = new GinxParser();
	
	//example read from file
	nparser.parseFile("nginx_prod.log", 	
	  function(err, row){
		  if (err) throw err;
		  console.log("this will print each parsed line:" + row);
	  },	  
	  function(file){
		 console.log(file + " parsing complete");
	  }
	);
