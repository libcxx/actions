const exec = require('@actions/exec');
const  core  = require("@actions/core");
const glob = require('@actions/glob');
const path = require('path');
const fs = require('fs');
const process = require('process');
const { execSync } = require('child_process');
const rimraf = require('rimraf');


function mkdirP(dir_path) {
   fs.mkdirSync(dir_path, {recursive: true});
}

function handleErrors(err) {
  core.setFailed(err.message);
}

function run(cmd, args,  options = {}) {
  return exec.exec(cmd, args, options);
}

function rmRf(dir_path) {
  rimraf.sync(dir_path, {}, (err) => { if (err) core.setFailed(err); });
}

async function rmRfIgnoreError(dir_path) {
  rimraf.sync(dir_path, {}, (err) => {});
}

async function unlinkIgnoreError(file_path) {
  await fs.unlink(file_path, (err) => {});
}

async function unlink(file_path) {
  await fs.unlink(file_path, (err) => { core.setFailed(err); });
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


async function globDirectory(dir) {
  const globber =
      await glob.create(path.join(dir, '*'), {followSymbolicLinks : false});
  const files = await globber.glob()
  return files;
}

async function globDirectoryRecursive(dir) {
  const globber =
      await glob.create(path.join(dir, '**'), {followSymbolicLinks : false});
  const files = await globber.glob()
  return files;
}

async function getGitSha(repo_path) {
  let l = await capture('git', ['rev-parse', 'HEAD'], {cwd: repo_path});
  return l;
}

module.exports = {mkdirP, run, getGitSha, capture, unlink, handleErrors, rmRf, rmRfIgnoreError, unlinkIgnoreError, globDirectory, globDirectoryRecursive}
