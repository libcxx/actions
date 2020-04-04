import * as core from "@libcxx/core"
import * as build from "@libcxx/build"
import * as action from "@actions/core"

export interface TestRunRequestI {
  id: string,
  runtimes: string[],
  test_options: string[],
}

export interface TestRunResultI {
  request: TestRunRequestI,
  exitCode: number,
  numTests: number,
  numFailures: number,
  numPassed: number,
  xunitFile: string
}
