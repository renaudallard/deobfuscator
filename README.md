# Thunderbird Deobfuscator

Extension that deobfuscates Microsoft Safe Links and similar URL wrappers in Thunderbird email messages. Shows you the real destination URL before opening links.

## Features
- **Context Menu Integration**: Right-click any Safe Link and select "Deobfuscate Link"
- **Interactive Popup**: Shows both original (wrapped) and clean URLs before opening
- **Choice of Actions**: Open the clean URL, original URL, or cancel
- **Decodes Complex Obfuscation**: Handles percent-encoded, base64-encoded, and nested Safe Links
- **Opens in Default Browser**: URLs open in Firefox (or your default browser), not Thunderbird
- **Works with All Protocols**: Functions with `owl://`, `imap://`, and standard protocols

## Installation
1. Download `deobfuscator.xpi` from the releases
2. In Thunderbird: **Add-ons** → gear menu → **Install Add-on From File…**
3. Select `deobfuscator.xpi`

For development:
- **Add-ons** → gear menu → **Debug Add-ons** → **Load Temporary Add-on…**
- Select `src/manifest.json`

## Usage
1. Open any email containing Microsoft Safe Links (URLs with `safelinks.protection.outlook.com`)
2. **Right-click** on the obfuscated link
3. Select **"Deobfuscate Link"** from the context menu
4. A popup window appears showing:
   - **Original link**: The wrapped/obfuscated URL
   - **Clean URL**: The decoded destination
5. Choose an action:
   - **Open Clean Link** (recommended) - Opens the deobfuscated URL
   - **Open Original Link** - Opens the wrapped URL (if needed)
   - **Cancel** - Closes the popup

## Build
A build script is included for convenience:
```bash
./build.sh
```

This creates `deobfuscator.xpi` from the `src/` directory.

## How It Works
- **`src/background.js`**: Creates context menu, handles deobfuscation logic, and manages popup window
- **`src/popup.html`**: Popup window UI showing URLs and action buttons
- **`src/popup.js`**: Popup window logic for opening URLs
- **`src/message-cleaner.js`**: Legacy file (currently unused)
- **`src/manifest.json`**: MailExtension manifest (v2) with required permissions

## Technical Details
The extension uses a **context menu** approach instead of automatic script injection to work around Thunderbird's security restrictions on `owl://` and `imap://` protocols. When you right-click a link:

1. The background script extracts the Safe Links URL
2. Decodes the `url` or `u` query parameter
3. Opens a popup window with both URLs
4. User selects which URL to open
5. Background script opens the selected URL in the default browser via `windows.openDefaultBrowser()`

## Version
Current version: **0.0.1**

## Notes
- Original email messages remain completely unchanged
- Only works with Safe Links format (`safelinks.protection.outlook.com`)
- To add support for other URL obfuscation services, extend the `deobfuscateUrl()` function in `src/background.js`
