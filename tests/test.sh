#!/bin/bash

# Simple test script for secure-notes CLI
# Tests basic functionality without interactive prompts

set -e

# Setup test environment
export SECURE_NOTES_HOME="/tmp/secure-notes-test-$$"
TEST_DIR="/tmp/secure-notes-test-$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass_count=0
fail_count=0

echo "========================================="
echo "Secure Notes CLI Test Suite"
echo "========================================="
echo ""

# Cleanup function
cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Test 1: Check help
echo -e "${YELLOW}Test 1: Check CLI help${NC}"
if bun run src/index.ts --help | grep -q "A secure CLI notes application"; then
    echo -e "${GREEN}✓ Help command works${NC}"
    ((pass_count++))
else
    echo -e "${RED}✗ Help command failed${NC}"
    ((fail_count++))
fi

# Test 2: Initialize database (using expect-like approach with printf)
echo ""
echo -e "${YELLOW}Test 2: Initialize database${NC}"
printf "testpass123\ntestpass123\n" | bun run src/index.ts init 2>&1 | grep -q "ready to use" && {
    echo -e "${GREEN}✓ Database initialized${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Database initialization failed${NC}"
    ((fail_count++))
}

# Test 3: Unlock database
echo ""
echo -e "${YELLOW}Test 3: Unlock database${NC}"
printf "testpass123\n" | bun run src/index.ts unlock 2>&1 | grep -q "Unlocked successfully" && {
    echo -e "${GREEN}✓ Database unlocked${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Unlock failed${NC}"
    ((fail_count++))
}

# Test 4: Add a note
echo ""
echo -e "${YELLOW}Test 4: Add a regular note${NC}"
bun run src/index.ts add "Test Note 1" --content "This is test content" 2>&1 | grep -q "Note created" && {
    echo -e "${GREEN}✓ Note added${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Add note failed${NC}"
    ((fail_count++))
}

# Test 5: List notes
echo ""
echo -e "${YELLOW}Test 5: List notes${NC}"
bun run src/index.ts list 2>&1 | grep -q "Test Note 1" && {
    echo -e "${GREEN}✓ List notes works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ List notes failed${NC}"
    ((fail_count++))
}

# Test 6: Show note
echo ""
echo -e "${YELLOW}Test 6: Show note${NC}"
bun run src/index.ts show 1 2>&1 | grep -q "This is test content" && {
    echo -e "${GREEN}✓ Show note works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Show note failed${NC}"
    ((fail_count++))
}

# Test 7: Add encrypted note
echo ""
echo -e "${YELLOW}Test 7: Add encrypted note${NC}"
printf "notepass456\nnotepass456\n" | bun run src/index.ts add "Secret Note" --encrypted --content "Secret content here" 2>&1 | grep -q "Note created" && {
    echo -e "${GREEN}✓ Encrypted note added${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Add encrypted note failed${NC}"
    ((fail_count++))
}

# Test 8: Show encrypted note
echo ""
echo -e "${YELLOW}Test 8: Show encrypted note${NC}"
printf "notepass456\n" | bun run src/index.ts show 2 2>&1 | grep -q "Secret content here" && {
    echo -e "${GREEN}✓ Show encrypted note works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Show encrypted note failed${NC}"
    ((fail_count++))
}

# Test 9: Add tags
echo ""
echo -e "${YELLOW}Test 9: Add tags${NC}"
bun run src/index.ts tag 1 "personal" 2>&1 | grep -q "added to note" && {
    echo -e "${GREEN}✓ Tag added${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Add tag failed${NC}"
    ((fail_count++))
}

# Test 10: List with tag filter
echo ""
echo -e "${YELLOW}Test 10: Filter by tag${NC}"
bun run src/index.ts list --tag personal 2>&1 | grep -q "Test Note 1" && {
    echo -e "${GREEN}✓ Tag filter works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Tag filter failed${NC}"
    ((fail_count++))
}

# Test 11: Search
echo ""
echo -e "${YELLOW}Test 11: Search notes${NC}"
bun run src/index.ts search "Test" 2>&1 | grep -q "Test Note 1" && {
    echo -e "${GREEN}✓ Search works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Search failed${NC}"
    ((fail_count++))
}

# Test 12: Export note
echo ""
echo -e "${YELLOW}Test 12: Export note${NC}"
bun run src/index.ts export 1 --output "$TEST_DIR/exported.txt" 2>&1 | grep -q "exported to" && {
    if [ -f "$TEST_DIR/exported.txt" ]; then
        echo -e "${GREEN}✓ Export works${NC}"
        ((pass_count++))
    else
        echo -e "${RED}✗ Export file not created${NC}"
        ((fail_count++))
    fi
} || {
    echo -e "${RED}✗ Export failed${NC}"
    ((fail_count++))
}

# Test 13: Import note
echo ""
echo -e "${YELLOW}Test 13: Import note${NC}"
echo "Imported content" > "$TEST_DIR/import.txt"
bun run src/index.ts import "$TEST_DIR/import.txt" --title "Imported Note" 2>&1 | grep -q "Note imported" && {
    echo -e "${GREEN}✓ Import works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Import failed${NC}"
    ((fail_count++))
}

# Test 14: Config
echo ""
echo -e "${YELLOW}Test 14: Config settings${NC}"
bun run src/index.ts config --editor vim 2>&1 | grep -q "Editor set to" && {
    echo -e "${GREEN}✓ Config editor works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Config failed${NC}"
    ((fail_count++))
}

# Test 15: Lock
echo ""
echo -e "${YELLOW}Test 15: Lock database${NC}"
bun run src/index.ts lock 2>&1 | grep -q "Locked successfully" && {
    echo -e "${GREEN}✓ Lock works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Lock failed${NC}"
    ((fail_count++))
}

# Test 16: Verify locked
echo ""
echo -e "${YELLOW}Test 16: Verify database is locked${NC}"
bun run src/index.ts list 2>&1 | grep -q "Database is locked" && {
    echo -e "${GREEN}✓ Lock verification works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Lock verification failed${NC}"
    ((fail_count++))
}

# Test 17: Unlock again
echo ""
echo -e "${YELLOW}Test 17: Unlock after lock${NC}"
printf "testpass123\n" | bun run src/index.ts unlock 2>&1 | grep -q "Unlocked successfully" && {
    echo -e "${GREEN}✓ Unlock after lock works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Unlock after lock failed${NC}"
    ((fail_count++))
}

# Test 18: Delete note
echo ""
echo -e "${YELLOW}Test 18: Delete note${NC}"
printf "y\n" | bun run src/index.ts delete 1 2>&1 | grep -q "Note deleted" && {
    echo -e "${GREEN}✓ Delete works${NC}"
    ((pass_count++))
} || {
    echo -e "${RED}✗ Delete failed${NC}"
    ((fail_count++))
}

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
