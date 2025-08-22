# Transient - Advanced Translation Tool


## Overview

Transient is an advanced browser extension that provides seamless translation capabilities across the web, with special focus on making translation easy in complex web applications like Discord.

## Features

- **Quick Selection Translation**: Simply highlight text on any webpage to get instant translations
- **Discord Messages Translation**: Translate messages before sending in Discord and other messaging platforms
- **Multiple Translation Services**: Support for both free and paid translation APIs:
  - Google Translate (Web)
  - LibreTranslate
  - MyMemory API
  - Microsoft Translator
  - Google Gemini API

## Privacy & Security

- No tracking or storing of user data
- Temporary clipboard use only when specifically translating in Discord
- No external servers - everything happens in your browser
- Direct connections to translation APIs only

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)
1. Download the latest release from [GitHub Releases](https://github.com/imshanutyagi/transient-extension/releases)
2. Unzip the downloaded file
3. Open Chrome/Edge and navigate to `chrome://extensions/`
4. Enable "Developer Mode"
5. Click "Load Unpacked" and select the unzipped folder

## Usage

### Text Selection Translation
1. Highlight any text on any webpage
2. A translation popup will appear with the translated text
3. Click anywhere else to dismiss

### Discord Message Translation
1. Type your message in Discord
2. Click the "+" icon that appears near the text field
3. Your message will be translated before sending

### Changing Languages
1. Long-press on the translation icon
2. Select your desired source and target languages
3. Click "Save" to apply

## Configuration

Click the Transient icon in your browser toolbar to access settings:

- Enable/disable selection translation
- Enable/disable textbar translation icons
- Set target languages for translations
- Choose between free and paid translation services
- Configure API keys for paid services

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under a Custom Non-Commercial License - see the [LICENSE](LICENSE) file for details.

This license allows for personal and educational use, but explicitly prohibits any commercial use, including selling the extension or using it to generate revenue.

## Acknowledgments

- SVG editing and viewing: [SVG Viewer](https://www.svgviewer.dev/)
- Icon references from: [SVG Repo](https://www.svgrepo.com/)
- SVG to PNG conversion: [SVG to PNG](https://svgtopng.com/)
- Translation API methods adapted from [Firefox Translations](https://github.com/mozilla/firefox-translations)
- Discord text area detection inspired by [Discord Translator](https://github.com/WhoStoleMyBrain/discord-translator)
- UI components based on [Chrome Extensions Samples](https://github.com/GoogleChrome/chrome-extensions-samples)

## Creators

- **imshanutyagi**
- **Sunny** 
- **Mohit**

---

Last updated: 2025-08-22 08:26:10 by imshanutyagi
