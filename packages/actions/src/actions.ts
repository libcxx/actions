import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as gactions from '@actions/core'
import * as actions from '@actions/core'
import {Octokit} from '@octokit/rest'

export interface ActionInputDescription {
  name: string
  description: string
  default?: string|string[]
  required?: boolean
}

export interface ActionOutputDescription {
  name: string
  description: string
}

type ActionInputTable  = Map<string, ActionInputDescription>
type ActionOutputTable = Map<string, ActionOutputDescription>


export interface ActionDescription {
  name: string
  description: string
  inputs: ActionInputTable
  outputs: ActionOutputTable
}


export function createGithubAPI(token: string): Octokit {
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


export function readActionDescription(filename: string) : any {
  let result = yaml.safeLoad(fs.readFileSync(filename, 'utf8'))
  console.log(result)

  return result
}


