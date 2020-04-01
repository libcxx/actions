const core = require('@actions/core');
const octokit = require('@')
const path = require('path');
const fs = require('fs');
const io = require('@actions/io');
const assert = require('assert');
const process = require('process');
const utils = require('./utils');

const { Octokit } = require("@octokit/rest");
const github = require('@actions/github');



function splitIntoOwnerAndRepo(repo_uri) {
  const i = repo_uri.indexOf('/');
  assert(i != -1);
  owner = repo_uri.substr(0, i);
  repo = repo_uri.substr(i + 1);
  return { owner, repo };
}

async function createAPI(token) {
  const octokit = new Octokit({
    auth: token,
    userAgent: 'libc++ github actions',
    previews: ['everest'],
    log: {
      debug: () => {},
      info: core.info,
      warn: core.warning,
      error: core.error,
    }
  });
  return octokit;
}


function getRawActionInputs() {
  return {
    repository: core.getInput('repository'),
    event_type: core.getInput('event_type'),
    client_payload: core.getInput('client_payload'),
    token: core.getInput('token')
  };
}

async function validatePayloadString(str) {
  try {
    let l = await JSON.parse(str);
    return l;
  } catch (error) {
    error.message = 'Bad JSON input: ' + error.message;
    throw error;
  }
}

async function getAPIInputsFromActionInputs(action_inputs) {
  const {O, R} = splitIntoOwnerAndRepo(action_inputs.repository);
  return {
    owner: O,
    repo: R,
    event_type: action_inputs.event_type,
    client_payload: validatePayloadString(action_inputs.client_payload),
  }
}

async function runAction(raw_inputs = getRawActionInputs()) {
  const api_inputs = await getAPIInputsFromActionInputs(raw_inputs);
  const octokit = await createAPI(raw_input.token);
  let l = await octokit.repos.dispatchEvent(api_inputs);
}




module.exports = {}
