
const process = require('process');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const utils = require('../src/utils');
const publish = require('../src/publish-action')
const xunitViewer = require('xunit-viewer');

jest.setTimeout(100000);


test('checkout test', async () => {
    const out_path = path.join('/', 'tmp', 'libcxx-io');
    await utils.rmRfIgnoreError(out_path);
    let l = await publish.withSSHKey(process.env['GITHUB_TOKEN'], async () => {
        let r = await publish.checkoutLibcxxIO(out_path);
        return r;
    });
    let sha = await utils.getGitSha(out_path);
    expect(fs.existsSync(out_path)).toBe(true);
    await utils.run('touch', ['test.txt'], {cwd: out_path});
    await publish.commitChanges(out_path, 'foo bar');
    let sha2 = await utils.getGitSha(out_path);
    expect(sha2).not.toBe(sha);
    utils.rmRfIgnoreError(out_path);
})

test('push test', async () => {
    const out_path = path.join('/', 'tmp', 'libcxx-io-2');
    await utils.rmRfIgnoreError(out_path);

    let sha = await publish.withSSHKey(process.env['GITHUB_TOKEN'], async () => {
        await publish.checkoutLibcxxIO(out_path,'ci-testing-branch');
        let sha = await utils.getGitSha(out_path);
        await expect(fs.existsSync(out_path)).toBe(true);
        const test_file = path.join(out_path, 'test.txt');
        if (fs.existsSync(test_file)) {
            await utils.unlink(test_file);
        } else {
            await utils.run('touch', [test_file]);
        }
        let r = await publish.commitAndPushChanges(out_path, 'pushing from test case');
        return sha;
    });
    let sha2 = await utils.getGitSha(out_path);
    await expect(sha2).not.toBe(sha);
    await utils.rmRfIgnoreError(out_path);
})


test('build html sites', async () => {
    const inputs = path.join('.', 'Inputs', 'multi_testsuite_results');
    const output = path.join('/', 'tmp', 'results.html');
    console.log(output);
    await utils.unlinkIgnoreError(output);
    await expect(publish.createTestSuiteHTMLResults("results", inputs, output)).resolves.toBe(0);
    await expect(fs.existsSync(output)).toBe(true);
    await fs.unlinkSync(output);
})
