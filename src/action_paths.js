const { Octokit } = require("@octokit/rest");
const { createTokenAuth } = require("@octokit/auth-token");
const { exec } = require("@actions/exec");
const  core  = require("@actions/core");
const assert = require('@assert');
const { execSync } = require('child_process');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const process = require('process');
const io = require('@actions/io');

function handle_error(err) {
  core.error(err);
  core.setFailed(err.message);
}

function getActionPathsForConfigUnchecked(config_name, root_path) {
  return {
    source: path.join(root_path);
    install: path.join(root_path, 'install', config_name);
    build: path.join(root_path, 'build', config_name);
    artifacts: path.join(root_path, 'artifacts', config_name);
  };
}


function checkAllActionPathsUnused(action_paths) {
  action_paths.values().forEach(val => {
    if (path.existsSync(val)) {
      var basename = path.basename(val);
      var path_for = path.basename(path.dirname(val));
      core.setFailed(`${path_for} path for config ${basename} already exists!`);
      process.exit(process.exitCode);
    }
  });
}

function createActionPathsForConfig(config_name, root_path) {
  core.startGroup('create-action-paths');
  const action_paths = getActionPathsForConfigUnchecked(config_name, root_path);
  action_paths.values().forEach(val => {
    if (path.existsSync(val)) {
      var basename = path.basename(val);
      var path_for = path.basename(path.dirname(val));
      core.setFailed(`${path_for} path for config ${basename} already exist!`);
      process.exit(process.exitCode);
    }
    core.info(`Creating directory ${val}`);
    io.mkdirP(val);
  });
  core.endGroup();
  return action_paths;
}

function getActionPathsForConfig(config_name, root_path) {
  const action_paths = getActionPathsForConfigUnchecked(config_name, root_path);
  action_paths.values().forEach(val => {
    if (!path.existsSync(val)) {
      var basename = path.basename(val);
      var path_for = path.basename(path.dirname(val));
      core.setFailed(`${path_for} path for config ${basename} does not already exist!`);
      process.exit(process.exitCode);
    }
  });
  return action_paths;
}

export function getActionPaths(config_name) {
  return getActionPathsForConfig(config_name, core.getInput('GITHUB_WORKSPACE'));
}

export function createActionPaths(config_name) {
  return createActionPathsForConfig(config_name, core.getInput('GITHUB_WORKSPACE'));
}


