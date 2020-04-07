import { Octokit } from '@octokit/rest';
export interface ActionInputDescription {
    name: string;
    description: string;
    default?: string | string[];
    required?: boolean;
}
export interface ActionOutputDescription {
    name: string;
    description: string;
}
declare type ActionInputTable = Map<string, ActionInputDescription>;
declare type ActionOutputTable = Map<string, ActionOutputDescription>;
export interface ActionDescription {
    name: string;
    description: string;
    inputs: ActionInputTable;
    outputs: ActionOutputTable;
}
export declare function createGithubAPI(token: string): Octokit;
export declare function readActionDescription(filename: string): any;
export {};
