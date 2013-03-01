var assert = require('assert'),
    path = require('path');

var GinxParserTest = require(path.join(__dirname, './setup/ginxparsertest'));
var parserTestHelper = new GinxParserTest();
parserTestHelper.storageTmpFile = path.join(__dirname, '/storage/persistent/dir/cursors.json');
parserTestHelper.setupTest(30, 'large', true, function () {
    describe('.parseDir ', function () {
        it('[third] should parse a directory of nginx logs (large: 16k lines, small: 50 lines, tiny: 10 lines) and store their cursor values', function () {
            var GinxParser = require(path.join(__dirname, './../lib/ginxparser')),
                counter = 0,
                dir = path.join(__dirname, "/tmplogs");

            var parser = new GinxParser(true);
            parser.__mem.tmpStorageFile = parserTestHelper.storageTmpFile;
            parser.parseDir(dir,

            function (err, row) {
                if (err) {
                    console.log(err.message);
                    throw err;
                }
                counter++;
            },

            function (file) {
                assert.equal("number", typeof parser.__mem.cursors[parser.getStorageKeyfromPath(file)]);
            },

            function () {
                assert.equal(1660, counter);
            });
        });
    });
});