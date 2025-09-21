import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";

const execAsync = promisify(exec);

export async function activate(context: vscode.ExtensionContext) {
    promptAccount();

    const disposable = vscode.commands.registerCommand('vsc-git-sync.selectAccount', async () => {
        promptAccount(true);
    });

    context.subscriptions.push(disposable);


    vscode.authentication.onDidChangeSessions(async ({ provider }) => {
        if (provider.id !== 'github') return;

        const session = await vscode.authentication.getSession('github', ['user:email'], {});
        if (!session) return;

        await setGitConfig(session);
        vscode.commands.executeCommand('workbench.action.reloadWindow');
    });
}

export function deactivate() { }

async function setGitConfig(session: vscode.AuthenticationSession) {
    const email = await getGithubEmail(session.accessToken);
    const setUsername = execAsync(`git config --global user.name ${session.account.label}`);
    const setEmail = execAsync(`git config --global user.email ${email ?? ''}`); // A bit hacky, but if empty, it should print instead of set.

    return Promise.all([setUsername, setEmail]);
}

async function promptAccount(ignoreConfirm: boolean = false) {
    if (!ignoreConfirm) {
        const prompt = await vscode.window.showInformationMessage(
            "Would you like to switch your Github account?",
            "Yes", "No"
        );

        if (prompt !== "Yes") return;
    }

    const session = await vscode.authentication.getSession('github', ['user:email'], { clearSessionPreference: true, createIfNone: true });
    await setGitConfig(session);
    vscode.commands.executeCommand('workbench.action.reloadWindow');
}

type EmailsResponse = { email: string, primary: boolean }[];
async function getGithubEmail(token: string) {
    const headers = { Authorization: `token ${token}` };

    const response = await fetch("https://api.github.com/user/emails", { headers });
    const emails = await response.json() as EmailsResponse;
    const primaryEmail = emails.find((email) => email.primary);

    return primaryEmail?.email;
}
