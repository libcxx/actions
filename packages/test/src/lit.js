const  core  = require("@actions/core");
const assert = require('assert');
var DOMParser = require('xmldom').DOMParser;
const path = require('path');
const fs = require('fs');

function readXMLFile(xml_file) {
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

function correctTestNames(test_case) {
  const ts = test_case.parentNode;
  assert(ts && ts.nodeName == "testsuite");
  const testsuite_name = ts.getAttribute("name");

  const file_name = test_case.getAttribute('name');
  const file_path_and_suite = test_case.getAttribute('classname');
  assert(file_path_and_suite.startsWith(testsuite_name));
  const testcase_name = path.join(file_path_and_suite.substring(testsuite_name.length), file_name);

  return {testsuite_name, testcase_name};
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
    const {testsuite_name, testcase_name} = correctTestNames(tc);

    const failure_message =  `TEST '${testsuite_name} :: ${testcase_name} FAILED\n${failure_text}`

    failure_messages.push(failure_message);
  }
  return failure_messages;
}

async function getTestSuiteAnnotations(xml_file_path) {
  const xml_dom = await readXMLFile(xml_file_path);
  const failures = await visit_all_failures(xml_dom);
  return failures;
}

async function createTestSuiteAnnotations(xml_file_path) {
  const failures = await getTestSuiteAnnotations(xml_file_path);
  let count = 0;
  for (let f of failures) {
    count += 1;
    await core.error(failure);
  }
  return count;
}

module.exports = {
  getTestSuiteAnnotations,
  createTestSuiteAnnotations
};
