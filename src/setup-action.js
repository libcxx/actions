const core = require('@actions/core');
const github = require('@actions/github');
const {create_annotations_from_xunit_results} = require('../src/lit_utils');
const {checkoutRepoShallow, getRevisionAtHead} = require('../src/git_utils');
const {getActionPaths, createActionPaths} = require('../src/action_paths');
const xunitViewer = require('xunit-viewer');
const artifact = require('@actions/artifact');
const artifactClient = artifact.create();

const rootDirectory = '.'; // Also possible to use __dirname
const artifactOptions = {
  continueOnError: false
};
const artifactName = "my-artifact";


function checkoutRuntimes() {
  try {
    var out_path = core.getInput('path') || github.context.workspace;
    var action_paths = createActionPaths(core.getInput('name'), out_path);
    checkoutRepoShallow(core.getInput('repository'), core.getInput('ref'), action_paths.source);
    core.setOutput('sha', getRevisionAtHead(action_paths.source));
    core.setOutput('artifacts', action_paths.artifacts);
    core.setOutput('install', action_paths.install);
    core.setOutput('build', action_paths.build);
    core.setOutput('source', action_paths.source);
    return action_paths;
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getRuntimeList() {
  const parts = core.getInput('runtimes').split(',');
  parts.forEach(runtime => {
    if (runtime != 'libcxx' && runtime != 'libcxxrt' && runtime != 'libunwind')
      throw Error("Invalid runtime name: " + runtime);
  });
  return parts;
}

function getNeededRuntimeTargets() {
  return getRuntimeList().map(rt => `projects/${rt}/all`);
}

function getLLVMProjectsCMakeOption() {
  const joined_rt = ';'.join(getRuntimeList());
  return `"-DLLVM_ENABLE_PROJECTS=${joined_rt}"`
}

function configureRuntimes(action_paths) {
  let myOutput = '';
  let myError = '';


  let args = ['-GNinja',
    `-DCMAKE_INSTALL_PREFIX=${action_paths.install}`
    `-DCMAKE_C_COMPILER=${core.getInput('cc')}`,
    `-DCMAKE_CXX_COMPILER=${core.getInput('cxx')}`,
    `"-DLLVM_ENABLE_RUNTIMES=${';'.join(getRuntimeList())}"`,
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
  exec('cmake', args, options);
}

function buildRuntimes(action_paths) {
  core.startGroup('building-runtimes');

  let args = ['-v'];
  args.push(getRuntimeList().map(rt => { return '/'.join('projects', rt, 'all')}));
  const options = {};
  options.cwd = action_paths.build;
  exec('ninja', args, options)
  core.endGroup();
}

module.exports = {checkoutRuntimes, configureRuntimes, buildRuntimes};
