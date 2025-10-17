let refreshInterval = null;
let currentTab = null;
let countdownInterval = null;
let nextRefreshTime = null;


let audioPlayer = null;

function playNotification() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer = null;
  }
  audioPlayer = new Audio(browser.runtime.getURL("notification.mp3"));
  audioPlayer.loop = true; // falls Dauerschleife gewünscht
  audioPlayer.play();
}

function stopNotification() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer = null;
  }
}


browser.runtime.onMessage.addListener((message) => {
  if (message.action === "playNotification") {
    playNotification();
  } else if (message.action === "stopNotification") {
    stopNotification();
  } else if (message.action === 'startRefresh') {
    startRefreshSchedule(message.config);
  } else if (message.action === 'stopRefresh') {
    stopRefreshSchedule();
  }
});

function startRefreshSchedule(config) {
  stopRefreshSchedule(); // Stoppe vorherige Intervalle
  
  const targetTime = new Date(config.targetTime).getTime();
  
  // Hole aktiven Tab
  browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    if (tabs[0]) {
      currentTab = tabs[0].id;
      checkAndRefresh(targetTime, config.timeSlots);
      startCountdownDisplay();
    }
  });
}

function checkAndRefresh(targetTime, timeSlots) {
  const now = Date.now();
  const timeUntilTarget = targetTime - now;
  
  if (timeUntilTarget <= 0) {
    console.log('Ziel-Zeitpunkt erreicht');
    stopRefreshSchedule();
    return;
  }
  
  // Finde passendes Zeitfenster
  let currentRate = null;
  for (let slot of timeSlots) {
    const slotThreshold = slot.minutes * 60 * 1000; // Minuten in Millisekunden
    if (timeUntilTarget <= slotThreshold) {
      currentRate = slot.rate * 1000; // Sekunden in Millisekunden
      break;
    }
  }
  
  if (currentRate) {
    // Refresh durchführen
    if (currentTab) {
      browser.tabs.reload(currentTab).catch(err => {
        console.error('Fehler beim Refresh:', err);
      });
    }
    
    // Randomisiere die Rate um ±25%
    const randomizedRate = randomizeRate(currentRate);
    nextRefreshTime = Date.now() + randomizedRate;
    
    // Setze nächsten Refresh
    refreshInterval = setTimeout(() => {
      checkAndRefresh(targetTime, timeSlots);
    }, randomizedRate);
  } else {
    // Kein Zeitfenster aktiv, prüfe in 10 Sekunden erneut
    const checkRate = 10000;
    nextRefreshTime = Date.now() + checkRate;
    refreshInterval = setTimeout(() => {
      checkAndRefresh(targetTime, timeSlots);
    }, checkRate);
  }
}

function randomizeRate(rate) {
  // Randomisiere um ±25%
  const variance = rate * 0.25;
  return Math.floor(2*(Math.random()-0.5) * variance) + rate;
}

function startCountdownDisplay() {
  // Stoppe vorheriges Countdown-Intervall
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Update Badge jede Sekunde
  countdownInterval = setInterval(updateBadge, 1000);
  updateBadge(); // Sofortiges erstes Update
}

function updateBadge() {
  if (!nextRefreshTime) {
    browser.browserAction.setBadgeText({text: ''});
    return;
  }
  
  const now = Date.now();
  const secondsLeft = Math.max(0, Math.ceil((nextRefreshTime - now) / 1000));

  if (secondsLeft <= 0) {
    browser.browserAction.setBadgeText({text: '0'});
    return;
  }
  
  // Zeige Sekunden an
  browser.browserAction.setBadgeText({text: secondsLeft.toString()});
  browser.browserAction.setBadgeBackgroundColor({color: '#4CAF50'});
}

function stopRefreshSchedule() {
  if (refreshInterval) {
    clearTimeout(refreshInterval);
    refreshInterval = null;
  }
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  nextRefreshTime = null;
  browser.browserAction.setBadgeText({text: ''});
}