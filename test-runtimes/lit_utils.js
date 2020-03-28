const { Octokit } = require("@octokit/rest");
const { createTokenAuth } = require("@octokit/auth-token");
const { exec } = require("@actions/exec");
const  core  = require("@actions/core");
var DOMParser = require('xmldom').DOMParser;

const { execSync } = require('child_process');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const process = require('process');

function handle_error(err) {
  console.error(err)
}

let create_annotations_for_results = function(xml_file) {
    const xml_string = fs.readFileSync(xml_file, 'utf8');
    var parser = new DOMParser({
      errorHandler: {
        warning: function (w) {
          console.warn(w)
        }, error: handle_error, fatalError: handle_error
      }
    });
    var doc = parser.parseFromString(xml_string);
    var elems = doc.getElementsByTagName("testcase");
    for (var i = 0; i < elems.length; ++i) {
      const tc = elems[i];
      if (!tc.hasChildNodes())
        continue;


      const failures = tc.getElementsByTagName("failure");
      if (failures.length != 1) {
        throw "shit";
      }

      const test_path = tc.getAttribute('classname');
      const test_name = tc.getAttribute('name');
      var output = 'TEST ';
      output = test_path;
      output += test_name;
      output += "FAILED\n ";
      output += failures[0].firstChild.data;
      core.error(output);
    }
}

module.exports = create_annotations_for_results;
