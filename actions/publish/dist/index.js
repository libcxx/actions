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

/***/ 179:
/***/ (function(module) {

module.exports = eval("require")("../src/setup-action");


/***/ }),

/***/ 384:
/***/ (function(module) {

module.exports = eval("require")("../src/publish-action");


/***/ }),

/***/ 622:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const core = __webpack_require__(968);
const {createAndPublishTestSuiteResults} = __webpack_require__(384);
const { getActionConfig } = __webpack_require__(179);

// most @actions toolkit packages have async methods
async function run() {
  try {
    const action_paths = await getActionConfig();
    const token = core.getInput('publisher_key');
    const test_config_name = core.getInput('config_name');
    await createAndPublishTestSuiteResults(action_paths, test_config_name, token);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run()


/***/ }),

/***/ 968:
/***/ (function(module) {

module.exports = eval("require")("@actions/core");


/***/ })

/******/ });