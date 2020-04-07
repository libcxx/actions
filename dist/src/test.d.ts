import * as util from './util';
export declare enum TestOutcome {
    Passed = 0,
    Failed = 1,
    Skipped = 2
}
export interface TestRunRequest {
    id: string;
    runtimes: string[];
    test_options: string[];
    xunit_path: string;
}
export interface TestResult {
    name: string;
    suite: string;
    result: TestOutcome;
    output: string;
}
export interface TestRunResult {
    request: TestRunRequest;
    outcome: util.Outcome;
    tests: TestResult[];
    numSkipped: number;
    numFailures: number;
}
export declare class TestSuiteRunner {
    private request;
    constructor(request: TestRunRequest);
    private actOnDocument;
    private actOnTestCase;
    readTestRunResults(): TestRunResult;
}
