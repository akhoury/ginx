var fsx = require('fs-extra'),
    fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    Ginx = require(path.join(__dirname, '../../lib/ginx'));

/**
 * Helper constructor
 *   
 */

function Helper() {
    this.defaultOrgTinyLog = path.join(__dirname, '/../logs/nginx_prod-tiny.log');
    this.defaultOrgSmallLog = path.join(__dirname, '/../logs/nginx_prod-small.log');
    this.defaultOrgLargeLog = path.join(__dirname, '/../logs/nginx_prod-large.log');
    this.defaultTmpLogsDir = path.join(__dirname, '/../tmplogs');
    this.LARGE = 'large';
    this.SMALL = 'small';
    this.TINY = 'tiny';
    this.storageTmpFile = path.join(__dirname, '/../../tmp/stored.cursors');
}

//TEST HELPER FUNCTIONS
Helper.prototype.setupTest = function (count, logSize, delPrevStorage, callback, storageFile) {
    var dir = path.join(__dirname, '/../tmplogs');
    var that = this;
    if (count < 0) return;
    fsx.remove(dir, function (err) {
        fsx.mkdirs(dir, function () {
            if(count === 0){
                if (typeof delPrevStorage === 'boolean' && delPrevStorage) {
                    that.emptyTmpStorage(storageFile, callback);
                } else {
                    callback();
                }
            } else {
                that.copyLogFiles(count, logSize, function (doneCp) {
                    if (typeof delPrevStorage === 'boolean' && delPrevStorage) {
                        that.emptyTmpStorage(storageFile, callback);
                    } else {
                        callback();
                    }
                });
            }
        });
    });
};
Helper.prototype.copyLogFiles = function (n, size, callback) {
    console.log("[GINX-TEST] copying " + n + " " + size + " log file(s) started");
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
Helper.prototype.copyFileMultipleToTmpLogs = function (nbCopies, file, pre, callback) {
    var trgFile, srcFile = file,
        that = this;
    if (nbCopies > 0) {
        trgFile = path.join(this.defaultTmpLogsDir, '_' + pre + '_' + 'nginx' + nbCopies + '.log');
        fsx.copy(file, trgFile, function (err) {
            if (err) {
                throw err;
            }
            console.log("[GINX-TEST] COPYING " + file + " to: " + trgFile);
            that.copyFileMultipleToTmpLogs(nbCopies - 1, file, pre, callback);
        });
    } else {
        console.log("[GINX-TEST] All test log files copied.")
        callback(true)
    }
}
Helper.prototype.emptyTmpStorage = function (file, callback) {
    var that = this, storageFile = file ? file : that.storageTmpFile;
    fs.writeFileSync(storageFile, "{}");//, function(err){
        //if (err) throw err;
    console.log("[GINX-TEST] Emptied " + storageFile + " storage file");
    callback(storageFile);
    //});
}

module.exports = Helper;