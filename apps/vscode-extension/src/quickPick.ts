// biome-ignore lint/style/useFilenamingConvention: For Plasmo
import * as vscode from 'vscode';
import type { AuthStore } from './stores/auth-store';

export class WebhookEventQuickPick {
  private static instance: WebhookEventQuickPick;
  private authStore: AuthStore | null = null;

  private constructor() {}

  public static getInstance(): WebhookEventQuickPick {
    if (!WebhookEventQuickPick.instance) {
      WebhookEventQuickPick.instance = new WebhookEventQuickPick();
    }
    return WebhookEventQuickPick.instance;
  }

  public setAuthStore(authStore: AuthStore) {
    this.authStore = authStore;
  }

  public async showQuickPick() {
    const items: vscode.QuickPickItem[] = [];

    // Add auth items based on current state
    if (this.authStore) {
      if (this.authStore.isValidatingSession) {
        items.push({
          label: '$(sync~spin) Validating Session',
          description: 'Please wait while we validate your session',
          detail: 'Your session is being validated...',
        });
      } else if (this.authStore.isSignedIn) {
        items.push({
          label: '$(sign-out) Sign Out',
          description: 'Sign out of your Acme account',
          detail: `Currently signed in as ${this.authStore.user?.email ?? 'User'}`,
        });
      } else {
        items.push({
          label: '$(sign-in) Sign In',
          description: 'Sign in to your Acme account',
          detail: 'Sign in to access your webhook events',
        });
      }
    }

    // Add webhook event items if signed in
    if (this.authStore?.isSignedIn) {
      items.push(
        {
          label: '$(add) Add New Webhook Event',
          description: 'Create a new webhook event',
          detail: 'Add a new webhook event to the list',
        },
        {
          label: '$(refresh) Refresh Events',
          description: 'Refresh the webhook events list',
          detail: 'Update the list of webhook events',
        },
      );
    }

    // Add settings item
    items.push({
      label: '$(settings) Configure Settings',
      description: 'Open settings panel',
      detail: 'Configure Acme extension settings',
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an action',
      title: 'Acme Quick Actions',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      switch (selected.label) {
        case '$(sign-in) Sign In':
          await vscode.commands.executeCommand('acme.signIn');
          break;
        case '$(sign-out) Sign Out':
          await vscode.commands.executeCommand('acme.signOut');
          break;
        case '$(add) Add New Webhook Event':
          await vscode.commands.executeCommand('acme.addWebhookEvent');
          break;
        case '$(refresh) Refresh Events':
          await vscode.commands.executeCommand('acme.webhookEvents.refresh');
          break;
        case '$(settings) Configure Settings':
          await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            '@ext:acme',
          );
          break;
      }
    }
  }
}
