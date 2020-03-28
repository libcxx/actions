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

export function checkoutRepoShallow(github_repo, ref, output_path) {
  if (path.existSync(output_path)) {
    raise
  }
  exec.exec()
}
