
// Require the module
var GinxParser = require('./lib/ginxparser');
//construct a parser object, optionally you can pass in the Nginx access_log format. if you don't it will use the default
var parser = new GinxParser(true);

/**
 * ======README PLEASE====
 * ===== FOR DEMO PURPOSES ONLY ==========
 * I use the GinxParserTest to create N copies of log files in 
 *   ./test/tmplogs from either ./test/logs/nginx_prod-large.log or ./test/logs/nginx_prod-small.log 
 * you will usually have your own log files
 * and since I need to wait for these the files to be copied before I actually start parsing, I pass the parsing code in a callback function
 */
 var GinxParserTest = require('./test/ginxparsertest')
 var parserTest = new GinxParserTest();
 parserTest.setupTest(30, 'large', function(){
   
   /**
    * parses all files in level 0 of a directory (NOT RECURSIVE)
    * first callback prints out each row as it gets parsed
    * second callback prints out each file when it's completely parsed
    */
   parser.parseDir("./test/tmplogs", 
     function (err, row) {
       if (err) throw err;
       /* 
         uncomment on your own risk :P - this will print out every row, 
         usually these would be persisted to the database, or handled in an analysis, or search
       */
         //console.log(row);
       },
     function(file){
      console.log("[DEBUG] " + file + " parsing completed in ParseDir()");
     }
   );

   /**
    * parses a single log file
    * first callback prints out each row as it gets parsed
    * second callback prints out the file when it's completely parsed
    */
//    parser.parseFile("./test/logs/nginx_prod-tiny.log", 
//      function (err, row) {
//        if (err) {throw err;}
//        /* 
//          uncomment on your own risk - this will print out every row, 
//          usually these would be persisted to the database, or handled in an analysis, or search
//        */
//         console.log(row[2]);
//        },
//      function(file){
//       console.log("[DEBUG] " + file + " parsing completed in ParseFile()");
//      }
//    );  
 });