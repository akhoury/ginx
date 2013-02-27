nginxparser
===================

nginxparser is an Nginx log parser written in Javascript.

API
---
 
GinxParser
---------
	
#Parser#

##parser.parseLine(line, rowCallback)##

Parse one line string
* Arguments
	* line - a string representing the line to be parsed
	* callback(err, result) - a callback function with the error if any, and the result array


##parser.parseFile(filename, rowCallback, fileCallback)##

Parse a file
* Arguments
	* filename - a string representing the file to be parsed
	* rowCallback(err, row) - a callback function for each row's end of parse, with the error if any, and the result array
	* fileCallback(file) - a callback function for file's end of parse

##parser.parseDir(directory, rowCallback, fileCallback)##

	Parse all parsable files in the first level of a directory
	* Arguments
		* directory - a string representing the directory that has the files to be parsed
		* rowCallback(err, row) - a callback function for each row's end of parse, with the error if any, and the result array
		* fileCallback(file) - a callback function for file's end of parse


EXAMPLE USAGE
-------------

	var GinxParser = require("./lib/ginxparser");
	var parser = new GinxParser();
	
	//example read from file
	nparser.parseFile("nginx_prod.log", 	
	  function(err, row){
		  if (err) throw err;
		  console.log(row);
	  },	  
	  function(file){
		 console.log(file + " parsing complete");
	  }
	);