var path = require('path'), fs = require('fs');

//TODO maybe move the storage file path to a conf file, or pass it over from the parent.
var storageTmpFile = path.join(__dirname, "/../tmp/stored.cursors");
process.on('message', function(c) {
    var cursors = JSON.stringify(c);
    fs.writeFile(storageTmpFile, cursors, function(err){
        console.log("[GINXPARSER-DEBUG][CHILD_PROCESS]" + Object.keys(c).length + " {file:cursor} record(s) stored in " + storageTmpFile);        
    if(err){
        process.exit(1);          
    }
    process.exit(0);
    });    
});