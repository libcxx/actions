const exec = require('@actions/exec');
const core = require("@actions/core");
const glob = require('@actions/glob');
const io = require('@actions/io');

const path = require('path');
const fs = require('fs');
const process = require('process');
const child_process = require('child_process');
const rimraf = require('rimraf');
const temp = require("temp");

async function mkdirP(dir_path) {
  await fs.mkdirSync(dir_path, {recursive : true});
}

function handleErrors(err) { core.setFailed(err.message); }

async function run(cmd, args, options = {}) {
  options.env = process.env;
  let l = await exec.exec(cmd, args, options);
  return l;
}

async function rmRf(dir_path) {
  let l = await rimraf.sync(dir_path, {}, (err) => {
    if (err)
      core.setFailed(err);
  });
  return l;
}

async function rmRfIgnoreError(dir_path) {
  await rimraf.sync(dir_path, {}, (err) => {});
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
    stdout : (data) => { myOutput += data.toString(); },
    stderr : (data) => { process.stderr.write(data); }
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
  let l = await capture('git', [ 'rev-parse', 'HEAD' ], {cwd : repo_path});
  return l;
}

function processError(commands, err) {
  const command = `Command [${commands.join(' ')}]`;
  let exit_reason = null;
  if (err.status != null) {
    exit_reason = `Exited with code ${err.status}...`;
  } else {
    exit_reason = `Killed with signal ${err.signal}...`;
  }

  err.message = `${command}\n${exit_reason}\n${err.message}`;
  return err;
}

async function createTempFile(prefix, data = '') {
  var tempFile = await temp.openSync({prefix});
  if (data != null) {
    await fs.writeSync(tempFile.fd, data);

  }
  await fs.closeSync(tempFile.fd);
  return tempFile.path;
}

async function bash(commands, options = {}) {
  const script = await createTempFile(commands);
  const bash_path = await io.which(
      'bash',
  );
  const internal_options = {
    stdio : [ 'ignore', 'inherit', 'inherit' ],
    shell : bash_path
  };
  const new_options = {
    ...options,
    ...internal_options,
  };

  try {
    let stdout = await child_process.execFileSync(script, new_options);
  } catch (error) {
    throw processError(error, commands);
  } finally {
    await unlinkIgnoreError(script);
  }
}

module.exports = {
  createTempFile,
  mkdirP,
  run,
  getGitSha,
  capture,
  unlink,
  handleErrors,
  rmRf,
  rmRfIgnoreError,
  unlinkIgnoreError,
  globDirectory,
  globDirectoryRecursive
}
