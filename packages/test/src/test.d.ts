export interface TestRunRequestI {
    id: string;
    runtimes: string[];
    test_options: string[];
}
export interface TestRunResultI {
    request: TestRunRequestI;
    exitCode: number;
    numTests: number;
    numFailures: number;
    numPassed: number;
    xunitFile: string;
}
