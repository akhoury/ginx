/**
 * ======README PLEASE====
 * 
 * I use the /test/setup/helper ==> FOR DEMO PURPOSES ONLY <=== to create N extact copies of log files in 
 *	 ./test/tmplogs from either ./test/logs/nginx_prod-[large|small|tiny].log, so I won't have to commit a lot sample logs,
 *  you will usually have your own log files
 *  and since I need to wait for these the files to be copied before I actually start parsing, I pass the parsing code in a callback anon function
 * 
 *  One more note, the setupTest does deletes the storage before running, if you do not wish to do so, pass it a 'false' in the  3rd argument.
 *  currently a normal program run does not delete the storage for you, (default storage in ./tmp/*) 
 */
var fs = require('fs'),
    path = require('path'),
    Helper = require(path.join(__dirname, '/test/setup/helper')),
    testHelper = new Helper();
    
//require('v8-profiler');

// give it a try 
// setupTest(NumberOfFilesToCreateThenParse, file's sizes => 'large'(~20k lines) or 'small' (~50 lines) or 'tiny'(~10 lines), DeleteTheStorageBefore?, cb)
testHelper.setupTest(100, 'large', true/* DELETE PREVIOUS STORAGE? - TOGGLE THIS IF YOU WANT TO TRY THE PERSISTENCE*/, function () {
    console.log("[GINX-DEBUG-DEMO] finished SetupTest - Parsing begins now");
    var startTime = Date.now();
       
    // This is how you would use it usually, in a NodeJS program
    // Require the module
    var Ginx = require(path.join(__dirname, '/lib/ginx')); // OR require('ginx'), depends how and where you isntalled it
    
    //construct a parser object, 
    // optionally you can pass in two arguments, a the format as a String of the the Nginx access_log format, and an options object {'persistent': true, 'fieldsToObjects': true} 
    // default is {'persistent': true, 'fieldsToObjects': false} and the default Nginx access_log, check ./lib/ginx.js source to see the default format
    // fieldsToObjects when true, it will try to convert each column's value to it's corresponding objects, so far i only parse dates to Date,  numbers to Number,and every '-' to null 
    // turning that to False will impact performance positevly as well, but of course everything depends on what you're trying to do with the logs, 
    var parser = new Ginx('$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" $request_time', {'persistent': true, 'fieldsToObjects': false});
    
    
//UNCOMMENT THIS BLOCK, COMMENT THE ONE BELOW, to try out parseDir() alone, 
//(you can test them together, it's just if you're parsing a mutual file, it's record will get overwritten by the last occurence and you will get the its rowCallbacks twice)    
/*
    parser.parseDir(path.join(__dirname, "/./test/tmplogs"),
        function (err, row) {
            if (err) throw err;
            //uncomment on your own risk :P - this will print out every row after it gets parsed, and it has a performance hit.
            //usually these would be persisted to a database, or handled in an analysis, or search
            //I would change the setupTest to parse 2 or 3 'tiny' files if you don't want to fill up your terminal before uncommenting.             
            //console.log("[GINX-DEBUG-DEMO] " +  JSON.stringify(row));
        
            // Here's a sample one row output, the attributes may change depending on the format, except __file and __originalText
            //		  { __file: '/Users/akhoury/code/ginx/test/tmplogs/_large_nginx1.log',
            //          __originalText: '10.100.9.92 - - [12/Nov/2012:12:15:69 -0500] "GET /assets/application-b3c5eeba998a57a7440394ae2ef6f6df.css HTTP/1.1" 200 111128 "http://demonet.trll.co/users/sign_in" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11"',
            //         remote_addr: '172.28.0.104',
            //         remote_user: null,
            //         time_local: Thu Feb 21 2013 09:10:57 GMT-0500 (EST),
            //         request: 'GET /favicon.ico HTTP/1.1',
            //         status: '502',
            //         body_bytes_sent: '172',
            //         http_referer: null,
            //         http_user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:19.0) Gecko/20100101 Firefox/19.0' 
            //        }
        }, function (err, file) {
            // something here
        }, function (err, filesCount) {
            console.log("[GINX-DEBUG-DEMO] " + filesCount + " Files parsing completed in " + (Date.now() - startTime) + " ms");
            console.info("[GINX-DEBUG-DEMO] Note: For the purpose of this demo, every run will delete then replace the previous storage before parsing, " 
                        + " if you do not wish to delete it before a demo run, set the 3rd param in testHelper.setupTest to false" 
                        + " at the top of demo.js.");
        });
/// BLOCK ENDS HERE 	
//*/

    /**
     * parses a single log file
     * first callback prints out each row as it gets parsed
     * second callback prints out the file when it's completely parsed
     */
//UNCOMMENT THIS BLOCK, COMMENT THE ONE ABOVE, to try out parseFile() alone 
     // IF YOU WANT TO ONLY RUN THIS TEST parseFile (a single file) change the first param in setupTest to 0 - so you won't have to wait for it to create mock files
	parser.parseFile(path.join(__dirname, "/./test/logs/nginx_prod-tiny.log"),
	//parser.parseFile("/Users/akhoury/.Trash/nginx_prod-enourmous.log",
		function (err, row) {
			if (err) {throw err;}
			 
			    //uncomment on your own risk - this will print out every row, 
				//usually these would be persisted to the database, or handled in an analysis, or search
			
			 console.log("[GINX-DEBUG-DEMO] " + JSON.stringify(row));
			},
		function(err, file){
		 console.log("[GINX-DEBUG-DEMO] " + file + " parsing completed in " + (Date.now()-startTime) + " ms");
		}
	);
// */
/// BLOCK ENDS HERE 	
});