export {};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: './tabs/welcome.html',
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url?.includes('ycombinator.com')) {
    chrome.tabs.sendMessage(tabId, { type: 'URL_CHANGED' });
  }
});
