import { debug, defaultLogger } from '@acme/logger';
import { VSCodeOutputDestination } from '@acme/logger/destinations/vscode-output';
import * as vscode from 'vscode';
import { registerAuthCommands } from './auth/commands';
import { registerOutputCommands } from './commands/output.commands';
import { registerQuickPickCommand } from './commands/quick-pick.commands';
import { registerSettingsCommands } from './commands/settings.commands';
import { registerWebhookEventCommands } from './commands/webhook-events.commands';
import { env } from './env';
import { SettingsProvider } from './providers/settings.provider';
import { WebhookEventsProvider } from './providers/webhook-events.provider';
import { WebhookEventQuickPick } from './quickPick';
import { RequestDetailsWebviewProvider } from './request-details-webview/request-details.webview';
import { SettingsService } from './services/settings.service';
import { AuthStore } from './stores/auth-store';

defaultLogger.enableNamespace('*');
defaultLogger.enableNamespace('acme:vscode');
defaultLogger.enableNamespace('acme:vscode:*');
const log = debug('acme:vscode');

export async function activate(context: vscode.ExtensionContext) {
  log('Acme extension is activating...');

  // Initialize auth store
  const authStore = new AuthStore(context);
  await authStore.initialize();

  // Register auth commands and provider
  const { authProvider, signInCommand, signOutCommand } = registerAuthCommands(
    context,
    authStore,
  );

  // Initialize settings service
  const settingsService = SettingsService.getInstance();
  context.subscriptions.push(settingsService);

  // Add VS Code output destination to default logger
  const outputDestination = new VSCodeOutputDestination({
    name: 'Acme',
    vscode,
    autoShow: settingsService.getSettings().output.autoShow,
  });
  defaultLogger.addDestination(outputDestination);

  // Listen for settings changes
  settingsService.onSettingsChange((settings) => {
    outputDestination.autoShow = settings.output.autoShow;
  });

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );

  // Update status bar based on auth state
  function updateStatusBar() {
    if (authStore.isValidatingSession) {
      statusBarItem.text = '$(sync~spin) Validating Acme Session...';
      statusBarItem.tooltip = 'Validating your Acme session...';
      statusBarItem.command = undefined;
    } else if (authStore.isSignedIn) {
      statusBarItem.text = `$(check) ${authStore.user?.email ?? 'Signed in'}`;
      statusBarItem.tooltip = 'Click to sign out of Acme';
      statusBarItem.command = 'acme.signOut';
    } else {
      statusBarItem.text = '$(sign-in) Sign in to Acme';
      statusBarItem.tooltip = 'Click to sign in to Acme';
      statusBarItem.command = 'acme.signIn';
    }
    statusBarItem.show();
  }

  // Listen for auth state changes
  authStore.onDidChangeAuth(() => updateStatusBar());
  updateStatusBar();

  // Add status bar item to subscriptions
  context.subscriptions.push(
    authStore,
    authProvider,
    signInCommand,
    signOutCommand,
    statusBarItem,
  );

  // Initialize webhook events provider
  const webhookEventsProvider = new WebhookEventsProvider(context);
  webhookEventsProvider.setAuthStore(authStore);

  // Initialize webview provider
  const webviewProvider = new RequestDetailsWebviewProvider(
    context.extensionUri,
  );

  // Register webhook event commands
  registerWebhookEventCommands(context, webhookEventsProvider, webviewProvider);

  // Set up quick pick
  const quickPick = WebhookEventQuickPick.getInstance();
  quickPick.setAuthStore(authStore);

  const settingsProvider = new SettingsProvider();
  vscode.window.registerTreeDataProvider('acme.settings', settingsProvider);

  // Register the custom URI scheme handler
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri) {
        log('Handling URI:', uri.toString());
        // Handle any of our supported editor schemes
        if (
          uri.authority === env.NEXT_PUBLIC_VSCODE_EXTENSION_ID &&
          uri.path === '/auth/callback'
        ) {
          const code = uri.query.split('=')[1];
          if (code) {
            // The auth provider will handle the code exchange
            vscode.authentication.getSession(
              'acme',
              ['openid', 'email', 'profile'],
              {
                createIfNone: true,
              },
            );
          }
        }
      },
    }),
  );

  // Create the webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RequestDetailsWebviewProvider.viewType,
      webviewProvider,
    ),
  );

  // Register commands
  registerOutputCommands(context, outputDestination);
  registerQuickPickCommand(context);

  registerSettingsCommands(context);

  // Register the webhook events provider
  const treeView = vscode.window.createTreeView('acme.webhookEvents', {
    treeDataProvider: webhookEventsProvider,
    showCollapseAll: true,
  });

  treeView.onDidChangeVisibility(() => {
    webhookEventsProvider.refresh();
  });

  context.subscriptions.push(treeView);

  log('Acme extension activation complete');
}

export function deactivate() {}
