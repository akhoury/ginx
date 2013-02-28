var assert = require('assert'),
    path = require('path');
    
describe('GinxParser', function () {
    var GinxParserTest = require(path.join(__dirname, './setup/ginxparsertest'));
    //empty the storage before this test
    var parserTestHelper = new GinxParserTest();
    parserTestHelper.storageTmpFile = path.join(__dirname, '/storage/persistent/dir/cursors.json');
    parserTestHelper.emptyTmpStorage(function () {
        describe('.parseDir() ', function () {

            it('[DIR-TEST] should parse a directory of nginx logs (large: 16k lines, small: 50 lines, tiny: 10 lines) and store their cursor values', function () {
                
                var GinxParser = require(path.join(__dirname, './../lib/ginxparser')),  
                    counter = 0,
                    dir = path.join(__dirname, "/logs");
                    
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
});