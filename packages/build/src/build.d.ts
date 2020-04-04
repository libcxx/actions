export interface ActionInputsI {
    name: string;
    repository: string;
    ref: string;
    path: string;
    runtimes: string[];
    cc: string;
    cxx: string;
    cxxabi: string;
    sanitizer: string;
    cmake_args: string[];
    getToken?: () => string;
}
export declare function getActionInputsWithDefaults(): ActionInputsI;
export declare class RuntimeConfig implements ActionInputsI {
    name: string;
    repository: string;
    ref: string;
    path: string;
    runtimes: string[];
    cc: string;
    cxx: string;
    cxxabi: string;
    sanitizer: string;
    cmake_args: string[];
    getToken: () => string;
    constructor(i: ActionInputsI);
    getRepositoryOwner(): string;
    getRepositoryName(): string;
    getRepositoryURL(): string;
    getBuildTargets(): string[];
    getInstallTargets(): string[];
    getTestTargets(): string[];
    workspacePath(): string;
    outputPath(): string;
    artifactsPath(): string;
    buildPath(): string;
    installPath(): string;
    sourcePath(): string;
    getWorkspacePaths(): string[];
    getCMakeArguments(): string[];
    cleanupPaths(): void;
    createPaths(): Promise<void>;
    saveConfig(): string;
    static configFileName(): string;
    static loadConfig(file?: string): RuntimeConfig;
}
export declare class GenericRuntimeAction {
    config: RuntimeConfig;
    constructor(inputs: ActionInputsI);
    checkoutRuntimes(): Promise<string>;
    setupRuntimeWorkspace(): Promise<void>;
    configureRuntimes(): Promise<number>;
    buildRuntimes(): Promise<number>;
    installRuntimes(): Promise<number>;
    static runAll(): Promise<number>;
}
