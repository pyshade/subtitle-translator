const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Polyfill for fetch in Node.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const TRANSLATION_SERVICES = [
  { value: "gtxFreeAPI", label: "GTX API (Free)" },
  { value: "google", label: "Google Translate" },
  { value: "deepl", label: "DeepL" },
  { value: "azure", label: "Azure Translate" },
  { value: "deeplx", label: "DeepLX (Free)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openai", label: "OpenAI" },
  { value: "azureopenai", label: "Azure OpenAI" },
  { value: "siliconflow", label: "SiliconFlow" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "llm", label: "Custom LLM" }
];

const LLM_MODELS = ["deepseek", "openai", "azureopenai", "siliconflow", "groq", "openrouter", "llm"];

const defaultConfigs = {
  gtxFreeAPI: { limit: 100 },
  deeplx: { url: "", chunkSize: 1000, delayTime: 200, limit: 10 },
  deepl: { url: "", apiKey: "", chunkSize: 128000, delayTime: 200, limit: 20 },
  deepseek: { apiKey: "", model: "deepseek-chat", temperature: 1.3, limit: 1000 },
  openai: { apiKey: "", model: "gpt-4o-mini", temperature: 1.3, limit: 20 },
  azureopenai: { url: "", apiKey: "", model: "gpt-4o-mini", apiVersion: "2024-07-18", temperature: 1.3, limit: 20 },
  siliconflow: { apiKey: "", model: "deepseek-ai/DeepSeek-V3", temperature: 1.3, limit: 20 },
  groq: { apiKey: "", model: "gemma2-9b-it", temperature: 1.3, limit: 20 },
  openrouter: { apiKey: "", model: "deepseek/deepseek-chat-v3-0324:free", temperature: 1.3, limit: 20, siteUrl: "", siteName: "" },
  llm: { url: "http://127.0.0.1:11434/v1/chat/completions", apiKey: "", model: "llama3.2", temperature: 1.3, limit: 20 },
  azure: { apiKey: "", chunkSize: 10000, delayTime: 200, region: "eastasia", limit: 100 },
  google: { apiKey: "", delayTime: 200, limit: 100 }
};

// Simple hash function for caching
function simpleHash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

const getLanguageName = (value) => {
  const languageMap = {
    'en': 'English',
    'zh': 'Chinese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'auto': 'Auto-detect'
  };
  return languageMap[value] || value;
};

const getAIModelPrompt = (content, userPrompt, targetLanguage, sourceLanguage) => {
  let prompt = userPrompt || 'Translate the following subtitle text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text without any additional explanation:\n\n${content}';
  
  if (sourceLanguage === "auto") {
    prompt = prompt.replace(/from \${sourceLanguage} (to|into)/g, "into");
  }
  
  prompt = prompt
    .replace("${sourceLanguage}", getLanguageName(sourceLanguage))
    .replace("${targetLanguage}", getLanguageName(targetLanguage))
    .replace("${content}", content);
    
  return prompt;
};

class TranslationService {
  constructor(options = {}) {
    this.options = options;
    this.cache = new Map();
  }

  async translateText(text, sourceLanguage, targetLanguage) {
    // Skip translation if text is empty or languages are the same
    if (!text || !text.trim() || sourceLanguage === targetLanguage) {
      return text;
    }

    const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}_${this.options.translationMethod}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const method = this.options.translationMethod || 'gtxFreeAPI';
    const config = this.options.apiConfigs?.[method] || defaultConfigs[method] || {};

    try {
      let result;
      
      switch (method) {
        case 'gtxFreeAPI':
          result = await this.translateWithGTX(text, sourceLanguage, targetLanguage);
          break;
        case 'google':
          result = await this.translateWithGoogle(text, sourceLanguage, targetLanguage, config);
          break;
        case 'deepl':
          result = await this.translateWithDeepL(text, sourceLanguage, targetLanguage, config);
          break;
        case 'openai':
          result = await this.translateWithOpenAI(text, sourceLanguage, targetLanguage, config);
          break;
        default:
          throw new Error(`Unsupported translation method: ${method}`);
      }

      if (result) {
        this.cache.set(cacheKey, result);
      }
      
      return result || text; // Return original text if translation fails
    } catch (error) {
      console.error(`Translation failed for method ${method}:`, error.message);
      return text; // Return original text on error
    }
  }

  async translateWithGTX(text, sourceLanguage, targetLanguage) {
    const apiEndpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(apiEndpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data[0].map(part => part[0]).join("");
  }

  async translateWithGoogle(text, sourceLanguage, targetLanguage, config) {
    if (!config.apiKey) {
      throw new Error('Google Translate API key is required');
    }

    const requestBody = {
      q: text,
      target: targetLanguage,
      ...(sourceLanguage !== "auto" && { source: sourceLanguage }),
    };

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${config.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    return data.data.translations[0].translatedText;
  }

  async translateWithDeepL(text, sourceLanguage, targetLanguage, config) {
    if (!config.apiKey) {
      throw new Error('DeepL API key is required');
    }

    const requestBody = {
      text,
      target_lang: targetLanguage,
      authKey: config.apiKey,
      ...(sourceLanguage !== "auto" && { source_lang: sourceLanguage }),
    };

    const apiEndpoint = config.url || 'https://api-free.deepl.com/v2/translate';
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return data.translations[0].text;
  }

  async translateWithOpenAI(text, sourceLanguage, targetLanguage, config) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const sysPrompt = this.options.llmPrompts?.system || 'You are a professional subtitle translator. Translate the given subtitle text accurately while preserving timing and formatting.';
    const userPrompt = this.options.llmPrompts?.user || 'Translate the following subtitle text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text without any additional explanation:\n\n${content}';
    
    const prompt = getAIModelPrompt(text, userPrompt, targetLanguage, sourceLanguage);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: prompt },
        ],
        model: config.model || "gpt-4o-mini",
        temperature: Number(config.temperature || 1.3),
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async translateBatch(texts, sourceLanguage, targetLanguage) {
    const results = [];
    const batchSize = 5; // Process in small batches to avoid rate limits
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => 
        this.translateText(text, sourceLanguage, targetLanguage)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Progress indicator
      console.log(`  Progress: ${Math.min(i + batchSize, texts.length)}/${texts.length} lines translated`);
    }
    
    return results;
  }
}

module.exports = {
  TRANSLATION_SERVICES,
  LLM_MODELS,
  defaultConfigs,
  TranslationService
};