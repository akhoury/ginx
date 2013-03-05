Ginx
===================

Ginx is a fast Nginx log parser written in Javascript; It can persist cursors of each file, to continue where it left off in case of a
shutdown, unexpected exception or Ctrl+D, all that with the option of parsing a directory of files instead of one file.

##TODO##

* add tail -f feature to the command line tool using fs.watch or node-tail module
* add Stop, Pause, Resume, DeleteStorage to the API 
* add auto detection feature for the format based on an example log line.
* add support for Error logs
* log with different levels (info, error, warning, debug, trace) to an optional log file
* use a better hashing algorithm for cursors keys
* refactor some of the big functions
* support other encodings
* optional DEBUG param flag, and input/output paths flags
* increase test coverage, seriously

API
---
 
Ginx
---------
	
##Ginx(format, options={})##

Construct a 'new Ginx();
* Arguments
	* format - Optional string representing the Nginx access_log format, usually in your nginx conf, check ./lib/ginx.js source to see the default format if you don't pass any.
	* options - Optional hash that may contain two key:value pairs - default {'persistent': true, 'fieldsToObjects': false}
	  * 'persistent' defaults to true, whether your program will persist file positions to a local file in ./tmp/stored.cursors
	  * 'fieldsToObjects' defaults to false, whether the program will attempt to parse every column to its corresponding object, i.e Date, Number, or Null - if turned to True, it may impact the performance depending on Number and Size of files getting parsed.
	  * 'storageFile' defaults to ./tmp/stored.cursors, which file you want to store the cursors in
		* 'originalText' - defaults to false, a boolean, if true, it will augment each row JSON object with its original text on an __originalText property


##parser.parseLine(line, rowCallback, options={})##

Parse one line string
* Arguments
	* line - a string representing the line to be parsed
	* callback(err, row) - a callback function with the error if any, and the result row object which may contain custom attributes parsed from the format
	Also, the result object has more attributes __file which is the file parsed from, __originalText which the original text before parsing and __lastrow if it is
	* options, optional hash, currently only supports 'file': path


##parser.parseFile(path, rowCallback, fileCallback, options={})##

Parse a file
* Arguments
	* path - a string representing the path to the file to be parsed
	* rowCallback(err, row) - a callback function for each row's end of parse, with the error if any, and the result row object
	* fileCallback(err, file) - a callback function for file's end of parse
	* dirCallback(err) - an Optional callback function for Dir's end of parse, if any
	* options, optional hash, currently only supports 'isPool': boolean, which is used internally to determine if this file was in the waiting pool or not, you don't need it at all if you're parsing a single file, even if you're not, parseDir will take care of that part if you're parsing multiple files.

##parser.parseDir(directory, rowCallback, fileCallback, dirCallback)##

Parse all files in the first level of a directory (they have to all have the same format)
* Arguments
	* directory - a string representing the directory that has the files to be parsed
	* rowCallback(err, row) - a callback function for each row's end of parse, with the error if any, and the result row object
	* fileCallback(err, file) - a callback function for file's end of parse
	* dirCallback(err, filesParsedCount) - a callback function for Dir's end of parse

INSTALL
-------
(It's not on NPM yet so you need to install manually)
	
		git clone https://github.com/akhoury/ginx.git
		# cp the ginx dir into your program's node_modules
		npm install # to install dependencies 

you can 'node demo.js' to try it out quick, but please open demo.js and read the comments quickly.

EXAMPLE USAGE
-------------

	var Ginx = require("./lib/ginx");
	var parser = new Ginx();
	//example read from file
	parser.parseFile("nginx_prod.log", 	
	  function(err, row){
		  if (err) throw err;
		  console.log("this will print each parsed line:" + JSON.stringify(row));
	  },	  
	  function(err, file){
		if (err) throw err;
		 console.log(file + " parsing complete");
	  }
	);
