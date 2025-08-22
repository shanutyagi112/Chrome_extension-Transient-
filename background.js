 // Multi-service translation background script 
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    translateText(request.text, request.sourceLang, request.targetLang)
      .then(translation => {
        sendResponse({ success: true, translation: translation });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; 
  }
  
  // Handle opening settings page
  if (request.action === 'openSettings') {
    chrome.runtime.openOptionsPage();
  }
});

async function translateText(text, sourceLang, targetLang) {
  try {
    // Get current settings
    const settings = await chrome.storage.sync.get([
      'serviceType',
      'freeService', 
      'paidService',
      'microsoftApiKey',
      'geminiApiKey'
    ]);
    
    const serviceType = settings.serviceType || 'free';
    
    if (serviceType === 'paid') {
      return await translateWithPaidService(text, sourceLang, targetLang, settings);
    } else {
      return await translateWithFreeService(text, sourceLang, targetLang, settings);
    }
    
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Translation failed: ' + error.message);
  }
}

// PAID SERVICES
async function translateWithPaidService(text, sourceLang, targetLang, settings) {
  const service = settings.paidService || 'microsoft';
  
  switch (service) {
    case 'microsoft':
      return await translateWithMicrosoft(text, sourceLang, targetLang, settings.microsoftApiKey);
    case 'gemini':
      return await translateWithGemini(text, sourceLang, targetLang, settings.geminiApiKey);
    default:
      throw new Error('Unknown paid service');
  }
}

async function translateWithMicrosoft(text, sourceLang, targetLang, apiKey) {
  if (!apiKey) {
    throw new Error('Microsoft API key is required');
  }
  
  const endpoint = 'https://api.cognitive.microsofttranslator.com';
  const params = new URLSearchParams({
    'api-version': '3.0',
    'to': targetLang
  });
  
  if (sourceLang !== 'auto') {
    params.append('from', sourceLang);
  }
  
  const response = await fetch(`${endpoint}/translate?${params}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Region': 'global'
    },
    body: JSON.stringify([{ text: text }])
  });
  
  if (!response.ok) {
    throw new Error(`Microsoft Translator failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data[0].translations[0].text;
}

async function translateWithGemini(text, sourceLang, targetLang, apiKey) {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }
  
  const languages = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
    'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi'
  };
  
  const targetLanguage = languages[targetLang] || targetLang;
  const sourceLanguage = sourceLang === 'auto' ? 'detected language' : (languages[sourceLang] || sourceLang);
  
  const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Return only the translated text without any explanations or additional content:\n\n${text}`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API failed: ${response.status}`);
  }
  
  const data = await response.json();
  const translation = data.candidates[0].content.parts[0].text.trim();
  
  // Remove quotes if they exist
  return translation.replace(/^["']|["']$/g, '');
}

// FREE SERVICES
async function translateWithFreeService(text, sourceLang, targetLang, settings) {
  const service = settings.freeService || 'multi-free';
  
  switch (service) {
    case 'google-web':
      return await translateWithGoogleWeb(text, sourceLang, targetLang);
    case 'libretranslate':
      return await translateWithLibreTranslate(text, sourceLang, targetLang);
    case 'mymemory':
      return await translateWithMyMemory(text, sourceLang, targetLang);
    case 'multi-free':
      return await translateWithMultiFree(text, sourceLang, targetLang);
    default:
      return await translateWithMultiFree(text, sourceLang, targetLang);
  }
}

async function translateWithMultiFree(text, sourceLang, targetLang) {
  const services = [
    () => translateWithGoogleWeb(text, sourceLang, targetLang),
    () => translateWithLibreTranslate(text, sourceLang, targetLang),
    () => translateWithMyMemory(text, sourceLang, targetLang)
  ];
  
  for (let i = 0; i < services.length; i++) {
    try {
      console.log(`Trying free translation service ${i + 1}`);
      const result = await services[i]();
      if (result && result.trim()) {
        console.log(`Service ${i + 1} succeeded`);
        return result;
      }
    } catch (error) {
      console.log(`Service ${i + 1} failed:`, error);
      if (i === services.length - 1) {
        throw error;
      }
    }
  }
}

async function translateWithGoogleWeb(text, sourceLang, targetLang) {
  const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
  const tl = targetLang;
  
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Google Translate failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  let translation = '';
  if (data && data[0]) {
    for (let segment of data[0]) {
      if (segment[0]) {
        translation += segment[0];
      }
    }
  }
  
  return translation.trim();
}

async function translateWithLibreTranslate(text, sourceLang, targetLang) {
  const response = await fetch('https://libretranslate.de/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: text,
      source: sourceLang === 'auto' ? 'auto' : sourceLang,
      target: targetLang,
      format: 'text'
    })
  });
  
  if (!response.ok) {
    throw new Error(`LibreTranslate failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.translatedText;
}

async function translateWithMyMemory(text, sourceLang, targetLang) {
  const langPair = sourceLang === 'auto' ? `en|${targetLang}` : `${sourceLang}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`MyMemory failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.responseStatus !== 200) {
    throw new Error('MyMemory API error');
  }
  
  return data.responseData.translatedText;
}
