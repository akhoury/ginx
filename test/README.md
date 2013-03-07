##TESTING

USAGE
------
  make sure you 'npm install' to install mocha
  then

	./node_modules/mocha/bin/mocha -R spec

	*these test depend on sample logs in ./test/logs, if you alter these sample files, the test may fail, the sample nginx log files in test/logs, are all using the default nginx format with real data, one tiny:10 lines, small:50 lines, large: ~16k lines.
	*[NOTE]! TestSetup still a little buggy on deleting previous storage, so sometimes you need to empty the storage manually before running the test , just empty .tmp/stored.cursors content before testing, you can use a UNIX command ' > ./tmp/stored.cursors'  //TODO fix this once and for all !
	* also if you like to test the storage saving for file and dir, run each test on it's own.
		./node_modules/mocha/bin/mocha -R spec ./test/test.dir.js
		./node_modules/mocha/bin/mocha -R spec ./test/test/file.js 
