import {ExecOptions} from '@actions/exec/lib/interfaces'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as io from '@actions/io'
import * as actions from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as temp from 'temp'

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
