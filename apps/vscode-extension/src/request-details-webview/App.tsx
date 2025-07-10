/** biome-ignore-all lint/style/useFilenamingConvention: todo */
import { Icons } from '@acme/ui/custom/icons';
import { useEffect, useRef, useState } from 'react';

// Declare the vscode global
declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void;
    };
  }
}

// biome-ignore lint/suspicious/noExplicitAny: asdf
function RequestDetails({ data }: { data: Record<string, any> }) {
  const parseBody = (body?: string) => {
    if (!body) return null;
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  };

  return (
    <div className="app">
      <div className="section">
        <div className="section-title">Request</div>
        <pre>
          Method: <span className="key">{data.request.method}</span>
          URL: <span className="value">{data.request.sourceUrl}</span>
          Content Type:{' '}
          <span className="value">{data.request.contentType}</span>
          Size: <span className="value">{data.request.size} bytes</span>
          Client IP: <span className="value">{data.request.clientIp}</span>
        </pre>
      </div>

      <div className="section">
        <div className="section-title">Request Headers</div>
        <pre>{JSON.stringify(data.request.headers, null, 2)}</pre>
      </div>

      {data.request.body && (
        <div className="section">
          <div className="section-title">Request Body</div>
          <pre>{JSON.stringify(parseBody(data.request.body), null, 2)}</pre>
        </div>
      )}

      {data.response && (
        <>
          <div className="section">
            <div className="section-title">Response</div>
            <pre>
              Status:{' '}
              <span
                className={`status status-${Math.floor(
                  data.response.status / 100,
                )}xx`}
              >
                {data.response.status}
              </span>
              {data.responseTimeMs && (
                <>
                  Response Time:{' '}
                  <span className="value">{data.responseTimeMs}ms</span>
                </>
              )}
            </pre>
          </div>

          <div className="section">
            <div className="section-title">Response Headers</div>
            <pre>{JSON.stringify(data.response.headers, null, 2)}</pre>
          </div>

          {data.response.body && (
            <div className="section">
              <div className="section-title">Response Body</div>
              <pre>
                {JSON.stringify(parseBody(data.response.body), null, 2)}
              </pre>
            </div>
          )}
        </>
      )}

      {data.failedReason && (
        <div className="section">
          <div className="section-title">Failure Reason</div>
          <pre>{data.failedReason}</pre>
        </div>
      )}
    </div>
  );
}

function MainView() {
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click or escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  return (
    <div className="app">
      {/* Filter Bar with Popout */}
      <div
        style={{
          alignItems: 'center',
          background: 'var(--vscode-input-background)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: 2,
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          padding: '0.25rem 0.5rem',
          position: 'relative',
        }}
      >
        <input
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter..."
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--vscode-input-foreground)',
            flex: 1,
            fontSize: '1em',
            outline: 'none',
          }}
          type="text"
          value={filter}
        />
        <button
          aria-label="Show filter menu"
          onClick={() => setMenuOpen((open) => !open)}
          ref={buttonRef}
          style={{
            alignItems: 'center',
            background: 'none',
            border: 'none',
            color: 'var(--vscode-input-foreground)',
            cursor: 'pointer',
            display: 'flex',
            padding: 4,
          }}
          type="button"
        >
          <Icons.ListFilter size="sm" variant="muted" />
        </button>
        {menuOpen && (
          <div
            aria-label="Filter options"
            ref={menuRef}
            role="menu"
            style={{
              background: 'var(--vscode-menu-background)',
              border: '1px solid var(--vscode-menu-border)',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              color: 'var(--vscode-menu-foreground)',
              minWidth: 180,
              padding: '0.25rem 0',
              position: 'absolute',
              right: 0,
              top: '110%',
              zIndex: 10,
            }}
            tabIndex={-1}
          >
            <button
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '1em',
                padding: '0.5rem 1rem',
                textAlign: 'left',
                width: '100%',
              }}
              type="button"
            >
              Featured
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '1em',
                padding: '0.5rem 1rem',
                textAlign: 'left',
                width: '100%',
              }}
              type="button"
            >
              Most Popular
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '1em',
                padding: '0.5rem 1rem',
                textAlign: 'left',
                width: '100%',
              }}
              type="button"
            >
              Recently Published
            </button>
          </div>
        )}
      </div>
      {/* Main Content */}
      <h1>Acme API</h1>
      <div className="content">
        <p>Welcome to the Acme VS Code extension!</p>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)} type="button">
            Count is {count}
          </button>
          <p>
            Edit <code>src/webview/App.tsx</code> and save to test HMR
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [requestData, setRequestData] = useState<unknown | null>(null);

  useEffect(() => {
    // Listen for messages from the extension
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'requestData':
          setRequestData(message.data);
          break;
      }
    };

    window.addEventListener('message', messageHandler);
    // Notify the extension that the webview is ready
    window.vscode.postMessage({ type: 'ready' });

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  if (requestData) {
    return <RequestDetails data={requestData} />;
  }

  return <MainView />;
}

export default App;
