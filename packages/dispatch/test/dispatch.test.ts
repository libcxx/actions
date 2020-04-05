import * as dispatch from '../src/dispatch'
import * as core from '@libcxx/core'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import {strict as assert} from 'assert'

let workspace = ''

beforeAll(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), '/', 'libcxx-actions-test'))
  workspace = fs.realpathSync(workspace)
  assert(path.isAbsolute(workspace))
  process.chdir(workspace)
  process.env['GITHUB_WORKSPACE'] = workspace
  process.env['GITHUB_REPOSITORY'] = 'libcxx/actions'
  process.env['GITHUB_EVENT_PATH'] = path.join(workspace, 'payload.json')
})

afterAll(async () => {
  if (workspace && fs.existsSync(workspace)) {
    assert(path.isAbsolute(workspace))
    process.chdir(__dirname)
    if (fs.existsSync(workspace)) await core.rmRfIgnoreError(workspace)
  }
})

async function getTestInputs(): Promise<dispatch.ActionInputsI> {
  const inputs = {
    repo: 'actions',
    owner: 'libcxx',
    event_type: 'test_event',
    client_payload: {
      repository: 'llvm/llvm-project',
      ref: 'master'
    },
    token: process.env['GITHUB_TOKEN'] as string
  } as dispatch.ActionInputsI
  return inputs
}

test('basic test', async () => {
  const inputs = getTestInputs()
  await expect(dispatch.runAction(inputs)).resolves.toBeDefined()
})
