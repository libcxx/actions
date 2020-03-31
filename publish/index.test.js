
const process = require('process');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const {rmRf, rmRfIgnoreError, unlinkIgnoreError} = require('../src/utils');

const {createTestSuiteAnnotations, getTestSuiteAnnotations, createTestSuiteHTMLResults} = require('../src/lit-utils');



test('process successful xunit file', () => {
    const failures = getTestSuiteAnnotations(path.join('.', 'Inputs', 'libcxx_passing_run.xml'));
    expect(failures.length).toBe(0);
})
test('process failed xunit file', () => {
    const failures = getTestSuiteAnnotations(path.join('.', 'Inputs', 'libcxx_failed_run.xml'));
    expect(failures.length).toBe(4);
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
