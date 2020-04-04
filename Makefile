
actions = test build publish dispatch
dirs = test build publish dispatch

action_srcs := $(foreach action,$(actions),$(action)/index.js)
action_objs := $(foreach action,$(actions),$(action)/dist/index.js)
srcs := $(wildcard __package__/src/*)
objs := $(file:__package__/lib/%.js=__package__/src/%.js)

.PHONY : all
all: build

define CMD_clean
cd $(1) && rm -rf dist/ && mkdir dist;

endef

define CMD_build
ncc build $(1)/index.js --out $(1)/dist;

endef


define CMD_distclean
cd $(1) && rm -rf node_modules/ package-lock.json;

endef

define CMD_reinstall
cd $(1) && npm install;

endef


.PHONY : build
build:
	npm run build && npm run pack
	$(foreach tool,$(dirs),$(call CMD_build,$(tool)))


.phony : clean
clean:

	$(foreach tool,$(dirs),$(call CMD_clean,$(tool)))

.phony : test
test:
	$(foreach tool,$(dirs),$(call CMD_test,$(tool)))

.phony : reinstall
reinstall: distclean
	$(foreach tool,$(dirs),$(call CMD_reinstall,$(tool)))

.phony : distclean
distclean:
	$(foreach tool,$(dirs),$(call CMD_distclean,$(tool)))




.PHONY : commit
push: build
	git add -A :/
	git commit -am 'dummy commit'
	git push

.PHONY : add-package
add-package:
	@echo "Which package?: "; \
	read package; \
	npm install $$package --save; \
	npm install --prefix build/ $$package --save; \
	npm install --prefix test/ $$package --save; \
	npm install --prefix publish/ $$package --save; \
	npm install --prefix dispatch/ $$package --save





