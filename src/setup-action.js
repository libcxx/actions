const core = require('@actions/core');
const github = require('@actions/github');
const {create_annotations_from_xunit_results} = require('../src/lit_utils');
const {checkoutRepoShallow, getRevisionAtHead} = require('../src/git_utils');
const {getActionPaths, createActionPaths} = require('../src/action_paths');
const xunitViewer = require('xunit-viewer');
const artifact = require('@actions/artifact');
const path = require('path');
const { mkdirP, run, capture} = require('./utils');

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
  let myOutput = '';
  let myError = '';

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
  args.push(getRuntimeList().map(rt => { return path.join('projects', rt, 'all')}));
  const options = {};
  options.cwd = action_paths.build;
  let exitCode = await run('ninja', args, options);
  core.endGroup();
  return exitCode;
}

module.exports = {checkoutRuntimes, configureRuntimes, buildRuntimes};
