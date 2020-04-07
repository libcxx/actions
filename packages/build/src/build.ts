import * as actions from '@actions/core'
import * as path from 'path'
import * as fs from 'fs'
import * as process from 'process'
import * as core from '@libcxx/core'
import {strict as assert} from 'assert'

export interface LLVMProjectInfo {
  readonly name: string
  readonly output_path: string
  readonly build_targets: string[]
  readonly install_targets: string[]
}


function getLLVMProjectInfo(name : string) : LLVMProjectInfo {
  switch (name) {
    case 'llvm':
      return {
        name: 'llvm',
        output_path: '.',
        build_targets: ['include/llvm/all', 'lib/all'],
        install_targets: ['install-llvm-headers', 'install-llvm-libraries']
      }
    case 'libc':
    case 'libclc':
    case 'libcxx':
    case 'libcxxabi':
    case 'libunwind':
    case 'pstl':
    case 'openmp':
    case 'parallel-libs':
    case 'compiler-rt':
    case 'debuginfo-tests':
      return {
        name: name,
        output_path: `projects/${name}/`,
        build_targets: [`projects/${name}/all`],
        install_targets: [`projects/${name}/install`]
      }
    case 'clang':
    case 'lld':
    case 'lldb':
    case 'polly':
    case 'mlir':
      return {
        name: name,
        output_path:  `tools/${name}/`,
        build_targets: [`tools/${name}/all`],
        install_targets: [`tools/${name}/install`]

      }
    case 'clang-tools-extra':
      return {
        name: name,
        output_path: 'tools/clang/tools/extra',
        build_targets: ['tools/clang/tools/extra/all'],
        install_targets: ['tools/clang/tools/extra/install']
      }
    default:
      throw new Error(`Unknown LLVM project: '${name}'`)
  }
}

const all_llvm_projects = ['clang', 'clang-tools-extra', 'compiler-rt', 'debuginfo-tests', 'libc', 'libclc', 'libcxx', 'libcxxabi', 'libunwind', 'lld', 'lldb', 'mlir', 'openmp', 'parallel-libs', 'polly', 'pstl']
const default_llvm_projects = ['libcxx', 'libcxxabi', 'libunwind']

function getProjectsList() : string[] {
  let allowed_projects = all_llvm_projects
  allowed_projects.push('all')

  const projects : string[] = core.getInputList('projects', {
      allowEmpty: false,
      allowedValues: allowed_projects,
      default: default_llvm_projects,
    })
  if (projects.includes('all')) {
    if (projects.length != 1)
      throw new Error('"all" must appear as the only project')
    return all_llvm_projects
  }

  return projects
}

export interface BuildActionInputs {
  name: string
  projects: string[]
  repository: string
  ref: string
  destination: string
  args: string[]
}

export function getBuildActionInputsWithDefaults(): BuildActionInputs {
  const result: BuildActionInputs = {
    destination: core.getInput('destination', {
      allowEmpty: false,
      default: process.cwd()
    }),
    name: core.getInput('name', {default: 'debug'}),
    repository: core.getInput('repository', {default: 'llvm/llvm-project'}),
    ref: core.getInput('ref', {default: 'master'}),
    projects: getProjectsList(),
    args: core.getInputList('args', {
      default: ['-DCMAKE_BUILD_TYPE=DEBUG']
    }),
  }
  return result
}

export class LLVMProjectConfig implements BuildActionInputs {
  name: string
  repository: string
  ref: string
  destination: string
  projects: string[]
  args: string[]

  constructor(i: BuildActionInputs) {
    this.name = i.name
    this.repository = i.repository
    this.ref = i.ref
    this.destination = path.resolve(i.destination)
    this.projects = i.projects
    this.args = i.args
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
    let targets : string[] = []
    for (const p of this.projects) {
      targets = targets.concat(getLLVMProjectInfo(p).build_targets)
    }
    return targets
  }
  getInstallTargets(): string[] {
    let targets : string[] = []
    for (const p of this.projects) {
      targets = targets.concat(getLLVMProjectInfo(p).install_targets)
    }
    return targets
  }
  getTestTargets(): string[] {
    return this.projects.map(proj => {
      return path.join(this.sourcePath(), proj, 'test')
    })
  }

  workspacePath(): string {
    return this.destination
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
      `-DLLVM_ENABLE_PROJECTS=${this.projects.join(';')}`,
    ]
    if (this.args) {
      for (const arg of this.args) args.push(arg)
    }
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
    const this_base = this as BuildActionInputs
    const config = {
      ...this_base
    }
    const output: string = path.join(
      this.workspacePath(),
      LLVMProjectConfig.configFileName()
    )
    fs.writeFileSync(output, JSON.stringify(config))
    return output
  }

  static configFileName(): string {
    return 'runtime-config.json'
  }

  static loadConfig(file?: string): LLVMProjectConfig {
    if (!file) {
      file = path.join(process.cwd(), this.configFileName())
    }
    const config_str: Buffer = fs.readFileSync(file)
    const result = JSON.parse(config_str.toString()) as BuildActionInputs
    return new LLVMProjectConfig(result)
  }
}

export class LLVMAction {
  config: LLVMProjectConfig

  constructor(inputs: BuildActionInputs) {
    this.config = new LLVMProjectConfig(inputs)
  }

  async checkoutProjects(): Promise<string> {
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

  async setupWorkspace(): Promise<void> {
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

  async configureProjects(): Promise<number> {
    const config = this.config
    const exitCode = await actions.group('configure', async () => {
      return await core.run('cmake', config.getCMakeArguments(), {
        cwd: config.buildPath()
      })
    })
    return exitCode
  }

  async buildProjects(): Promise<number> {
    const config = this.config
    const exitCode = await actions.group('building runtimes', async () => {
      return await core.run('ninja -v', config.getBuildTargets(), {
        cwd: config.buildPath()
      })
    })
    return exitCode
  }

  async installProjects(): Promise<number> {
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
      const config = new LLVMAction(getBuildActionInputsWithDefaults())
      await config.setupWorkspace()
      await config.checkoutProjects()
      await config.configureProjects()
      await config.buildProjects()
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
async function test(config : LLVMProjectConfig, runtime : string, name, options) {
  try {
    let result = await actions.group(`test-runtime-${runtime}`,async () => {
      if (!name)
        name = 'default';
      const config_name = `test-${runtime}-${name}`;
      const xunit_output = path.join(config.artifactsPath(), `${config_name}.xml`)

      if (fs.existsSync(xunit_output)) {
        actions.setFailed(`Duplicate test suite entry for ${config_name}`);
        return xunit_output;
      }
      actions.setOutput('results', xunit_output)
      const llvm_lit = path.join(config.buildPath(), 'bin', 'llvm-lit');
      let result = await core.run(llvm_lit, ['--version'], {}); // Breathing test
      assert(result === 0);

      assert(llvm_lit !== undefined);
      const test_path = path.join(config.getSo, runtime, 'test');
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
