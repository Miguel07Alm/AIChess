# Chess AI App

A modern chess application built with Next.js that features both AI and online multiplayer gameplay modes.

## Features

- 🤖 Play against an AI powered by OpenAI
- 🎮 Real-time online multiplayer
- 💬 In-game chat with AI strategic advice
- 📊 Game statistics and analysis
- 🎨 Dark/Light theme support
- 📱 Responsive design for mobile and desktop
- ♟️ Drag and drop piece movement
- ⏱️ Game timer support
- 🔄 Move history and game review

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- An OpenAI API key for AI gameplay features

## Environment Setup

Create a `.env` file in the root directory with:

```env
OPENAI_API_KEY=your_api_key_here
```

This API key is required for:
- AI opponent moves
- Strategic chat advice
- Game analysis

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chess-ai-app.git
cd chess-ai-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Game Modes

### AI Mode
- Play against an AI opponent powered by OpenAI
- Receive strategic advice and move analysis
- Multiple difficulty levels (coming soon)

### Online Mode
- Real-time multiplayer games
- WebRTC peer-to-peer connection
- In-game chat with opponents
- Spectator mode support

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: TailwindCSS + Shadcn/ui
- **State Management**: React Context
- **Multiplayer**: WebRTC
- **AI Integration**: OpenAI API + Vercel AI SDK
- **Animations**: Framer Motion
- **Drag & Drop**: Atlaskit Pragmatic Drag and Drop

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - See [LICENSE](LICENSE) for details
