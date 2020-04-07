
import {strict as assert} from 'assert'
import * as path from 'path'
import * as fs from 'fs'
import * as xmldom from 'xmldom'
import * as jsutil from 'util'
import * as util from './util'

export enum TestOutcome {
  Passed,
  Failed,
  Skipped
}

export interface TestRunRequest {
  id: string
  runtimes: string[]
  test_options: string[]
  xunit_path: string
}

export interface TestResult {
  name: string
  suite: string
  result: TestOutcome
  output: string
}

export interface TestRunResult {
  request: TestRunRequest
  outcome: util.Outcome
  tests: TestResult[]
  numSkipped: number
  numFailures: number
}

function correctTestNames(
  test_case: Element, testsuite: Element
): {testsuite_name: string; testcase_name: string} {
  const testsuite_name = <string>testsuite.getAttribute('name')

  const file_name = <string>test_case.getAttribute('name')
  const file_path_and_suite = <string>test_case.getAttribute('classname')
  assert(file_path_and_suite.startsWith(testsuite_name))
  const testcase_name = path.join(
    file_path_and_suite.substring(testsuite_name.length + 1),
    file_name
  )

  return {testsuite_name, testcase_name}
}

export class TestSuiteRunner {
  private request: TestRunRequest

  constructor(request: TestRunRequest) {
    this.request = request
  }

  private actOnDocument(doc: XMLDocument): TestRunResult {
    const result: TestRunResult = {
      request: this.request,
      outcome: util.Outcome.Success,
      tests: <TestResult[]>[],
      numFailures: 0,
      numSkipped: 0
    }
    const suites  = doc.getElementsByTagName(
      'testsuite'
    )

    for (let i = 0; i < suites.length; ++i) {
      const suite: Element = suites[i]
      const numFailed = parseInt(<string>suite.getAttribute('failures'))
      const numSkipped = parseInt(<string>suite.getAttribute('skipped'))
      if (numFailed !== 0) {
        result.outcome = util.Outcome.Failure
      }
      result.numFailures += numFailed
      result.numSkipped += numSkipped
      const cases: HTMLCollectionOf<Element> = suite.getElementsByTagName(
        'testcase'
      )


      for (let j = 0; j < cases.length; ++j) {
        const testcase: Element = cases[j]
        result.tests.push(this.actOnTestCase(testcase, suite))
      }
    }
    return result
  }

  private  actOnTestCase(testcase: Element, suite: Element): TestResult {
    const {testsuite_name, testcase_name} = correctTestNames(testcase, suite)
    const result: TestResult = {
      name: testcase_name,
      suite: testsuite_name,
      output: '',
      result: TestOutcome.Passed
    }
    if (!testcase.hasChildNodes() ) {
      return result
    }
    let failures = testcase.getElementsByTagName('failure')
    let skipped = testcase.getElementsByTagName('skipped')
    assert.strict(failures.length == 1 || skipped.length == 1)

    if (failures.length == 1) {
      result.result = TestOutcome.Failed
      let child = <ChildNode>failures[0].firstChild;
      result.output = <string>child.nodeValue;
    } else if (skipped.length == 1) {
      result.result = TestOutcome.Skipped
      result.output = <string>skipped[0].getAttribute('message')
    } else {

      console.log(jsutil.inspect(testcase, false, 3))
       throw new Error(`Unexpected  lack of children node`)
    }
    return result;
    const child = testcase.children[0]
    const kind: string = child.tagName

    switch (kind) {
      case 'skipped':
        result.result = TestOutcome.Skipped
        result.output = <string>child.getAttribute('message')
        return result
      case 'failure':
        result.result = TestOutcome.Failed
        result.output = <string>child.childNodes[0].nodeValue
        return result
      default:

    }
  }

  readTestRunResults(): TestRunResult {
    const xml_string = fs.readFileSync(this.request.xunit_path, 'utf8')
    const parser = new xmldom.DOMParser()
    const doc : XMLDocument = parser.parseFromString(xml_string, 'application/xml')
    return this.actOnDocument(doc)
  }
}
