import * as build from '../src/build'
import * as core from '@libcxx/core'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'

let workspace: string
jest.setTimeout(100000)

beforeAll(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), '/', 'libcxx-actions-test'))
  process.chdir(workspace)
  process.env['GITHUB_WORKSPACE'] = workspace
  process.env['GITHUB_REPOSITORY'] = 'libcxx/actions'
  process.env['GITHUB_EVENT_PATH'] = path.join(workspace, 'payload.json')
})

afterAll(() => {
  if (workspace && fs.existsSync(workspace)) {
    core.rmRfIgnoreError(workspace)
  }
})

test('basic test', async () => {
  await expect( build.GenericRuntimeAction.runAll()).resolves.toBe(0)
})
