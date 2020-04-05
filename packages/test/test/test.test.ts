'use strict'
import * as test from '../../test'
import * as path from 'path'
import * as core from '@libcxx/core'

const inputs_dir = path.join(__dirname, 'Inputs')

const failedTestOutput : string = `
Command: ['echo', 'This is contrived!', '&&', 'exit', '1']
Exit Code: 1
Standard Error:
--
This is contrived!
--
Test failed unexpectedly!
`.trim()

const Expected : test.TestResult[] = [
  <test.TestResult>{ name: 'sample/a/passing_test.pass.cpp', suite: 'libc++', output: '', result: test.TestOutcome.Passed},
  <test.TestResult>{ name: 'sample/a/b/failing_test.pass.cpp', suite: 'libc++', output: failedTestOutput, result: test.TestOutcome.Failed},
  <test.TestResult>{ name: 'sample/a/c/skipped.pass.cpp', suite: 'libc++', output: 'Skipping because of configuration.', result: test.TestOutcome.Skipped},
  <test.TestResult>{ name: 'sample/a/nothing_to_do.pass.cpp', suite: 'libc++', output: '', result: test.TestOutcome.Passed},
]

describe('@libcxx/test: read results', () => {
  const sample_file = path.join(__dirname, 'Inputs', 'sample_xunit_output.xml')
  const run_request = <test.TestRunRequest>{id: 'test', test_options: [], runtimes: [], xunit_path: sample_file}
  const test_runner = new test.TestSuiteRunner(run_request)
  let results : test.TestRunResult = test_runner.readTestRunResults()

  expect(results).toBeDefined()
  expect(results.request).toBe(run_request)
  expect(results.outcome).toBe(test.TestOutcome.Failed)
  expect(results.numFailures).toBe(1)
  expect(results.numSkipped).toBe(1)
  expect(results.tests.length).toBe(4)
  expect(results.tests).toContainEqual(Expected)

})
