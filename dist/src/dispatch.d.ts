export interface ActionInputsI {
    repo: string;
    owner: string;
    event_type: string;
    client_payload: any;
    token: string;
}
export declare class ActionInputs implements ActionInputsI {
    repo: string;
    owner: string;
    event_type: string;
    client_payload: any;
    token: string;
    constructor(i: ActionInputsI);
    static fromEnviroment(): Promise<ActionInputsI>;
}
export declare function runAction(rawInputs?: Promise<ActionInputsI>): Promise<any>;
