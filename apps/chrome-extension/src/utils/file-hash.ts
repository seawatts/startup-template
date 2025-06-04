export async function calculateFileHash(blob: Blob): Promise<string> {
  // Convert blob to array buffer
  const arrayBuffer = await blob.arrayBuffer();
  // Convert array buffer to Uint8Array
  const uint8Array = new Uint8Array(arrayBuffer);

  // Use Web Crypto API to generate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Array);

  // Convert hash to hex string
  const hashArray = [...new Uint8Array(hashBuffer)];
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
}
