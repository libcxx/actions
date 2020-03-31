
.PHONY : all
all:
	cd test/ && ncc build index.js
	cd build/ && ncc build index.js
	cd publish/ && ncc build index.js

.PHONY : test
test:
	cd test/ && npm test
	cd publish/ && npm test

.PHONY : commit
push: all
	git add -A :/
	git commit -am 'dummy commit'
	git push
