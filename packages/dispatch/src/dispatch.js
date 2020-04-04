"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const actions = __importStar(require("@actions/core"));
const rest_1 = require("@octokit/rest");
const assert_1 = require("assert");
function createAPI(token) {
    const octokit = new rest_1.Octokit({
        auth: token,
        userAgent: 'ericwf',
        previews: ['everest-preview'],
        baseUrl: 'https://api.github.com',
        log: {
            debug: actions.info,
            info: actions.info,
            warn: actions.warning,
            error: actions.error
        },
        request: {
            agent: undefined,
            fetch: undefined,
            timeout: 0
        }
    });
    return octokit;
}
class ActionInputs {
    constructor(i) {
        this.repo = i.repo;
        this.owner = i.owner;
        this.event_type = i.event_type;
        this.client_payload = i.client_payload;
        this.token = i.token;
    }
    static async fromEnviroment() {
        const repository = actions.getInput('repository');
        const i = repository.indexOf('/');
        assert_1.strict(i !== -1);
        let parsed;
        try {
            parsed = await JSON.parse(actions.getInput('client_payload'));
        }
        catch (error) {
            error.message = `Bad JSON input: ${error.message}`;
            throw error;
        }
        return new ActionInputs({
            owner: repository.substr(0, i),
            repo: repository.substr(i + 1),
            event_type: actions.getInput('event_type'),
            client_payload: parsed,
            token: actions.getInput('token')
        });
    }
}
exports.ActionInputs = ActionInputs;
async function runAction(rawInputs = ActionInputs.fromEnviroment()) {
    try {
        const inputs = await rawInputs;
        const octokit = createAPI(inputs.token);
        const r = await octokit.repos.createDispatchEvent({
            repo: inputs.repo,
            owner: inputs.owner,
            event_type: inputs.event_type,
            client_payload: inputs.client_payload
        });
        if (r.status === 204)
            return r;
        console.log(r);
        throw new Error(`Failed to create dispatch event: Got status ${r.status}`);
    }
    catch (error) {
        console.log(error.stack);
        actions.setFailed(error.message);
        throw error;
    }
}
exports.runAction = runAction;
//# sourceMappingURL=dispatch.js.map