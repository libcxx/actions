
.PHONY : all
all:
	cd test/ && rm -rf dist/ && mkdir dist/ && npm run package
	cd build/ && rm -rf dist/ && mkdir dist/ && npm run package
	cd publish/ && rm -rf dist/ && mkdir dist/ && npm run package
	cd dispatch-event/ && rm -rf dist/ && mkdir dist/ && npm run package


.PHONY : clean
clean:
	cd test/ && rm -rf dist/ && mkdir dist && rm -rf node_modules/
	cd build/ && rm -rf dist/ && mkdir dist && rm -rf node_modules/
	cd publish/ && rm -rf dist/ && mkdir dist && rm -rf node_modules/
	cd dispatch-event/ && rm -rf dist/ && mkdir dist && rm -rf node_modules/
	rm -rf node_modules/


.PHONY : test
test:
	cd test/ && npm test
	cd publish/ && npm test
	cd dispatch-event && npm test


.PHONY : reinstall
reinstall:
	rm -rf node_modules/ package-lock.json && npm install --save
	cd test/ && rm -rf node_modules/ package-lock.json && npm install --save
	cd publish/ && rm -rf node_modules/ package-lock.json && npm install --save
	cd build/ && rm -rf node_modules/ package-lock.json && npm install --save
	cd dispatch-event/ && rm -rf node_modules/ package-lock.json && npm install --save


.PHONY : add-package
add-package:
	@echo "Which package?: "; \
	read package; \
	npm install $$package --save; \
	npm install --prefix build/ $$package --save; \
	npm install --prefix test/ $$package --save; \
	npm install --prefix publish/ $$package --save; \
	npm install --prefix dispatch-event/ $$package --save


.PHONY : commit
push: all
	git add -A :/
	git commit -am 'dummy commit'
	git push
