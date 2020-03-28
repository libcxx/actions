const { exec } = require("@actions/exec");
const  core  = require("@actions/core");
const path = require('path');
const fs = require('fs');
const process = require('process');

function mkdirP(dir_path) {
   fs.mkdirSync(dir_path, {recursive: true});
}

async function run(cmd, args, options = {}) {
  options.listeners = {
    stdout: (data) => {
      process.stdout.write(data);
    },
    stderr: (data) => {
      process.stderr.write(data);
    }
  };
  await exec.exec(cmd, args, options);
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

  return exec('git', ['rev-parse', 'HEAD'], options).then(() => {
    if (core.isDebug()) {
      console.info(myOutput);
    }
    return myOutput;
  });
}

module.exports = {mkdirP, run, capture}
