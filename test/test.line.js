var assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    Ginx = require(path.join(__dirname, './../lib/ginx')),
    Helper = require(path.join(__dirname, './setup/helper')),
    testHelper, parser, data, storageFile = path.join(__dirname, '/storage/persistent/line/cursors.json');

before(function(done) {
    parser = new Ginx({'persistent':true,'storageFile': storageFile});
    testHelper = new Helper();
    testHelper.storageTmpFile = storageFile;
    testHelper.emptyTmpStorage(storageFile, function () {
        done();
    });
});

describe('.parseLine ', function (done) {
    var Ginx = require(path.join(__dirname, './../lib/ginx'));
    it('should parse a line of nginx logs and return correct object values', function (done) {
        var format = '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"';
        var parser = new Ginx(format, {'fieldsToObjects': true, 'originalText':true});
        var line = '10.100.9.92 - - [12/Nov/2012:12:11:28 -0500] "GET /favicon.ico HTTP/1.1" 502 574 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11"';
        var __file = "fakefile.jpg";
        var __originalText = line;
        parser.parseLine(line,

        function (err, row) {
            if (err) throw err;
            assert.equal('10.100.9.92', row['remote_addr']);
            assert.equal(null, row['remote_user']);
            assert.equal(new Date('12 Nov 2012 12:11:28 GMT-0500').toString(), row['time_local'].toString());
            assert.equal('GET /favicon.ico HTTP/1.1', row['request']);
            assert.equal(502, row['status']);
            assert.equal(574, row['body_bytes_sent']);
            assert.equal(null, row['http_referer']);
            assert.equal('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11', row['http_user_agent']);
            assert.equal(__file, row['__file']);
            assert.equal(__originalText, row['__originalText']);
            done();
        },{'file':__file});
    });
});

after(function(done) {
    done();
});
