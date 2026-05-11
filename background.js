chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'statusUpdate') {
        chrome.runtime.sendMessage(message).catch(() => {});
    }
});
