
/**
 * ======README PLEASE====
 * ===== FOR DEMO PURPOSES ONLY ==========
 * I use the GinxParserTest to create N extact copies of log files in 
 *	 ./test/tmplogs from either ./test/logs/nginx_prod-[large|small|tiny].log, so I won't have to commit all sample logs,
 *  you will usually have your own log files
 *  and since I need to wait for these the files to be copied before I actually start parsing, I pass the parsing code in a callback anon function
 * 
 *  One more note, the setupTest does delete the storage before running, if you don't want to do so, pass it a 'false' in the  3rd argument.
 *  currently the program does not delete the storage (tmp/*) for you,
 */
 var GinxParserTest = require('./test/ginxparsertest')
 var parserTest = new GinxParserTest();
 // give it a try 
 // setupTest(NumberOfFilesToCreateThenParse, file's size => 'large'(~20k lines) or 'small' (~50 lines) or 'tiny'(~10 lines), DeleteTheStorageBefore?, cb)
 parserTest.setupTest(2, 'tiny', true, function(){
	 console.log("[GINXPARSER-TEST] finished SetupTest - Parsing begins now");
	
		// This is how you would use it usually, in a NodeJS program
		
	 // Require the module
   var GinxParser = require('./lib/ginxparser'); // OR require('ginxparser'), depends how and where you isntalled it
   //construct a parser object, 
   // optionally you can pass in two arguments, a boolean (persistent or not) and a string the Nginx access_log format. 
   // default is Persistent, and the default Nginx access_log, check ./lib/ginxparser.js source to see the default format
   var parser = new GinxParser();	 
   
	 parser.parseDir("/Users/akhoury/code/ginxparser/test/tmplogs", 
		 function (err, row) {
			 if (err) throw err;
			 /* 
				* uncomment on your own risk :P - this will print out every row after it gets parsed, and it has a performance hit.
				* usually these would be persisted to a database, or handled in an analysis, or search
				* I would change the setupTest to parse 2 or 3 tiny files if you don't want to fill up your terminal before uncommenting.
			 */
			 	console.log(row);
			
			 /* Here's a sample one row output, the attributes may change depending on the format, except __file, __lastCharAt and __originalText */			 
//			  { __file: '/Users/akhoury/code/ginxparser/test/tmplogs/_large_nginx1.log',
//          __lastCharAt: 1786,
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
    				
			 },
		 function(file){
			console.log("[GINXPARSER-DEBUG] " + file + " parsing completed in ParseDir()");
		 }
	 );

	 /**
		* parses a single log file
		* first callback prints out each row as it gets parsed
		* second callback prints out the file when it's completely parsed
		*/
//		parser.parseFile("./test/logs/nginx_prod-tiny.log", 
//			function (err, row) {
//				if (err) {throw err;}
//				/* 
//					uncomment on your own risk - this will print out every row, 
//					usually these would be persisted to the database, or handled in an analysis, or search
//				*/
//				 //console.log(row);
//				},
//			function(file){
//			 console.log("[DEBUG] " + file + " parsing completed in ParseFile()");
//			}
//		);	
 
 });