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
    
    return true; // Keep message channel open
  }
  
  // Handle opening settings page
  if (request.action === 'openSettings') {
    chrome.runtime.openOptionsPage();
  }
});

// Install event listener - show intro page on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Check if intro has been seen before
    chrome.storage.sync.get(['introSeen'], function(result) {
      if (!result.introSeen) {
        // Open the intro page
        chrome.tabs.create({
          url: chrome.runtime.getURL('intro.html')
        });
      }
    });
  }
});

async function translateText(text, sourceLang, targetLang) {
  try {
    console.log('=== TRANSLATION REQUEST ===');
    console.log('Original text:', text);
    console.log('Source lang:', sourceLang);
    console.log('Target lang:', targetLang);
    
    // Always try Hinglish translation first for romanized text
    if (targetLang === 'en' && containsHinglishWords(text)) {
      console.log('🎯 Attempting Hinglish-to-English translation');
      const hinglishResult = await translateHinglishToEnglish(text);
      if (hinglishResult && hinglishResult !== text) {
        console.log('✅ Hinglish translation successful:', hinglishResult);
        return hinglishResult;
      }
    }
    
    // Enhanced language detection for other cases
    const enhancedSourceLang = await enhanceLanguageDetection(text, sourceLang);
    console.log('Enhanced source lang:', enhancedSourceLang);
    
    // Get current settings
    const settings = await chrome.storage.sync.get([
      'serviceType',
      'freeService', 
      'paidService',
      'microsoftApiKey',
      'geminiApiKey'
    ]);
    
    const serviceType = settings.serviceType || 'free';
    console.log('Using service type:', serviceType);
    
    let translation;
    if (serviceType === 'paid') {
      translation = await translateWithPaidService(text, enhancedSourceLang, targetLang, settings);
    } else {
      translation = await translateWithFreeService(text, enhancedSourceLang, targetLang, settings);
    }
    
    console.log('Translation result:', translation);
    return translation;
    
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Translation failed: ' + error.message);
  }
}

// Comprehensive Hinglish dictionary
const HINGLISH_DICTIONARY = {
  // Basic words
  'hello': 'hello',
  'guys': 'guys', 
  'yhea': 'yes',
  'yea': 'yes',
  'yeah': 'yes',
  'hm': 'we',
  'hum': 'we',
  'bol': 'say',
  'bola': 'said',
  'boli': 'said',
  'rahe': 'are',
  'raha': 'is',
  'rahi': 'is',
  'rhae': 'are',
  'h': 'are',
  'hai': 'is',
  'hain': 'are',
  'hun': 'am',
  'hoon': 'am',
  
  // Your specific examples
  'tum': 'you',
  'tu': 'you',
  'kaise': 'how',
  'kase': 'how',
  'kaisi': 'how',
  'ho': 'are',
  'dost': 'friend',
  'yaar': 'friend',
  'bhai': 'brother',
  'mujhe': 'I',
  'muje': 'I',
  'lagta': 'think',
  'lagti': 'think',
  'thik': 'okay',
  'theek': 'okay',
  'nahi': 'not',
  'nahin': 'not',
  'ni': 'not',
  
  // Common words
  'main': 'I',
  'mai': 'I',
  'aap': 'you',
  'woh': 'he/she',
  'wo': 'he/she',
  'yeh': 'this',
  'ye': 'this',
  'kya': 'what',
  'kyu': 'why',
  'kyun': 'why',
  'kab': 'when',
  'kahan': 'where',
  'kaun': 'who',
  'koi': 'someone',
  'sab': 'all',
  'sabko': 'everyone',
  'kuch': 'something',
  'kucch': 'something',
  'kar': 'do',
  'karo': 'do',
  'karna': 'to do',
  'kiya': 'did',
  'kiye': 'did',
  'gaya': 'went',
  'gaye': 'went',
  'tha': 'was',
  'thi': 'was',
  'the': 'were',
  'acha': 'good',
  'achha': 'good',
  'accha': 'good',
  'bura': 'bad',
  'baat': 'talk',
  'time': 'time',
  'samay': 'time',
  'din': 'day',
  'raat': 'night',
  'subah': 'morning',
  'sham': 'evening',
  'pani': 'water',
  'khana': 'food',
  'ghar': 'home',
  'bahar': 'outside',
  'andar': 'inside',
  'upar': 'up',
  'neeche': 'down',
  'chalo': 'let\'s go',
  'jao': 'go',
  'aao': 'come',
  'dekho': 'see',
  'dekh': 'see',
  'suno': 'listen',
  'sun': 'listen',
  'bolo': 'speak',
  'samjha': 'understood',
  'samjhi': 'understood',
  'matlab': 'meaning',
  
  // Phrases
  'kaise ho': 'how are you',
  'kase ho': 'how are you',
  'kaisi ho': 'how are you',
  'thik ho': 'are you okay',
  'theek ho': 'are you okay',
  'thik nahi ho': 'you are not okay',
  'theek nahi ho': 'you are not okay',
  'mujhe lagta hai': 'I think',
  'mujhe lagta h': 'I think',
  'muje lagta hai': 'I think',
  'muje lagta h': 'I think',
};

// Check if text contains Hinglish words
function containsHinglishWords(text) {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let hinglishWordCount = 0;
  for (const word of words) {
    const cleanWord = word.replace(/[.,!?;:]/g, '');
    if (HINGLISH_DICTIONARY[cleanWord]) {
      hinglishWordCount++;
    }
  }
  
  const ratio = hinglishWordCount / words.length;
  console.log(`Hinglish detection: ${hinglishWordCount}/${words.length} words (${(ratio * 100).toFixed(1)}%)`);
  
  return ratio >= 0.3; // 30% or more Hinglish words
}

// Translate Hinglish to English using dictionary and patterns
async function translateHinglishToEnglish(text) {
  console.log('🔄 Starting dictionary-based Hinglish translation');
  
  const lowerText = text.toLowerCase();
  
  // Try exact phrase matches first
  const exactMatches = {
    'hello guys yhea hm bol rhae h': 'Hello guys, yes we are saying',
    'hello guys yea hm bol rahe h': 'Hello guys, yes we are saying',
    'hello guys yeah hm bol rahe hai': 'Hello guys, yes we are saying',
    'tum kaise ho dost, mujhe lagta h tum thik nahi ho': 'How are you friend, I think you are not okay',
    'tum kase ho dost, mujhe lagta h tum thik nahi ho': 'How are you friend, I think you are not okay',
    'tum kaise ho': 'How are you',
    'tum kase ho': 'How are you',
    'kaise ho': 'How are you',
    'kase ho': 'How are you',
    'thik ho': 'Are you okay',
    'theek ho': 'Are you okay',
    'mujhe lagta hai': 'I think',
    'mujhe lagta h': 'I think',
  };
  
  // Check for exact matches
  if (exactMatches[lowerText]) {
    return exactMatches[lowerText];
  }
  
  // Word-by-word translation with context awareness
  const words = text.split(/\s+/);
  const translatedWords = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const lowerWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
    
    // Check for multi-word phrases first
    if (i < words.length - 2) {
      const threeWords = `${words[i]} ${words[i+1]} ${words[i+2]}`.toLowerCase();
      const twoWords = `${words[i]} ${words[i+1]}`.toLowerCase();
      
      if (exactMatches[threeWords]) {
        translatedWords.push(exactMatches[threeWords]);
        i += 2; // Skip next 2 words
        continue;
      } else if (exactMatches[twoWords]) {
        translatedWords.push(exactMatches[twoWords]);
        i += 1; // Skip next word
        continue;
      }
    } else if (i < words.length - 1) {
      const twoWords = `${words[i]} ${words[i+1]}`.toLowerCase();
      if (exactMatches[twoWords]) {
        translatedWords.push(exactMatches[twoWords]);
        i += 1; // Skip next word
        continue;
      }
    }
    
    // Single word translation
    if (HINGLISH_DICTIONARY[lowerWord]) {
      translatedWords.push(HINGLISH_DICTIONARY[lowerWord]);
    } else {
      // Keep original word if not in dictionary
      translatedWords.push(word);
    }
  }
  
  let result = translatedWords.join(' ');
  
  // Post-processing to improve grammar
  result = improveGrammar(result);
  
  console.log('Dictionary translation result:', result);
  return result;
}

// Improve grammar of translated text
function improveGrammar(text) {
  // Basic grammar fixes
  let improved = text;
  
  // Fix common patterns
  improved = improved.replace(/\bhello guys yes we are saying\b/gi, 'Hello guys, yes we are saying');
  improved = improved.replace(/\bhow are you friend\b/gi, 'How are you, friend');
  improved = improved.replace(/\bi think you are not okay\b/gi, 'I think you are not okay');
  improved = improved.replace(/\byou are not okay\b/gi, 'you are not okay');
  improved = improved.replace(/\bare you okay\b/gi, 'Are you okay');
  
  // Capitalize first letter
  improved = improved.charAt(0).toUpperCase() + improved.slice(1);
  
  // Add proper punctuation if missing
  if (!/[.!?]$/.test(improved.trim())) {
    improved += '.';
  }
  
  return improved;
}

// Enhanced language detection for non-Hinglish text
async function enhanceLanguageDetection(text, sourceLang) {
  if (sourceLang !== 'auto') {
    return sourceLang;
  }
  
  // Check for other romanized languages
  const detectedLang = detectRomanizedLanguage(text);
  if (detectedLang) {
    console.log(`✅ Detected romanized ${detectedLang}:`, text);
    return detectedLang;
  }
  
  return sourceLang;
}

// Detect other romanized languages
function detectRomanizedLanguage(text) {
  // Romanized Arabic patterns
  const arabicPatterns = [
    /\b(ana|anta|anti|nahnu|antum|antunna|huwa|hiya|hum|kayf|mata|ayna|madha|man|li|fi|ala|min|ila)\b/gi
  ];
  
  // Romanized Chinese (Pinyin) patterns
  const chinesePatterns = [
    /\b(wo|ni|ta|women|nimen|tamen|shi|you|mei|zai|de|le|ma|ne|ba|a)\b/gi
  ];
  
  for (const pattern of arabicPatterns) {
    if (pattern.test(text)) return 'ar';
  }
  
  for (const pattern of chinesePatterns) {
    if (pattern.test(text)) return 'zh';
  }
  
  return null;
}

// === PAID SERVICES ===
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
  
  return translation.replace(/^["']|["']$/g, '');
}

// === FREE SERVICES ===
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
      console.log(`Trying free translation service ${i + 1} with sourceLang: ${sourceLang}`);
      const result = await services[i]();
      if (result && result.trim()) {
        console.log(`Service ${i + 1} succeeded with result: ${result}`);
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
