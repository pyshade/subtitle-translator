# Project Structure

## Root Level
- **Configuration files**: `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `package.json`
- **Docker setup**: `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore`
- **Build scripts**: `scripts/buildWithLang.js` for language-specific builds
- **Sitemap**: `next-sitemap.config.js` for SEO

## Source Organization (`src/`)

### App Directory (`src/app/`)
- **Root layout**: `layout.tsx`, `page.tsx`, `globals.css`
- **Internationalized routes**: `[locale]/` directory with locale-specific pages
- **API routes**: `api/` directory (e.g., `api/deepl/route.ts`)
- **Theme provider**: `ThemesProvider.tsx` for dark/light mode

### Feature Organization
```
src/app/
├── components/          # Reusable UI components
│   ├── languages.tsx    # Language selection logic
│   ├── translateAPI.tsx # Translation API configurations
│   └── TranslationSettings.tsx
├── hooks/              # Custom React hooks
│   ├── useFileUpload.ts
│   ├── useTranslateData.tsx
│   └── useCopyToClipboard.tsx
├── utils/              # Utility functions
│   ├── subtitleUtils.ts # Subtitle format handling
│   ├── fileUtils.ts    # File operations
│   ├── textUtils.ts    # Text processing
│   └── DataContext.tsx # Global state management
└── ui/                 # UI-specific components
    └── Navigation.tsx
```

### Internationalization (`src/i18n/`)
- **Routing config**: `routing.ts` with 14 supported locales
- **Navigation**: `navigation.ts` for locale-aware routing
- **Request handling**: `request.ts` for server-side i18n

### Translation Files (`messages/`)
- **14 language files**: `en.json`, `zh.json`, `zh-hant.json`, etc.
- **Structured namespaces**: `common`, `subtitle` sections in each file

## Key Architectural Patterns

### Component Structure
- **Client components**: Use `"use client"` directive for interactive components
- **Server components**: Default for static content and metadata generation
- **Hooks pattern**: Custom hooks for complex state management (file upload, translation data)

### File Naming Conventions
- **Pages**: `page.tsx` in directory-based routing
- **Layouts**: `layout.tsx` for nested layouts
- **Components**: PascalCase (e.g., `SubtitleTranslator.tsx`)
- **Utilities**: camelCase (e.g., `subtitleUtils.ts`)
- **Hooks**: `use` prefix (e.g., `useFileUpload.ts`)

### State Management
- **Local state**: React hooks for component-specific state
- **Context**: `DataContext.tsx` for global application state
- **Custom hooks**: Encapsulate complex state logic and side effects

### Import Patterns
- **Absolute imports**: Use `@/` alias for `src/` directory
- **Barrel exports**: `utils/index.ts` for utility re-exports
- **Component imports**: Direct imports from component files