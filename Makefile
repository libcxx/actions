
.PHONY : all
all:
	cd test/ && ncc build index.js
	cd build/ && ncc build index.js

