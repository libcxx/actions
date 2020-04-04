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

/***/ 115:
/***/ (function(module) {

module.exports = eval("require")("../src/lit-utils");


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

/***/ 622:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const core = __webpack_require__(968);
const io = __webpack_require__(352);
const artifact = __webpack_require__(105);
const glob = __webpack_require__(973);
const path = __webpack_require__(277);
const fs = __webpack_require__(747);
const {
  getRuntimeList,
  checkoutRuntimes,
  configureRuntimes,
  buildRuntimes,
  installRuntimes,
  getActionConfig,
  testRuntime
} = __webpack_require__(179);
const {createTestSuiteAnnotations} = __webpack_require__(115);

// most @actions toolkit packages have async methods
async function run() {
  try {
    const test_config = core.getInput('build');
    const options = core.getInput('options');
    const action_paths = await getActionConfig();

    const runtimes_str = core.getInput('runtimes');
    var runtimes = null;
    if (runtimes_str) {
      runtimes = runtimes_str.split(' ').map((rt) => { return rt.trim(); })
    } else {
      runtimes = action_paths.runtimes;
    }

    for (const runtime of runtimes) {
      let xunit_path = await testRuntime(action_paths, runtime, test_config, options);
      await createTestSuiteAnnotations(xunit_path);
    }
  } catch (error) {
    core.setFailed(error);
  }
}

run()


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