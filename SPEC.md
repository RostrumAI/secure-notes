# Spec: Add Expiring Notes Feature

## Issue
- **Issue Number**: 3
- **Issue Title**: Add expiring notes feature
- **Description**: As a user, I want to be able to create notes that automatically expire after a certain time period, so that I can create temporary notes that don't clutter my notes list.

## Problem Statement
Currently, all notes in secure-notes persist indefinitely. Users need a way to create temporary notes that:
1. Can be set with an expiration date/time
2. Automatically become "expired" after the set time
3. Are hidden from the default note list to reduce clutter
4. Can be optionally viewed when needed

## Requirements

### 1. Database Schema Changes
Add an `expires_at` field to the notes table:
- Column: `expires_at` (INTEGER, nullable)
- Stores Unix timestamp in milliseconds
- NULL means note never expires

### 2. Add Command Updates
Modify the `add` command to accept an expiration option:
- New option: `--expires-in <duration>` or `--expires-at <timestamp>`
- Duration format: `1h`, `1d`, `1w` (hours, days, weeks)
- Alternative: `--expires-at` accepts ISO 8601 datetime string
- If not specified, note never expires (null)

### 3. List Command Updates
Modify the `list` command to filter expired notes:
- Default behavior: Hide expired notes (show only active notes)
- New option: `--show-expired` or `-x` to show expired notes
- Display indication for expired notes (e.g., `[EXPIRED]` badge)

### 4. Show Command Updates
When displaying an expired note:
- Show the note content normally
- Display a warning message indicating the note has expired

### 5. Auto-Delete Old Notes (Optional Enhancement)
- Add a background task or check on startup
- Delete notes that are both:
  - Expired (expires_at < now)
  - Older than 30 days from expiration
- This keeps the database clean

## Acceptance Criteria

- [ ] Can create a note with expiration date
  - [ ] `secure-notes add "My temp note" --expires-in 1d` creates a note expiring in 1 day
  - [ ] `secure-notes add "My temp note" --expires-at 2025-12-31T23:59:59` creates a note expiring at specific time
  - [ ] `secure-notes add "My permanent note"` creates a note that never expires

- [ ] Expired notes are hidden by default
  - [ ] `secure-notes list` does not show expired notes
  - [ ] `secure-notes list --show-expired` shows all notes including expired ones
  - [ ] Expired notes display with `[EXPIRED]` badge when using `--show-expired`

- [ ] Can view expired notes with a flag
  - [ ] `secure-notes show <id>` shows note content even if expired
  - [ ] Shows warning message for expired notes: "Note expired on <date>"

## Implementation Plan

### Phase 1: Database & Repository Layer
1. Update `src/db/database.ts`:
   - Add `expires_at INTEGER` column to notes table in schema

2. Update `src/db/repository.ts`:
   - Update `Note` interface to include `expires_at: number | null`
   - Update `createNote()` to accept and store `expiresAt`
   - Add `getAllNotes(includeExpired?: boolean)` method
   - Add `getActiveNotes()` method (excludes expired)
   - Add `getExpiredNotes()` method
   - Update `searchNotes()` to handle expiration filtering

### Phase 2: Add Command
1. Update `src/commands/add.ts`:
   - Add `--expires-in` and `--expires-at` options
   - Parse duration strings into timestamps
   - Pass expiration to repository

2. Update CLI options in `src/index.ts`:
   - Add expiration options to `add` command

### Phase 3: List Command
1. Update `src/commands/list.ts`:
   - Add `--show-expired` / `-x` option
   - Filter notes based on expiration
   - Display expired status in output

### Phase 4: Show Command
1. Update `src/commands/show.ts`:
   - Check if note is expired
   - Display warning for expired notes

### Phase 5: Optional Auto-Delete
1. Add cleanup function to `src/db/repository.ts`:
   - `deleteExpiredNotesOlderThan(days: number)` method

2. Call cleanup on appropriate events (e.g., list, unlock)

## Technical Considerations

### Expiration Check Logic
```typescript
function isExpired(expiresAt: number | null): boolean {
  if (expiresAt === null) return false;
  return Date.now() > expiresAt;
}
```

### Duration Parsing
Supported formats:
- `1h` - 1 hour
- `2d` - 2 days  
- `3w` - 3 weeks
- `30m` - 30 minutes

ISO 8601 format:
- `2025-12-31T23:59:59`
- `2025-12-31`

### Data Migration
On first run with this feature:
- Existing notes have `expires_at = NULL` (never expires)
- No data migration needed

## Backward Compatibility
- Notes without expiration date continue to work as before
- List command default behavior changes (hides expired) - this is the intended feature behavior
- All existing commands work the same for non-expiring notes
