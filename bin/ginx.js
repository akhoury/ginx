#!/usr/bin/env node
// if you want to use this command line tool you must 'npm install' to get 'optimist'
var argv = require('optimist').argv,
    path = require('path'),
    fs = require('fs'),
    Ginx = require(path.join(__dirname, '/../lib/ginx')), 
    parser, input, output, format, persistent, 
    fieldsToObjects, cursorsStorage, usage,
    stats, isFile, isDir, io_notice, verbose;

function usage(notice){
                if (notice) console.log('\n'+notice);
                console.log(
                    '\n\nUsage: ginx -i [path] -o [path] -t -n -f [format] -s [storage]'
                    + "\nthis tool will parse an nginx_log format and saves it for you in a JSON format. I don't know how much that is useful, if I were you I would just use the module in a node.js program."
                    + '\n-i | --input          : input file OR directory to parse'
                    + '\n-o | --output         : destination file OR directory of where you would like to program the save the .json file(s)' 
                    + '\n-f | --format         : the format of your nginx access_log, if different then default [IMPORTANT] you must escape double quotes, the format MUST be exactly the same'
                    + '\n-n | --nonpersistent  : a boolean value, defaults to true if not passed, if passed the program will not keep track of the file\'s positions, aka cursors, so it can\'t pick it where it left off in case of a crash or kill'
                    + '\n-t | --fields2objects : a boolean value, defaults to false if not passed, if passed the program will try to parse each field to a corresponding object, such as Date, Integer and NULL if \'-\' - may hit performance a little if large or too many files'
                    + '\n-s | --storage        : a custome storage file for the file\'s positions cursors, it uses ./tmp/storage.cursors by default, but it won\'t save anything if --persistent is false'
                    + '\n-h | --help           : displays this message'
                    + '\n-v | --verbose        : verbose, but this could get ugly, and print each row on the screen, huge performance hit, don\'t use it'
                    + '\n\n'
                );
            };
            
// check if parser has a cached reference for this file in the loaded cursors from storage file, that happened in the Ginx constructor
function isNewFile(f){
    return parser.__mem.cursors[parser.getStorageKeyfromPath(f)] ? false : true;
}
// print error and throw it
function error(err){
    return console.log("[GINX-ERROR]:" + err.message); throw err;
}

// if -h or --help                    
if (argv.h || argv.help){
    return usage();           
}

input = argv.i || argv.input;
output = argv.o || argv.output;
io_notice = "You must pass both input and output, if input is a file, output will be a file, same for directories, if input is a directory, output will be a directory as well";
if (!input || !output){
    return usage(io_notice);
} else {
    output = path.resolve(output);
    input = path.resolve(input);
    // synchronous, but necessary before it can continue
    stats = fs.statSync(input);
    if(!stats.isDirectory() && !stats.isFile()){
        return usage(io_notice);
    }
}

//defaults
format = argv.f || argv.format || null;
persistent = argv.n || argv.nonpersistent ? false : true;
fieldsToObjects = argv.t || argv.fields2objects ? true : false;
console.log("t: " +argv.t + " t: " + argv.fields2objects + " fieldsToObjects:" + fieldsToObjects);
cursorsStorage = argv.s || argv.storage || null;
verbose = argv.v || argv.verbose || false;

//construct the Ginx parser
parser = new Ginx(format, {'persistent': persistent, 'fieldsToObjects': fieldsToObjects});
console.log("fieldsToObjects::: "+parser.fieldsToObjects);
if(stats.isDirectory()){
    return console.log("[GINX-APOLOGY] the command line tool for parsing directory is not completed yet."
                       +"\nYou can still parse a directory if you use the module in a node.js program."
                       +"\nthis will be done very soon, check back in the next few days, I promise."
                       +"\nI just needed to sleep and didn't want to deliver shitty work.");
} else if (stats.isFile()){
    if(isNewFile(input)){
        fs.appendFile(output, "{", function(){
            processfile(input, output);
        });
    } else {
        processfile(input, output);
    }
}
// process file parsing
function processfile(input, ouput){
    parser.parseFile(input, 
    	function (err, row) {
    	    if (err) error(err);
    		if (!row.__lastrow) {
    		    row = JSON.stringify(row)+",";
    		} else {
    		    row = JSON.stringify(row);
    		}
    		fs.appendFile(output, row, function (err) {
        	    //if (err) error(err);
                if (verbose) console.log("[GINX-INFO] " + "appended " + row + " to " + output);
            });
        },
    	function (err, file) {
            if (err) error(err);
    	    fs.appendFile(output, "}", function(err){
    	        console.log("[GINX-INFO] " + file + " has finished parsing, find its JSON parsed output in: " + output);
    	    });
    	}
    );
}
//TODO finish this function !!!! 
function processDirectory(input, output, callback){
    fs.readdir(dir, function (err, files) {
        if (err) {
            if (err) error(err);
        }
        parser.__mem.outputs = {};
        files.foreach(function(f){
            parser.__mem.outputs[path.join(dir, f)] = null;
        });
        fs.mkdir(output, function(){  
            parser.parseDir(input,
                function (err, row) {
            	    if (err) error(err);
                    row

                }, function (err, file) {
                    if (err) error(err);
            	    fs.appendFile(file, "}", function(err){
            	        console.log("[GINX-INFO] " + file + " has finished parsing, find its JSON parsed output in: " + path.join(output,file));
            	    });
                }, function (err, filesCount) {
                    if (err) error(err);
        	        console.log("[GINX-INFO] " + input + " dir has finished parsing, find its JSON parsed output in dir: " + output);
                }
            );    
        }); 
    });
}