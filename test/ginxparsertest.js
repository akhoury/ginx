 var fs = require('fs-extra'), path = require('path');

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
    this.defaultOrgSmallLog = path.normalize('./test/logs/nginx_prod-small.log');
    this.defaultOrgLargeLog = path.normalize('./test/logs/nginx_prod-large.log');
    this.defaultTmpLogsDir = path.normalize('./test/tmplogs');
    this.LARGE = 'large';
    this.small = 'small';
  }

//TESTING HELPER FUNCTIONS

GinxParserTest.prototype.setupTest = function(count,logSize, callback){
  var dir = './test/tmplogs';
  var that = this;
  fs.remove(dir, function(){
    fs.mkdirs(dir, function(){
     //testing a random dir in the log dir, THIS WILL BLOCK just to test
     fs.mkdirSync(path.join(dir,'randomFolder')); 
     that.copyLogFiles(count, logSize, callback);
    });
  });
};

GinxParserTest.prototype.copyLogFiles = function(n, size, callback){
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