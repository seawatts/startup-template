// biome-ignore lint/style/useFilenamingConvention: For Plasmo
import type { PlasmoMessaging } from '@plasmohq/messaging';

const handler: PlasmoMessaging.MessageHandler = async (request, res) => {
  const { url } = request.body;
  chrome.tabs.create({ url });
  res.send({ success: true });
};

export default handler;
