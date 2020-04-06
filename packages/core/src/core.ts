import {ExecOptions} from '@actions/exec/lib/interfaces'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as io from '@actions/io'
import * as actions from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as temp from 'temp'

export enum Outcome {
  Success,
  Failure,
  FatalError,
  Unknown
}

export function mkdirP(dirPath: string): void {
  fs.mkdirSync(dirPath, {recursive: true})
}

export async function rmRF(dirPath: string): Promise<void> {
  return await io.rmRF(dirPath)
  //return fs.rmdirSync(dirPath, {recursive: true})
}

export async function rmRfIgnoreError(dirPath: string): Promise<void> {
  try {
    // return  fs.rmdirSync(dirPath, {recursive: true})
    return await io.rmRF(dirPath)
  } catch (error) {
    // continue regardless of error
    throw error
  }
}

export function unlinkIgnoreError(filePath: string): void {
  try {
    return fs.unlinkSync(filePath)
  } catch (error) {
    // continue regardless of error
    throw error
  }
}

export function unlink(filePath: string): void {
  return fs.unlinkSync(filePath)
}

export async function capture(
  cmd: string,
  args?: string[],
  options?: ExecOptions
): Promise<string> {
  let myOutput = ''
  options = options || {}
  options.listeners = {
    stdout: async data => {
      myOutput += data.toString()
      process.stdout.write(data)
    },
    stderr: data => {
      process.stderr.write(data)
    }
  }
  const l = await exec.exec(cmd, args, options).then(() => {
    return myOutput
  })
  return l
}

export async function run(
  cmd: string,
  args?: string[],
  options?: ExecOptions
): Promise<number> {
  const l = await exec.exec(cmd, args, options)
  return l
}

export async function globDirectory(dir: string): Promise<string[]> {
  const globber = await glob.create(path.join(dir, '*'), {
    followSymbolicLinks: false
  })
  const files = await globber.glob()
  return files
}

export async function globDirectoryRecursive(dir: string): Promise<string[]> {
  const globber = await glob.create(path.join(dir, '**'), {
    followSymbolicLinks: false
  })
  const files = await globber.glob()
  return files
}

export interface TempFileOptions {
  prefix?: string
  data?: string
}

export class TempFile {
  tempFile: typeof temp
  private toCleanup: string[]

  constructor() {
    this.tempFile = temp.track()
    this.toCleanup = []
  }

  async create(options?: TempFileOptions): Promise<string> {
    let newOpts = {}
    if (options && options.prefix) {
      newOpts = {prefix: options.prefix}
    }
    const tmp = this.tempFile.openSync(newOpts)
    this.toCleanup.push(tmp.path)
    if (options && options.data != null) {
      fs.writeSync(tmp.fd, options.data)
    }
    fs.closeSync(tmp.fd)
    return tmp.path
  }

  cleanup(): void {
    for (const p of this.toCleanup) {
      unlinkIgnoreError(p)
    }
    this.toCleanup = []
  }
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
  const raw_input = actions.getInput(key, {required: options.required})
  if (raw_input === null || raw_input === '') {
    if (!options.required && options.default !== null)
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
  if (!options.allowEmpty && values.length === 0) {
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
