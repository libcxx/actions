import {ExecOptions} from '@actions/exec/lib/interfaces'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as io from '@actions/io'
import * as fs from 'fs'
import * as path from 'path'
import * as temp from 'temp'

export function mkdirP(dirPath: string): void {
  return fs.mkdirSync(dirPath, {recursive: true})
}

export async function rmRF(dirPath: string): Promise<void> {
  await io.rmRF(dirPath);
}

export function rmRfIgnoreError(dirPath: string): void {
  try {
    rmRF(dirPath)
  } catch (error) {
    // continue regardless of error
  }
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
    this.toCleanup.push(tmp.path);
    if (options && options.data != null) {
      fs.writeSync(tmp.fd, options.data)
    }
    fs.closeSync(tmp.fd)
    return tmp.path
  }

  async cleanup(): Promise<void> {
    for (let p of this.toCleanup) {
      unlinkIgnoreError(p);
    }
    this.toCleanup = []
  }
}
