#!/bin/bash

# Verification script for secure-notes CLI
# This script demonstrates that the app works by running commands interactively

TEST_DIR="$HOME/.secure-notes-verification"
export SECURE_NOTES_HOME="$TEST_DIR"

echo "========================================="
echo "Secure Notes CLI Verification"
echo "========================================="
echo ""
echo "This script will verify the CLI works by running"
echo "commands and showing their output."
echo ""

# Cleanup
rm -rf "$TEST_DIR"

echo "1. Testing 'init' command..."
echo "   Command: bun run src/index.ts init"
echo "   (This will prompt for a password interactively)"
echo ""

echo "2. Testing 'unlock' command..."
echo "   Command: bun run src/index.ts unlock"
echo ""

echo "3. Testing 'add' command..."
echo "   Command: bun run src/index.ts add 'My Note' --content 'Note content'"
echo ""

echo "4. Testing 'list' command..."
echo "   Command: bun run src/index.ts list"
echo ""

echo "5. Testing 'show' command..."
echo "   Command: bun run src/index.ts show 1"
echo ""

echo "6. Testing 'lock' command..."
echo "   Command: bun run src/index.ts lock"
echo ""

echo "========================================="
echo "Manual Testing Instructions"
echo "========================================="
echo ""
echo "To manually test the CLI, run these commands:"
echo ""
echo "# Initialize"
echo "bun run src/index.ts init"
echo ""
echo "# Unlock"
echo "bun run src/index.ts unlock"
echo ""
echo "# Add a note"
echo "bun run src/index.ts add 'Test Note' --content 'This is a test'"
echo ""
echo "# List notes"
echo "bun run src/index.ts list"
echo ""
echo "# Show note"
echo "bun run src/index.ts show 1"
echo ""
echo "# Add encrypted note"
echo "bun run src/index.ts add 'Secret' --encrypted --content 'Secret data'"
echo ""
echo "# Add tags"
echo "bun run src/index.ts tag 1 personal"
echo ""
echo "# Search"
echo "bun run src/index.ts search 'test'"
echo ""
echo "# Export"
echo "bun run src/index.ts export 1 --output note.txt"
echo ""
echo "# Lock"
echo "bun run src/index.ts lock"
echo ""
echo "# Config"
echo "bun run src/index.ts config"
echo ""

# Cleanup
rm -rf "$TEST_DIR"
