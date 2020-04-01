
const process = require('process');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const {rmRf, rmRfIgnoreError, unlinkIgnoreError, run, getGitSha, unlink} = require('../src/utils');
const {checkoutLibcxxIO, commitChanges, commitAndPushChanges, createTestSuiteHTMLResults} = require('../src/publish-action')
const xunitViewer = require('xunit-viewer');

jest.setTimeout(100000);

test('checkout test', async () => {
    const out_path = path.join('/', 'tmp', 'libcxx-io');
    await rmRfIgnoreError(out_path);
    let l = await checkoutLibcxxIO(out_path);
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
    let l = await checkoutLibcxxIO(out_path,'ci-testing-branch');
    let sha = await getGitSha(out_path);
    await expect(fs.existsSync(out_path)).toBe(true);
    const test_file = path.join(out_path, 'test.txt');
    if (fs.existsSync(test_file)) {
        await unlink(test_file);
    } else {
        await run('touch', [test_file]);
    }
    await commitAndPushChanges(out_path, 'pushing from test case', process.env['GITHUB_TOKEN']);
    let sha2 = await getGitSha(out_path);
    await expect(sha2).not.toBe(sha);
    await rmRfIgnoreError(out_path);
})


test('build html sites', async () => {
    const inputs = path.join('.', 'Inputs', 'multi_testsuite_results');
    const output = path.join('/', 'tmp', 'results.html');
    console.log(output);
    await unlinkIgnoreError(output);
    await expect(createTestSuiteHTMLResults("results", inputs, output)).resolves.toBe(0);
    await expect(fs.existsSync(output)).toBe(true);
    await fs.unlinkSync(output);

})
