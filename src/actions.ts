import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as gactions from '@actions/core'
import * as actions from '@actions/core'
import {Octokit} from '@octokit/rest'

export * from './interfaces'


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




export class ValidationOptions {
  allowedValues?: string[] | null = null
  allowEmpty?: boolean = true
  default?: string[] | string | null = null
  required?: boolean = false
}

export function getInputList(
  key: string,
  options?: ValidationOptions
): string[] {
  if (!options) options = {}
  const raw_input = actions.getInput(key, {required: options.required}).trim()
  if (raw_input === null || raw_input === '') {
    if ((!options.required || !options.allowEmpty) && options.default !== null)
      return <string[]>options.default
    if (options.required && !options.allowEmpty)
      throw new Error(`Input '${key}' was required but not found`)
    throw new Error(`Input '${key} was not defined and no default was provided`)
  }
  const values: string[] = raw_input.split('\n').filter(x => x !== '')
  if (options.allowedValues) {
    for (const v of values) {
      if (!(v in options.allowedValues)) {
        throw new Error(
          `Value '${v}' is not allowed. [${options.allowedValues.join(', ')}]`
        )
      }
    }
  }
  if (!options.allowEmpty && values.length == 0) {
    throw new Error(`Empty lists are not allowed for input ${key}`)
  }
  return values
}

export function getInput(key: string, options?: ValidationOptions): string {
  if (!options) options = {}
  const raw_input = actions.getInput(key, {required: options.required})
  if (raw_input === null || raw_input === '') {
    if (options.required)
      throw new Error(`Input '${key}' was required but not found`)
    if (options.default !== null) return <string>options.default
    throw new Error(`Input '${key} was not defined and no default was provided`)
  }
  const value: string = raw_input
  if (options.allowedValues) {
    if (!(value in options.allowedValues)) {
      throw new Error(
        `Value '${value}' is not allowed. [${options.allowedValues.join(', ')}]`
      )
    }
  }
  return value
}


