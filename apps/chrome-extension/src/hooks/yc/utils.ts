export interface GraphQLRequest {
  operationName: string;
  variables: Record<string, unknown>;
  query: string;
}

// Helper functions
export function getCSRFToken(): string | null {
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag?.getAttribute('content') ?? null;
}

export async function fetchYCGraphQL(
  request: GraphQLRequest,
): Promise<Response> {
  let csrfToken = typeof document === 'undefined' ? null : getCSRFToken();

  if (!csrfToken) {
    const cookie = await chrome.cookies.get({
      name: '_csrf_token',
      url: 'https://apply.ycombinator.com',
    });
    csrfToken = cookie?.value ?? '';
  }

  const headers = {
    accept: '*/*',
    'content-type': 'application/json',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-csrf-token': csrfToken,
  };

  return fetch('https://apply.ycombinator.com/graphql', {
    body: JSON.stringify(request),
    headers,
    method: 'POST',
  });
}
