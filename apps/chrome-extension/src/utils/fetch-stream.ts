// New function to handle fetching and streaming
export async function fetchAndStream<T>(
  apiEndpoint: string,
  payload: object,
  onPartialData: (data: T) => Promise<void> | void,
): Promise<T | undefined> {
  const apiUrl =
    process.env.NODE_ENV === 'production'
      ? `https://app.acme.ai${apiEndpoint}`
      : `http://localhost:3000${apiEndpoint}`;

  try {
    const response = await fetch(apiUrl, {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let lastPartialData: T | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() !== '') {
          try {
            const parsedChunk = JSON.parse(line);
            if (parsedChunk.content) {
              lastPartialData = parsedChunk.content as T;
              onPartialData(lastPartialData);
            }
          } catch (error) {
            console.error('Error parsing chunk:', error);
          }
        }
      }
    }

    return lastPartialData;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
