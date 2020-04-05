import * as actions from '@actions/core'
import * as path from 'path'
import * as fs from 'fs'
import * as process from 'process'
import * as core from '@libcxx/core'

const all_runtimes = ['libcxx', 'libcxxabi', 'libunwind']

export interface ActionInputsI {
  name: string
  repository: string
  ref: string
  path: string
  runtimes: string[]
  cc: string
  cxx: string
  cxxabi: string
  sanitizer: string
  cmake_args: string[]
  getToken?: () => string
}

export function getActionInputsWithDefaults(): ActionInputsI {
  const result: ActionInputsI = {
    path: core.getInput('path', {
      allowEmpty: false,
      default: process.cwd()
    }),
    name: core.getInput('name', {default: 'debug'}),
    repository: core.getInput('repository', {default: 'llvm/llvm-project'}),
    ref: core.getInput('ref', {default: 'master'}),
    runtimes: core.getInputList('runtimes', {
      allowEmpty: false,
      allowedValues: all_runtimes,
      default: all_runtimes
    }),
    cc: core.getInput('cc', {default: 'clang'}),
    cxx: core.getInput('cxx', {default: 'clang++'}),
    sanitizer: core.getInput('sanitizer', {default: ''}),
    cxxabi: core.getInput('cxxabi', {default: 'default'}),
    cmake_args: core.getInputList('cmake_args', {
      default: ['-DCMAKE_BUILD_TYPE=DEBUG']
    }),
    getToken: () => {
      return core.getInput('token', {required: true})
    }
  }
  return result
}

export class RuntimeConfig implements ActionInputsI {
  name: string
  repository: string
  ref: string
  path: string
  runtimes: string[]
  cc: string
  cxx: string
  cxxabi: string
  sanitizer: string
  cmake_args: string[]
  getToken: () => string

  constructor(i: ActionInputsI) {
    this.name = i.name
    this.repository = i.repository
    this.ref = i.ref
    this.path = path.resolve(i.path)
    this.runtimes = i.runtimes
    this.cc = i.cc
    this.cxx = i.cxx
    this.cxxabi = i.cxxabi
    this.sanitizer = i.sanitizer
    this.cmake_args = i.cmake_args
    this.getToken =
      i.getToken || (getActionInputsWithDefaults().getToken as () => string)
  }

  getRepositoryOwner(): string {
    return this.repository.split('/')[0]
  }
  getRepositoryName(): string {
    return this.repository.split('/')[1]
  }
  getRepositoryURL(): string {
    return `https://github.com/${this.repository}.git`
  }

  getBuildTargets(): string[] {
    return this.runtimes.map(rt => {
      return `projects/${rt}/all`
    })
  }
  getInstallTargets(): string[] {
    return this.runtimes.map(rt => {
      return `projects/${rt}/install`
    })
  }
  getTestTargets(): string[] {
    return this.runtimes.map(rt => {
      return path.join(this.sourcePath(), rt, 'test')
    })
  }

  workspacePath(): string {
    return this.path
  }
  outputPath(): string {
    return path.join(this.workspacePath(), 'output')
  }
  artifactsPath(): string {
    return path.join(this.outputPath(), 'artifacts')
  }
  buildPath(): string {
    return path.join(this.outputPath(), 'build')
  }
  installPath(): string {
    return path.join(this.outputPath(), 'install')
  }
  sourcePath(): string {
    return path.join(this.workspacePath(), this.getRepositoryName())
  }

  getWorkspacePaths(): string[] {
    return [
      this.sourcePath(),
      this.outputPath(),
      this.installPath(),
      this.buildPath(),
      this.artifactsPath()
    ]
  }

  getCMakeArguments(): string[] {
    const args = [
      '-GNinja',
      `-DCMAKE_INSTALL_PREFIX=${this.installPath()}`,
      `-DCMAKE_C_COMPILER=${this.cc}`,
      `-DCMAKE_CXX_COMPILER=${this.cxx}`,
      `-DLLVM_ENABLE_PROJECTS=${this.runtimes.join(';')}`,
      `-DLIBCXX_CXX_ABI=${this.cxxabi}`
    ]
    if (this.cmake_args) {
      for (const arg of this.cmake_args) args.push(arg)
    }
    if (this.sanitizer) args.push(`"-DLLVM_ENABLE_SANITIZER=${this.sanitizer}"`)

    args.push(path.join(this.sourcePath(), 'llvm'))
    return args
  }

  cleanupPaths(): void {
    core.rmRF(this.outputPath())
    core.rmRF(this.sourcePath())
  }

  async createPaths(): Promise<void> {
    const paths = this.getWorkspacePaths()
    for (const p of paths) {
      if (!fs.existsSync(p)) {
        core.mkdirP(p)
      }
    }
  }

  saveConfig(): string {
    const this_base = this as ActionInputsI
    const config = {
      ...this_base
    }
    delete config.getToken
    const output: string = path.join(
      this.workspacePath(),
      RuntimeConfig.configFileName()
    )
    fs.writeFileSync(output, JSON.stringify(config))
    return output
  }

  static configFileName(): string {
    return 'runtime-config.json'
  }

  static loadConfig(file?: string): RuntimeConfig {
    if (!file) {
      file = path.join(process.cwd(), this.configFileName())
    }
    const config_str: Buffer = fs.readFileSync(file)
    const result = JSON.parse(config_str.toString()) as ActionInputsI
    return new RuntimeConfig(result)
  }
}

export class GenericRuntimeAction {
  config: RuntimeConfig

  constructor(inputs: ActionInputsI) {
    this.config = new RuntimeConfig(inputs)
  }

  async checkoutRuntimes(): Promise<string> {
    const config = this.config
    return await actions.group(
      'checkout',
      async (): Promise<string> => {
        const options = {cwd: config.sourcePath()}
        await core.run('git', ['init'], options)
        await core.run(
          'git',
          ['remote', 'add', 'origin', config.getRepositoryURL()],
          options
        )
        await core.run(
          'git',
          ['fetch', '--depth=1', 'origin', config.ref],
          options
        )
        await core.run('git', ['reset', '--hard', 'FETCH_HEAD'], options)
        const sha = await core.capture('git', ['rev-parse', 'HEAD'], options)
        actions.saveState('sha', sha)
        return sha
      }
    )
  }

  async setupRuntimeWorkspace(): Promise<void> {
    return await actions.group(
      'configuration',
      async (): Promise<void> => {
        const config = this.config
        await config.createPaths()
        const config_file = config.saveConfig()
        actions.setOutput('config_file', config_file)
        actions.saveState('config_file', config_file)
      }
    )
  }

  async configureRuntimes(): Promise<number> {
    const config = this.config
    const exitCode = await actions.group('configure', async () => {
      return await core.run('cmake', config.getCMakeArguments(), {
        cwd: config.buildPath()
      })
    })
    return exitCode
  }

  async buildRuntimes(): Promise<number> {
    const config = this.config
    const exitCode = await actions.group('building runtimes', async () => {
      return await core.run('ninja -v', config.getBuildTargets(), {
        cwd: config.buildPath()
      })
    })
    return exitCode
  }

  async installRuntimes(): Promise<number> {
    const config = this.config
    const exitCode = await actions.group('installing runtimes', async () => {
      return await core.run('ninja -v', config.getBuildTargets(), {
        cwd: config.buildPath()
      })
    })
    return exitCode
  }

  static async runAll(): Promise<number> {
    try {
      const config = new GenericRuntimeAction(getActionInputsWithDefaults())
      await config.setupRuntimeWorkspace()
      await config.checkoutRuntimes()
      await config.configureRuntimes()
      await config.buildRuntimes()
      return 0
    } catch (error) {
      console.error(error.message)
      console.error(error.stack)
      console.error(error)
      actions.setFailed(error.message)
      throw error
    }
  }
}

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
