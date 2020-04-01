
const process = require('process');
const cp = require('child_process');
var path = require('path');
const io = require('@actions/io');
const core = require('@actions/core');
const fs = require('fs');
const os = require('os');
const { checkoutRuntimes, configureRuntimes, buildRuntimes, getActionConfig, createActionConfig, installRuntimes, testRuntime, } = require('../src/setup-action');
const { createTestSuiteAnnotations } = require('../src/lit-utils');
const { mkdirP, run, capture, handleErrors } = require('../src/utils');

jest.setTimeout(100000);

function setup(name, workspace) {
    if (!fs.existsSync(workspace)) {
         mkdirP(workspace);
    }
    process.chdir(workspace);
    process.env['INPUT_NAME'] = name;
    process.env['INPUT_REPOSITORY'] = 'llvm/llvm-project';
    process.env['INPUT_REF'] = 'master';
    process.env['INPUT_PATH'] = 'my-out';
    process.env['INPUT_CC'] = 'clang';
    process.env['INPUT_CXX'] = 'clang++';
    process.env['INPUT_RUNTIMES'] = 'libcxx libcxxabi';
    process.env['INPUT_CXXABI'] = 'default';
    process.env['INPUT_BUILD'] = 'foo';
    process.env['INPUT_OPTIONS'] = '';
    process.env['GITHUB_WORKSPACE'] = workspace;
    process.env['GITHUB_REPOSITORY'] = 'libcxx/actions';
    process.env['GITHUB_EVENT_PATH'] = path.join(workspace, 'payload.json');

}

function tear_down(workspace) {
    if (fs.existsSync(workspace)) {
        io.rmRF(workspace);
    }
}

beforeAll(async () => {
    await setup('test-run', fs.mkdtempSync(path.join(os.tmpdir(), '/', 'libcxx-actions-test')));
})

afterAll(() => {
})


test('full test', async () => {
    await expect(core.getInput('repository')).toBe('llvm/llvm-project');
    const action_paths = await createActionConfig('my-config');
    await expect(action_paths.name).toBe('my-config');
    await expect(getActionConfig()).toStrictEqual(action_paths);
    await expect(checkoutRuntimes(action_paths)).resolves.toMatch(new RegExp('[0-9a-f]{5,40}'));
    await expect(configureRuntimes(action_paths)).resolves.toBe(0);
    await expect(buildRuntimes(action_paths)).resolves.toBe(0);
    await expect(installRuntimes(action_paths)).resolves.toBe(0);

    const test_config = core.getInput('build');
    const options = core.getInput('options');

    let xunit_path = await testRuntime(action_paths, 'libcxxabi', test_config, options);
    await expect(fs.existsSync(xunit_path)).toBe(true);
    await expect(createTestSuiteAnnotations(xunit_path)).resolves();
})
