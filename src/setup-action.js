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


function getActionPathsForConfigUnchecked(config_name, root_path) {
  console.log('root_path = ' + root_path);
  console.log('config_name = ' + config_name);
  const output_path = path.join(root_path, 'output', config_name);
  return {
    source: path.join(root_path, 'llvm-project'),
    install: path.join(output_path, 'install'),
    build: path.join(output_path, 'build'),
    artifacts: path.join(output_path, 'artifacts')
  };
}

function createActionPathsForConfig(config_name, root_path) {
  core.startGroup('create-action-paths');
  const action_paths = getActionPathsForConfigUnchecked(config_name, root_path);
  Object.entries(action_paths).forEach((entry) => {
      let key = entry[0];
      let val = entry[1];
      if (fs.existsSync(val) && key != 'source') {
        var basename = path.basename(val);
        var path_for = path.basename(path.dirname(val));
        //core.setFailed(`${path_for} path for config ${basename} already exist!`);
        //throw Error('The patch already exists');
      } else if (!fs.existsSync(val)) {
        core.info(`Creating directory ${val}`);
        mkdirP(val);
      }
  });
  return action_paths;

}

function getActionPathsForConfig(config_name, root_path) {
  const action_paths = getActionPathsForConfigUnchecked(config_name, root_path);
  action_paths.values().forEach(val => {
    if (!fs.existsSync(val)) {
      var basename = path.basename(val);
      var path_for = path.basename(path.dirname(val));
      core.setFailed(`${path_for} path for config ${basename} does not already exist!`);
      process.exit(process.exitCode);
    }
  });
  return action_paths;
}

function getActionPaths(config_name, root_path = '') {
  if (!root_path)
    root_path = process.env['GITHUB_WORKSPACE'];
  return getActionPathsForConfig(config_name, root_path);
}

function createActionPaths(config_name, root_path = '') {
  if (!root_path)
    root_path = process.env['GITHUB_WORKSPACE'];
  return createActionPathsForConfig(config_name, root_path);
}

const artifactClient = artifact.create();

const rootDirectory = '.'; // Also possible to use __dirname
const artifactOptions = {
  continueOnError: false
};
const artifactName = "my-artifact";


async function checkoutRuntimes() {
  var out_path = core.getInput('path');
  const action_paths = await createActionPaths(core.getInput('name'), out_path);
  console.log(action_paths);
  await checkoutRepoShallow(core.getInput('repository'),
                            core.getInput('ref'), action_paths.source);
  let sha = await getRevisionAtHead(action_paths.source);
  core.setOutput('sha', sha);
  core.setOutput('artifacts', action_paths.artifacts);
  core.setOutput('install', action_paths.install);
  core.setOutput('build', action_paths.build);
  core.setOutput('source', action_paths.source);
  return action_paths;
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
  core.startGroup('configure');
  if (fs.existsSync(action_paths.build)) {
    await io.rmRF(action_paths.build);
    mkdirP(action_paths.build);
  }
  let args = ['-GNinja',
    `-DCMAKE_INSTALL_PREFIX=${action_paths.install}`,
    `-DCMAKE_C_COMPILER=${core.getInput('cc')}`,
    `-DCMAKE_CXX_COMPILER=${core.getInput('cxx')}`,
    `"-DLLVM_ENABLE_PROJECTS=${getRuntimeList().join(';')}"`,
    `-DLIBCXX_CXX_ABI=${core.getInput('cxxabi')}`,
  ];
  const extra_cmake_args = core.getInput('cmake_args');
  if (extra_cmake_args)
    args.push(extra_cmake_args);

  const sanitizer = core.getInput('sanitizer');
  if (sanitizer)
    args.push(`"-DLLVM_ENABLE_SANITIZER=${sanitizer}"`)

  args.push(path.join(action_paths.source, 'llvm'));

  const options = {};
  options.cwd = action_paths.build;
  let exitCode = await run('cmake', args, options);
  core.endGroup();
  return exitCode;
}

async function buildRuntimes(action_paths) {
  core.startGroup('building-runtimes');
  let args = ['-v'];
  await getRuntimeList().map(rt => { return path.join('projects', rt, 'all')}).forEach(rt => { args.push(rt); });
  const options = {};
  options.cwd = action_paths.build;
  let exitCode = await run('ninja', args, options);
  core.endGroup();
  return exitCode;
}

module.exports = {checkoutRuntimes, configureRuntimes, buildRuntimes, getActionPaths, createActionPaths};
