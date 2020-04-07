export interface LLVMProjectInfo {
    readonly name: string;
    readonly output_path: string;
    readonly build_targets: string[];
    readonly install_targets: string[];
}
export interface BuildActionInputs {
    name: string;
    projects: string[];
    repository: string;
    ref: string;
    destination: string;
    args: string[];
}
export declare function getBuildActionInputsWithDefaults(): BuildActionInputs;
export declare class LLVMProjectConfig implements BuildActionInputs {
    name: string;
    repository: string;
    ref: string;
    destination: string;
    projects: string[];
    args: string[];
    constructor(i: BuildActionInputs);
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
    static loadConfig(file?: string): LLVMProjectConfig;
}
export declare class LLVMAction {
    config: LLVMProjectConfig;
    constructor(inputs: BuildActionInputs);
    checkoutProjects(): Promise<string>;
    setupWorkspace(): Promise<void>;
    configureProjects(): Promise<number>;
    buildProjects(): Promise<number>;
    installProjects(): Promise<number>;
    static runAll(): Promise<number>;
}
