var assert = require('assert'),
    path = require('path'),     
    Ginx = require(path.join(__dirname, './../lib/ginx')),
    Helper = require(path.join(__dirname, './setup/helper')), 
    testHelper, parser, count, storageFile = path.join(__dirname, '/storage/persistent/file/cursors.json'); 
    
testHelper = new Helper();
parser = new Ginx({'persistent': true, 'fieldsToObjects': true, 'storageFile':storageFile});


before(function(done) {
    count = 30;
    testHelper.storageTmpFile = storageFile;
    testHelper.setupTest(count, 'small', true, function (file) {
        console.log("[GINX-TEST][PARSEDIR] before setup done");
        done();
    }, storageFile);
});
describe('.parseDir ', function (done) {
    it('should parse a directory of nginx logs 30 "small" file: 50 lines each, totals 1500 rows, '
        + ' and store their cursor values, 30 cursor records', function (done) {
        var counter = 0,
        dir = path.join(__dirname, "/tmplogs");
        parser.parseDir(dir,

            function (err, row) {
                if (err) {
                    console.log(err.message);
                    throw err;
                }
                counter++;
            },

            function (err, file) {
                assert.equal(false, !!err);
                assert.equal("number", typeof parser.__mem.cursors[file]);
            },

            function (err, filesCount) {
                assert.equal(1500, counter);
                assert.equal(30, filesCount);
                done();
            });
        });
});
after(function(done) {
    //testHelper.emptyTmpStorage(storageFile, function () {
        //console.log("[GINX-TEST] After test, deleting storage");       
        console.warn("[GINX-TEST] NOTE: ParseDir() test copies " + count + " files to a tmp dir before parsing, "
                     + "it maybe a little slower, depending on file size"
                     + "\n[IMPORTANT] Since Mocha have a 2000 ms timeout for each test, you can't use it to test very large"
                     + "file or too many files, these have to be done outside of mocha's suite, play around with demo.js using helper.js you can do magic in there.");
        done();
  // });
});