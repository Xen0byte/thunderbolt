console.log('Simple background script loaded - v1.0.4');

// Simple message handler
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  
  if (request.action === 'getServerStatus') {
    sendResponse({ 
      running: true, 
      version: '1.0.4',
      message: 'Test response from background script' 
    });
  }
  
  return true;
});