const core = require('@actions/core');

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
    userAgent: 'ericwf',
    previews: ['everest-preview'],
    baseUrl: 'https://api.github.com',
    log: {
        debug: core.info,
        info: core.info,
        warn: core.warning,
        error: core.error
      },
      request: {
        agent: undefined,
        fetch: undefined,
        timeout: 0
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
  const {owner, repo} = await splitIntoOwnerAndRepo(action_inputs.repository);
  const json_obj = await validatePayloadString(action_inputs.client_payload);
  return {
    owner: owner,
    repo: repo,
    event_type: action_inputs.event_type,
    client_payload: json_obj,
  }
}

async function runAction(raw_inputs = getRawActionInputs()) {
  try {
    const api_inputs = await getAPIInputsFromActionInputs(raw_inputs);
    const octokit = await createAPI(raw_inputs.token);
    let r = await octokit.repos.createDispatchEvent(api_inputs);
    if (r.status === 204)
      return r;
    await console.log(r);
    return r;
  } catch (error) {
    await console.log(error.stack);
    core.setFailed(error.message);
  }
}




module.exports = { runAction }
