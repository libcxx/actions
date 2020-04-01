const core = require('@actions/core');
const path = require('path');
const fs = require('fs');
const io = require('@actions/io');
const assert = require('assert');
const { mkdirP, run, capture } = require('./utils');

const all_runtimes = ['libcxx', 'libcxxabi', 'libunwind'];

function processRuntimeInput(raw_input) {
  const parts = raw_input.split(' ').map(p => { return p.trim(); });
  parts.forEach(runtime => {
    if (runtime != 'libcxx' && runtime != 'libcxxabi' && runtime != 'libunwind')
      throw Error("Invalid runtime name: " + runtime);
  });
  if (parts.length == 0)
    throw Error("non-empty string consists entirely of whitespace");
  return parts;
}

function _getRuntimeList() {
  const raw_input = core.getInput('runtimes');
  if (!raw_input) {
    return all_runtimes;
  }
  return processRuntimeInput(raw_input);
}

async function createActionConfig(config_name) {
  const root_path = process.env['GITHUB_WORKSPACE'];
  assert(fs.existsSync(root_path));
  const output_path = path.join(root_path, 'output', config_name);
  const action_config = {
    name: config_name,
    runtimes: _getRuntimeList(),
    source: path.join(root_path, 'llvm-project'),
    output: output_path,
    install: path.join(output_path, 'install'),
    build: path.join(output_path, 'build'),
    artifacts: path.join(output_path, 'artifacts')
  };
  for (key of ['output', 'source']) {
    const p = action_config[key];
    if (fs.existsSync(p)) {
      await rmRf(p);
    }
  }
  for (key of ['output', 'source', 'build', 'install', 'artifacts']) {
    const p = action_config[key];
    await mkdirP(p);
    core.setOutput(key, p);
  }
  fs.writeFileSync(path.join(root_path, 'config.json'), JSON.stringify(action_config));
  let config = getActionConfig();
  return config;
}


function getActionConfig() {
  root_path = process.env['GITHUB_WORKSPACE'];
  const config_file = path.join(root_path, 'config.json');
  config_str = fs.readFileSync(config_file);
  return JSON.parse(config_str);
}


async function checkoutRuntimes(action_paths) {
  let sha = await core.group('checkout', async () => {
    const repo_url = ''.concat('https://github.com/', core.getInput('repository'));
    const ref = core.getInput('ref');
    const options = { cwd: action_paths.source };
    await run('git', ['init'], options);
    await run('git', ['remote', 'add', 'origin', repo_url], options);
    await run('git', ['fetch', '--depth=1', 'origin', ref], options);
    await run('git', ['reset', '--hard', 'FETCH_HEAD'], options);
    let sha = await capture('git', ['rev-parse', 'HEAD'], options);
    core.setOutput('sha', sha);
    return sha;
  });

  return sha;
}


async function configureRuntimes(action_paths) {
  let exitCode = await core.group('configure', async () => {
    let args = ['-GNinja',
      `-DCMAKE_INSTALL_PREFIX=${action_paths.install}`,
      `-DCMAKE_C_COMPILER=${core.getInput('cc')}`,
      `-DCMAKE_CXX_COMPILER=${core.getInput('cxx')}`,
      `-DLLVM_ENABLE_PROJECTS=${action_paths.runtimes.join(';')}`,
      `-DLIBCXX_CXX_ABI=${core.getInput('cxxabi')}`,
    ];
    const extra_cmake_args = core.getInput('cmake_args');
    if (extra_cmake_args)
      args.push(extra_cmake_args);

    const sanitizer = core.getInput('sanitizer');
    if (sanitizer)
      args.push(`"-DLLVM_ENABLE_SANITIZER=${sanitizer}"`)

    args.push(path.join(action_paths.source, 'llvm'));
    let exitCode = await run('cmake', args, {cwd: action_paths.build});
    return exitCode;
  });
  return exitCode;
}

async function buildRuntimes(action_paths) {
  let exitCode = await core.group('building runtimes', async () => {
    let args = ['-v'];
    action_paths.runtimes.forEach(rt => {
      args.push(path.join('projects', rt, 'all'));
    });
    const result = await run('ninja', args, {cwd: action_paths.build});
    return result;
  });
  return exitCode;
}

async function installRuntimes(action_paths) {
  let exitCode = await core.group('installing runtimes', async () => {
    let args = ['-v'];
    action_paths.runtimes.forEach(rt => {
      args.push(path.join('projects', rt, 'install'));
    });
    const result = await run('ninja', args, {cwd: action_paths.build});
    return result;
  });
  return exitCode;
}

async function testRuntime(action_paths, runtime, name, options) {
  try {
    let result = await core.group(`test-runtime-${runtime}`,async () => {
      if (!name)
        name = 'default';
      const config_name = `test-${runtime}-${name}`;
      const xunit_output = path.join(action_paths.artifacts, `${config_name}.xml`)

      if (fs.existsSync(xunit_output)) {
        core.setFailed(`Duplicate test suite entry for ${config_name}`);
        return xunit_output;
      }
      core.setOutput('results', xunit_output)
      const llvm_lit = path.join(action_paths.build, 'bin', 'llvm-lit');
      let result = await run(llvm_lit, ['--version'], {}); // Breathing test
      assert(result === 0);

      assert(llvm_lit !== undefined);
      const test_path = path.join(action_paths.source, runtime, 'test');
      const options = [
        '--no-progress-bar', '--show-xfail', '--show-unsupported', '-v', '--xunit-xml-output', xunit_output, test_path]
      const user_options = core.getInput('options');
      if (user_options) {
        options.push(user_options);
      }
      try {
        let result = await run(llvm_lit, options, {});
      } catch (error) {
        console.log(error);
      }
      return xunit_output;
    });
    return result;
  } catch (error) {
    core.setFailed(error);
    throw error;
  }
}




module.exports = {checkoutRuntimes, configureRuntimes, buildRuntimes, getActionConfig,
  createActionConfig, installRuntimes, testRuntime, processRuntimeInput};
