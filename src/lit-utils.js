const { Octokit } = require("@octokit/rest");
const { createTokenAuth } = require("@octokit/auth-token");
const { exec } = require("@actions/exec");
const  core  = require("@actions/core");
const assert = require('assert');
var DOMParser = require('xmldom').DOMParser;

const { execSync } = require('child_process');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const process = require('process');
const xunitViewer = require('xunit-viewer');



function read_xml_from_file(xml_file) {
  const xml_string = fs.readFileSync(xml_file, 'utf8');
  function handle_error(err) {
    core.error(err);
    core.setFailed(err.message);
  }

  var parser = new DOMParser({
    errorHandler: {
      warning: function (w) {
        core.warning(w)
      }, error: handle_error, fatalError: handle_error
    }
  });
  var doc = parser.parseFromString(xml_string);
  return doc;
}

function get_corrected_names(test_case) {
  const ts = test_case.parentNode;
  assert(ts && ts.nodeName == "testsuite");
  const ts_name = ts.getAttribute("name");

  const file_name = test_case.getAttribute('name');
  const file_path_and_suite = test_case.getAttribute('classname');
  assert(file_path_and_suite.startsWith(ts_name));
  const test_case_name = path.join(file_path_and_suite.substring(ts_name.length), file_name);

  return {test_suite_name: ts_name, test_case_name: test_case_name};
}

function visit_all_failures(xml_doc) {
  var failure_messages = [];
  var elems = xml_doc.getElementsByTagName("failure");
  for (var i = 0; i < elems.length; ++i) {
    const failure = elems[i];
    assert(failure.hasChildNodes());
    assert(failure.childNodes.length == 1);
    const failure_text = failure.childNodes[0].nodeValue;

    const tc = failure.parentNode;
    assert(tc && tc.nodeName == "testcase");
    const {test_suite_name, test_case_name} = get_corrected_names(tc);

    const failure_message =  `TEST '${test_suite_name} :: ${test_case_name} FAILED\n${failure_text}`

    failure_messages.push(failure_message);
  }
  return failure_messages;
}

function getTestSuiteAnnotations(xml_file_path) {
  const xml_dom = read_xml_from_file(xml_file_path);
  const failures = visit_all_failures(xml_dom);
  return failures;
}

function createTestSuiteAnnotations(xml_file_path) {
  const failures = getTestSuiteAnnotations(xml_file_path);
  count = 0;
  failures.forEach(failure => { count += 1; core.error(failure); });
  return count;
}



module.exports = {getTestSuiteAnnotations, createTestSuiteAnnotations}
