'use strict';

import * as vscode from 'vscode';
import {findGit, git} from "./git";
import {flow} from './flow';
import {fail} from './fail'

const runWrapped = async function<T>(fn: (...any) => Thenable<T>, args: any[] = []): Promise<T|null> {
    try {
        return await fn(...args);
    } catch(e) {
        if (!e.handlers || !e.message)
            throw e;

        const err: fail.IError = e;
        const chosen = await vscode.window.showErrorMessage(err.message, ...(err.handlers || []));
        if (!!chosen) {
            return await runWrapped(chosen.cb);
        }
        return null;
    }
};


async function setup(disposables : vscode.Disposable[]) {
    const pathHint = vscode.workspace.getConfiguration('git').get<string>('path');
	git.info = await findGit(pathHint);
    vscode.window.setStatusBarMessage("Using git: " + git.info.path + " with version " + git.info.version);
    const commands = [
        vscode.commands.registerCommand('gitflow.initialize', async function() {
            await runWrapped(flow.initialize);
        }),
        vscode.commands.registerCommand('gitflow.featureStart', async function () {
            await runWrapped(flow.requireFlowEnabled);
            const name = await vscode.window.showInputBox({
                placeHolder: 'my-awesome-feature',
                prompt: 'A new name for your feature',
            });
            if (!name)
                return;
            await runWrapped(flow.feature.start, [name]);
        }),
        vscode.commands.registerCommand('gitflow.featureRebase', async function() {
            await runWrapped(flow.feature.rebase);
        }),
        vscode.commands.registerCommand('gitflow.featureFinish', async function() {
            await runWrapped(flow.feature.finish);
        }),
        vscode.commands.registerCommand('gitflow.releaseStart', async function() {
            await runWrapped(flow.requireFlowEnabled);
            const name = await vscode.window.showInputBox({
                placeHolder: '1.6.2',
                prompt: 'The name of the release',
            });
            if (!name)
                return;
            await runWrapped(flow.release.start, [name]);
        }),
        vscode.commands.registerCommand('gitflow.releaseFinish', async function() {
            await runWrapped(flow.release.finish);
        }),
        vscode.commands.registerCommand('gitflow.hotfixStart', async function(){
            await runWrapped(flow.requireFlowEnabled);
            const name = await vscode.window.showInputBox({
                prompt: 'The name of the hotfix version',
            });
            if (!name)
                return;
            await runWrapped(flow.hotfix.start, [name]);
        }),
        vscode.commands.registerCommand('gitflow.hotfixFinish', async function() {
            await runWrapped(flow.hotfix.finish);
        })
    ];
    //add disposable
    disposables.push(...commands);
}

export function activate(context: vscode.ExtensionContext) {
	const disposables: vscode.Disposable[] = [];
	context.subscriptions.push(new vscode.Disposable(() => vscode.Disposable.from(...disposables).dispose()));
    
    setup(disposables).catch(err => console.error(err));
}

export function deactivate() {
}