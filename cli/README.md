# Subtitle Translator CLI

Una interfaccia a riga di comando per tradurre file di sottotitoli in batch utilizzando vari servizi di traduzione.

## Installazione

```bash
# Installa le dipendenze
yarn install

# Rendi eseguibile la CLI (opzionale)
chmod +x cli/index.js
```

## Utilizzo

### Comandi Principali

#### Traduzione di File/Directory

```bash
# Traduzione base con GTX API gratuita
yarn cli translate input.srt

# Traduzione con parametri personalizzati
yarn cli translate input.srt -t it -s en -o ./output

# Traduzione di una directory intera
yarn cli translate ./subtitles -t es -m deepl -k YOUR_API_KEY

# Sottotitoli bilingue
yarn cli translate input.srt -t fr -b

# Modalità dry-run (anteprima senza modifiche)
yarn cli translate input.srt --dry-run
```

#### Rilevamento Formato

```bash
# Rileva il formato di un file di sottotitoli
yarn cli detect input.srt
```

#### Lista Metodi di Traduzione

```bash
# Mostra tutti i metodi di traduzione disponibili
yarn cli list-methods
```

#### Generazione File di Configurazione

```bash
# Crea un template di configurazione
yarn cli config -o my-config.json
```

### Opzioni Disponibili

| Opzione | Descrizione | Default |
|---------|-------------|---------|
| `-t, --target <lang>` | Lingua di destinazione | `en` |
| `-s, --source <lang>` | Lingua di origine | `auto` |
| `-m, --method <method>` | Metodo di traduzione | `gtxFreeAPI` |
| `-k, --api-key <key>` | Chiave API per il servizio | - |
| `-o, --output <path>` | Directory di output | `./translated` |
| `-b, --bilingual` | Crea sottotitoli bilingue | `false` |
| `--format <format>` | Formato di output (srt, ass, vtt, lrc, auto) | `auto` |
| `--encoding <encoding>` | Codifica del file di output | `utf8` |
| `--parallel <number>` | Numero di traduzioni parallele (1-10) | `3` |
| `--delay <ms>` | Ritardo tra chiamate API in millisecondi | `1000` |
| `--config <path>` | File di configurazione JSON | - |
| `--dry-run` | Anteprima senza modifiche | `false` |
| `-v, --verbose` | Output dettagliato per debug | `false` |

### Variabili d'Ambiente

La CLI supporta variabili d'ambiente per le chiavi API:

```bash
export DEEPL_API_KEY="your-deepl-key"
export OPENAI_API_KEY="your-openai-key"
export GOOGLE_API_KEY="your-google-key"
export AZURE_API_KEY="your-azure-key"
export DEEPSEEK_API_KEY="your-deepseek-key"
export GROQ_API_KEY="your-groq-key"
export SILICONFLOW_API_KEY="your-siliconflow-key"
export OPENROUTER_API_KEY="your-openrouter-key"
```

### Esempi Avanzati

```bash
# Traduzione con controllo del parallelismo
yarn cli translate input.srt -t zh --parallel 5 --delay 2000

# Output dettagliato per debug
yarn cli translate input.srt -t ru -v

# Usa variabili d'ambiente per le chiavi API
export DEEPL_API_KEY="your-key-here"
yarn cli translate input.srt -t pt -m deepl

# Rilevamento formato con dettagli
yarn cli detect input.srt -v

# Lista metodi con documentazione
yarn cli list-methods -v

# Configurazione personalizzata
yarn cli config --method openai --target it -o custom-config.json
```

### Metodi di Traduzione Supportati

#### Gratuiti
- **gtxFreeAPI** - Google Translate gratuito (default)
- **deeplx** - DeepL gratuito (richiede URL)

#### A Pagamento
- **google** - Google Translate API
- **deepl** - DeepL API
- **azure** - Azure Translator
- **openai** - OpenAI GPT
- **deepseek** - DeepSeek AI
- **groq** - Groq AI
- **siliconflow** - SiliconFlow
- **openrouter** - OpenRouter
- **azureopenai** - Azure OpenAI
- **llm** - LLM personalizzato

### Formati Supportati

- **SRT** - SubRip Subtitle
- **ASS** - Advanced SubStation Alpha
- **VTT** - WebVTT
- **LRC** - LyRiCs

### Codici Lingua Supportati

| Codice | Lingua |
|--------|--------|
| `auto` | Rilevamento automatico |
| `en` | Inglese |
| `it` | Italiano |
| `es` | Spagnolo |
| `fr` | Francese |
| `de` | Tedesco |
| `zh` | Cinese |
| `ja` | Giapponese |
| `ko` | Coreano |
| `pt` | Portoghese |
| `ru` | Russo |
| `ar` | Arabo |
| `hi` | Hindi |

## File di Configurazione

Puoi creare un file di configurazione JSON per evitare di specificare le opzioni ogni volta:

```json
{
  "translationMethod": "deepl",
  "sourceLanguage": "en",
  "targetLanguage": "it",
  "bilingualSubtitle": false,
  "outputDir": "./translated",
  "apiConfigs": {
    "deepl": {
      "apiKey": "your-deepl-api-key",
      "url": "",
      "chunkSize": 128000,
      "delayTime": 200,
      "limit": 20
    },
    "openai": {
      "apiKey": "your-openai-api-key",
      "model": "gpt-4o-mini",
      "temperature": 1.3,
      "limit": 20
    }
  },
  "llmPrompts": {
    "system": "You are a professional subtitle translator.",
    "user": "Translate from ${sourceLanguage} to ${targetLanguage}: ${content}"
  }
}
```

Usa il file di configurazione:

```bash
yarn cli translate input.srt --config my-config.json
```

## Esempi Pratici

### Traduzione Singola con DeepL

```bash
yarn cli translate movie.srt -t it -m deepl -k your-deepl-key
```

### Traduzione Batch di una Directory

```bash
yarn cli translate ./movies -t es -m google -k your-google-key -o ./spanish-subs
```

### Sottotitoli Bilingue con OpenAI

```bash
yarn cli translate series.srt -t fr -m openai -k your-openai-key -b
```

### Anteprima Prima della Traduzione

```bash
yarn cli translate ./subtitles --dry-run -t de
```

## Risoluzione Problemi

### Errori Comuni

1. **File non trovato**: Verifica che il percorso del file sia corretto
2. **Formato non supportato**: Usa `yarn cli detect` per verificare il formato
3. **API key mancante**: Alcuni servizi richiedono una chiave API
4. **Rate limit**: Riduci la velocità di traduzione o usa un servizio diverso

### Debug

Aggiungi `DEBUG=1` prima del comando per output dettagliato:

```bash
DEBUG=1 yarn cli translate input.srt -t it
```

## Contribuire

Per contribuire al progetto:

1. Fork del repository
2. Crea un branch per la tua feature
3. Commit delle modifiche
4. Push al branch
5. Crea una Pull Request

## Licenza

MIT License - vedi il file LICENSE per i dettagli.