  fs = require('fs-extra');

  /**
   * GinxParser constructor
   *
   * @format specified in your nginx conf. If you haven't specified anything, it will use nginx's default
   */
  function GinxParserTest(format){
    var default_format = '$remote_addr - $remote_user [$time_local] ' +
                          '"$request" $status $body_bytes_sent ' +  
                          '"$http_referer" "$http_user_agent"';
    this.format = format || default_format;
    this.delimeters = this.format.match(/[^\$\w+]+/g);
    this.attrs = this.format.match(/\$\w+/g);
    this.defaultCopies = 30;
    this.defaultOrgSmallLog = './test/logs/nginx_prod-small.log'
    this.defaultOrgLargeLog = './test/logs/nginx_prod-large.log'
    this.defaultTmpLogsDir = './test/tmplogs';
    this.LARGE = 'large';
    this.small = 'small';
  }

//TESTING HELPER FUNCTIONS

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
  if (size === this.SMALL){
    this.copySmallLogs(n);
  } else if (size === this.LARGE){
    this.copyLargeLogs(n);
  }
  callback(true);
};

GinxParserTest.prototype.copyFileMultipleToTmpLogs = function(nbCopies, file){
  var trgFile, srcFile = file;        
  for (var i = 0; i < nbCopies; i++){
    trgFile = this.defaultTmpLogsDir + '/nginx' + i + '.log'; 
    fs.copy(file,trgFile);
  }
}
GinxParserTest.prototype.copySmallLogs = function(n){
  this.copyFileMultipleToTmpLogs(n, this.defaultOrgSmallLog);
}
GinxParserTest.prototype.copyLargeLogs = function(n){
  this.copyFileMultipleToTmpLogs(n, this.defaultOrgLargeLog);
}
module.exports = GinxParserTest;