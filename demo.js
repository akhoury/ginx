
/**
 * ======README PLEASE====
 * ===== FOR DEMO PURPOSES ONLY ==========
 * I use the GinxParserTest to create N extact copies of log files in 
 *	 ./test/tmplogs from either ./test/logs/nginx_prod-large.log or ./test/logs/nginx_prod-small.log, so I don't commit all sample logs,
 *  I just make copies to test performance.
 * you will usually have your own log files
 * and since I need to wait for these the files to be copied before I actually start parsing, I pass the parsing code in a callback anon function
 * 
 *  One more note, the setupTest does delete the storage before running, if you don't want to do so, pass it a 'false' in the  3rd argument.
 *  currently the program does not delete the storage (tmp/*) for you,
 */
 var GinxParserTest = require('./test/ginxparsertest')
 var parserTest = new GinxParserTest();
 parserTest.setupTest(2, 'tiny', true, function(){
	 console.log("[GINXPARSER-TEST] finished SetupTest - Parsing begins now");
	
		// This is how you would use it usually, in a NodeJS program
		
	 // Require the module
   var GinxParser = require('./lib/ginxparser');
   //construct a parser object, 
   // optionally you can pass in the Nginx access_log format. if you don't use it will use the default
   var parser = new GinxParser();	 
   
	 parser.parseDir("./test/tmplogs", 
		 function (err, row) {
			 if (err) throw err;
			 /* 
				 uncomment on your own risk :P - this will print out every row after it gets parsed 
				 usually these would be persisted to a database, or handled in an analysis, or search
			 */
				console.log(row);
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