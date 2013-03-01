var assert = require('assert'),
    path = require('path');

var GinxParserTest = require(path.join(__dirname, './setup/ginxparsertest'));
//empty the storage before this test
var parserTestHelper = new GinxParserTest();
parserTestHelper.storageTmpFile = path.join(__dirname, '/storage/persistent/file/cursors.json');
parserTestHelper.emptyTmpStorage(function () {
    describe('.parseFile ', function () {
        it('should parse a sample nginx log file with 10 lines and store its cursor values and return 10 rows', function () {
            var GinxParser = require(path.join(__dirname, './../lib/ginxparser')),
                counter = 0,
                testFile = path.join(__dirname, "/logs/nginx_prod-tiny.log");
            var parser = new GinxParser();
            parser.__mem.tmpStorageFile = parserTestHelper.storageTmpFile;

            parser.parseFile(testFile,
            function (err, row) {
                if (err) {
                    console.log(err.message);
                    throw err;
                }
                counter++;
            },
            function (file) {
                assert.equal(10, counter);
                assert.equal("number", typeof parser.__mem.cursors[parser.getStorageKeyfromPath(file)]);
            });
        });
    });
});