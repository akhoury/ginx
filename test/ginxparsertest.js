 var fs = require('fs-extra'), path = require('path');

  /**
   * GinxParserTest constructor
   *   
   */
  function GinxParserTest(){
    this.defaultCopies = 30;
    this.defaultOrgSmallLog = path.normalize('./test/logs/nginx_prod-small.log');
    this.defaultOrgLargeLog = path.normalize('./test/logs/nginx_prod-large.log');
    this.defaultTmpLogsDir = path.normalize('./test/tmplogs');
    this.LARGE = 'large';
    this.SMALL = 'small';
  }

//TEST HELPER FUNCTIONS

GinxParserTest.prototype.setupTest = function(count,logSize, callback){
  var dir = './test/tmplogs';
  var that = this;
  fs.remove(dir, function(){
    fs.mkdirs(dir, function(){
     that.copyLogFiles(count, logSize, callback);
    });
  });
};
GinxParserTest.prototype.copyLogFiles = function(n, size, callback){
  console.log("[TEST] copying of " + n + " " + size + " log files started");
  if (size === this.SMALL){
    this.copySmallLogs(n, callback);
  } else if (size === this.LARGE){
    this.copyLargeLogs(n, callback);
  }
};
GinxParserTest.prototype.copyFileMultipleToTmpLogs = function(nbCopies, file, callback){
  var trgFile, srcFile = file, that = this;
  if (nbCopies > 0 ){  
    trgFile = path.join(this.defaultTmpLogsDir, 'nginx' + nbCopies + '.log'); 
    fs.copy(file,trgFile, function(err){
      if(err) throw err
      that.copyFileMultipleToTmpLogs(nbCopies-1, file, callback);
    });
  }
  else {
    console.log("[TEST] All test log files copied.")
    callback(true)
  }
}
GinxParserTest.prototype.copySmallLogs = function(n, callback){
  this.copyFileMultipleToTmpLogs(n, this.defaultOrgSmallLog, callback);
}
GinxParserTest.prototype.copyLargeLogs = function(n, callback){
  this.copyFileMultipleToTmpLogs(n, this.defaultOrgLargeLog, callback);
}
module.exports = GinxParserTest;