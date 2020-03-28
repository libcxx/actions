const { exec } = require("@actions/exec");
const  core  = require("@actions/core");
const path = require('path');
const fs = require('fs');
const process = require('process');
const { execSync } = require('child_process');


function runSync(cmd, args, options = {}) {
  console.log(`${cmd}`)
  cmdStr = cmd;
  cmdStr += ' ';
  cmdStr += ' '.join(args);
  options.stdio = [0, 1, 2];
  execSync(cmdStr, options);
  return null;
}

function mkdirP(dir_path) {
   fs.mkdirSync(dir_path, {recursive: true});
}

 function run(cmd, args, options = {}) {
  return runSync(cmd, args, options);
  options.listeners = {
    stdout: (data) => {
      process.stdout.write(data);
    },
    stderr: (data) => {
      process.stderr.write(data);
    }
  };
  //await exec(cmd, args, options).then(() => {});
}



 function capture(cmd, args, options = {}) {
  let myOutput = '';

  options.listeners = {
    stdout: (data) => {
      myOutput += data.toString();
    },
    stderr: (data) => {
      process.stderr.write(data);
    }
  };

  let result  = exec('git', ['rev-parse', 'HEAD'], options).exec().then(() => {
    if (core.isDebug()) {
      console.info(myOutput);
    }
    return myOutput;
  });
  return result;
}

module.exports = {mkdirP, run, capture}
