import * as actions from '@actions/core'
import {Octokit} from '@octokit/rest'
import * as my_actions from '@libcxx/actions'
import {strict as assert} from 'assert'


export interface ActionInputsI {
  repo: string
  owner: string
  event_type: string
  client_payload: any
  token: string
}

export class ActionInputs implements ActionInputsI {
  repo: string
  owner: string
  event_type: string
  client_payload: any
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

    let parsed: any
    try {
      parsed = await JSON.parse(actions.getInput('client_payload'))
    } catch (error) {
      error.message = `Bad JSON input: ${error.message}`
      throw error
    }
    return new ActionInputs({
      owner: repository.substr(0, i),
      repo: repository.substr(i + 1),
      event_type: actions.getInput('event_type'),
      client_payload: parsed,
      token: actions.getInput('token')
    })
  }
}

export async function runAction(
  rawInputs: Promise<ActionInputsI> = ActionInputs.fromEnviroment()
): Promise<any> {
  try {
    const inputs: ActionInputsI = await rawInputs
    const octokit = my_actions.createGithubAPI(inputs.token)
    const r = await octokit.repos.createDispatchEvent({
      repo: inputs.repo,
      owner: inputs.owner,
      event_type: inputs.event_type,
      client_payload: inputs.client_payload
    })
    if (r.status === 204) return r
    console.log(r)
    throw new Error(`Failed to create dispatch event: Got status ${r.status}`)
  } catch (error) {
    console.log(error.stack)
    actions.setFailed(error.message)
    throw error
  }
}
