# Ansyc RT - Real-time Speech Translation

A real-time speech-to-text and translation application with Picture-in-Picture support.

## Features

- 🎤 Real-time speech recognition (Japanese)
- 🌐 Live translation (Japanese to Chinese)
- 🖼️ Picture-in-Picture mode for overlay display
- 🔊 Multiple microphone support
- 💾 Automatic text history

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Get your Soniox API key:

   - Visit [Soniox](https://soniox.com/) to create an account and get your API key
   - The API key will be securely stored in your browser's localStorage

3. Start the development server:

```bash
pnpm dev
```

## Usage

1. Enter your Soniox API key in the input field
2. Select your preferred microphone
3. Click "Start Recording" to begin
4. (Optional) Click "Open PiP" to enable Picture-in-Picture mode
5. Speak in Japanese and see real-time transcription and translation

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Soniox Speech-to-Text API
- Document Picture-in-Picture API

## Privacy

⚠️ **Important**: Your API key is stored locally in your browser and never sent to any server except Soniox's API. Make sure to keep your API key confidential.

## License

MIT
