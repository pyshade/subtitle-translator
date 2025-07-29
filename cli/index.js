#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { translateSubtitles } = require('./translator');
const { detectSubtitleFormat, filterSubLines } = require('./utils/subtitleUtils');
const { TRANSLATION_SERVICES } = require('./utils/translateAPI');

const program = new Command();

program
  .name('subtitle-translator')
  .description('CLI tool for batch subtitle translation')
  .version('1.0.0');

program
  .command('translate <input>')
  .description('Translate subtitle files')
  .option('-o, --output <path>', 'Output directory')
  .option('-t, --target <lang>', 'Target language code')
  .option('-s, --source <lang>', 'Source language code')
  .option('-m, --method <method>', 'Translation method')
  .option('-k, --api-key <key>', 'API key for translation service')
  .option('-b, --bilingual', 'Create bilingual subtitles')
  .option('--config <path>', 'Path to configuration file')
  .option('--dry-run', 'Show what would be translated without actually doing it')
  .action(async (input, options) => {
    try {
      await translateSubtitles(input, options);
    } catch (error) {
      console.error('Translation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('detect <file>')
  .description('Detect subtitle format')
  .action(async (file) => {
    try {
      if (!fs.existsSync(file)) {
        console.error('File not found:', file);
        process.exit(1);
      }

      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      const format = detectSubtitleFormat(lines);
      
      console.log(`File: ${file}`);
      console.log(`Format: ${format}`);
      
      if (format !== 'error') {
        const { contentLines } = filterSubLines(lines, format);
        console.log(`Content lines: ${contentLines.length}`);
      }
    } catch (error) {
      console.error('Detection failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-methods')
  .description('List available translation methods')
  .action(() => {
    console.log('Available translation methods:');
    TRANSLATION_SERVICES.forEach(service => {
      console.log(`  ${service.value} - ${service.label}`);
      if (service.docs) {
        console.log(`    Docs: ${service.docs}`);
      }
    });
  });

program
  .command('config')
  .description('Generate configuration file template')
  .option('-o, --output <path>', 'Output path for config file', './subtitle-translator.config.json')
  .action((options) => {
    const config = {
      translationMethod: 'gtxFreeAPI',
      sourceLanguage: 'auto',
      targetLanguage: 'en',
      bilingualSubtitle: false,
      outputDir: './translated',
      apiConfigs: {
        deepl: {
          apiKey: '',
          url: '',
          chunkSize: 128000,
          delayTime: 200,
          limit: 20
        },
        openai: {
          apiKey: '',
          model: 'gpt-4o-mini',
          temperature: 1.3,
          limit: 20
        },
        google: {
          apiKey: '',
          delayTime: 200,
          limit: 100
        }
      },
      llmPrompts: {
        system: 'You are a professional subtitle translator. Translate the given subtitle text accurately while preserving timing and formatting.',
        user: 'Translate the following subtitle text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text without any additional explanation:\n\n${content}'
      }
    };

    fs.writeFileSync(options.output, JSON.stringify(config, null, 2));
    console.log(`Configuration template created at: ${options.output}`);
  });

if (process.argv.length < 3) {
  program.help();
}

program.parse();