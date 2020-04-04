import * as actions from '@actions/core'
import {Octokit} from '@octokit/rest'
import {strict as assert} from 'assert'

function createAPI(token: string): Octokit {
  const octokit = new Octokit({
    auth: token,
    userAgent: 'ericwf',
    previews: ['everest-preview'],
    baseUrl: 'https://api.github.com',
    log: {
      debug: actions.info,
      info: actions.info,
      warn: actions.warning,
      error: actions.error
    },
    request: {
      agent: undefined,
      fetch: undefined,
      timeout: 0
    }
  })
  return octokit
}

export interface ActionInputsI {
  repo: string
  owner: string
  event_type: string
  client_payload: string
  token: string
}

export class ActionInputs implements ActionInputsI {
  repo: string
  owner: string
  event_type: string
  client_payload: string
  token: string

  constructor(i: ActionInputsI) {
    this.repo = i.repo
    this.owner = i.owner
    this.event_type = i.event_type
    this.client_payload = i.client_payload
    this.token = i.token
  }

  static async fromEnviroment(): Promise<ActionInputsI> {
    const repository: string = actions.getInput('repository')
    const i = repository.indexOf('/')
    assert(i !== -1)

    try {
      await JSON.parse(actions.getInput('client_payload'))
    } catch (error) {
      error.message = `Bad JSON input: ${error.message}`
      throw error
    }
    return new ActionInputs({
      owner: repository.substr(0, i),
      repo: repository.substr(i + 1),
      event_type: actions.getInput('event_type'),
      client_payload: actions.getInput('client_payload'),
      token: actions.getInput('token')
    })
  }
}

export async function runAction(
  rawInputs: Promise<ActionInputsI> = ActionInputs.fromEnviroment()
): Promise<any> {
  try {
    const inputs: ActionInputsI = await rawInputs
    const octokit = createAPI(inputs.token)
    const r = await octokit.repos.createDispatchEvent(inputs)
    if (r.status === 204) return r
    console.log(r)
    return r
  } catch (error) {
    console.log(error.stack)
    actions.setFailed(error.message)
  }
}
