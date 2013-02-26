
// Require the module
var GinxParser = require('./lib/ginxparser');
//construct a parser object, optionally you can pass in the Nginx access_log format. if you don't it will use the default
var parser = new GinxParser();

/**
 * FOR DEMO PURPOSES ONLY
 * I use tthe GinxParserTest to create 30 copy of log files in 
 *   ./test/tmplogs from either ./test/logs/nginx_prod-large.log or ./test/logs/nginx_prod-small.log 
 * you will usually have your own log files
 * and since I need to wait for these the files to be created before I actually start parsing, I pass the parsing code in a callback
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
         uncomment under your own risk :P - this will print out every row, 
         usually these would be persisted to the database, or handled in an analysis, or for search
       */
         //console.log(row);
       },
     function(file){
      console.log(file + " parsing complete");
     }
   );
   /**
    * parses a single log file
    * first callback prints out each row as it gets parsed
    * second callback prints out the file when it's completely parsed
    */
    parser.parseFile("./test/logs/nginx_prod-large.log", 
      function (err, row) {
        if (err) throw err;
        /* 
          uncomment under your own risk - this will print out every row, 
          usually these would be persisted to the database, or handled in an analysis, or for search
        */
          //console.log(row);
        },
      function(file){
       console.log(file + " parsing complete");
      }
    );
 });