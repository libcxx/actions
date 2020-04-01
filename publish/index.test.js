
const process = require('process');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const {rmRf, rmRfIgnoreError, unlinkIgnoreError, run, getGitSha, unlink} = require('../src/utils');
const {checkoutLibcxxIO, commitChanges, commitAndPushChanges, createTestSuiteHTMLResults} = require('../src/publish-action')
const xunitViewer = require('xunit-viewer');


test('checkout test', async () => {
    const out_path = path.join('/', 'tmp', 'libcxx-io');
    await rmRfIgnoreError(out_path);
    let l = await checkoutLibcxxIO(out_path, process.env['GITHUB_TOKEN']);
    let sha = await getGitSha(out_path);
    expect(fs.existsSync(out_path)).toBe(true);
    await run('touch', ['test.txt'], {cwd: out_path});
    await commitChanges(out_path, 'foo bar');
    let sha2 = await getGitSha(out_path);
    expect(sha2).not.toBe(sha);
    rmRfIgnoreError(out_path);
})

test('push test', async () => {
    const out_path = path.join('/', 'tmp', 'libcxx-io-2');
    await rmRfIgnoreError(out_path);
    let l = await checkoutLibcxxIO(out_path, process.env['GITHUB_TOKEN'], 'ci-testing-branch');
    let sha = await getGitSha(out_path);
    expect(fs.existsSync(out_path)).toBe(true);
    const test_file = path.join(out_path, 'test.txt');
    if (fs.existsSync(test_file)) {
        await unlink(test_file);
    } else {
        await run('touch', [test_file]);
    }
    await commitAndPushChanges(out_path, 'pushing from test case');
    let sha2 = await getGitSha(out_path);
    expect(sha2).not.toBe(sha);
    rmRfIgnoreError(out_path);
})


test('build html sites', async () => {
    const inputs = path.join('.', 'Inputs', 'multi_testsuite_results');
    const output = path.join('/', 'tmp', 'results.html');
    console.log(output);
    unlinkIgnoreError(output);
    await createTestSuiteHTMLResults("results", inputs, output);
    expect(fs.existsSync(output)).toBe(true);
    fs.unlinkSync(output);

})
