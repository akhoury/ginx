##TESTING

USAGE
------
  make sure you 'npm install' to install mocha
  then

	./node_modules/mocha/bin/mocha -R spec

	*these test depend on sample logs in ./test/logs, if you alter these sample files, the test may fail
	*[NOTE]! TestSetup still a little buggy on deleting previous storage, so sometimes you need to empty the storage manually before running the test , just empty .tmp/stored.cursors content before testing. //TODO fix this once and for all ! 
