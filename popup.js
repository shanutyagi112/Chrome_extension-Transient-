document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  setupEventListeners();
});
 
function setupEventListeners() {
  // Toggle switches
  document.getElementById('selectToggle').addEventListener('click', () => {
    toggleSwitch('selectToggle');
    autoSaveSettings();
  });
  
  document.getElementById('textbarToggle').addEventListener('click', () => {
    toggleSwitch('textbarToggle');
    autoSaveSettings();
  });
  
  document.getElementById('serviceTypeToggle').addEventListener('click', () => {
    toggleServiceType();
    autoSaveSettings();
  });
  
  // Language selectors - auto-save on change
  document.getElementById('selectTargetLang').addEventListener('change', autoSaveSettings);
  document.getElementById('textbarSourceLang').addEventListener('change', autoSaveSettings);
  document.getElementById('textbarTargetLang').addEventListener('change', autoSaveSettings);
  
  // Service selection - auto-save on change
  document.getElementById('freeServiceSelect').addEventListener('change', autoSaveSettings);
  document.getElementById('paidServiceSelect').addEventListener('change', () => {
    updatePaidServiceConfig();
    autoSaveSettings();
  });
  
  // API keys - auto-save on input with debounce
  let debounceTimer;
  
  document.getElementById('microsoftApiKey').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(autoSaveSettings, 1000);
  });
  
  document.getElementById('geminiApiKey').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(autoSaveSettings, 1000);
  });
}

function toggleSwitch(toggleId) {
  const toggle = document.getElementById(toggleId);
  toggle.classList.toggle('active');
}

function toggleServiceType() {
  const toggle = document.getElementById('serviceTypeToggle');
  const label = document.getElementById('serviceTypeLabel');
  const freeServices = document.getElementById('freeServices');
  const paidServices = document.getElementById('paidServices');
  
  toggle.classList.toggle('active');
  
  if (toggle.classList.contains('active')) {
    label.textContent = 'Paid Services';
    freeServices.classList.add('hidden');
    paidServices.classList.remove('hidden');
  } else {
    label.textContent = 'Free Services';
    freeServices.classList.remove('hidden');
    paidServices.classList.add('hidden');
  }
}

function updatePaidServiceConfig() {
  const selectedService = document.getElementById('paidServiceSelect').value;
  const microsoftConfig = document.getElementById('microsoftConfig');
  const geminiConfig = document.getElementById('geminiConfig');
  
  // Hide all configs
  microsoftConfig.classList.add('hidden');
  geminiConfig.classList.add('hidden');
  
  // Show relevant config
  if (selectedService === 'microsoft') {
    microsoftConfig.classList.remove('hidden');
  } else if (selectedService === 'gemini') {
    geminiConfig.classList.remove('hidden');
  }
}

function loadSettings() {
  chrome.storage.sync.get([
    'selectTranslation',
    'selectTargetLang',
    'textbarTranslation',
    'textbarSourceLang',
    'textbarTargetLang',
    'serviceType',
    'freeService',
    'paidService',
    'microsoftApiKey',
    'geminiApiKey'
  ], function(result) {
    // Selection translation
    document.getElementById('selectToggle').classList.toggle('active', result.selectTranslation || false);
    document.getElementById('selectTargetLang').value = result.selectTargetLang || 'en';
    
    // Textbar translation
    document.getElementById('textbarToggle').classList.toggle('active', result.textbarTranslation || false);
    document.getElementById('textbarSourceLang').value = result.textbarSourceLang || 'auto';
    document.getElementById('textbarTargetLang').value = result.textbarTargetLang || 'en';
    
    // Service type
    const isPaid = result.serviceType === 'paid';
    document.getElementById('serviceTypeToggle').classList.toggle('active', isPaid);
    document.getElementById('serviceTypeLabel').textContent = isPaid ? 'Paid Services' : 'Free Services';
    document.getElementById('freeServices').classList.toggle('hidden', isPaid);
    document.getElementById('paidServices').classList.toggle('hidden', !isPaid);
    
    // Service selection
    document.getElementById('freeServiceSelect').value = result.freeService || 'multi-free';
    document.getElementById('paidServiceSelect').value = result.paidService || 'microsoft';
    
    // API keys
    document.getElementById('microsoftApiKey').value = result.microsoftApiKey || '';
    document.getElementById('geminiApiKey').value = result.geminiApiKey || '';
    
    // Update paid service config
    updatePaidServiceConfig();
  });
}

function autoSaveSettings() {
  const settings = {
    selectTranslation: document.getElementById('selectToggle').classList.contains('active'),
    selectTargetLang: document.getElementById('selectTargetLang').value,
    textbarTranslation: document.getElementById('textbarToggle').classList.contains('active'),
    textbarSourceLang: document.getElementById('textbarSourceLang').value,
    textbarTargetLang: document.getElementById('textbarTargetLang').value,
    serviceType: document.getElementById('serviceTypeToggle').classList.contains('active') ? 'paid' : 'free',
    freeService: document.getElementById('freeServiceSelect').value,
    paidService: document.getElementById('paidServiceSelect').value,
    microsoftApiKey: document.getElementById('microsoftApiKey').value,
    geminiApiKey: document.getElementById('geminiApiKey').value
  };
  
  chrome.storage.sync.set(settings, function() {
    // Visual feedback for auto-save
    const indicator = document.querySelector('.auto-save-indicator');
    indicator.style.background = 'rgba(40, 167, 69, 0.3)';
    indicator.style.transform = 'scale(1.02)';
    
    setTimeout(() => {
      indicator.style.background = 'rgba(40, 167, 69, 0.2)';
      indicator.style.transform = 'scale(1)';
    }, 500);
    
    // Notify content scripts
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settingsUpdated',
          settings: settings
        }).catch(() => {}); // Ignore errors for inactive tabs
      });
    });
  });
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.classList.remove('hidden');
  
  setTimeout(() => {
    status.classList.add('hidden');
  }, 3000);
}
