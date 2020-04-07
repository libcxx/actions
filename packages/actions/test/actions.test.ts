import * as actions from '../src/actions'
import * as path from 'path'


test('@libcxx/actions', () => {
  let result = actions.readActionDescription(path.join(__dirname, 'Inputs', 'action.yml'))
})

