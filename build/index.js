const core = require('@actions/core');
const github = require('@actions/github');
const create_annotations_for_results = require('./xml_annotate');
const xunitViewer = require('xunit-viewer');
const artifact = require('@actions/artifact');
const artifactClient = artifact.create();
const rootDirectory = '.'; // Also possible to use __dirname
const artifactOptions = {
  continueOnError: false
};
const artifactName = "my-artifact";

async fu

// most @actions toolkit packages have async methods
async function run() {
  try {
    const input = core.getInput('xunit_path');
    create_annotations_for_results(input);


    const files = ['output.html'];
    const uploadResponse = await artifactClient.uploadArtifact(artifactName,
        files, rootDirectory, artifactOptions);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
