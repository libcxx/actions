
.PHONY : all
all:
	cd test/ && ncc build index.js
	cd build/ && ncc build index.js
	cd publish/ && ncc build index.js

.PHONY : test
test:
	cd test/ && npm test
	cd publish/ && npm test

