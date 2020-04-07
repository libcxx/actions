import { ExecOptions } from '@actions/exec/lib/interfaces';
import * as temp from 'temp';
export declare enum Outcome {
    Success = 0,
    Failure = 1,
    FatalError = 2,
    Unknown = 3
}
export declare function mkdirP(dirPath: string): void;
export declare function rmRF(dirPath: string): Promise<void>;
export declare function rmRfIgnoreError(dirPath: string): Promise<void>;
export declare function unlinkIgnoreError(filePath: string): void;
export declare function unlink(filePath: string): void;
export declare function capture(cmd: string, args?: string[], options?: ExecOptions): Promise<string>;
export declare function run(cmd: string, args?: string[], options?: ExecOptions): Promise<number>;
export declare function globDirectory(dir: string): Promise<string[]>;
export declare function globDirectoryRecursive(dir: string): Promise<string[]>;
export interface TempFileOptions {
    prefix?: string;
    data?: string;
}
export declare class TempFile {
    tempFile: typeof temp;
    private toCleanup;
    constructor();
    create(options?: TempFileOptions): Promise<string>;
    cleanup(): void;
}
export declare class ValidationOptions {
    allowedValues?: string[] | null;
    allowEmpty?: boolean;
    default?: string[] | string | null;
    required?: boolean;
}
export declare function getInputList(key: string, options?: ValidationOptions): string[];
export declare function getInput(key: string, options?: ValidationOptions): string;
