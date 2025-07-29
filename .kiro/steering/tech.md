# Technology Stack

## Framework & Runtime
- **Next.js 14.2.30**: React framework with App Router and static export configuration
- **React 18**: UI library with TypeScript support
- **Node.js 18.18+**: Required runtime environment

## Build System & Package Management
- **Yarn 1.22.22**: Package manager (preferred over npm)
- **TypeScript 5.8.3**: Type system with relaxed strict mode
- **ESLint**: Code linting with Next.js configuration

## Styling & UI
- **Tailwind CSS 3.4.17**: Utility-first CSS framework with `important: true` config
- **Ant Design 5.26.3**: Primary UI component library
- **PostCSS**: CSS processing with autoprefixer

## Internationalization
- **next-intl 4.2.0**: Internationalization with 14 supported locales
- **Locale routing**: Dynamic routes with `[locale]` parameter
- **RTL support**: Right-to-left language detection

## Key Libraries
- **deepl-node**: DeepL translation API integration
- **opencc-js**: Chinese text conversion
- **jschardet**: Character encoding detection
- **file-saver**: Client-side file downloads
- **spark-md5**: File hashing for caching
- **p-limit & p-retry**: Concurrency control and retry logic

## Development Commands
```bash
# Install dependencies
yarn

# Development server
yarn dev

# Production build (all languages)
yarn build

# Language-specific builds
yarn build:lang en
yarn build:lang zh
yarn build:lang zh-hant

# Start production server
yarn start

# Linting
yarn lint

# Update dependencies
yarn update
```

## Deployment Configuration
- **Static export**: Configured for static site generation
- **Asset optimization**: Images set to unoptimized for static export
- **Multi-platform**: Supports Cloudflare, Vercel, EdgeOne deployment
- **Docker support**: Includes Dockerfile and docker-entrypoint.sh