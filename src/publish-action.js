const core = require('@actions/core');
const artifact = require('@actions/artifact');
const path = require('path');
const fs = require('fs');
const io = require('@actions/io');
const assert = require('assert');
const utils = require('./utils');
const xunitViewer = require('xunit-viewer');
const temp = require('temp');

async function withSSHKey(token, then) {
  let tempFile = await utils.createTempFile('id_rsa', token);
  process.env.GIT_SSH_COMMAND = `ssh -i ${tempFile} -o "StrictHostKeyChecking=no"`;
  try {

    let result = await then();
    let R2 = await result;
    return R2;
  } finally {
    await utils.unlinkIgnoreError(tempFile);
  }
}

async function checkoutLibcxxIO(out_path, branch = 'master') {
  let result = await core.group('checkout', async () => {
    const agent = 'publisher'
    const repo_url = `git@github.com:libcxx/libcxx.github.io.git`;
    await utils.mkdirP(out_path);
    const opts = {cwd : out_path};
    await utils.run('git config --local user.name "libcpp actions builder"', [], opts);
    await utils.run('git config --local user.email "eric@efcs.ca"', [], opts);
    let out = utils.capture('git config --list --show-origin', [], opts);
    let l = await utils.run(
        'git', [ 'clone', '--depth=1', '-b', branch, repo_url, out_path ], {env: process.env});

    await utils.run(
        'git config --local user.name "libcpp actions publisher"', [], opts);
    await utils.run(
        'git config --local user.email eric@efcs.ca', [], opts);
    return l;
  });
  return result;
}

async function commitChanges(repo_path, destination_name) {
  const opts = {cwd : repo_path};
  await utils.run('git', [ 'add', '-A', ':/' ], opts);
  await utils.run(
      'git',
      [ 'commit', '-am', `Publish testsuite results for ${destination_name}` ],
      opts);
}

async function commitAndPushChanges(repo_path, destination_name) {
  await commitChanges(repo_path, destination_name);
  let result = await utils.run(`git -C ${repo_path} push`);
  return result;
}

async function publishTestSuiteHTMLResults(results_file, destination, token) {
  repo_path = 'libcxx.github.io';
  let l = await withSSHKey(token, async () => {
    try {
      await core.saveState('libcxx-io', repo_path);
      await checkoutLibcxxIO(repo_path);

      output_path = path.join(repo_path, 'results', destination);

      if (!fs.existsSync(output_path)) {
        await utils.mkdirP(output_path);
      }

      const output_file = path.basename(results_file);
      await io.cp(results_file, path.join(output_path, output_file));

      index = path.join(output_path, 'index.html');
      if (fs.existsSync(index)) {
        await utils.unlink(index);
      }
      await fs.symlinkSync(index, `./${output_file}`);

      await commitAndPushChanges(repo_path, destination);
    } finally {
      await utils.rmRfIgnoreError(repo_path);
    }
  });
  return await l;
}

async function createTestSuiteHTMLResults(title, xml_file_path,
                                          html_output_path) {
  await Promise.all([ await xunitViewer({
    server : false,
    results : xml_file_path,
    title : title,
    output : html_output_path
  }) ]);
  return 0;
}

async function publishArtifacts(artifacts_dir) {
  let p = await core.group("upload-artifacts", async () => {
    const artifactClient = await artifact.create();
    let files = await utils.globDirectoryRecursive(artifacts_dir);
    let l = await artifactClient.uploadArtifact(`test-suite-results`, files,
                                         artifacts_dir);
    return l;
  });
  return p;
}

async function createAndPublishTestSuiteResults(action_paths, config_name,
                                                token) {
  const result_name = await `test-results-${await new Date().toISOString()}.html`.replace(':', '-');
  let html_results = path.join(action_paths.artifacts, result_name);
  await createTestSuiteHTMLResults(`${config_name} Test Suite Results`,
                                   action_paths.artifacts, html_results);
  let promise = await publishArtifacts(action_paths.artifacts);
  await publishTestSuiteHTMLResults(html_results, config_name, token);
}

module.exports = {
  checkoutLibcxxIO,
  withSSHKey,
  commitChanges,
  commitAndPushChanges,
  publishTestSuiteHTMLResults,
  createTestSuiteHTMLResults,
  createAndPublishTestSuiteResults
};
