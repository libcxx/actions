

.PHONY : all
all: clean
	tsc
	ncc build lib/index.js



.PHONY : clean
clean:
	rm -rf lib/* dist/*
	touch lib/.gitkeep
	touch dist/.gitkeep


.PHONY : distclean
distclean: clean
	rm -rf node_modules/* package-lock.json
