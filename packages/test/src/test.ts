import * as actions from '@actions/core'
import {strict as assert} from "assert"
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
}

export interface TestResult {
  name: string,
  suite: string,
  result: TestOutcome,
  output: string,
}

export interface TestRunResult {
  request: TestRunRequest
  outcome: TestOutcome,
  exitCode: number
  tests: TestResult[],
  xunitFile: string
}


function readXMLFile(xml_file : string) {
  const xml_string = fs.readFileSync(xml_file, 'utf8');
  function handle_error(err : any) {
    actions.error(err);
    actions.setFailed(err.message);
  }

  var parser = new DOMParser();
  var doc : XMLDocument = parser.parseFromString(xml_string, "application/xml");
  return doc;
}

function correctTestNames(test_case: HTMLElement) {
  const ts = <HTMLElement> test_case.parentElement;
  assert(ts && ts.nodeName == "testsuite");
  const testsuite_name = <string> ts.getAttribute("name");

  const file_name = <string> test_case.getAttribute('name');
  const file_path_and_suite = <string> test_case.getAttribute('classname');
  assert(file_path_and_suite.startsWith(testsuite_name));
  const testcase_name = path.join(file_path_and_suite.substring(testsuite_name.length), file_name);

  return {testsuite_name, testcase_name};
}

function visit_all_failures(xml_doc: XMLDocument ) {
  let failure_messages = <string[]>[];
  let elems: HTMLCollectionOf<Element> = xml_doc.getElementsByTagName("failure");
  for (let i = 0; i < elems.length; ++i) {
    const failure = elems[i];
    assert(failure.hasChildNodes());
    assert(failure.childNodes.length == 1);
    const failure_text = failure.childNodes[0].nodeValue;

    const tc = <HTMLElement> failure.parentNode;
    const {testsuite_name, testcase_name} = correctTestNames(tc);

    const failure_message =  `TEST '${testsuite_name} :: ${testcase_name} FAILED\n${failure_text}`

    failure_messages.push(failure_message);
  }
  return failure_messages;
}

export async function getTestSuiteAnnotations(xml_file_path: string) : Promise<string[]> {
  const xml_dom = await readXMLFile(xml_file_path);
  return visit_all_failures(xml_dom);
}

export async function createTestSuiteAnnotations(xml_file_path: string) : Promise<number> {
  const failures = await getTestSuiteAnnotations(xml_file_path);
  let count = 0;
  for (let f of failures) {
    count += 1;
    await actions.error(f);
  }
  return count;
}
