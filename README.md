nginxparser
===================

(C) Aziz Khoury 2013, Licensed under the MIT-LICENSE
nginxparser is an Nginx log parser written in Javascript.

API
---
 
LogParser
---------
	
#Parse#

##parser.parseLine(line, callback)##

Parse a one line string
* return: result or callback(err, result), if callback function is passed
* Arguments
	* line - a string representing the line to be parsed
	* callback(err, result) - a callback function with the error if any, and the result array


##parser.parseFile(filename)##

Parse a file
* return: boolean. true if no errors, false otherwise
* Arguments
	* filename - a string representing the file to be parsed
	

EXAMPLE USAGE
-------------

	var nparser = require("./lib/ginxparser");
	
	//example read from file
	nparser.parseFile("sample.log");