import { exec } from "child_process";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    promptAccount();

    const disposable = vscode.commands.registerCommand('vs-git-sync.selectAccount', async () => {
        promptAccount(true);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }

async function promptAccount(ignoreConfirm: boolean = false) {
    if (!ignoreConfirm) {
        const prompt = await vscode.window.showInformationMessage(
            "Would you like to switch your Github account?",
            "Yes", "No"
        );

        if (prompt !== "Yes") return;
    }

    const session = await vscode.authentication.getSession('github', ['user:email'], { forceNewSession: true, clearSessionPreference: true });
    const email = await getGithubEmail(session.accessToken);
    exec(`git config --global user.name ${session.account.label}`);
    exec(`git config --global user.email ${email}`);
}

type EmailsResponse = { email: string, primary: boolean }[];
async function getGithubEmail(token: string) {
    const headers = { Authorization: `token ${token}` };

    const response = await fetch("https://api.github.com/user/emails", { headers });
    const emails = await response.json() as EmailsResponse;
    const primaryEmail = emails.find((email) => email.primary);

    return primaryEmail?.email;
}
