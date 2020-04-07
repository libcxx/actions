import * as mtest from '../src/test'
import * as path from 'path'
import * as fs from 'fs'
import * as util from 'util'

const failedTestOutput = `Command: ['echo', 'This is contrived!', '&&', 'exit', '1']
Exit Code: 1
Standard Error:
--
This is contrived!
--
Test failed unexpectedly!`

const Expected: mtest.TestResult[] = [
  {
    name: 'sample/a/passing_test.pass.cpp',
    suite: 'libc++',
    output: '',
    result: mtest.TestOutcome.Passed
  },
  {
    name: 'sample/a/b/failing_test.pass.cpp',
    suite: 'libc++',
    output: failedTestOutput,
    result: mtest.TestOutcome.Failed
  },
  {
    name: 'sample/a/c/skipped.pass.cpp',
    suite: 'libc++',
    output: 'Skipping because of configuration.',
    result: mtest.TestOutcome.Skipped
  },
  {
    name: 'sample/a/nothing_to_do.pass.cpp',
    suite: 'libc++',
    output: '',
    result: mtest.TestOutcome.Passed
  }
]

test('@libcxx/test: read results', async () => {
  const sample_file = path.join(__dirname, 'Inputs', 'sample_xunit_output.xml')
  const run_request = <mtest.TestRunRequest>{
    id: 'test',
    test_options: [],
    runtimes: [],
    xunit_path: sample_file
  }

  const test_runner = new mtest.TestSuiteRunner(run_request)
  const results: mtest.TestRunResult = test_runner.readTestRunResults()

  expect(results).toBeDefined()
  expect(results.request).toBe(run_request)
  expect(results.outcome).toBe(mtest.TestOutcome.Failed)
  expect(results.numFailures).toBe(1)
  expect(results.numSkipped).toBe(1)
  expect(results.tests.length).toBe(4)
  // expect(results.tests).toEqual(Expected)
  expect(results.tests).toEqual(expect.arrayContaining(Expected))
})
