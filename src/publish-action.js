const core = require('@actions/core');
const path = require('path');
const fs = require('fs');
const io = require('@actions/io');
const assert = require('assert');
const { mkdirP, run, capture, unlink, rmRfIgnoreError} = require('./utils');
const xunitViewer = require('xunit-viewer');


async function createSSHAgent(token) {
  core.setSecret(token);
  await run('ssh-agent -t 5m')
  await fs.writeFileSync('/tmp/id_rsa', token, {mode: 0o600});
  await run('ssh-add /tmp/id_rsa', [], { })
  await unlink('/tmp/id_rsa');
}

async function checkoutLibcxxIO(out_path, token, branch = 'master') {
  let result = await core.group('checkout', async () => {
    await createSSHAgent(token);
    const agent = 'publisher'
    const repo_url = `git@github.com:libcxx/libcxx.github.io.git`;
    let l = await run('git', ['clone', '--depth=1', '-b', branch, repo_url, out_path]);
    const opts = {cwd: out_path};
    await run('git', ['config', '--local', 'user.name', `libc++ Actions ${agent}`], opts);
    await run('git', ['config', '--local', 'user.email', 'agent@efcs.ca'], opts);
    return l;
  });
  return result;
}


async function checkoutLibcxxIOToken(out_path, token, branch = 'master') {
  let result = await core.group('checkout', async () => {
    const agent = 'publisher';
    const repo_url = `https://${agent}:${token}@github.com/libcxx/libcxx.github.io.git`;
    let l = await run('git', ['clone', '--depth=1', '-b', branch, repo_url, out_path]);
    const opts = {cwd: out_path};
    await run('git', ['config', '--local', 'user.name', `"libc++ Actions ${agent}"`], opts);
    await run('git', ['config', '--local', 'user.email', '"agent@efcs.ca"'], opts);
    return l;
  });
  return result;
}

async function commitChanges(repo_path, destination_name) {
  const opts = {cwd: repo_path};
  await run('git', ['add', '-A', ':/'], opts);
  await run('git', ['commit', '-am', `Publish testsuite results for ${destination_name}`], opts);
}

async function commitAndPushChanges(repo_path, destination_name) {
  await commitChanges(repo_path, destination_name);
  let result = await run('git', ['push'], {cwd: repo_path});
  return result;
}

async function publishTestSuiteHTMLResults(results_file, destination, token) {
  repo_path = 'libcxx.github.io';
  try {
    core.saveState('libcxx-io', repo_path);
    await checkoutLibcxxIOToken(repo_path, token);

    const timestamp = new Date().toISOString();
    output_path = path.join(repo_path, 'results', destination);

    if (!fs.existsSync(output_path)) {
      await mkdirP(output_path);
    }

    const output_file = `results-${timestamp}.html`;
    await io.cp(results_file, path.join(output_path, output_file));

    index = path.join(output_path, 'index.html');
    if (fs.existsSync(index)) {
      await unlink(index);
    }
    await fs.symlinkSync(index, `./${output_file}`);

    await commitAndPushChanges(repo_path, destination);
  } finally {
    rmRfIgnoreError(repo_path);
  }
}

async function createTestSuiteHTMLResults(title, xml_file_path, html_output_path) {
  await Promise.all([xunitViewer({
      server: false,
      results: xml_file_path,
      title: title,
      output: html_output_path
    })]
    );
  return 0;
}

async function createAndPublishTestSuiteResults(action_paths, config_name, token) {
  let html_results = path.join(action_paths.artifacts, 'result.html');
  await createTestSuiteHTMLResults(`${config_name} Test Suite Results`,
    action_paths.artifacts, html_results);
  await publishTestSuiteHTMLResults(html_results, config_name, token);
}

module.exports = {checkoutLibcxxIO, commitChanges, commitAndPushChanges, publishTestSuiteHTMLResults, createTestSuiteHTMLResults, createAndPublishTestSuiteResults};
