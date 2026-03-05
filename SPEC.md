# Specification: Expiring Notes Feature

## Issue
**Issue Number:** 3
**Title:** Add expiring notes feature
**Description:** As a user, I want to be able to create notes that automatically expire after a certain time period, so that I can create temporary notes that don't clutter my notes list.

## Problem Statement
Currently, notes in secure-notes persist indefinitely. Users need a way to create temporary notes that automatically expire and are hidden from the default view, reducing clutter from notes that are no longer needed.

## Proposed Solution

### 1. Database Schema Changes

Add an `expires_at` field to the notes table in `src/db/database.ts`:

```sql
ALTER TABLE notes ADD COLUMN expires_at INTEGER;
```

The `expires_at` field will store a Unix timestamp (milliseconds) representing when the note should expire. A `NULL` value means the note never expires.

### 2. Note Interface Updates

Update the `Note` interface in `src/db/repository.ts`:

```typescript
export interface Note {
  id: number;
  title: string;
  content: string | null;
  encrypted: number;
  encrypted_content: string | null;
  encryption_salt: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number | null;  // NEW FIELD
}
```

### 3. Repository Method Updates

Update `NoteRepository` in `src/db/repository.ts` with the following changes:

#### 3.1 Update `createNote` method
Add `expires_at` parameter and insert it into the database:

```typescript
createNote(
  title: string, 
  content: string, 
  encrypted = false, 
  encryptedContent?: string, 
  encryptionSalt?: string,
  expiresAt?: number | null
): Note
```

#### 3.2 Update `getAllNotes` method
Add optional parameter to include expired notes:

```typescript
getAllNotes(includeExpired: boolean = false): Note[]
```

#### 3.3 Update `getNotesByTag` method
Add optional parameter to include expired notes:

```typescript
getNotesByTag(tagName: string, includeExpired: boolean = false): Note[]
```

#### 3.4 Add helper methods

```typescript
// Check if a note is expired
isNoteExpired(expiresAt: number | null): boolean {
  if (expiresAt === null) return false;
  return Date.now() > expiresAt;
}

// Get all notes that have expired
getExpiredNotes(): Note[]

// Delete all notes that have been expired for more than 30 days
deleteOldExpiredNotes(daysOld: number = 30): number
```

### 4. CLI Command Changes

#### 4.1 Update `add` command in `src/commands/add.ts`

Add `--expires` or `-x` option to specify expiration time:

```bash
secure-notes add <title> --expires <duration>
```

Where `<duration>` can be:
- `1h` - 1 hour
- `1d` - 1 day
- `7d` - 7 days (default if specified)
- `30d` - 30 days

Parse duration and calculate `expires_at` timestamp:

```typescript
interface AddCommandOptions {
  encrypted?: boolean;
  content?: string;
  notePassword?: string;
  expires?: string;  // NEW OPTION
}
```

#### 4.2 Update `list` command in `src/commands/list.ts`

Add `--include-expired` or `-a` flag to show expired notes:

```bash
secure-notes list --include-expired
# or
secure-notes list -a
```

The list output should indicate expired notes with an indicator (e.g., "⚠️ EXPIRED").

```typescript
interface ListCommandOptions {
  tag?: string;
  includeExpired?: boolean;  // NEW OPTION
}
```

#### 4.3 Update `show` command in `src/commands/show.ts`

Show a warning when viewing an expired note:

```
⚠️ This note expired on <date>
```

#### 4.4 Update `search` command in `src/commands/search.ts`

Add `--include-expired` option to search expired notes as well.

### 5. Auto-cleanup Feature (Optional)

Add a cleanup mechanism that runs on database unlock to delete expired notes older than 30 days. This can be implemented in `src/utils/session.ts`:

```typescript
// Run cleanup when unlocking
export async function cleanupExpiredNotes(): Promise<number> {
  const db = getDatabase();
  const noteRepo = new NoteRepository(db);
  const deleted = noteRepo.deleteOldExpiredNotes(30);
  db.close();
  return deleted;
}
```

## Acceptance Criteria

1. **Can create a note with expiration date**
   - [ ] `secure-notes add "Temporary Note" --expires 7d` creates a note that expires in 7 days
   - [ ] `secure-notes add "One Hour Note" --expires 1h` creates a note that expires in 1 hour
   - [ ] Notes without `--expires` flag have no expiration (expires_at = NULL)

2. **Expired notes are hidden by default**
   - [ ] Running `secure-notes list` does not show expired notes
   - [ ] Running `secure-notes search "query"` does not show expired notes
   - [ ] Tags filtered list (`secure-notes list --tag <tag>`) does not show expired notes

3. **Can view expired notes with a flag**
   - [ ] `secure-notes list --include-expired` shows all notes including expired ones
   - [ ] Expired notes are marked with "⚠️ EXPIRED" in the list output
   - [ ] `secure-notes show <id>` shows expired notes but displays a warning

4. **Auto-delete old expired notes (Optional)**
   - [ ] Notes expired for more than 30 days are automatically deleted on next unlock
   - [ ] Config option to customize auto-delete period

## Implementation Priority

1. **Phase 1: Core Implementation**
   - Add database schema changes
   - Update Note interface
   - Update repository methods
   - Add expiration parsing in add command

2. **Phase 2: CLI Updates**
   - Update list command with --include-expired
   - Update show command to warn about expired notes
   - Update search command

3. **Phase 3: Auto-cleanup (Optional)**
   - Implement cleanup on unlock
   - Add config option for cleanup period

## Example Usage

```bash
# Create a note that expires in 7 days
$ secure-notes add "Meeting Notes" --expires 7d
Note created with ID: 1

# List non-expired notes (default)
$ secure-notes list
  ID  | Encrypted | Title                    | Updated
  ------------------------------------------------------------
    1 |           | Meeting Notes            | 2024-01-15

# Try to view expired notes
$ secure-notes list --include-expired
  ID  | Encrypted | Title                    | Updated       | Status
  ------------------------------------------------------------
    1 |           | Meeting Notes            | 2024-01-15    | ⚠️ EXPIRED

# Show an expired note (with warning)
$ secure-notes show 1
⚠️ This note expired on January 8, 2024

Title: Meeting Notes
Content: ...
```

## Edge Cases

1. Creating a note with `--expires 0d` should result in an immediate expiration
2. Creating a note with a past date should be rejected
3. Attempting to show/edit an expired note should still work (with warning)
4. Tags should work correctly with expired notes

## Testing Requirements

- Unit tests for duration parsing
- Unit tests for expiration checking
- Integration tests for CLI commands
- Test database schema migration
