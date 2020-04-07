import * as build from '../'
import * as core from '@libcxx/core'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import * as assert from 'assert'

let workspace: string
let popd: string
jest.setTimeout(100000)

beforeAll(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'libcxx-actions-test'))
  assert.strict(fs.existsSync(workspace))
  assert.strict(path.isAbsolute(workspace))
  popd = process.cwd()
  process.chdir(workspace)
  process.env['GITHUB_WORKSPACE'] = workspace
  process.env['GITHUB_REPOSITORY'] = 'libcxx/actions'
  process.env['GITHUB_EVENT_PATH'] = path.join(workspace, 'payload.json')
})

afterAll(async () => {
  process.chdir(popd)
  assert.strict(fs.existsSync(workspace))
  assert.strict(path.isAbsolute(workspace))
  await core.rmRfIgnoreError(workspace)
})

test('@libcxx/build', async () => {
  await expect(build.LLVMAction.runAll()).resolves.toBe(0)
})

