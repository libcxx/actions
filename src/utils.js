const exec = require('@actions/exec');
const  core  = require("@actions/core");
const path = require('path');
const fs = require('fs');
const process = require('process');
const { execSync } = require('child_process');


function mkdirP(dir_path) {
   fs.mkdirSync(dir_path, {recursive: true});
}

function handleErrors(err) {
  core.setFailed(err.message);
}

function run(cmd, args,  options = new exec.ExecOptions) {
  return exec.exec(cmd, args, options);
}


async function capture(cmd, args, options = {}) {
  let myOutput = '';
  options.listeners = {
    stdout: (data) => {
      myOutput += data.toString();
    },
    stderr: (data) => {
      process.stderr.write(data);
    }
  };
  await exec.exec(cmd, args, options);
  return myOutput;
}

module.exports = {mkdirP, run, capture, handleErrors}
