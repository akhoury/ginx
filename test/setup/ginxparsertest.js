var fsx = require('fs-extra'), fs = require('fs'),
    path = require('path'), exec = require('child_process').exec,
    GinxParser = require(path.join(__dirname, '../../lib/ginxparser'));

/**
 * GinxParserTest constructor
 *   
 */
function GinxParserTest() {
    this.defaultOrgTinyLog = path.normalize('./test/logs/nginx_prod-tiny.log');
    this.defaultOrgSmallLog = path.normalize('./test/logs/nginx_prod-small.log');
    this.defaultOrgLargeLog = path.normalize('./test/logs/nginx_prod-large.log');
    this.defaultTmpLogsDir = path.normalize('./test/tmplogs');
    this.LARGE = 'large';
    this.SMALL = 'small';
    this.TINY = 'tiny';
    this.storageTmpFile = path.join(__dirname, '/../../tmp/stored.cursors');
}

//TEST HELPER FUNCTIONS

GinxParserTest.prototype.setupTest = function (count, logSize, delPrevStorage, callback) {
    var dir = path.join(__dirname, '/../tmplogs');
    var that = this;
    fsx.remove(dir, function () {
        fsx.mkdirs(dir, function () {
            that.copyLogFiles(count, logSize, function (doneCp) {
                if (typeof delPrevStorage === 'boolean' && delPrevStorage) {
                    that.emptyTmpStorage(callback);
                } else {
                    callback();
                }
            });
        });
    });
};
GinxParserTest.prototype.copyLogFiles = function (n, size, callback) {
    console.log("[GINXPARSER-TEST] copying of " + n + " " + size + " log file(s) started");
    var file, pre;
    if (size === this.TINY) {
        file = this.defaultOrgTinyLog;
    } else if (size === this.SMALL) {
        file = this.defaultOrgSmallLog;
    } else if (size === this.LARGE) {
        file = this.defaultOrgLargeLog;
    }
    this.copyFileMultipleToTmpLogs(n, file, size, callback);
};
GinxParserTest.prototype.copyFileMultipleToTmpLogs = function (nbCopies, file, pre, callback) {
    var trgFile, srcFile = file,
        that = this;
    if (nbCopies > 0) {
        trgFile = path.join(this.defaultTmpLogsDir, '_' + pre + '_' + 'nginx' + nbCopies + '.log');
        fsx.copy(file, trgFile, function (err) {
            if (err) throw err
            console.log("[GINXPARSER-TEST] copied " + file + " to: " + trgFile);
            that.copyFileMultipleToTmpLogs(nbCopies - 1, file, pre, callback);
        });
    } else {
        console.log("[GINXPARSER-TEST] All test log files copied.")
        callback(true)
    }
}
GinxParserTest.prototype.emptyTmpStorage = function (callback) {
    var that = this;
    console.log(this.storageTmpFile);
    fs.writeFileSync(this.storageTmpFile, "{}");// "{}", function(err){
    console.log("[GINXPARSER-TEST] Emptied " + that.storageTmpFile + " storage file");
    callback();
   //  });
}

module.exports = GinxParserTest;