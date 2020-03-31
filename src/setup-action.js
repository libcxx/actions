const core = require('@actions/core');
const github = require('@actions/github');
const {create_annotations_from_xunit_results} = require('../src/lit_utils');
const {checkoutRepoShallow, getRevisionAtHead} = require('../src/git_utils');
const xunitViewer = require('xunit-viewer');
const artifact = require('@actions/artifact');
const path = require('path');
const fs = require('fs');
const io = require('@actions/io');
const { mkdirP, run, capture } = require('./utils');


function getActionPaths(config_name, root_path = '') {
  if (!root_path)
    root_path = process.env['GITHUB_WORKSPACE'];
  const output_path = path.join(root_path, 'output', config_name);
  return {
    source: path.join(root_path, 'llvm-project'),
    output: output_path,
    install: path.join(output_path, 'install'),
    build: path.join(output_path, 'build'),
    artifacts: path.join(output_path, 'artifacts')
  };
}

async function createActionPaths(config_name, root_path = '') {
  let action_paths = await core.group('setup paths', async() => {
    const action_paths = getActionPaths(config_name, root_path);
    if (fs.existsSync(action_paths.source)) {
      await io.rmRF(action_paths.source);
    }
    if (fs.existsSync(action_paths.output)) {
      await io.rmRF(action_paths.output);
    }
    Object.entries(action_paths).forEach((entry) => {
      let key = entry[0];
      let val = entry[1];
      if (fs.existsSync(val) && key != 'source' && key != 'output') {
        var basename = path.basename(val);
        var path_for = path.basename(path.dirname(val));
        //core.setFailed(`${path_for} path for config ${basename} already exist!`);
        //throw Error('The patch already exists');
      } else if (!fs.existsSync(val)) {
        core.info(`Creating directory ${val}`);
        mkdirP(val);
      }
      core.setOutput(key, val);
    });
    return action_paths;
  });
  return action_paths;
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

function getRuntimeList() {
  const parts = core.getInput('runtimes').split(' ').map(p => { return p.trim(); });
  parts.forEach(runtime => {
    if (runtime != 'libcxx' && runtime != 'libcxxabi' && runtime != 'libunwind')
      throw Error("Invalid runtime name: " + runtime);
  });
  return parts;
}

async function configureRuntimes(action_paths) {
  let exitCode = await core.group('configure', async () => {
    let args = ['-GNinja',
      `-DCMAKE_INSTALL_PREFIX=${action_paths.install}`,
      `-DCMAKE_C_COMPILER=${core.getInput('cc')}`,
      `-DCMAKE_CXX_COMPILER=${core.getInput('cxx')}`,
      `-DLLVM_ENABLE_PROJECTS=${getRuntimeList().join(';')}`,
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
    getRuntimeList().forEach(rt => {
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
    getRuntimeList().forEach(rt => {
      args.push(path.join('projects', rt, 'install'));
    });
    const result = await run('ninja', args, {cwd: action_paths.build});
    return result;
  });
  return exitCode;
}

async function testRuntime(action_paths, runtime, name, options) {
  let result = await core.group(`test-runtime-${runtime}`,async () => {
    if (!name)
      name = 'default';
    const config_name = `test-${runtime}-${name}`;
    const xunit_output = path.join(action_paths.artifacts, `${config_name}.xml`)

    if (fs.existsSync(xunit_output)) {
      return core.setFailed(`Duplicate test suite entry for ${config_name}`);
    }
    core.setOutput('results', xunit_output)
    const llvm_lit = path.join(action_paths.build, 'bin', 'llvm-lit');
    const test_path = path.join(action_paths.source, runtime, 'test');
    const options = [
      '--no-progress-bar', '--show-xfail', '--show-unsupported', '-v', '--xunit-output', xunit_output, test_path]
    const user_options = core.getInput('options');
    if (user_options) {
      options.push(user_options);
    }
    let result = await run(llvm_lit, options);
    return xunit_output;
  });
  return result;
}

module.exports = {checkoutRuntimes, configureRuntimes, buildRuntimes, getActionPaths, createActionPaths, installRuntimes, testRuntime};
