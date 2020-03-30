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
const io = require('@actions/io');
const { mkdirP, run, capture} = require('./utils');

async function checkoutRepoShallow(github_repo, ref, output_path) {
  if (!fs.existsSync(output_path)) {
    throw new Error("Output path does not exist!");
  }

  const options = {};
  options.cwd = output_path;
  core.startGroup('checkout');
  await run('git', ['init'], options);
  await run('git', ['remote', 'add', 'origin', ''.concat('https://github.com/', github_repo)], options);
  await run('git', ['fetch', '--depth=1', 'origin', ref], options);
  await run('git', ['reset', '--hard', 'FETCH_HEAD'], options);
  core.endGroup();
  return 0;
}

function getRevisionAtHead(repo_path) {
  return capture('git', ['rev-parse', 'HEAD'], {cwd: repo_path});
}

module.exports = {checkoutRepoShallow, getRevisionAtHead}


