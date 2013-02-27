 var fs = require('fs-extra'), path = require('path');

  /**
   * GinxParserTest constructor
   *   
   */
  function GinxParserTest(){
    this.defaultOrgTinyLog = path.normalize('./test/logs/nginx_prod-tiny.log');
    this.defaultOrgSmallLog = path.normalize('./test/logs/nginx_prod-small.log');
    this.defaultOrgLargeLog = path.normalize('./test/logs/nginx_prod-large.log');
    this.defaultTmpLogsDir = path.normalize('./test/tmplogs');
    this.LARGE = 'large';
    this.SMALL = 'small';
    this.TINY = 'tiny';
  }

//TEST HELPER FUNCTIONS

GinxParserTest.prototype.setupTest = function(count, logSize, delPrevStorage, callback){
  var dir = path.join(__dirname,'/tmplogs');
  var that = this;
  fs.remove(dir, function(){
    fs.mkdirs(dir, function(){
     that.copyLogFiles(count, logSize, function(doneCp){
       if(typeof delPrevStorage === 'boolean' && delPrevStorage){
         that.emptyTmpStorage(path.join(__dirname,'/../tmp'), callback);
       }
     });
    });
  });
};
GinxParserTest.prototype.copyLogFiles = function(n, size, callback){
  console.log("[GINXPARSER-TEST] copying of " + n + " " + size + " log file(s) started");
  var file, pre;
  if (size === this.TINY){
    file = this.defaultOrgTinyLog;
  } else if (size === this.SMALL){
    file = this.defaultOrgSmallLog;
  } else if (size === this.LARGE){
    file = this.defaultOrgLargeLog;
  }
  this.copyFileMultipleToTmpLogs(n,file,size,callback);
};
GinxParserTest.prototype.copyFileMultipleToTmpLogs = function(nbCopies, file, pre, callback){
  var trgFile, srcFile = file, that = this;
  if (nbCopies > 0 ){ 
    trgFile = path.join(this.defaultTmpLogsDir, '_' + pre + '_' + 'nginx' + nbCopies + '.log'); 
    fs.copy(file,trgFile, function(err){
      if(err) throw err
      console.log("[GINXPARSER-TEST] copied " + file + " to: " + trgFile); 
      that.copyFileMultipleToTmpLogs(nbCopies-1, file, pre, callback);
    });
  }
  else {
    console.log("[GINXPARSER-TEST] All test log files copied.")
    callback(true)
  }
}
GinxParserTest.prototype.emptyTmpStorage = function(dir, callback){
  fs.remove(dir, function(){
    console.log("[GINXPARSER-TEST] Removed " + dir + " storage directory");
    fs.mkdirs(dir, function(){
      if(typeof callback === 'function'){
        callback(dir);
      }
    });
  });
}
module.exports = GinxParserTest;