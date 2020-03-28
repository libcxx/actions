const { Octokit } = require("@octokit/rest");
const { createTokenAuth } = require("@octokit/auth-token");
const { execSync } = require('child_process');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const process = require('process');

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

function run_command(cmd) {
  var p;
  console.log(`${cmd}`)
  execSync(cmd, (error, stdout, stderr) => {
    console.log(`${stdout}`);
    console.error(`${stderr}`);
    if (error) {
      process.exit(error.code);
    }
  });
  return null;
}

function run_command_async(cmd) {
  p = spawn(cmd, { shell : true});

  p.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  p.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  p.on('error', (code) => {
    process.exit(code);
  });

  return p
}


function getAPI({ userAgent, accessToken }) {
  const github = new Octokit({
    timeout: 5000,
    baseUrl: 'https://api.github.com',
    headers: {
      accept: 'application/json',
    },
    requestMedia: 'application/json',
    auth: accessToken,
    userAgent: userAgent,
    log: {
      debug: () => {},
      info: console.log,
      warn: console.warn,
      error: console.error
    },
  });

  return github;
}

async function run() {
  try {
    const github = getAPI({
      userAgent: "EricWF",
      accessToken: process.env.MY_GITHUB_TOKEN
    });
    const repo = "libcxx-builders";
    const owner = "efcs";

    const res =  await github.paginate(
        github.actions.listRepoWorkflowRuns.endpoint.merge(
            {owner, repo})).then(data => {
      return data;
    });
    console.log(res);
  } catch (error) {
    console.log(error.message);
  }

}

run()
