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


async function checkoutRuntimes() {
    var out_path = core.getInput('path');
  const action_paths = await createActionPaths(core.getInput('name'), out_path);
  console.log(action_paths);
  return await checkoutRepoShallow(core.getInput('repository'), core.getInput('ref'), action_paths.source)
    .then(async () => {
      let sha = await getRevisionAtHead(action_paths.source);
      core.setOutput('sha', sha);
      core.setOutput('artifacts', action_paths.artifacts);
      core.setOutput('install', action_paths.install);
      core.setOutput('build', action_paths.build);
      core.setOutput('source', action_paths.source);
      return action_paths;
    });

}

function getRuntimeList() {
  const parts = core.getInput('runtimes').split(' ');
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

async function configureRuntimes(action_paths) {
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
  return run('cmake', args, options);
}

function buildRuntimes(action_paths) {
  core.startGroup('building-runtimes');
  let args = ['-v'];
  args.push(getRuntimeList().map(rt => { return '/'.join('projects', rt, 'all')}));
  const options = {};
  options.cwd = action_paths.build;
  return run('ninja', args, options).finally(() => { core.endGroup(); });
}

module.exports = {checkoutRuntimes, configureRuntimes, buildRuntimes};
