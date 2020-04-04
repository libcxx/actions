import {ExecOptions} from '@actions/exec/lib/interfaces'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as fs from 'fs'
import * as path from 'path'
import * as rimraf from 'rimraf'
import * as temp from 'temp'

export function mkdirP(dirPath: string): void {
  return fs.mkdirSync(dirPath, {recursive: true})
}

export function rmRF(dirPath: string): void {
  return rimraf.sync(dirPath, {}, err => {
    if (err)
      throw new Error(`Failed to remove directory '${dirPath}': ${err.message}`)
  })
}

export function rmRfIgnoreError(dirPath: string): void {
  return rimraf.sync(dirPath, {}, () => {
    // continue regardless of error
  })
}

export function unlinkIgnoreError(filePath: string): void {
  try {
    return fs.unlinkSync(filePath)
  } catch (error) {
    // continue regardless of error
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
    stdout: data => {
      myOutput += data.toString()
      process.stdout.write(data)
    },
    stderr: data => {
      process.stderr.write(data)
    }
  }
  await exec.exec(cmd, args, options)
  return myOutput
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

  constructor() {
    this.tempFile = new temp()
    this.tempFile.track()
  }

  async create(options?: TempFileOptions): Promise<string> {
    let newOpts = {}
    if (options && options.prefix) {
      newOpts = {prefix: options.prefix}
    }
    const tmp = this.tempFile.openSync(newOpts)
    if (options && options.data != null) {
      fs.writeSync(tmp.fd, options.data)
    }
    fs.closeSync(tmp.fd)
    return tmp.path
  }

  async cleanup(): Promise<void> {
    await this.tempFile.cleanupSync()
  }
}
