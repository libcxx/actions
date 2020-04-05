import * as actions from '@actions/core'
import * as core from '@libcxx/core'
import * as build from '@libcxx/build'
import {strict as assert} from 'assert'
import * as path from 'path'
import * as fs from 'fs'

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
  outcome: core.Outcome
  tests: TestResult[]
  numSkipped: number
  numFailures: number
}


function correctTestNames(
  test_case: Element
): {testsuite_name: string; testcase_name: string} {
  const ts = <Element>test_case.parentElement
  const testsuite_name = <string>ts.getAttribute('name')

  const file_name = <string>test_case.getAttribute('name')
  const file_path_and_suite = <string>test_case.getAttribute('classname')
  assert(file_path_and_suite.startsWith(testsuite_name))
  const testcase_name = path.join(
    file_path_and_suite.substring(testsuite_name.length),
    file_name
  )

  return {testsuite_name, testcase_name}
}

class RuntimesTester {
  private request: TestRunRequest

  constructor(request: TestRunRequest) {
    this.request = request
  }

  private actOnDocument(doc : XMLDocument) : TestRunResult {
    let result = <TestRunResult>{request: this.request, outcome: core.Outcome.Success};
    
    let suites :  HTMLCollectionOf<Element> = doc.getElementsByTagName(
    'testsuite')

    let suite : Element
    for (suite of suites) {
      let numFailed = parseInt(<string>suite.getAttribute('failures'))
      let numSkipped = parseInt(<string>suite.getAttribute('skipped'))
      if (numFailed !== 0) {
        result.outcome = core.Outcome.Failure
      }
      result.numFailures += numFailed
      result.numSkipped += numSkipped
      const cases : HTMLCollectionOf<Element> = suite.getElementsByTagName('testcase')
      let testcase : Element
      for (testcase of cases) {
        result.tests.push(this.actOnTestCase(testcase))
      }
      
    }
    return result
  }

  private actOnTestCase(testcase : Element) : TestResult {
    const {testsuite_name, testcase_name} = correctTestNames(testcase)
    let result = <TestResult>{name: testcase_name, suite: testsuite_name, output: "", result: TestOutcome.Passed};
    if (!testcase.hasChildNodes()) {
      return result
    }
    assert(testcase.childNodes.length === 1);
    let child = <Element>testcase.childNodes[0]
    let kind : string = child.tagName
    switch (kind) {
      case 'skipped':
        result.result = TestOutcome.Skipped
        result.output = <string>child.getAttribute('message')
        return result
      case 'failure':
        result.result = TestOutcome.Failed
        result.output = <string>child.childNodes[0].nodeValue;
        return result
      default:
        throw new Error(`Unexpected child node ${child.tagName}`)
    }
  }


  async readTestRunResults() : Promise<TestRunResult> {
    const xml_string = fs.readFileSync(this.request.xunit_path, 'utf8')
    const parser = new DOMParser()
    let doc = parser.parseFromString(xml_string, "application/xml");
    return this.actOnDocument(doc)
  }
}
