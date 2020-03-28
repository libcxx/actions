const { Octokit } = require("@octokit/rest");
const { createTokenAuth } = require("@octokit/auth-token");
const { exec } = require("@actions/exec");
const  core  = require("@actions/core");
const assert = require('assert');
const { execSync } = require('child_process');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const process = require('process');
const {mkdirP} = require('./utils');

function handle_error(err) {
  core.error(err);
  core.setFailed(err.message);
}

function getActionPathsForConfigUnchecked(config_name, root_path) {
  console.log('root_path = ' + root_path);
  console.log('config_name = ' + config_name);
  const output_path = path.join(root_path, 'output', config_name);
  return {
    source: path.join(root_path, 'llvm-project'),
    install: path.join(output_path, 'install'),
    build: path.join(output_path, 'build'),
    artifacts: path.join(output_path, 'artifacts')
  };
}


async function createActionPathsForConfig(config_name, root_path) {
  core.startGroup('create-action-paths');
  const action_paths = getActionPathsForConfigUnchecked(config_name, root_path);
  await Object.entries(action_paths).forEach(async (entry) => {
    let key = entry[0];
    let val = entry[1];
    if (fs.existsSync(val) && key != 'source') {
      var basename = path.basename(val);
      var path_for = path.basename(path.dirname(val));
      core.setFailed(`${path_for} path for config ${basename} already exist!`);
      process.exit(process.exitCode);
    } else if (!fs.existsSync(val)) {
      core.info(`Creating directory ${val}`);
      await mkdirP(val);
    }
  });
  core.endGroup();
  return action_paths;
}
async  function getActionPathsForConfig(config_name, root_path) {
  const action_paths = getActionPathsForConfigUnchecked(config_name, root_path);
  await action_paths.values().forEach(val => {
    if (!fs.existsSync(val)) {
      var basename = path.basename(val);
      var path_for = path.basename(path.dirname(val));
      core.setFailed(`${path_for} path for config ${basename} does not already exist!`);
      process.exit(process.exitCode);
    }
  });
  return action_paths;
}

function getActionPaths(config_name, root_path = '') {
  if (!root_path)
    root_path = process.env['GITHUB_WORKSPACE'];
  return getActionPathsForConfig(config_name, root_path);
}

function createActionPaths(config_name, root_path = '') {
  if (!root_path)
    root_path = process.env['GITHUB_WORKSPACE'];
  return createActionPathsForConfig(config_name, root_path);
}

module.exports = {getActionPaths, createActionPaths};

