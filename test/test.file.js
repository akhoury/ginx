var assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    Ginx = require(path.join(__dirname, './../lib/ginx')),
    Helper = require(path.join(__dirname, './setup/helper')),
    testHelper, parser, data, storageFile = path.join(__dirname, '/storage/persistent/file/cursors.json'); 

before(function(done) {
    parser = new Ginx({'persistent':true,'storageFile': storageFile});
    testHelper = new Helper();
    testHelper.storageTmpFile = storageFile;
    testHelper.emptyTmpStorage(storageFile, function (file) {
        done();
    });
});

describe('.parseFile() ', function (done) {
    it('should parse a sample nginx log file with 15920 lines and store its cursor values and return 10 rows', function (done) {
        var counter = 0,
            testFile = path.join(__dirname, "/logs/nginx_prod-large.log");
        parser.parseFile(testFile,
        function (err, row) {
            if (err) {
                console.log(err.message);
                throw err;
            }
            counter++;
        },
        function (err, file) {
            assert.equal(false, !!err);
            assert.equal(15920, counter, "It's probably because a tiny bug, try emptying the storage file ("+storageFile+") manually and run test again, or just run the test now");
            assert.equal("number", typeof parser.__mem.cursors[file]);
            done();
        });
    });
});
    
after(function(done) {
    done();
});
