let observer = null;
let isMonitoring = false;
let initialContent = null;

// Initialisiere beim Laden
browser.storage.local.get(['isActive']).then(data => {
  if (data.isActive) {
    startMonitoring();
  }
});

// Lausche auf Nachrichten vom Popup
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'start') {
    startMonitoring();
  } else if (message.action === 'stop') {
    stopMonitoring();
  } 
});


function startMonitoring() {
  if (isMonitoring) return;
  
  isMonitoring = true;


  setTimeout(() => {
    initialContent = getPageSnapshot();

    observer = new MutationObserver(() => {
      const currentContent = getPageSnapshot();
      if (currentContent !== initialContent) {
        playSound();
        initialContent = currentContent;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

  console.log('Page monitoring started');
  }, 1); // warte 2s bis Seite steht
}

function stopMonitoring() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  isMonitoring = false;
  console.log('Page monitoring stopped');
}

function playSound() {
  browser.runtime.sendMessage({ action: "playNotification" });
}
