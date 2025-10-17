document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');

  document.getElementById("muteBtn").addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "stopNotification" });
  });


  // Lade gespeicherte Werte
  browser.storage.local.get(['isActive', 'targetTime', 'timeSlots']).then(data => {
    updateStatus(data.isActive);
    
    if (data.targetTime) {
      document.getElementById('targetTime').value = data.targetTime;
    }
    
    if (data.timeSlots) {
      for (let i = 0; i < 4; i++) {
        if (data.timeSlots[i]) {
          document.getElementById(`minutes${i+1}`).value = data.timeSlots[i].minutes;
          document.getElementById(`rate${i+1}`).value = data.timeSlots[i].rate;
        }
      }
    }
  });

  startBtn.addEventListener('click', function() {
    const targetTime = document.getElementById('targetTime').value;
    
    if (!targetTime) {
      alert('Bitte einen Ziel-Zeitpunkt eingeben!');
      return;
    }

    const timeSlots = [];
    for (let i = 1; i <= 4; i++) {
      const minutes = document.getElementById(`minutes${i}`).value;
      const rate = document.getElementById(`rate${i}`).value;
      
      if (minutes && rate) {
        timeSlots.push({
          minutes: parseInt(minutes),
          rate: parseInt(rate)
        });
      }
    }

    // Sortiere Zeitfenster nach Minuten (größte zuerst)
    timeSlots.sort((a, b) => b.minutes - a.minutes);

    const config = {
      isActive: true,
      targetTime: targetTime,
      timeSlots: timeSlots
    };

    browser.storage.local.set(config).then(() => {
      // Sende Nachricht an Content Script
      browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
        browser.tabs.sendMessage(tabs[0].id, {action: 'start', config: config});
      });
      
      // Sende Nachricht an Background Script für Refresh-Management
      browser.runtime.sendMessage({action: 'startRefresh', config: config});
      
      updateStatus(true);
    });
  });

  stopBtn.addEventListener('click', function() {
    browser.storage.local.set({isActive: false}).then(() => {
      browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
        browser.tabs.sendMessage(tabs[0].id, {action: 'stop'});
      });
      
      browser.runtime.sendMessage({action: 'stopRefresh'});
      
      updateStatus(false);
    });
  });

  function updateStatus(isActive) {
    if (isActive) {
      statusDiv.textContent = 'Status: Aktiv';
      statusDiv.className = 'status active';
    } else {
      statusDiv.textContent = 'Status: Inaktiv';
      statusDiv.className = 'status inactive';
    }
  }
});