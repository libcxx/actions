module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(622);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 105:
/***/ (function(module) {

module.exports = eval("require")("@actions/artifact");


/***/ }),

/***/ 179:
/***/ (function(module) {

module.exports = eval("require")("../src/setup-action");


/***/ }),

/***/ 277:
/***/ (function(module) {

module.exports = require("path");

/***/ }),

/***/ 352:
/***/ (function(module) {

module.exports = eval("require")("@actions/io");


/***/ }),

/***/ 357:
/***/ (function(module) {

module.exports = require("assert");

/***/ }),

/***/ 622:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const core = __webpack_require__(968);
const io = __webpack_require__(352);
const artifact = __webpack_require__(105);
const glob = __webpack_require__(973);
const path = __webpack_require__(277);
const fs = __webpack_require__(747);
const assert = __webpack_require__(357);
const setup = __webpack_require__(179);
const utils = __webpack_require__(744);


async function run() {
  try {
    const artifactClient = artifact.create();

    const config_name = core.getInput('name');
    core.saveState('config_name', config_name);
    const action_paths = await setup.createActionConfig(config_name);

    let sha = await setup.checkoutRuntimes(action_paths);
    await setup.configureRuntimes(action_paths);

    let a1 = core.group('upload-cmake-cache', async () => {
      return artifactClient.uploadArtifact(
          `runtimes-${config_name}-config`, [ path.join(action_paths.build, 'CMakeCache.txt') ],
          action_paths.build);
    });

    await setup.buildRuntimes(action_paths);
    await setup.installRuntimes(action_paths);

    let a2 = await core.group('upload-installation', async () => {
      let files = await utils.globDirectoryRecursive(action_paths.install);
      return artifactClient.uploadArtifact(
          `runtimes-${config_name}-install.zip`, files,
          action_paths.install);
    });
    await Promise.all([a1, a2]);
  } catch (error) {
    core.setFailed(error);
    return;
  }
}

async function cleanup() {
  let result = await core.group('cleanup', async () => {
    try {
      const action_paths = setup.getActionConfig();
      assert(action_paths);
      assert(action_paths.source);
      assert(action_paths.output);
      if (fs.existsSync(action_paths.source)) {
        utils.rmRfIgnoreError(action_paths.source);
      }
      if (fs.existsSync(action_paths.output)) {
        utils.rmRfIgnoreError(action_paths.output);
      }
    } catch (error) { core.setFailed(error); }
  });
  return result;
}

if (core.getState('cleanup')) {
  cleanup();
} else {
  core.saveState('cleanup', '1');
  run()
}


/***/ }),

/***/ 744:
/***/ (function(module) {

module.exports = eval("require")("../src/utils");


/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 968:
/***/ (function(module) {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 973:
/***/ (function(module) {

module.exports = eval("require")("@actions/glob");


/***/ })

/******/ });