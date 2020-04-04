import * as dispatch from '../src/dispatch'
import * as utils from '@libcxx/core'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'

jest.setTimeout(100000)

function setup(workspace): void {
  if (!fs.existsSync(workspace)) {
    utils.mkdirP(workspace)
  }
  process.chdir(workspace)
  process.env['INPUT_REPOSITORY'] = 'llvm/llvm-project'
  process.env['INPUT_REF'] = 'master'
  process.env['INPUT_RUNTIMES'] = 'libcxx libcxxabi'
  process.env['INPUT_TOKEN'] = process.env['GITHUB_TOKEN']
  process.env['INPUT_EVENT_TYPE'] = 'test_event'
  process.env['INPUT_CLIENT_PAYLOAD'] = JSON.stringify({
    repository: 'llvm/llvm-project',
    ref: 'master'
  })
  process.env['GITHUB_WORKSPACE'] = workspace
  process.env['GITHUB_REPOSITORY'] = 'libcxx/actions'
  process.env['GITHUB_EVENT_PATH'] = path.join(workspace, 'payload.json')
}

beforeAll(async () => {
  setup(fs.mkdtempSync(path.join(os.tmpdir(), '/', 'libcxx-actions-test')))
})

test('basic test', async () => {
  await expect(dispatch.runAction()).resolves.toBeDefined()
})
