import { languages } from "@/app/components/languages";

/**
 * Validates if a language code follows ISO 639-1 standard
 * @param languageCode - The language code to validate
 * @returns boolean indicating if the code is valid
 */
export const isValidISO639Code = (languageCode: string): boolean => {
  // Find the language in our supported languages list
  const language = languages.find(lang => lang.value === languageCode);
  
  // Exclude 'auto' as it's not a valid ISO 639-1 code for file naming
  if (!language || language.value === 'auto') {
    return false;
  }
  
  return true;
};

/**
 * Generates a properly formatted filename with language code suffix
 * @param originalFileName - The original file name (with or without extension)
 * @param languageCode - The target language code (ISO 639-1)
 * @param fileExtension - The file extension (e.g., 'srt', 'vtt')
 * @param outputFormat - Optional output format override
 * @returns Formatted filename or null if language code is invalid
 */
export const generateTranslatedFileName = (
  originalFileName: string,
  languageCode: string,
  fileExtension: string,
  outputFormat?: string
): string | null => {
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
  
  // Use output format if provided, otherwise use the original file extension
  const finalExtension = outputFormat || fileExtension;
  
  // Ensure extension doesn't have leading dot
  const cleanExtension = finalExtension.startsWith('.') 
    ? finalExtension.slice(1) 
    : finalExtension;
  
  // Generate filename with pattern: filename_{languageCode}.extension
  return `${fileNameWithoutExt}_${languageCode}.${cleanExtension}`;
};

/**
 * Gets the ISO 639-1 language code from our language options
 * @param languageValue - The language value from our system
 * @returns The ISO 639-1 code or null if invalid
 */
export const getISO639Code = (languageValue: string): string | null => {
  const language = languages.find(lang => lang.value === languageValue);
  
  if (!language || language.value === 'auto') {
    return null;
  }
  
  return language.value;
};

/**
 * Validates and generates filename for batch processing
 * @param originalFileName - Original filename
 * @param languageCode - Target language code
 * @param fileExtension - File extension
 * @param outputFormat - Optional output format override
 * @returns Valid filename or fallback filename
 */
export const generateSafeFileName = (
  originalFileName: string,
  languageCode: string,
  fileExtension: string,
  outputFormat?: string
): string => {
  const validFileName = generateTranslatedFileName(originalFileName, languageCode, fileExtension, outputFormat);
  
  if (validFileName) {
    return validFileName;
  }
  
  // Fallback to original naming pattern if language code is invalid
  console.warn(`Using fallback filename for invalid language code: ${languageCode}`);
  const lastDotIndex = originalFileName.lastIndexOf('.');
  const fileNameWithoutExt = lastDotIndex !== -1 
    ? originalFileName.slice(0, lastDotIndex) 
    : originalFileName;
  
  // Use output format if provided, otherwise use the original file extension
  const finalExtension = outputFormat || fileExtension;
  const cleanExtension = finalExtension.startsWith('.') 
    ? finalExtension.slice(1) 
    : finalExtension;
  
  return `${fileNameWithoutExt}_translated.${cleanExtension}`;
};