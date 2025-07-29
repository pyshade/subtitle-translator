// ISO 639-1 language codes supported by the application
const SUPPORTED_LANGUAGE_CODES = [
  'en', 'zh', 'zh-hant', 'es', 'de', 'pt-br', 'pt-pt', 'ar', 'ja', 'ko', 'ru', 'fr', 'it', 
  'tr', 'pl', 'uk', 'ro', 'hu', 'cs', 'sk', 'bg', 'sv', 'da', 'fi', 'nb', 'lt', 'lv', 'et', 
  'el', 'sl', 'nl', 'id', 'ms', 'vi', 'hi', 'bn', 'bho', 'mr', 'gu', 'ta', 'te', 'kn', 'th', 
  'fil', 'jv', 'he', 'am', 'fa', 'ha', 'sw', 'uz', 'kk', 'ky', 'tk', 'ur', 'hr'
];

/**
 * Validates if a language code follows ISO 639-1 standard
 * @param {string} languageCode - The language code to validate
 * @returns {boolean} - True if the code is valid
 */
function isValidISO639Code(languageCode) {
  return SUPPORTED_LANGUAGE_CODES.includes(languageCode);
}

/**
 * Generates a properly formatted filename with language code suffix
 * @param {string} originalFileName - The original file name (with or without extension)
 * @param {string} languageCode - The target language code (ISO 639-1)
 * @param {string} fileExtension - The file extension (e.g., 'srt', 'vtt')
 * @returns {string|null} - Formatted filename or null if language code is invalid
 */
function generateTranslatedFileName(originalFileName, languageCode, fileExtension) {
  // Validate language code
  if (!isValidISO639Code(languageCode)) {
    console.warn(`Invalid language code for filename: ${languageCode}. Must follow ISO 639-1 standard.`);
    return null;
  }
  
  // Remove existing extension from original filename
  const lastDotIndex = originalFileName.lastIndexOf('.');
  const fileNameWithoutExt = lastDotIndex !== -1 
    ? originalFileName.slice(0, lastDotIndex) 
    : originalFileName;
  
  // Ensure extension doesn't have leading dot
  const cleanExtension = fileExtension.startsWith('.') 
    ? fileExtension.slice(1) 
    : fileExtension;
  
  // Generate filename with pattern: filename_{languageCode}.extension
  return `${fileNameWithoutExt}_${languageCode}.${cleanExtension}`;
}

/**
 * Validates and generates filename for batch processing
 * @param {string} originalFileName - Original filename
 * @param {string} languageCode - Target language code
 * @param {string} fileExtension - File extension
 * @returns {string} - Valid filename or fallback filename
 */
function generateSafeFileName(originalFileName, languageCode, fileExtension) {
  const validFileName = generateTranslatedFileName(originalFileName, languageCode, fileExtension);
  
  if (validFileName) {
    return validFileName;
  }
  
  // Fallback to original naming pattern if language code is invalid
  console.warn(`Using fallback filename for invalid language code: ${languageCode}`);
  const lastDotIndex = originalFileName.lastIndexOf('.');
  const fileNameWithoutExt = lastDotIndex !== -1 
    ? originalFileName.slice(0, lastDotIndex) 
    : originalFileName;
  const cleanExtension = fileExtension.startsWith('.') 
    ? fileExtension.slice(1) 
    : fileExtension;
  
  return `${fileNameWithoutExt}_translated.${cleanExtension}`;
}

module.exports = {
  isValidISO639Code,
  generateTranslatedFileName,
  generateSafeFileName,
  SUPPORTED_LANGUAGE_CODES
};