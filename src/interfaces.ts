
export interface ActionInputDescription {
  name: string
  description: string
  default?: string|string[]
  required?: boolean
}

export interface ActionOutputDescription {
  name: string
  description: string
}

type ActionInputTable  = Map<string, ActionInputDescription>
type ActionOutputTable = Map<string, ActionOutputDescription>


export interface ActionDescription {
  name: string
  description: string
  inputs: ActionInputTable
  outputs: ActionOutputTable
}


export enum Outcome {
  Success,
  Failure,
  FatalError,
  Unknown
}

export enum TestOutcome {
  Passed,
  Failed,
  Skipped
}

export interface BuildActionInputs {
  name: string
  projects: string[]
  repository: string
  ref: string
  destination: string
  args: string[]
}

export interface TestRunRequest {
  id: string
  projects: string[]
  options: string[]
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
  outcome: Outcome
  tests: TestResult[]
  numSkipped: number
  numFailures: number
}
