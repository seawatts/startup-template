// biome-ignore lint/style/useFilenamingConvention: For Plasmo
import type { PlasmoMessaging } from '@plasmohq/messaging';

const handler: PlasmoMessaging.MessageHandler = async (request, res) => {
  const { arrayBuffer, signedUrl } = request.body;

  try {
    // Convert the array back to Uint8Array and then to Blob
    const uint8Array = new Uint8Array(arrayBuffer);
    const blob = new Blob([uint8Array], { type: 'video/webm' });

    // Upload to S3
    const response = await fetch(signedUrl, {
      body: blob,
      headers: {
        'Content-Type': 'video/webm',
      },
      method: 'PUT',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Upload failed with status: ${response.status}, message: ${text}`,
      );
    }

    res.send({
      success: true,
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.send({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    });
  }
};

export default handler;
