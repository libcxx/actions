const libcxx = require('../dist/index')
async function foo() {
//await libcxx.build.LLVMAction.runBuild()
await libcxx.build.LLVMAction.runTests()
}

foo()
