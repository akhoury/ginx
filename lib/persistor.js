var path = require('path'),
    fs = require('fs'),
    storageTmpFile = path.join(__dirname, "/../tmp/stored.cursors");
process.on('message', function (obj) {
    var keys, file = obj.file ? obj.file : storageTmpFile;
    fs.writeFile(file, JSON.stringify(obj.cursors), function (err) {
        if (err) {
            process.exit(1);
        } else {
            keys = Object.keys(obj.cursors);
            console.log("[GINX-DEBUG][CHILD] Storing " 
            + keys.length + " record(s) "
            + " i.e 1st record's cursor is at: " + obj.cursors[keys[0]] + " byte(s)" 
            + " in " + file);
        }
    });
});