var path = require('path'),
    fs = require('fs');

//TODO maybe move the storage file path to a conf file, or pass it over from the parent.
var storageTmpFile = path.join(__dirname, "/../tmp/stored.cursors");
process.on('message', function (c) {
    var cursors = JSON.stringify(c), keys;
    fs.writeFile(storageTmpFile, cursors, function (err) {
        if (err) {
            process.exit(1);
        } else {
            keys = Object.keys(c);
            console.log("[GINXPARSER-DEBUG][CHILD] Storing " 
            + keys.length + " record(s) "
            + " i.e 1st record's cursor is at: " + c[keys[0]] + " byte" 
            + " in " + storageTmpFile);
        }
    });
});