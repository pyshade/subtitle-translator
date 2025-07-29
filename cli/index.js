#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { translateSubtitles } = require('./translator');
const { detectSubtitleFormat, filterSubLines } = require('./utils/subtitleUtils');
const { TRANSLATION_SERVICES } = require('./utils/translateAPI');

// Load environment variables for API keys
const ENV_API_KEYS = {
  deepl: process.env.DEEPL_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  google: process.env.GOOGLE_API_KEY,
  azure: process.env.AZURE_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  groq: process.env.GROQ_API_KEY,
  siliconflow: process.env.SILICONFLOW_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY
};

const program = new Command();

program
  .name('subtitle-translator')
  .description('CLI tool for batch subtitle translation')
  .version('1.0.0');

program
  .command('translate <input>')
  .description('Translate subtitle files or directories')
  .option('-o, --output <path>', 'Output directory (default: ./translated)')
  .option('-t, --target <lang>', 'Target language code (e.g., en, it, es, fr)')
  .option('-s, --source <lang>', 'Source language code (default: auto-detect)')
  .option('-m, --method <method>', 'Translation method (default: gtxFreeAPI)')
  .option('-k, --api-key <key>', 'API key for translation service')
  .option('-b, --bilingual', 'Create bilingual subtitles with original and translated text')
  .option('--format <format>', 'Output format: srt, ass, vtt, lrc, auto (default: auto)', 'auto')
  .option('--encoding <encoding>', 'Output file encoding (default: utf8)', 'utf8')
  .option('--config <path>', 'Path to JSON configuration file')
  .option('--dry-run', 'Preview translation without making changes')
  .option('--parallel <number>', 'Number of parallel translations (1-10)', '3')
  .option('--delay <ms>', 'Delay between API calls in milliseconds', '1000')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (input, options) => {
    try {
      // Validate input
      if (!input || input.trim() === '') {
        console.error('❌ Error: Input file or directory path is required');
        process.exit(1);
      }

      // Check if input exists
      if (!fs.existsSync(input)) {
        console.error(`❌ Error: Input path "${input}" does not exist`);
        process.exit(1);
      }

      // Validate parallel option
      const parallel = parseInt(options.parallel);
      if (isNaN(parallel) || parallel < 1 || parallel > 10) {
        console.error('❌ Error: --parallel must be a number between 1 and 10');
        process.exit(1);
      }

      // Validate delay option
      const delay = parseInt(options.delay);
      if (isNaN(delay) || delay < 0) {
        console.error('❌ Error: --delay must be a non-negative number');
        process.exit(1);
      }

      // Validate format option
      const validFormats = ['srt', 'ass', 'vtt', 'lrc', 'auto'];
      if (!validFormats.includes(options.format)) {
        console.error(`❌ Error: --format must be one of: ${validFormats.join(', ')}`);
        process.exit(1);
      }

      // Validate method if provided
      if (options.method) {
        const validMethods = TRANSLATION_SERVICES.map(s => s.value);
        if (!validMethods.includes(options.method)) {
          console.error(`❌ Error: --method must be one of: ${validMethods.join(', ')}`);
          console.error('Use "list-methods" command to see all available methods');
          process.exit(1);
        }
      }

      // Validate config file if provided
      if (options.config && !fs.existsSync(options.config)) {
        console.error(`❌ Error: Configuration file "${options.config}" does not exist`);
        process.exit(1);
      }

      await translateSubtitles(input, options);
    } catch (error) {
      console.error('❌ Translation failed:', error.message);
      if (options.verbose) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('detect <file>')
  .description('Detect subtitle format and show file information')
  .option('-v, --verbose', 'Show detailed file information')
  .action(async (file, options) => {
    try {
      if (!fs.existsSync(file)) {
        console.error(`❌ Error: File "${file}" not found`);
        process.exit(1);
      }

      const stats = fs.statSync(file);
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      const format = detectSubtitleFormat(lines);
      
      console.log(`📁 File: ${file}`);
      console.log(`📏 Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`📄 Lines: ${lines.length}`);
      
      if (format === 'error') {
        console.log('❌ Format: Unknown or unsupported format');
        console.log('💡 Supported formats: SRT, ASS, VTT, LRC');
      } else {
        console.log(`✅ Format: ${format.toUpperCase()}`);
        
        const { contentLines } = filterSubLines(lines, format);
        console.log(`💬 Translatable lines: ${contentLines.length}`);
        
        if (options.verbose && contentLines.length > 0) {
          console.log('\n📝 Sample content:');
          const sampleLines = contentLines.slice(0, 3);
          sampleLines.forEach((line, index) => {
            console.log(`  ${index + 1}. ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`);
          });
          
          if (contentLines.length > 3) {
            console.log(`  ... and ${contentLines.length - 3} more lines`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Detection failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-methods')
  .description('List available translation methods')
  .option('-v, --verbose', 'Show detailed information including documentation links')
  .action((options) => {
    console.log('🌐 Available Translation Methods:\n');
    
    // Categorize services
    const freeServices = TRANSLATION_SERVICES.filter(s => 
      s.value === 'gtxFreeAPI' || s.value === 'deeplx'
    );
    const paidServices = TRANSLATION_SERVICES.filter(s => 
      !freeServices.includes(s) && !['deepseek', 'openai', 'azureopenai', 'siliconflow', 'groq', 'openrouter', 'llm'].includes(s.value)
    );
    const aiServices = TRANSLATION_SERVICES.filter(s => 
      ['deepseek', 'openai', 'azureopenai', 'siliconflow', 'groq', 'openrouter', 'llm'].includes(s.value)
    );

    // Display free services
    console.log('🆓 Free Services:');
    freeServices.forEach(service => {
      console.log(`  • ${service.value} - ${service.label}`);
      if (options.verbose && service.docs) {
        console.log(`    📖 Docs: ${service.docs}`);
      }
    });

    // Display paid services
    if (paidServices.length > 0) {
      console.log('\n💳 Paid API Services:');
      paidServices.forEach(service => {
        console.log(`  • ${service.value} - ${service.label}`);
        if (options.verbose && service.docs) {
          console.log(`    📖 Docs: ${service.docs}`);
        }
      });
    }

    // Display AI services
    console.log('\n🤖 AI/LLM Services:');
    aiServices.forEach(service => {
      console.log(`  • ${service.value} - ${service.label}`);
      if (options.verbose && service.docs) {
        console.log(`    📖 Docs: ${service.docs}`);
      }
    });

    console.log('\n💡 Usage: Use -m/--method option to specify translation method');
    console.log('   Example: subtitle-translator translate input.srt -t it -m deepl');
  });

program
  .command('config')
  .description('Generate configuration file template')
  .option('-o, --output <path>', 'Output path for config file', './subtitle-translator.config.json')
  .option('--method <method>', 'Set default translation method in config')
  .option('--target <lang>', 'Set default target language in config')
  .action((options) => {
    try {
      // Check if output file already exists
      if (fs.existsSync(options.output)) {
        console.log(`⚠️  Warning: Configuration file "${options.output}" already exists`);
        console.log('   Use a different filename or remove the existing file');
        process.exit(1);
      }

      // Validate method if provided
      if (options.method) {
        const validMethods = TRANSLATION_SERVICES.map(s => s.value);
        if (!validMethods.includes(options.method)) {
          console.error(`❌ Error: Invalid method "${options.method}"`);
          console.error(`Valid methods: ${validMethods.join(', ')}`);
          process.exit(1);
        }
      }

      const config = {
        translationMethod: options.method || 'gtxFreeAPI',
        sourceLanguage: 'auto',
        targetLanguage: options.target || 'en',
        bilingualSubtitle: false,
        outputDir: './translated',
        parallel: 3,
        delay: 1000,
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
          },
          azure: {
            apiKey: '',
            region: 'eastasia',
            chunkSize: 10000,
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
      console.log(`✅ Configuration template created at: ${options.output}`);
      console.log('\n📝 Next steps:');
      console.log('   1. Edit the configuration file to add your API keys');
      console.log('   2. Customize translation settings as needed');
      console.log(`   3. Use with: subtitle-translator translate input.srt --config ${options.output}`);
    } catch (error) {
      console.error('❌ Failed to create configuration file:', error.message);
      process.exit(1);
    }
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Translation interrupted by user');
  console.log('🧹 Cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Translation terminated');
  console.log('🧹 Cleaning up...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('🔍 This is likely a bug. Please report it.');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('🔍 This is likely a bug. Please report it.');
  process.exit(1);
});

if (process.argv.length < 3) {
  program.help();
}

program.parse();