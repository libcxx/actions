import * as core from '../src/core'
import * as fs from 'fs'

describe('@libcxx/core', () => {
  it('tempfile tests', async () => {
    const tmpFile: core.TempFile = new core.TempFile()
    const p1: string = await tmpFile.create({data: 'abcd'})
    expect(fs.existsSync(p1)).toBe(true)

    const tmpFileTwo: core.TempFile = new core.TempFile()
    const p2: string = await tmpFileTwo.create()
    expect(fs.existsSync(p2)).toBe(true)

    await tmpFileTwo.cleanup()
    expect(fs.existsSync(p1)).toBe(true)
    expect(fs.existsSync(p2)).toBe(false)
  })
})
