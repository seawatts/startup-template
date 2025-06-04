import * as vscode from 'vscode';
import type { AuthStore } from '../stores/auth-store';
import { AcmeAuthProvider } from './provider';

export function registerAuthCommands(
  context: vscode.ExtensionContext,
  authStore: AuthStore,
) {
  // Register auth provider
  const provider = new AcmeAuthProvider(context, authStore);
  const authProvider = AcmeAuthProvider.register(context, authStore);

  // Register sign in command
  const signInCommand = vscode.commands.registerCommand(
    'acme.signIn',
    async () => {
      try {
        const session = await vscode.authentication.getSession(
          'acme',
          ['openid', 'email', 'profile'],
          {
            createIfNone: true,
          },
        );
        if (session) {
          vscode.window.showInformationMessage(
            'Successfully signed in to Acme',
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to sign in to Acme: ${(error as Error).message}`,
        );
      }
    },
  );

  // Register sign out command
  const signOutCommand = vscode.commands.registerCommand(
    'acme.signOut',
    async () => {
      try {
        const session = await vscode.authentication.getSession(
          'acme',
          ['openid', 'email', 'profile'],
          {
            createIfNone: false,
          },
        );
        if (session) {
          await provider.removeSession(session.id);
          vscode.window.showInformationMessage(
            'Successfully signed out of Acme',
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to sign out of Acme: ${(error as Error).message}`,
        );
      }
    },
  );

  // Add commands to extension context
  context.subscriptions.push(signInCommand, signOutCommand);

  return {
    authProvider,
    signInCommand,
    signOutCommand,
  };
}
