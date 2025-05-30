console.log('Test background script loaded');

// Simple message handler
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  sendResponse({ success: true, message: 'Test response' });
});

// Action click handler (if popup is not set)
if (browser.action && browser.action.onClicked) {
  browser.action.onClicked.addListener(() => {
    console.log('Action clicked');
  });
}