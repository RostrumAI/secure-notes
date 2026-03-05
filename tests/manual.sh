#!/bin/bash

# Manual test script for secure-notes CLI
# This script tests all major functionality

set -e

# Setup test environment
export SECURE_NOTES_HOME="/tmp/secure-notes-test-$$"
export TEST_PASSWORD="testmaster123"
export TEST_NOTE_PASSWORD="testnote456"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

test_command() {
    local description="$1"
    shift
    echo -n "Testing: $description ... "
    if "$@" >/dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((pass_count++))
    else
        echo -e "${RED}FAIL${NC}"
        ((fail_count++))
    fi
}

test_command_output() {
    local description="$1"
    local expected="$2"
    shift 2
    echo -n "Testing: $description ... "
    if output=$("$@" 2>&1) && echo "$output" | grep -q "$expected"; then
        echo -e "${GREEN}PASS${NC}"
        ((pass_count++))
    else
        echo -e "${RED}FAIL${NC}"
        echo "Expected: $expected"
        echo "Got: $output"
        ((fail_count++))
    fi
}

cleanup() {
    rm -rf "$SECURE_NOTES_HOME"
}

trap cleanup EXIT

echo "========================================="
echo "Secure Notes CLI Test Suite"
echo "========================================="
echo ""

# Test 1: Initialize database
echo "1. Testing initialization..."
bun run src/index.ts init <<EOF
$TEST_PASSWORD
$TEST_PASSWORD
EOF
test_command "Database initialization" test -d "$SECURE_NOTES_HOME"

# Test 2: Unlock database
echo ""
echo "2. Testing unlock..."
bun run src/index.ts unlock <<EOF
$TEST_PASSWORD
EOF
test_command "Unlock database" bun run src/index.ts list

# Test 3: Add a regular note
echo ""
echo "3. Testing add note..."
bun run src/index.ts add "Test Note 1" --content "This is test content for note 1"
test_command_output "Add regular note" "Note created with ID: 1" bun run src/index.ts add "Test Note 2" --content "Content for note 2"

# Test 4: List notes
echo ""
echo "4. Testing list notes..."
test_command_output "List notes" "Test Note 1" bun run src/index.ts list

# Test 5: Show note
echo ""
echo "5. Testing show note..."
test_command_output "Show note" "This is test content for note 1" bun run src/index.ts show 1

# Test 6: Add encrypted note
echo ""
echo "6. Testing add encrypted note..."
bun run src/index.ts add "Secret Note" --encrypted --content "This is secret content" <<EOF
$TEST_NOTE_PASSWORD
$TEST_NOTE_PASSWORD
EOF
test_command_output "Add encrypted note" "Note created with ID: 3" bun run src/index.ts list

# Test 7: Show encrypted note
echo ""
echo "7. Testing show encrypted note..."
bun run src/index.ts show 3 <<EOF
$TEST_NOTE_PASSWORD
EOF
test_command_output "Show encrypted note" "This is secret content" bun run src/index.ts show 3 <<EOF
$TEST_NOTE_PASSWORD
EOF

# Test 8: Edit note
echo ""
echo "8. Testing edit note..."
bun run src/index.ts edit 1 --title "Updated Test Note 1" <<EOF
Updated content for note 1
EOF
test_command_output "Edit note" "Updated Test Note 1" bun run src/index.ts list

# Test 9: Add tags
echo ""
echo "9. Testing tags..."
bun run src/index.ts tag 1 "personal"
bun run src/index.ts tag 1 "important"
bun run src/index.ts tag 2 "work"
test_command_output "Filter by tag" "Test Note 2" bun run src/index.ts list --tag work

# Test 10: Search
echo ""
echo "10. Testing search..."
test_command_output "Search notes" "Test Note" bun run src/index.ts search "Test"

# Test 11: Export note
echo ""
echo "11. Testing export..."
bun run src/index.ts export 1 --output /tmp/test-export.txt
test_command "Export note" test -f /tmp/test-export.txt
rm -f /tmp/test-export.txt

# Test 12: Import note
echo ""
echo "12. Testing import..."
echo "Imported note content" > /tmp/import-test.txt
bun run src/index.ts import /tmp/import-test.txt --title "Imported Note"
test_command_output "Import note" "Imported Note" bun run src/index.ts list
rm -f /tmp/import-test.txt

# Test 13: Config
echo ""
echo "13. Testing config..."
bun run src/index.ts config --editor vim
bun run src/index.ts config --autolock 30
test_command_output "Config settings" "Editor: vim" bun run src/index.ts config

# Test 14: Lock
echo ""
echo "14. Testing lock..."
bun run src/index.ts lock
test_command_output "Lock database" "Database is locked" bun run src/index.ts list

# Test 15: Unlock again
echo ""
echo "15. Testing unlock after lock..."
bun run src/index.ts unlock <<EOF
$TEST_PASSWORD
EOF
test_command "Unlock after lock" bun run src/index.ts list

# Test 16: Delete note
echo ""
echo "16. Testing delete..."
bun run src/index.ts delete 1 <<EOF
y
EOF
test_command "Delete note" bash -c "! bun run src/index.ts show 1 2>&1 | grep -q 'Test Note 1'"

# Test 17: Change password
echo ""
echo "17. Testing change password..."
bun run src/index.ts change-password <<EOF
$TEST_PASSWORD
newpassword123
newpassword123
EOF
bun run src/index.ts lock
bun run src/index.ts unlock <<EOF
newpassword123
EOF
test_command "Change password" bun run src/index.ts list

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
