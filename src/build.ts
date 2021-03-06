import * as core from '@actions/core'
import * as path from 'path'
import * as fs from 'fs'
import * as process from 'process'
import {strict as assert} from 'assert'
import * as actions from './actions'
import * as util from './util'
import {TestResultReader} from './test'
import {Outcome, TestOutcome, TestResult, TestRunRequest, TestRunResult } from './actions'

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


function getProjectsList(default_projects: string[] = ['libcxx', 'libcxxabi']) : string[] {

  const all_llvm_projects : string[] = ['clang', 'clang-tools-extra', 'compiler-rt', 'debuginfo-tests', 'libc', 'libclc',
  'libcxx', 'libcxxabi', 'libunwind', 'lld', 'lldb', 'mlir', 'openmp',
  'parallel-libs', 'polly', 'pstl']
  const default_llvm_projects : string[] = ['libcxx', 'libcxxabi']

  const allowed_projects : string[] = all_llvm_projects.concat(['all'])

  const projects : string[] = actions.getInputList('projects', {
      allowEmpty: false,
      allowedValues: allowed_projects,
      default: default_projects,
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
    destination: actions.getInput('destination', {
      allowEmpty: false,
      default: process.cwd()
    }),
    name: actions.getInput('name', {default: 'debug'}),
    repository: actions.getInput('repository', {default: 'llvm/llvm-project'}),
    ref: actions.getInput('ref', {default: 'master'}),
    projects: getProjectsList(),
    args: actions.getInputList('args', {
      default: ['-DCMAKE_BUILD_TYPE=DEBUG']
    }),
  }
  return result
}

export function getTestActionInputsWithDefaults(config: LLVMProjectConfig) : TestRunRequest {
  const result : TestRunRequest = {
    id: actions.getInput('id', {required: true}),
    projects: getProjectsList(config.projects),
    options: actions.getInputList('args', {required: false, allowEmpty: true, default: []}),
    xunit_path: ''
  }
  result.xunit_path = path.join(config.artifactsPath(), `testsuite-run-${result.id}.xml`)
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
  getTestsuitePaths(test_run?: TestRunRequest): string[] {
    let projects = this.projects
    if (test_run && test_run.projects.length != 0)
      projects = test_run.projects
    return projects.map(proj => {
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

  async cleanupPaths(): Promise<void> {
    await util.rmRF(this.outputPath())
    await util.rmRF(this.sourcePath())
  }

  async createPaths(): Promise<void> {
    const paths = this.getWorkspacePaths()
    for (const p of paths) {
      if (!fs.existsSync(p)) {
        util.mkdirP(p)
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
    return await core.group(
      'checkout',
      async (): Promise<string> => {
        const options = {cwd: config.sourcePath()}
        await util.run('git', ['init'], options)
        await util.run(
          'git',
          ['remote', 'add', 'origin', config.getRepositoryURL()],
          options
        )
        await util.run(
          'git',
          ['fetch', '--depth=1', 'origin', config.ref],
          options
        )
        await util.run('git', ['reset', '--hard', 'FETCH_HEAD'], options)
        const sha = await util.capture('git', ['rev-parse', 'HEAD'], options)
        core.saveState('sha', sha)
        return sha
      }
    )
  }

  async setupWorkspace(): Promise<void> {
    return await core.group(
      'configuration',
      async (): Promise<void> => {
        const config = this.config
        await config.createPaths()
        const config_file = config.saveConfig()
        core.setOutput('config_file', config_file)
        core.saveState('config_file', config_file)
      }
    )
  }

  async configureProjects(): Promise<number> {
    const config = this.config
    const exitCode = await core.group('configure', async () => {
      return await util.run('cmake', config.getCMakeArguments(), {
        cwd: config.buildPath()
      })
    })
    return exitCode
  }

  async buildProjects(): Promise<number> {
    const config = this.config
    const exitCode = await core.group('building runtimes', async () => {
      return await util.run('ninja -v', config.getBuildTargets(), {
        cwd: config.buildPath()
      })
    })
    return exitCode
  }

  async installProjects(): Promise<number> {
    const config = this.config
    const exitCode = await core.group('installing runtimes', async () => {
      return await util.run('ninja -v', config.getBuildTargets(), {
        cwd: config.buildPath()
      })
    })
    return exitCode
  }

  async testProjects(request : TestRunRequest) : Promise<TestRunResult> {
    const config = this.config
    if (request.projects.length == 0)
      request.projects = config.projects
    let r = await core.group('testing projects', async () => {
        if (fs.existsSync(request.xunit_path)) {
          throw new Error(`Duplicate test suite entry for ${request.xunit_path}`)
        }
        const llvm_lit = path.join(config.buildPath(), 'bin', 'llvm-lit');
        let exitCode = await util.run(llvm_lit, ['--version'], {}); // Breathing test
        if (exitCode != 0) {
          throw new Error("llvm_lit invocation failed")
        }
        let options = [
        '--no-progress-bar', '--show-xfail', '--show-unsupported', '-v', '--xunit-xml-output', request.xunit_path]
        options = options.concat(request.options)
        options = options.concat(config.getTestsuitePaths(request))

        actions.addCppProblemMatcher()
        exitCode = await util.run(llvm_lit, options, {ignoreReturnCode: true})
        const reader  = new TestResultReader(request)
        const results : TestRunResult = reader.readTestRunResults()
        await reader.annotateFailures(results)
        core.setOutput('results', request.xunit_path)
        return results
    });
    return r
  }

  static async runBuild(): Promise<number> {
    try {
      const config = new LLVMAction(getBuildActionInputsWithDefaults())
      await config.setupWorkspace()
      await config.checkoutProjects()
      await config.configureProjects()
      await config.buildProjects()
      core.setOutput('success', 'true')
      return 0
    } catch (error) {
      console.error(error.message)
      console.error(error.stack)
      console.error(error)
      core.setFailed(error.message)
      throw error
    }
  }

  static async runTests(): Promise<number> {
    try {
      const act = new LLVMAction(LLVMProjectConfig.loadConfig())
      const result : TestRunResult = await act.testProjects(getTestActionInputsWithDefaults(act.config))
      core.setOutput('total_tests', `${result.tests.length}`)
      core.setOutput('passing_tests', `${result.tests.length - result.numFailures - result.numSkipped}`)
      core.setOutput('skpped_tests', `${result.numSkipped}`)
      core.setOutput('failing_tests', `${result.numFailures}`)
      core.setOutput('success', 'true')
      if (result.numFailures != 0) {
        core.setFailed(`Test run for ${result.request.id} has ${result.numFailures} failing tests!`)
        return 1
      }
      return 0
    } catch (error) {
      console.error(error.message)
      console.error(error.stack)
      console.error(error)
      core.setFailed(error.message)
      throw error
    }
  }

  static async runCleanup(): Promise<void> {
    try {
      const config = LLVMProjectConfig.loadConfig()
      await config.cleanupPaths()
    } catch (error) {
      console.error(error.message)
      console.error(error.stack)
      console.error(error)
      core.setFailed(error.message)
      throw error
    }
  }
}
