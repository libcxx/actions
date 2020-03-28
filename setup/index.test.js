
const process = require('process');
const cp = require('child_process');
const path = require('path');
var index = require("./index");



// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
    index.run();
    console.log('Cool');
})
