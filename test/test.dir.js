var assert = require('assert'),
    path = require('path'),     
    GinxParser = require(path.join(__dirname, './../lib/ginxparser')),
    GinxParserTest = require(path.join(__dirname, './setup/ginxparsertest')), 
    parserTestHelper, parser;
    
parserTestHelper = new GinxParserTest();
parser = new GinxParser({'persistent': true, 'fieldsToObjects': true});


before(function(done) {
    parserTestHelper.setupTest(30, 'large', true, function (file) {
        console.log("[GINXPARSER-TEST][PARSEDIR] before setup done");
        parser.__mem.tmpStorageFile = file;
        done();
    });
});
describe('.parseDir ', function (done) {
    it('should parse a directory of nginx logs 30 "large" file: ~16k lines each, totals 477600 rows, '
        + ' and store their cursor values, 30 cursor records'
        + '\n [GINXPARSER-NOTE]: this test will copy 30 files to a tmp dir before parsing, so it is a little slower.\n', function (done) {
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
                assert.equal("number", typeof parser.__mem.cursors[parser.getStorageKeyfromPath(file)]);
            },

            function () {
                assert.equal(477600, counter);
                done();
            });
        });
});
after(function(done) {
    parserTestHelper.emptyTmpStorage(function () {
        console.log("[GINXPARSER-TEST][PARSEDIR] After test, deleting storage");
        done();
    });
});