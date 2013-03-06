#!/usr/bin/env node

'use strict';

// if you want to use this command line tool you must 'npm install' to get 'optimist'
var argv = require('optimist').argv,
    path = require('path'),
    fs = require('fs'),
    Ginx = require(path.join(__dirname, '/../lib/ginx')),
    parser, input, output, format, usage, stats, storage,
    isFile, isDir, io_notice, verbose, fext = '.json', writer;

function usage(notice) {
    if (notice) console.log('\n' + notice);
    console.log(
        '\nThis tool is still under develpment(issues #1, #4, #8 and probably more) - JSON output is too heavy and will be replaced by either CSV or database inserts instead.'
        + '\nUsage: ginx --input [path] --output [path] -t -n -f [format] -s [path]' 
        + '\n\nthis tool will parse nginx log files and save it/them in a JSON format. I don\'t know how much that is useful,'
        + '\nPlus, there is a HUGE performance hit by writing another JSON file(s) at the same time.'
        + '\nThe other problem with this (issue #1) is that is closing the JSON brackets at the end of each file, to complete the structure,'
        + '\nso if you parse a log file and it completes. Then sometime later you parse the same file again if there is more logs appended to it,' 
        + '\nthe total resulted JSON structure will not be correct, syntax wise. However, if a crash or a kill occurs, '
        + '\nand the JSON is not closed yet, the resulted syntax will be fine once you resume the parsing'
        + '\nI will be implementing a tail -f like feature soon, it may make this tool more useful, stay tuned. Meanwhile, limit usage to 50 files max '
        + '\n[BROTIP] if I were you I would just use the module in a node.js program, get what you need out of each row, persist to a DB or something -- i don\'t even know why I wrote this tool'
        + '\nif you have a large log file to parse, you will end up with an even larger JSON file. \n' 
        + '\n-i | --input          : input file OR directory to parse' 
        + '\n-o | --output         : destination file OR directory of where you would like to program the save the JSON file(s)'
        + '\n-f | --format         : [OPTIONAL] the format of your nginx access_log, if different then default [IMPORTANT] you must escape double quotes, the format MUST be exactly the same, single quotes in nginx format are not supported yet. (issue #5)' 
        + '\n-n | --nonpersistent  : [OPTIONAL] a boolean value, defaults to true if not passed, if passed the program will not keep track of the file\'s positions, aka cursors, so it can\'t pick it where it left off in case of a crash or kill' 
        + '\n-j | --fields2objects : [OPTIONAL] a boolean value, defaults to false if not passed, if passed the program will try to parse each field to a corresponding object, such as Date, Integer and NULL if \'-\' - may hit performance a little if large or too many files' 
        + '\n-s | --storage        : [OPTIONAL] a custome storage file for the file\'s positions cursors, it uses ./tmp/storage.cursors by default, but it won\'t save anything if --nonpersistent is passed' 
        + '\n-g | --original       : [OPTIONAL] a boolean value, defaults to false, if passed, it will augment each row JSON object with its original text, if you need it, use it, if you don\' leave it out, it will make your output a lot larger'
        + '\n-h | --help           : [OPTIONAL] displays this message' 
        + '\n-v | --verbose        : [OPTIONAL] verbose, but this could get ugly, printing each row on the screen, huge performance hit, don\'t use it' 
        + '\n-c | --clear          : [OPTIONAL] will clear the cursors storage first, use it with -s if you have a custom storage file, otherwise it clears the default' + '\n\n');
};

// print error and throw it
function error(err) {
    return console.log("[GINX-ERROR]:" + err.message);
    throw err;
}

// check if parser has a cached reference for this file in the loaded cursors from storage file, that latter happens in the Ginx constructor
function isNewFile(f) {
    return parser.__mem.cursors[parser.getStorageKeyfromPath(f)] ? false : true;
}

// if -h or --help                    
if (argv.h || argv.help) {
    return usage();
}
input = argv.i || argv.input;
output = argv.o || argv.output;
io_notice = 'You must pass both input and output, if input is a file, output will be a file, same for directories (limit to <50 files please)'
            + 'if input is a directory, output will be a directory as well, and you can\'t use the same directory nor same file for both arguments';
if (!input || !output) {
    return usage(io_notice);
} else {
    output = path.resolve(output);
    input = path.resolve(input);
    // synchronous, but necessary before it can continue
    stats = fs.statSync(input);
    if ((!stats.isDirectory() && !stats.isFile()) || (output === input)) {
        return usage(io_notice);
    }
}

//defaults
format = argv.f || argv.format || null;
verbose = argv.v || argv.verbose || false;
storage = argv.s || argv.storage || path.join(__dirname + '/../tmp/stored.cursors');

// MAKING SURE the storage file is there before we continue, bunch of Sync calls but needed
// this will need to be updated when fs.writeFile be able to create directories recursivly
if(!fs.existsSync(storage)){
    var storageDir = path.normalize(storage.substring(0, storage.lastIndexOf(path.sep)));
    if(!fs.existsSync(storageDir)){
        fs.mkdirSync(storageDir);
    }
    fs.writeFileSync(storage, "{}");
} else if (argv.c || argv.clear) {
    //clearing storage if requested before constructing Ginx.
    fs.writeFileSync(storage, "{}");
    console.log("[GINX-INFO] Emptied " + storage + " storage file");
}

//construct the Ginx parser
parser = new Ginx(format, {
    'persistent': argv.n || argv.nonpersistent ? false : true,
    'fieldsToObjects': argv.j || argv.fields2objects ? true : false,
    'storageFile': argv.s || argv.storage || null
});


// creating a writer to handle the data buffering from the parser's readstreams
writer = {
    wstreams: {},
    append: function(data, wfile, rfile){
        if(data 
            && this.wstreams[wfile] 
            && (this.wstreams[wfile].write(data) == false) 
            && parser.rstreams[rfile]
            && parser.rstreams[rfile].pause){
                parser.rstreams[rfile].pause();
        }
    },
    addStream: function(wfile, rfile, callback){
        var wstream = fs.createWriteStream(wfile, {'flags': 'w+', 'encoding':'utf8', 'mode': '0666'});
        this.wstreams[wfile] = wstream;
        this.wstreams[wfile].on('drain', function(){
            if(parser.rstreams[rfile]
                && parser.rstreams[rfile].readable 
                && parser.rstreams[rfile].resume){
                    parser.rstreams[rfile].resume();
            }
        });
        callback();
    }
}
// let the parsing begin !!! 

// process directory parsing
if (stats.isDirectory()) {
    fs.mkdir(output, function () {
        fs.readdir(input, function (err, files) {
            if (err) error(err);
            files.forEach(function (file) {
                var wfile = path.join(output, file),
                    rfile = path.join(input, file);
                writer.addStream(wfile, rfile, function(){
                    //prepend the JSON openings for each new file before we go on.
                    if (isNewFile(rfile)) {
                        writer.append("{[", wfile, rfile);
                    }
                });
            });
            console.log("Start processing directory");
            processDirectory(input, output);
        });
    });
} else if (stats.isFile()) {
    writer.addStream(output, input, function(){
        if (isNewFile(input)) {
            writer.append("{[", output, input);
        }  
        processFile(input, output);
    });

}
// process file parsing to JSON output
function processFile(input, ouput) {
    parser.parseFile(input,

    function (err, row) {
        if (err) error(err);
        writer.append(ifLastRow(row), output, row.__file);
    },

    function (err, rfile) {
        if (err) error(err);
        //close the JSON array
        writer.append("]}", output, rfile);
    });
}

// process directory parsing to JSON outputs
function processDirectory(input, output) {
    parser.parseDir(input,

    function (err, row) {
        if (err) error(err);
        var fname = row.__fname;
        writer.append(ifLastRow(row), path.join(output, fname), row.__file);
    },

    function (err, rfile) {
        if (err) error(err);
        var wfile = path.join(output, rfile.substring(rfile.lastIndexOf(path.sep) + 1));
        //close the JSON array
        writer.append("]}", wfile, rfile);
    },

    function (err, filesCount) {
        if (err) error(err);
        if (parser.__mem.child && parser.__mem.child.connected) {
            parser.__mem.child.kill('SIGKILL');
        }
        process.exit(0)
    });
}

function ifLastRow(row){
    return !row.__lastrow ? JSON.stringify(row) + "," : JSON.stringify(row);
}