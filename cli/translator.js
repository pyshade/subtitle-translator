const fs = require('fs');
const path = require('path');
const { detectSubtitleFormat, filterSubLines, getOutputFileExtension } = require('./utils/subtitleUtils');
const { TranslationService } = require('./utils/translateAPI');
const { processFiles, createOutputDir } = require('./utils/fileUtils');

class SubtitleTranslator {
  constructor(options = {}) {
    this.options = {
      translationMethod: 'gtxFreeAPI',
      sourceLanguage: 'auto',
      targetLanguage: 'en',
      bilingualSubtitle: false,
      outputDir: './translated',
      dryRun: false,
      ...options
    };

    this.translationService = new TranslationService(this.options);
    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };
  }

  async translateFile(filePath) {
    try {
      console.log(`Processing: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const format = detectSubtitleFormat(lines);

      if (format === 'error') {
        throw new Error('Unsupported subtitle format');
      }

      console.log(`  Format detected: ${format}`);

      const { contentLines, contentIndices } = filterSubLines(lines, format);
      
      if (contentLines.length === 0) {
        console.log('  No translatable content found, skipping...');
        this.stats.skipped++;
        return null;
      }

      console.log(`  Found ${contentLines.length} lines to translate`);

      if (this.options.dryRun) {
        console.log('  [DRY RUN] Would translate this file');
        return null;
      }

      // Translate content
      const translatedLines = await this.translationService.translateBatch(
        contentLines,
        this.options.sourceLanguage,
        this.options.targetLanguage
      );

      // Generate output
      const outputContent = this.generateOutput(
        lines,
        translatedLines,
        contentIndices,
        format
      );

      // Save translated file
      const outputPath = this.getOutputPath(filePath, format);
      createOutputDir(path.dirname(outputPath));
      fs.writeFileSync(outputPath, outputContent, 'utf8');

      console.log(`  ✓ Translated successfully: ${outputPath}`);
      this.stats.successful++;
      
      return outputPath;

    } catch (error) {
      console.error(`  ✗ Failed to translate ${filePath}: ${error.message}`);
      this.stats.failed++;
      return null;
    }
  }

  generateOutput(originalLines, translatedLines, contentIndices, format) {
    const outputLines = [...originalLines];
    
    // Replace original content with translated content
    translatedLines.forEach((translatedLine, index) => {
      const originalIndex = contentIndices[index];
      if (this.options.bilingualSubtitle) {
        // For bilingual subtitles, combine original and translated
        outputLines[originalIndex] = `${originalLines[originalIndex]}\n${translatedLine}`;
      } else {
        outputLines[originalIndex] = translatedLine;
      }
    });

    return outputLines.join('\n');
  }

  getOutputPath(inputPath, format) {
    const parsedPath = path.parse(inputPath);
    const extension = getOutputFileExtension(format, this.options.bilingualSubtitle);
    const suffix = this.options.bilingualSubtitle ? '_bilingual' : `_${this.options.targetLanguage}`;
    
    return path.join(
      this.options.outputDir,
      `${parsedPath.name}${suffix}.${extension}`
    );
  }

  async translateDirectory(dirPath) {
    const files = processFiles(dirPath);
    const subtitleFiles = files.filter(file => 
      /\.(srt|ass|vtt|lrc)$/i.test(file)
    );

    if (subtitleFiles.length === 0) {
      console.log('No subtitle files found in directory');
      return;
    }

    console.log(`Found ${subtitleFiles.length} subtitle files`);

    for (const file of subtitleFiles) {
      this.stats.processed++;
      await this.translateFile(file);
    }
  }

  printStats() {
    console.log('\n=== Translation Summary ===');
    console.log(`Total processed: ${this.stats.processed}`);
    console.log(`Successful: ${this.stats.successful}`);
    console.log(`Failed: ${this.stats.failed}`);
    console.log(`Skipped: ${this.stats.skipped}`);
  }
}

async function translateSubtitles(input, options) {
  let config = {};
  
  // Load config file if specified
  if (options.config && fs.existsSync(options.config)) {
    config = JSON.parse(fs.readFileSync(options.config, 'utf8'));
  }

  // Map CLI options to internal options, with CLI options taking precedence
  const translatorOptions = {
    translationMethod: options.method || config.translationMethod || 'gtxFreeAPI',
    sourceLanguage: options.source || config.sourceLanguage || 'auto',
    targetLanguage: options.target || config.targetLanguage || 'en',
    bilingualSubtitle: options.bilingual || config.bilingualSubtitle || false,
    outputDir: options.output || config.outputDir || './translated',
    dryRun: options.dryRun || false,
    apiConfigs: config.apiConfigs || {},
    llmPrompts: config.llmPrompts || {}
  };

  // Debug output
  if (process.env.DEBUG) {
    console.log('Config loaded:', config);
    console.log('CLI options:', options);
    console.log('Final options:', translatorOptions);
  }

  // Add API key if provided
  if (options.apiKey) {
    const method = translatorOptions.translationMethod;
    if (!translatorOptions.apiConfigs[method]) {
      translatorOptions.apiConfigs[method] = {};
    }
    translatorOptions.apiConfigs[method].apiKey = options.apiKey;
  }

  const translator = new SubtitleTranslator(translatorOptions);

  console.log('Starting subtitle translation...');
  console.log(`Method: ${translatorOptions.translationMethod}`);
  console.log(`Source: ${translatorOptions.sourceLanguage} → Target: ${translatorOptions.targetLanguage}`);
  console.log(`Output: ${translatorOptions.outputDir}`);
  
  if (translatorOptions.dryRun) {
    console.log('DRY RUN MODE - No files will be modified');
  }

  const inputStat = fs.statSync(input);
  
  if (inputStat.isDirectory()) {
    await translator.translateDirectory(input);
  } else {
    translator.stats.processed = 1;
    await translator.translateFile(input);
  }

  translator.printStats();
}

module.exports = { translateSubtitles, SubtitleTranslator };