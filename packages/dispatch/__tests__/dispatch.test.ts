import * as dispatch from '../src/dispatch'
import * as utils from '@libcxx/core'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'

jest.setTimeout(100000)

function setup(workspace: string): void {
  if (!fs.existsSync(workspace)) {
    utils.mkdirP(workspace)
  }
  process.chdir(workspace)
  process.env['INPUT_REPOSITORY'] = 'llvm/llvm-project'
  process.env['INPUT_REF'] = 'master'
  process.env['INPUT_RUNTIMES'] = 'libcxx libcxxabi'
  process.env['INPUT_TOKEN'] = process.env['GITHUB_TOKEN']
  process.env['INPUT_EVENT_TYPE'] = 'test_event'
  process.env['INPUT_CLIENT_PAYLOAD'] =
  process.env['GITHUB_WORKSPACE'] = workspace
  process.env['GITHUB_REPOSITORY'] = 'libcxx/actions'
  process.env['GITHUB_EVENT_PATH'] = path.join(workspace, 'payload.json')
}

class ActionInputsTest implements dispatch.ActionInputsI {
  repo: string = "actions"
  owner: string = "libcxx"
  event_type: string = "test_event"
  client_payload: any = {
    repository: 'llvm/llvm-project',
    ref: 'master'
  }
  token: string = process.env['GITHUB_TOKEN'] as string;

  constructor() {}
}


async function getTestInputs() : Promise<dispatch.ActionInputsI> {
  return new ActionInputsTest()
}

beforeAll(() => {
  setup(fs.mkdtempSync(path.join(os.tmpdir(), '/', 'libcxx-actions-test')))
})

test('basic test', async () => {
  let inputs = getTestInputs();
  await expect(dispatch.runAction(inputs)).resolves.toBeDefined()
})
