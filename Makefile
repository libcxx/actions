


ACTIONS = build/dist/index.js test/dist/index.js dispatch/dist/index.js

.PHONY : all
all: $(ACTIONS)

$(ACTIONS): %/dist/index.js: %/action.ts
	ncc build $< --out $*/dist --external @libcxx/actions

%/action.ts:



.PHONY : clean
clean:
	rm -rf build/dist/* test/dist/* dispatch/dist/*
	rm -f lib/*
	touch lib/.gitkeep

.PHONY : distclean
distclean: clean
	rm -rf node_modules/* package-lock.
