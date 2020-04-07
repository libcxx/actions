"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const core = require('@actions/core');
const artifact = require('@actions/artifact');
const path = require('path');
const fs = require('fs');
const io = require('@actions/io');
const assert = require('assert');
const utils = require('./utils');
const xunitViewer = require('xunit-viewer');
const temp = require('temp');
function withSSHKey(token, then) {
    return __awaiter(this, void 0, void 0, function* () {
        let tempFile = yield utils.createTempFile('id_rsa', token);
        process.env.GIT_SSH_COMMAND = `ssh -i ${tempFile} -o "StrictHostKeyChecking=no"`;
        try {
            let result = yield then();
            let R2 = yield result;
            return R2;
        }
        finally {
            yield utils.unlinkIgnoreError(tempFile);
        }
    });
}
function checkoutLibcxxIO(out_path, branch = 'master') {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield core.group('checkout', () => __awaiter(this, void 0, void 0, function* () {
            const agent = 'publisher';
            const repo_url = `git@github.com:libcxx/libcxx.github.io.git`;
            yield utils.mkdirP(out_path);
            const opts = { cwd: out_path };
            yield utils.run('git config --local user.name "libcpp actions builder"', [], opts);
            yield utils.run('git config --local user.email "eric@efcs.ca"', [], opts);
            let out = utils.capture('git config --list --show-origin', [], opts);
            let l = yield utils.run('git', ['clone', '--depth=1', '-b', branch, repo_url, out_path], { env: process.env });
            yield utils.run('git config --local user.name "libcpp actions publisher"', [], opts);
            yield utils.run('git config --local user.email eric@efcs.ca', [], opts);
            return l;
        }));
        return result;
    });
}
function commitChanges(repo_path, destination_name) {
    return __awaiter(this, void 0, void 0, function* () {
        const opts = { cwd: repo_path };
        yield utils.run('git', ['add', '-A', ':/'], opts);
        yield utils.run('git', ['commit', '-am', `Publish testsuite results for ${destination_name}`], opts);
    });
}
function commitAndPushChanges(repo_path, destination_name) {
    return __awaiter(this, void 0, void 0, function* () {
        yield commitChanges(repo_path, destination_name);
        let result = yield utils.run(`git -C ${repo_path} push`);
        return result;
    });
}
function publishTestSuiteHTMLResults(results_file, destination, token) {
    return __awaiter(this, void 0, void 0, function* () {
        repo_path = 'libcxx.github.io';
        let l = yield withSSHKey(token, () => __awaiter(this, void 0, void 0, function* () {
            try {
                yield core.saveState('libcxx-io', repo_path);
                yield checkoutLibcxxIO(repo_path);
                output_path = path.join(repo_path, 'results', destination);
                if (!fs.existsSync(output_path)) {
                    yield utils.mkdirP(output_path);
                }
                const output_file = path.basename(results_file);
                yield io.cp(results_file, path.join(output_path, output_file));
                index = path.join(output_path, 'index.html');
                if (fs.existsSync(index)) {
                    yield utils.unlink(index);
                }
                yield fs.symlinkSync(index, `./${output_file}`);
                yield commitAndPushChanges(repo_path, destination);
            }
            finally {
                yield utils.rmRfIgnoreError(repo_path);
            }
        }));
        return yield l;
    });
}
function createTestSuiteHTMLResults(title, xml_file_path, html_output_path) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all([yield xunitViewer({
                server: false,
                results: xml_file_path,
                title: title,
                output: html_output_path
            })]);
        return 0;
    });
}
function publishArtifacts(artifacts_dir) {
    return __awaiter(this, void 0, void 0, function* () {
        let p = yield core.group("upload-artifacts", () => __awaiter(this, void 0, void 0, function* () {
            const artifactClient = yield artifact.create();
            let files = yield utils.globDirectoryRecursive(artifacts_dir);
            let l = yield artifactClient.uploadArtifact(`test-suite-results`, files, artifacts_dir);
            return l;
        }));
        return p;
    });
}
function createAndPublishTestSuiteResults(action_paths, config_name, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const result_name = yield `test-results-${yield new Date().toISOString()}.html`.replace(':', '-');
        let html_results = path.join(action_paths.artifacts, result_name);
        yield createTestSuiteHTMLResults(`${config_name} Test Suite Results`, action_paths.artifacts, html_results);
        let promise = yield publishArtifacts(action_paths.artifacts);
        yield publishTestSuiteHTMLResults(html_results, config_name, token);
    });
}
module.exports = {
    checkoutLibcxxIO,
    withSSHKey,
    commitChanges,
    commitAndPushChanges,
    publishTestSuiteHTMLResults,
    createTestSuiteHTMLResults,
    createAndPublishTestSuiteResults
};
//# sourceMappingURL=publish.js.map