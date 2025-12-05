#!/usr/local/bin/bash
# Build script for Deobfuscator extension

set -e

echo "Building deobfuscator.xpi..."
cd "$(dirname "$0")"

# Remove old xpi if it exists
rm -f deobfuscator.xpi

# Create new xpi from src directory
cd src
zip -r ../deobfuscator.xpi * -x "*.git*" -x "*node_modules*" -x "*.DS_Store"
cd ..

echo "✓ Built deobfuscator.xpi successfully"
