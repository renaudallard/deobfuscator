# 🔗 Thunderbird Deobfuscator

> A powerful Thunderbird extension that reveals the real destination of obfuscated email security links from 17+ major providers.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/yourusername/deobfuscator)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Thunderbird](https://img.shields.io/badge/thunderbird-102%2B-orange.svg)](https://www.thunderbird.net)

---

## ✨ Features

### 🎯 **Universal Protection Coverage**
Supports 17+ email security services including Microsoft, Proofpoint, Mimecast, Barracuda, Cisco, and more.

### ⚠️ **Automatic Detection & Warning**
Warning button automatically appears in the message toolbar when opening emails containing obfuscated links, showing the exact count of protected URLs detected.

### 🖱️ **Simple Right-Click Interface**
Right-click any protected link → Select "Deobfuscate Link" → See the real destination instantly.

### 🎨 **Beautiful Theme-Aware Popup**
- Clean, modern interface that respects your system theme (light/dark mode)
- Shows both original and decoded URLs side-by-side
- One-click copy buttons for easy URL sharing

### 🔒 **Privacy-First Design**
- All processing happens locally in Thunderbird
- No external servers or tracking
- Original emails remain completely unchanged

### 🌐 **Opens in Your Browser**
Decoded URLs open in Firefox (or your default browser), not within Thunderbird.

---

## 🛡️ Supported Email Security Services

<table>
<tr>
<td width="50%">

**Enterprise Solutions**
- ✅ Microsoft Safe Links
- ✅ Proofpoint URL Defense (v2 & v3)
- ✅ Mimecast URL Protect
- ✅ Barracuda Link Protection
- ✅ Cisco Secure Email
- ✅ Check Point Harmony Email
- ✅ Symantec/Broadcom Messaging Gateway
- ✅ Trend Micro Email Security
- ✅ FireEye/Trellix

</td>
<td width="50%">

**Additional Services**
- ✅ Sophos Email Security
- ✅ Trustwave MailMarshal
- ✅ Egress Defend
- ✅ Hornetsecurity ATP
- ✅ OpenText/EdgePilot
- ✅ Intermedia
- ✅ PostOffice
- ✅ Generic URL protection services

</td>
</tr>
</table>

---

## 📦 Installation

### For Users

1. Download `deobfuscator.xpi` from [Releases](https://github.com/yourusername/deobfuscator/releases)
2. Open Thunderbird
3. Go to **Add-ons and Themes** (≡ menu → Add-ons and Themes)
4. Click the gear icon ⚙️ → **Install Add-on From File…**
5. Select the downloaded `deobfuscator.xpi` file

### For Developers

1. Clone this repository
2. Open Thunderbird → **Add-ons and Themes**
3. Click gear icon ⚙️ → **Debug Add-ons**
4. Click **Load Temporary Add-on…**
5. Navigate to the `src/` folder and select `manifest.json`

---

## 🚀 Usage

### Quick Start

1. **Open an email** with a protected link
2. **Look for the warning** — A warning button automatically appears in the message toolbar showing:
   ```
   ⚠️ Warning: 3 Obfuscated Links ⚠️
   ```
3. **Right-click** on any obfuscated URL
4. **Select** "Deobfuscate Link" from the context menu
5. **Review** the popup showing:
   - 📄 **Original link**: The wrapped/protected URL
   - ✅ **Clean URL**: The real destination
6. **Choose an action**:
   - 🟢 **Open Clean Link** — Opens the decoded URL (recommended)
   - 🔴 **Open Original Link** — Opens the wrapped URL (if needed)
   - ⚪ **Cancel** — Close without action
   - 📋 **Copy** — One-click copy either URL to clipboard

### Example

**Before:** `https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com`

**After:** `https://example.com`

---

## 🛠️ Building from Source

A build script is included for your convenience:

```bash
./build.sh
```

This creates `deobfuscator.xpi` from the `src/` directory with all necessary files.

**Manual build:**
```bash
cd src
zip -r ../deobfuscator.xpi *
```

---

## 📁 Project Structure

```
deobfuscator/
├── src/
│   ├── background.js       # Core deobfuscation logic, context menu & auto-detection
│   ├── message-scanner.js  # Message content scanner (unused due to protocol restrictions)
│   ├── popup.html          # Popup UI with theme support
│   ├── popup.js            # Popup behavior & clipboard functionality
│   └── manifest.json       # Extension manifest (v2)
├── build.sh                # Build script
├── deobfuscator.xpi        # Packaged extension
└── README.md               # This file
```

---

## 🔧 Technical Details

### Architecture

The extension uses a **dual-approach system**:

#### Automatic Detection (Background)
1. **Message Monitoring**: Listens for `messageDisplay.onMessageDisplayed` events
2. **Content Scanning**: Fetches and scans message body for obfuscated link patterns
3. **Visual Warning**: Displays warning button in message toolbar with obfuscated link count
4. **Real-time Updates**: Warning appears/disappears as you switch between messages

#### Manual Deobfuscation (Context Menu)
1. **Right-Click**: User right-clicks any link in the message
2. **Analysis**: Background script identifies the protection service
3. **Decoding**: Extracts the real URL using service-specific logic
4. **Display**: Shows both URLs in a themed popup window
5. **Action**: Opens selected URL in default browser

This approach works around Thunderbird's security restrictions on `owl://` and `imap://` protocols.

### Deobfuscation Methods

- **Microsoft Safe Links**: Extracts `url` parameter
- **Proofpoint v2**: Custom character substitution decode
- **Proofpoint v3**: Path-based extraction
- **Generic Services**: Tries common parameter names (`url`, `u`, `dest`, `target`, etc.)

### Security

- ✅ All processing is local
- ✅ No network requests
- ✅ No data collection
- ✅ Minimal permissions required

---

## 🎨 Screenshots

### Popup Window (Light Mode)
Clean, modern interface showing original and decoded URLs with action buttons.

### Popup Window (Dark Mode)
Automatically adapts to your system theme for comfortable viewing.

---

## ⚙️ Configuration

No configuration needed! The extension works out of the box with sensible defaults.

---

## 🤝 Contributing

Contributions are welcome! To add support for a new email security service:

1. Edit `src/background.js`
2. Add hostname detection in `deobfuscateUrl()`
3. Add service name in `identifyService()`
4. Test with sample URLs
5. Submit a pull request

---

## 📝 Version History

### v0.0.1 (Current)
- ✨ Initial release
- 🛡️ Support for 17+ email security services
- ⚠️ Automatic detection with warning indicator in message toolbar
- 🎨 Theme-aware popup interface
- 📋 Copy-to-clipboard functionality
- 🌐 Opens URLs in default browser

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built for Thunderbird 102+
- Designed with privacy and security in mind
- Community-driven development

---

## 💬 Support

- 🐛 **Found a bug?** [Open an issue](https://github.com/yourusername/deobfuscator/issues)
- 💡 **Have a suggestion?** [Start a discussion](https://github.com/yourusername/deobfuscator/discussions)
- 📧 **Need help?** Check the [Wiki](https://github.com/yourusername/deobfuscator/wiki)

---

<div align="center">

**Made with ❤️ for the Thunderbird community**

[⬆ Back to Top](#-thunderbird-deobfuscator)

</div>
