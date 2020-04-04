"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const actions = __importStar(require("@actions/core"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const process = __importStar(require("process"));
const core = __importStar(require("@libcxx/core"));
const all_runtimes = ['libcxx', 'libcxxabi', 'libunwind'];
function getActionInputsWithDefaults() {
    const result = {
        path: core.getInput('path', {
            allowEmpty: false,
            default: process.cwd()
        }),
        name: core.getInput('name', { default: 'debug' }),
        repository: core.getInput('repository', { default: 'llvm/llvm-project' }),
        ref: core.getInput('ref', { default: 'master' }),
        runtimes: core.getInputList('runtimes', {
            allowEmpty: false,
            allowedValues: all_runtimes,
            default: all_runtimes
        }),
        cc: core.getInput('cc', { default: 'clang' }),
        cxx: core.getInput('cxx', { default: 'clang++' }),
        sanitizer: core.getInput('sanitizer', { default: '' }),
        cxxabi: core.getInput('cxxabi', { default: 'default' }),
        cmake_args: core.getInputList('cmake_args', {
            default: ['-DCMAKE_BUILD_TYPE=DEBUG']
        }),
        getToken: () => {
            return core.getInput('token', { required: true });
        }
    };
    return result;
}
exports.getActionInputsWithDefaults = getActionInputsWithDefaults;
class RuntimeConfig {
    constructor(i) {
        this.name = i.name;
        this.repository = i.repository;
        this.ref = i.ref;
        this.path = path.resolve(i.path);
        this.runtimes = i.runtimes;
        this.cc = i.cc;
        this.cxx = i.cxx;
        this.cxxabi = i.cxxabi;
        this.sanitizer = i.sanitizer;
        this.cmake_args = i.cmake_args;
        this.getToken =
            i.getToken || getActionInputsWithDefaults().getToken;
    }
    getRepositoryOwner() {
        return this.repository.split('/')[0];
    }
    getRepositoryName() {
        return this.repository.split('/')[1];
    }
    getRepositoryURL() {
        return `https://github.com/${this.repository}.git`;
    }
    getBuildTargets() {
        return this.runtimes.map(rt => {
            return `projects/${rt}/all`;
        });
    }
    getInstallTargets() {
        return this.runtimes.map(rt => {
            return `projects/${rt}/install`;
        });
    }
    getTestTargets() {
        return this.runtimes.map(rt => {
            return path.join(this.sourcePath(), rt, 'test');
        });
    }
    workspacePath() {
        return this.path;
    }
    outputPath() {
        return path.join(this.workspacePath(), 'output');
    }
    artifactsPath() {
        return path.join(this.outputPath(), 'artifacts');
    }
    buildPath() {
        return path.join(this.outputPath(), 'build');
    }
    installPath() {
        return path.join(this.outputPath(), 'install');
    }
    sourcePath() {
        return path.join(this.workspacePath(), this.getRepositoryName());
    }
    getWorkspacePaths() {
        return [
            this.sourcePath(),
            this.outputPath(),
            this.installPath(),
            this.buildPath(),
            this.artifactsPath()
        ];
    }
    getCMakeArguments() {
        const args = [
            '-GNinja',
            `-DCMAKE_INSTALL_PREFIX=${this.installPath()}`,
            `-DCMAKE_C_COMPILER=${this.cc}`,
            `-DCMAKE_CXX_COMPILER=${this.cxx}`,
            `-DLLVM_ENABLE_PROJECTS=${this.runtimes.join(';')}`,
            `-DLIBCXX_CXX_ABI=${this.cxxabi}`
        ];
        if (this.cmake_args) {
            for (const arg of this.cmake_args)
                args.push(arg);
        }
        if (this.sanitizer)
            args.push(`"-DLLVM_ENABLE_SANITIZER=${this.sanitizer}"`);
        args.push(path.join(this.sourcePath(), 'llvm'));
        return args;
    }
    cleanupPaths() {
        core.rmRF(this.outputPath());
        core.rmRF(this.sourcePath());
    }
    async createPaths() {
        const paths = this.getWorkspacePaths();
        for (const p of paths) {
            if (!fs.existsSync(p)) {
                core.mkdirP(p);
            }
        }
    }
    saveConfig() {
        const this_base = this;
        const config = {
            ...this_base
        };
        delete config.getToken;
        const output = path.join(this.workspacePath(), RuntimeConfig.configFileName());
        fs.writeFileSync(output, JSON.stringify(config));
        return output;
    }
    static configFileName() {
        return 'runtime-config.json';
    }
    static loadConfig(file) {
        if (!file) {
            file = path.join(process.cwd(), this.configFileName());
        }
        const config_str = fs.readFileSync(file);
        const result = JSON.parse(config_str.toString());
        return new RuntimeConfig(result);
    }
}
exports.RuntimeConfig = RuntimeConfig;
class GenericRuntimeAction {
    constructor(inputs) {
        this.config = new RuntimeConfig(inputs);
    }
    async checkoutRuntimes() {
        const config = this.config;
        return await actions.group('checkout', async () => {
            const options = { cwd: config.sourcePath() };
            await core.run('git', ['init'], options);
            await core.run('git', ['remote', 'add', 'origin', config.getRepositoryURL()], options);
            await core.run('git', ['fetch', '--depth=1', 'origin', config.ref], options);
            await core.run('git', ['reset', '--hard', 'FETCH_HEAD'], options);
            const sha = await core.capture('git', ['rev-parse', 'HEAD'], options);
            actions.saveState('sha', sha);
            return sha;
        });
    }
    async setupRuntimeWorkspace() {
        return await actions.group('configuration', async () => {
            const config = this.config;
            await config.createPaths();
            const config_file = await config.saveConfig();
            actions.setOutput('config_file', config_file);
            actions.saveState('config_file', config_file);
        });
    }
    async configureRuntimes() {
        const config = this.config;
        const exitCode = await actions.group('configure', async () => {
            return await core.run('cmake', config.getCMakeArguments(), {
                cwd: config.buildPath()
            });
        });
        return exitCode;
    }
    async buildRuntimes() {
        const config = this.config;
        const exitCode = await actions.group('building runtimes', async () => {
            return await core.run('ninja -v', config.getBuildTargets(), {
                cwd: config.buildPath()
            });
        });
        return exitCode;
    }
    async installRuntimes() {
        const config = this.config;
        const exitCode = await actions.group('installing runtimes', async () => {
            return await core.run('ninja -v', config.getBuildTargets(), {
                cwd: config.buildPath()
            });
        });
        return exitCode;
    }
    static async runAll() {
        try {
            const config = new GenericRuntimeAction(getActionInputsWithDefaults());
            await config.setupRuntimeWorkspace();
            await config.checkoutRuntimes();
            await config.configureRuntimes();
            await config.buildRuntimes();
            return 0;
        }
        catch (error) {
            console.error(error.message);
            console.error(error.stack);
            console.error(error);
            actions.setFailed(error.message);
            throw error;
        }
    }
}
exports.GenericRuntimeAction = GenericRuntimeAction;
/*
async function testRuntime(config : RuntimeConfig, runtime : string, name, options) {
  try {
    let result = await actions.group(`test-runtime-${runtime}`,async () => {
      if (!name)
        name = 'default';
      const config_name = `test-${runtime}-${name}`;
      const xunit_output = path.join(config.artifacts, `${config_name}.xml`)

      if (fs.existsSync(xunit_output)) {
        actions.setFailed(`Duplicate test suite entry for ${config_name}`);
        return xunit_output;
      }
      actions.setOutput('results', xunit_output)
      const llvm_lit = path.join(config.build, 'bin', 'llvm-lit');
      let result = await core.run(llvm_lit, ['--version'], {}); // Breathing test
      assert(result === 0);

      assert(llvm_lit !== undefined);
      const test_path = path.join(config.source, runtime, 'test');
      const options = [
        '--no-progress-bar', '--show-xfail', '--show-unsupported', '-v', '--xunit-xml-output', xunit_output, test_path]
      const user_options = actions.getInput('options');
      if (user_options) {
        options.push(user_options);
      }
      try {
        let result = await core.run(llvm_lit, options, {});
      } catch (error) {
        console.log(error);
      }
      return xunit_output;
    });
    return result;
  } catch (error) {
    actions.setFailed(error);
    throw error;
  }
}
*/
//# sourceMappingURL=build.js.map