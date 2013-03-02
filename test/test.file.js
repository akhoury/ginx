var assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    GinxParser = require(path.join(__dirname, './../lib/ginxparser')),
    GinxParserTest = require(path.join(__dirname, './setup/ginxparsertest')),
    parserTestHelper, parser, data; 

before(function(done) {
    parser = new GinxParser({'persistent':true});
    parserTestHelper = new GinxParserTest();
    parserTestHelper.storageTmpFile = path.join(__dirname, '/storage/persistent/file/cursors.json');
    parser.__mem.tmpStorageFile = parserTestHelper.storageTmpFile;
    parserTestHelper.emptyTmpStorage(function () {
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
            assert.equal(15920, counter);
            assert.equal("number", typeof parser.__mem.cursors[parser.getStorageKeyfromPath(file)]);
            done();
        });
    });
});
    
after(function(done) {
    done();
});
