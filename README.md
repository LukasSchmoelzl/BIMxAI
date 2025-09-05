# BIM Viewer with AI Integration

A modern BIM (Building Information Modeling) viewer built with Next.js 15 and enhanced with Claude AI integration for intelligent building analysis and querying.

Check out the newest Version:
app.lukas-bim.de

My Blog:
linkedin.com/in/lukas-schmölzl/

Homepage
lukas-bim.de

## Features

- **3D BIM Visualization**: Advanced 3D viewer using @thatopen/components v3 and Three.js
- **AI-Powered Analysis**: Integrated Claude AI for natural language queries about BIM data
- **Smart Chunks System**: Memory-efficient BIM data processing with chunk-based loading
- **Event-Driven Architecture**: Centralized event bus for loose coupling
- **Fragment-Based Loading**: Efficient .frag file loading for large models
- **Spatial Indexing**: Octree-based spatial queries for geometric analysis
- **Real-time Highlighting**: Interactive entity highlighting and selection
- **Modern UI**: Clean interface built with Tailwind CSS and Radix UI components

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Claude API key from Anthropic

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add your Claude API key:
```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
NEXTAUTH_URL=http://localhost:3010
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3010](http://localhost:3010) in your browser.

## Available Scripts

### Development
- `npm run dev` - Start development server on port 3010
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

### Code Generation
- `npm run generate:schemas` - Regenerate FlatBuffer TypeScript definitions
- `npm run generate:fragments` - Generate fragment data from IFC models
- `npm run audit:css` - Audit CSS usage in the project

## Architecture Overview

### Client-Only Rendering
The application uses a client-only rendering approach to avoid SSR issues with WebGL/Three.js:
- Entire app wrapped in dynamic import with `ssr: false`
- All 3D and BIM components load client-side only

### Smart Chunks System
Efficient BIM data processing with:
- Chunk-based loading with LRU cache
- Token limits (target: 3000, max: 4000 tokens per chunk)
- Spatial indexing using Octree for 3D queries
- FlatBuffers for binary serialization

### AI Integration
Claude AI integration provides:
- Natural language querying of BIM data
- 6 consolidated AI tools for different analysis types
- Context-aware responses with relevant BIM information
- Smart context assembly for optimal token usage

### Event-Driven Architecture
Centralized EventBus handles:
- Model loading events
- Entity selection and highlighting
- Chunk loading status
- Fragment processing events

## Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **3D Engine**: Three.js, @thatopen/components v3, @thatopen/fragments v3
- **AI**: Anthropic Claude API
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **Data Processing**: FlatBuffers, web-ifc
- **State Management**: Zustand, Custom Event Bus

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── bim-viewer/        # 3D viewer components
│   ├── bim-context/       # Smart chunks system
│   └── chat-tools/        # AI tool implementations
├── features/              # Feature-based modules
├── core/                  # Core utilities (events, chunks, spatial)
├── components/            # Shared UI components
├── types/                 # TypeScript definitions
├── styles/               # Global CSS and variables
└── utils/                # Utility functions
```

## Environment Variables

Required environment variables for `.env.local`:

```bash
# Claude AI API Key (Required)
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Application URLs
NEXTAUTH_URL=http://localhost:3010

## Development Notes

- **TypeScript**: Strict mode is disabled - exercise caution with type safety
- **Performance**: Fragment loading includes camera initialization checks
- **Debugging**: Comprehensive debug commands available in development mode
- **CSS**: DRY principle with centralized CSS variables in `src/styles/`


See [docs/DEBUG_COMMANDS.md](./docs/DEBUG_COMMANDS.md) for complete documentation.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please use the GitHub Issues tab or contact the development team.