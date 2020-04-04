"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const exec = __importStar(require("@actions/exec"));
const glob = __importStar(require("@actions/glob"));
const io = __importStar(require("@actions/io"));
const actions = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const temp = __importStar(require("temp"));
function mkdirP(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}
exports.mkdirP = mkdirP;
async function rmRF(dirPath) {
    await io.rmRF(dirPath);
}
exports.rmRF = rmRF;
async function rmRfIgnoreError(dirPath) {
    try {
        return await rmRF(dirPath);
    }
    catch (error) {
        // continue regardless of error
    }
}
exports.rmRfIgnoreError = rmRfIgnoreError;
function unlinkIgnoreError(filePath) {
    try {
        return fs.unlinkSync(filePath);
    }
    catch (error) {
        // continue regardless of error
    }
}
exports.unlinkIgnoreError = unlinkIgnoreError;
function unlink(filePath) {
    return fs.unlinkSync(filePath);
}
exports.unlink = unlink;
async function capture(cmd, args, options) {
    let myOutput = '';
    options = options || {};
    options.listeners = {
        stdout: async (data) => {
            myOutput += data.toString();
            await process.stdout.write(data);
        },
        stderr: data => {
            process.stderr.write(data);
        }
    };
    let l = await exec.exec(cmd, args, options).then(() => { return myOutput; });
    return l;
}
exports.capture = capture;
async function run(cmd, args, options) {
    let l = await exec.exec(cmd, args, options);
    return l;
}
exports.run = run;
async function globDirectory(dir) {
    const globber = await glob.create(path.join(dir, '*'), {
        followSymbolicLinks: false
    });
    const files = await globber.glob();
    return files;
}
exports.globDirectory = globDirectory;
async function globDirectoryRecursive(dir) {
    const globber = await glob.create(path.join(dir, '**'), {
        followSymbolicLinks: false
    });
    const files = await globber.glob();
    return files;
}
exports.globDirectoryRecursive = globDirectoryRecursive;
class TempFile {
    constructor() {
        this.tempFile = temp.track();
        this.toCleanup = [];
    }
    async create(options) {
        let newOpts = {};
        if (options && options.prefix) {
            newOpts = { prefix: options.prefix };
        }
        const tmp = this.tempFile.openSync(newOpts);
        this.toCleanup.push(tmp.path);
        if (options && options.data != null) {
            fs.writeSync(tmp.fd, options.data);
        }
        fs.closeSync(tmp.fd);
        return tmp.path;
    }
    async cleanup() {
        for (const p of this.toCleanup) {
            await unlinkIgnoreError(p);
        }
        this.toCleanup = [];
    }
}
exports.TempFile = TempFile;
class ValidationOptions {
    constructor() {
        this.allowedValues = null;
        this.allowEmpty = true;
        this.default = null;
        this.required = false;
    }
}
exports.ValidationOptions = ValidationOptions;
function getInputList(key, options) {
    if (!options)
        options = {};
    const raw_input = actions.getInput(key, { required: options.required });
    if (raw_input === null || raw_input === '') {
        if (!options.required && options.default !== null)
            return options.default;
        if (options.required && !options.allowEmpty)
            throw new Error(`Input '${key}' was required but not found`);
        throw new Error(`Input '${key} was not defined and no default was provided`);
    }
    const values = raw_input.split('\n').filter(x => x !== '');
    if (options.allowedValues) {
        for (const v of values) {
            if (!(v in options.allowedValues)) {
                throw new Error(`Value '${v}' is not allowed. [${options.allowedValues.join(', ')}]`);
            }
        }
    }
    if (!options.allowEmpty && values.length === 0) {
        throw new Error(`Empty lists are not allowed for input ${key}`);
    }
    return values;
}
exports.getInputList = getInputList;
function getInput(key, options) {
    if (!options)
        options = {};
    const raw_input = actions.getInput(key, { required: options.required });
    if (raw_input === null || raw_input === '') {
        if (options.required)
            throw new Error(`Input '${key}' was required but not found`);
        if (options.default !== null)
            return options.default;
        throw new Error(`Input '${key} was not defined and no default was provided`);
    }
    const value = raw_input;
    if (options.allowedValues) {
        if (!(value in options.allowedValues)) {
            throw new Error(`Value '${value}' is not allowed. [${options.allowedValues.join(', ')}]`);
        }
    }
    return value;
}
exports.getInput = getInput;
//# sourceMappingURL=core.js.map