#!/bin/bash

# Comprehensive manual test for secure-notes CLI
# This script tests the actual CLI commands

set -e

TEST_DIR="/tmp/secure-notes-cli-test-$$"
export SECURE_NOTES_HOME="$TEST_DIR"

echo "========================================="
echo "Secure Notes CLI - Manual Test"
echo "========================================="
echo ""
echo "Test directory: $TEST_DIR"
echo ""

# Cleanup function
cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Test counter
tests_passed=0
tests_failed=0

# Test function
test_cmd() {
    local description="$1"
    shift
    echo -n "Testing: $description... "
    if output=$("$@" 2>&1); then
        echo "✓ PASS"
        ((tests_passed++))
        return 0
    else
        echo "✗ FAIL"
        echo "$output"
        ((tests_failed++))
        return 1
    fi
}

# Test 1: Help command
echo "1. Testing help command..."
test_cmd "Help" bun run src/index.ts --help

# Test 2: Version command
echo ""
echo "2. Testing version command..."
test_cmd "Version" bun run src/index.ts --version

# Test 3: Init command (using expect-like input)
echo ""
echo "3. Testing init command..."
{
    sleep 0.5
    echo "testmaster123"
    sleep 0.5
    echo "testmaster123"
} | bun run src/index.ts init 2>&1 | head -20

# Test 4: Unlock command
echo ""
echo "4. Testing unlock command..."
{
    sleep 0.5
    echo "testmaster123"
} | bun run src/index.ts unlock 2>&1 | head -10

# Test 5: Add note
echo ""
echo "5. Testing add note..."
test_cmd "Add note" bun run src/index.ts add "Test Note 1" --content "This is test content for note 1"

# Test 6: Add another note
echo ""
echo "6. Testing add another note..."
test_cmd "Add note 2" bun run src/index.ts add "Test Note 2" --content "Content for note 2"

# Test 7: List notes
echo ""
echo "7. Testing list notes..."
bun run src/index.ts list 2>&1 | head -20

# Test 8: Show note
echo ""
echo "8. Testing show note..."
bun run src/index.ts show 1 2>&1 | head -20

# Test 9: Add encrypted note
echo ""
echo "9. Testing add encrypted note..."
{
    sleep 0.5
    echo "notepass456"
    sleep 0.5
    echo "notepass456"
} | bun run src/index.ts add "Secret Note" --encrypted --content "This is secret" 2>&1 | head -10

# Test 10: Show encrypted note
echo ""
echo "10. Testing show encrypted note..."
{
    sleep 0.5
    echo "notepass456"
} | bun run src/index.ts show 3 2>&1 | head -20

# Test 11: Add tags
echo ""
echo "11. Testing add tags..."
test_cmd "Add tag" bun run src/index.ts tag 1 "personal"
test_cmd "Add tag 2" bun run src/index.ts tag 1 "important"
test_cmd "Add tag 3" bun run src/index.ts tag 2 "work"

# Test 12: List with tag filter
echo ""
echo "12. Testing list with tag filter..."
bun run src/index.ts list --tag personal 2>&1 | head -20

# Test 13: Search
echo ""
echo "13. Testing search..."
bun run src/index.ts search "Test" 2>&1 | head -20

# Test 14: Export note
echo ""
echo "14. Testing export..."
test_cmd "Export note" bun run src/index.ts export 1 --output "$TEST_DIR/exported.txt"
if [ -f "$TEST_DIR/exported.txt" ]; then
    echo "✓ Export file created"
    ((tests_passed++))
else
    echo "✗ Export file not created"
    ((tests_failed++))
fi

# Test 15: Import note
echo ""
echo "15. Testing import..."
echo "Imported note content" > "$TEST_DIR/import.txt"
test_cmd "Import note" bun run src/index.ts import "$TEST_DIR/import.txt" --title "Imported Note"

# Test 16: Config
echo ""
echo "16. Testing config..."
bun run src/index.ts config --editor vim 2>&1 | head -5
bun run src/index.ts config --autolock 30 2>&1 | head -5
bun run src/index.ts config 2>&1 | head -20

# Test 17: Lock
echo ""
echo "17. Testing lock..."
test_cmd "Lock" bun run src/index.ts lock

# Test 18: Verify locked
echo ""
echo "18. Testing locked state..."
bun run src/index.ts list 2>&1 | head -10

# Test 19: Unlock again
echo ""
echo "19. Testing unlock after lock..."
{
    sleep 0.5
    echo "testmaster123"
} | bun run src/index.ts unlock 2>&1 | head -10

# Test 20: Delete note
echo ""
echo "20. Testing delete..."
{
    sleep 0.5
    echo "y"
} | bun run src/index.ts delete 1 2>&1 | head -10

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Tests passed: $tests_passed"
echo "Tests failed: $tests_failed"
echo ""

if [ $tests_failed -eq 0 ]; then
    echo "✓ All tests passed!"
    exit 0
else
    echo "✗ Some tests failed"
    exit 1
fi
