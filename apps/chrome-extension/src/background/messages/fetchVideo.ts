// biome-ignore lint/style/useFilenamingConvention: For Plasmo
import type { PlasmoMessaging } from '@plasmohq/messaging';

import { calculateFileHash } from '../../utils/file-hash';

const handler: PlasmoMessaging.MessageHandler = async (request, res) => {
  const { videoUrl } = request.body;

  try {
    // Fetch the video data with proper CORS headers
    const videoResponse = await fetch(videoUrl.toString(), {
      cache: 'no-store',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        Origin: '*',
        Pragma: 'no-cache',
      },
      mode: 'cors',
    });

    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    }

    // Get the video blob
    const videoBlob = await videoResponse.blob();

    const arrayBuffer = await videoBlob.arrayBuffer();

    // Calculate hash before any transformations
    const hash = await calculateFileHash(videoBlob);

    // Convert ArrayBuffer to array of numbers and verify it's not empty
    const uint8Array = new Uint8Array(arrayBuffer);
    if (uint8Array.length === 0) {
      res.send({
        error: 'Received empty video data',
        success: false,
      });
      return;
    }

    res.send({
      arrayBuffer: [...uint8Array],
      // Convert to regular array
      hash,
      size: uint8Array.length,
      success: true, // Adding size for debugging
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.send({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    });
  }
};

export default handler;
