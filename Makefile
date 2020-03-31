
.PHONY : all
all:
	cd test/ && npm run package
	cd build/ && npm run package
	cd publish/ && npm run package

.PHONY : clean
clean:
	cd test/ && rm -rf dist/ && mkdir dist
	cd build/ && rm -rf dist/ && mkdir dist
	cd package/ && rm -rf dist/ && mkdir dist


.PHONY : test
test:
	cd test/ && npm test
	cd publish/ && npm test


.PHONY : reinstall
reinstall:
	rm -rf node_modules/ package-lock.json && npm install --save
	cd test/ && rm -rf node_modules/ package-lock.json && npm install --save
	cd publish/ && rm -rf node_modules/ package-lock.json && npm install --save
	cd build/ && rm -rf node_modules/ package-lock.json && npm install --save


.PHONY : commit
push: all
	git add -A :/
	git commit -am 'dummy commit'
	git push
