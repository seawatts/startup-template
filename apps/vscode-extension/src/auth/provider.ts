import * as vscode from 'vscode';
import { env } from '../env';
import type { AuthStore } from '../stores/auth-store';

interface AuthenticationProvider {
  onDidChangeSessions: vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>;
  getSessions(scopes: string[]): Promise<vscode.AuthenticationSession[]>;
  createSession(scopes: string[]): Promise<vscode.AuthenticationSession>;
  removeSession(sessionId: string): Promise<void>;
}

export class SeawattsAuthProvider implements AuthenticationProvider {
  private static readonly AUTH_TYPE = 'seawatts';
  private static readonly SCOPES = ['openid', 'email', 'profile'];

  private _onDidChangeSessions =
    new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
  readonly onDidChangeSessions = this._onDidChangeSessions.event;

  constructor(
    readonly _context: vscode.ExtensionContext,
    private readonly authStore: AuthStore,
  ) {
    // Listen for auth store changes and emit session changes
    this.authStore.onDidChangeAuth(() => {
      this._onDidChangeSessions.fire({ added: [], changed: [], removed: [] });
    });
  }

  private getEditorUriScheme(): string {
    // Get the current editor's URI scheme
    const appName = vscode.env.appName.toLowerCase();
    if (appName.includes('cursor')) {
      return 'cursor';
    }
    if (appName.includes('insiders')) {
      return 'vscode-insiders';
    }
    if (appName.includes('windsurf')) {
      return 'windsurf';
    }
    return 'vscode';
  }

  static register(context: vscode.ExtensionContext, authStore: AuthStore) {
    const provider = new SeawattsAuthProvider(context, authStore);
    return vscode.authentication.registerAuthenticationProvider(
      SeawattsAuthProvider.AUTH_TYPE,
      'Seawatts',
      provider,
      {
        supportsMultipleAccounts: false,
      },
    );
  }

  async getSessions(scopes: string[]): Promise<vscode.AuthenticationSession[]> {
    const session = await this.getSession(scopes);
    return session ? [session] : [];
  }

  async getSession(
    _scopes: string[],
  ): Promise<vscode.AuthenticationSession | undefined> {
    if (!this.authStore.isSignedIn) {
      return undefined;
    }

    return {
      accessToken: this.authStore.authToken ?? '',
      account: {
        id: this.authStore.user?.id ?? '',
        label: this.authStore.user?.email ?? '',
      },
      id: this.authStore.sessionId ?? '',
      scopes: SeawattsAuthProvider.SCOPES,
    };
  }

  async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
    try {
      // Open browser for auth
      const authUrl = new URL('/cli-token', env.NEXT_PUBLIC_APP_URL);
      const editorScheme = this.getEditorUriScheme();
      authUrl.searchParams.set(
        'redirect_uri',
        `${editorScheme}://${env.NEXT_PUBLIC_VSCODE_EXTENSION_ID}`,
      );
      await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));

      // Wait for the auth code from VS Code
      const session = await vscode.authentication.getSession(
        SeawattsAuthProvider.AUTH_TYPE,
        scopes,
        { createIfNone: true },
      );

      if (!session) {
        throw new Error('No session returned from VS Code auth');
      }

      // Use your existing code exchange
      const { authToken, sessionId, user } =
        await this.authStore.api.auth.exchangeAuthCode({
          code: session.accessToken, // VS Code will pass the code as the accessToken
        });

      // Update auth store
      await this.authStore.setAuthToken(authToken);
      await this.authStore.setSessionId(sessionId);
      this.authStore.setUser(user);

      const newSession: vscode.AuthenticationSession = {
        accessToken: authToken,
        account: {
          id: user.id,
          label: user.email ?? '',
        },
        id: sessionId,
        scopes: SeawattsAuthProvider.SCOPES,
      };

      this._onDidChangeSessions.fire({
        added: [newSession],
        changed: [],
        removed: [],
      });

      return newSession;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to create authentication session: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async removeSession(_sessionId: string): Promise<void> {
    const session = await this.getSession(SeawattsAuthProvider.SCOPES);
    await this.authStore.signOut();
    if (session) {
      this._onDidChangeSessions.fire({
        added: [],
        changed: [],
        removed: [session],
      });
    }
  }
}
