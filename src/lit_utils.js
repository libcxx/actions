const { Octokit } = require("@octokit/rest");
const { createTokenAuth } = require("@octokit/auth-token");
const { exec } = require("@actions/exec");
const  core  = require("@actions/core");
const assert = require('@assert');
var DOMParser = require('xmldom').DOMParser;

const { execSync } = require('child_process');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const process = require('process');

function handle_error(err) {
  core.error(err);
  core.setFailed(err.message);
}

function read_xml_from_file(xml_file) {
  const xml_string = fs.readFileSync(xml_file, 'utf8');
    var parser = new DOMParser({
      errorHandler: {
        warning: function (w) {
          console.warn(w)
        }, error: handle_error, fatalError: handle_error
      }
    });
    var doc = parser.parseFromString(xml_string);
    return doc;
}

// The LIT XML stores the name 'libc++ :: std/foo/bar.pass.cpp' as two
// XML attributes:
//    'classname': 'libc++.std/foo'
//    'name'     : 'bar.pass.cpp'
// This function re-formats that into a test-suite name, 'libc++', and the
// test path and name, 'std/foo/bar.pass.cpp'
function split_test_case_name(test_path, test_file) {
  const split_idx = test_path.indexOf('.');
  assert(split_idx != -1, 'failed to find test suite delimiter');
  const suite_name = test_path.split(0, split_idx);
  const test_base_path = test_path.split(split_idx + 1);
  var test_full_path = '/'.concat(test_base_path, test_file);
  return {
    test_suite: suite_name,
    test_case: test_full_path
  };
}

function format_test_case_failure(tc_elem) {
  const failures = tc_elem.getElementsByTagName("failure");
      if (failures.length != 1) {
        throw "Unexpected XML format";
      }

      const {test_suite, test_case} = split_test_case_name(
        tc_elem.getAttribute('classname'), tc_elem.getAttribute('name'));
      const failure_text = failures[0].firstChild.data;

      return `TEST '${test_suite} :: ${test_case} FAILED\n${failure_text}`
}

function collect_failure_messages(xml_doc) {
  var failure_messages = [];
    var elems = xml_doc.getElementsByTagName("testcase");
    for (var i = 0; i < elems.length; ++i) {
      const tc = elems[i];
      if (!tc.hasChildNodes())
        continue;

      failure_messages.push(format_test_case_failure(tc));
    }
    return failure_messages;
}

export function create_annotations_from_xunit_results(xml_file_path) {
  const xml_dom = read_xml_from_file(xml_file_path);
  const failures = collect_failure_messages(xml_dom);
  failures.forEach(failure => { core.error(failure); });
}

export function create_html_from_xunit_results(title, xml_file_path, html_output_path) {
  buxunitViewer({
      server: false,
      results: xml_file_path,
      title: title,
      output: html_output_path,
    });
}
