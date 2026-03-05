# Specification: Support Multiple Users in the CLI

## Issue
- **Issue Number**: #5
- **Issue Title**: Support multiple users in the CLI

## Problem Statement
Currently, the CLI only supports a single user. All notes are stored in a single database and protected by a single master password. Users need the ability for multiple users to have their own separate notes, each with their own authentication and storage.

## Summary of Changes Needed
1. Add a new `users` table to store multiple users with their own credentials
2. Modify the database schema to associate notes with users
3. Update CLI commands to work with user-specific data
4. Add user management commands (create user, switch user, list users, delete user)
5. Update authentication to support multiple users

## Detailed Specification

### 1. Database Schema Changes

#### New Table: `users`
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

#### New Table: `user_session`
```sql
CREATE TABLE IF NOT EXISTS user_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_user_id INTEGER,
  unlocked_at INTEGER,
  last_activity INTEGER,
  FOREIGN KEY (current_user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

#### Modified Table: `notes`
Add `user_id` column:
```sql
ALTER TABLE notes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
```

#### Modified Table: `tags`
Add `user_id` column:
```sql
ALTER TABLE tags ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
```

#### Modified Table: `note_tags`
Update foreign keys to include user context through notes:
```sql
-- Note: note_tags already cascades through notes
```

### 2. Repository Changes

#### UserRepository Class
```typescript
export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

export class UserRepository {
  createUser(username: string, passwordHash: string): User
  getUserById(id: number): User | null
  getUserByUsername(username: string): User | null
  getAllUsers(): User[]
  updatePassword(id: number, passwordHash: string): boolean
  deleteUser(id: number): boolean
}
```

#### Updated NoteRepository
- All note operations now accept optional `userId` parameter
- Default to current user if not specified
- Methods to update:
  - `createNote(title, content, ...)` → add `userId`
  - `getAllNotes()` → filter by `userId`
  - `getNotesByTag(tagName, userId?)`
  - `searchNotes(query, userId?)`
  - `getNoteById(id)` → verify ownership

#### Updated TagRepository
- Tags become user-specific (user's own tags)
- `getTagsForNote(noteId, userId?)`

#### Updated SessionRepository
- Track current user in session
- `setCurrentUser(userId)`
- `getCurrentUser(): User | null`
- `clearCurrentUser()`

### 3. CLI Command Changes

#### New Commands

**`user-create`**
```bash
secure-notes user-create <username>
# Prompts for password (min 8 chars)
# Creates new user and switches to them
```

**`user-switch`**
```bash
secure-notes user-switch <username>
# Requires password verification
# Switches to specified user
```

**`user-list`**
```bash
secure-notes user-list
# Lists all users (just usernames, not passwords)
```

**`user-delete`**
```bash
secure-notes user-delete <username>
# Confirms deletion
# Deletes user and all their notes
# Cannot delete last remaining user
```

**`user-current`**
```bash
secure-notes user-current
# Shows current user
```

#### Modified Commands

**`init`** - Renamed behavior
- First run: Creates default user "admin"
- Subsequent runs: Error "already initialized"

**`unlock`** - Changed behavior
- Now unlocks for current user (not global)
- User must be selected first via `user-switch`

**`lock`** - Changed behavior
- Locks current user's session

**`add`** - Added implicit user context
- Notes created for current user

**`list`** - Added implicit user context
- Only lists notes for current user
- New option: `--all-users` to list all users' notes (admin only)

**`show`, `edit`, `delete`** - Ownership check
- Verify note belongs to current user
- Error if trying to access another user's note

**`search`** - Added implicit user context
- Only searches current user's notes

**`tag`, `untag`** - Added implicit user context

**`config`** - User-specific config
- Config stored per-user in `user_config` table

### 4. New Configuration Storage

#### Table: `user_config`
```sql
CREATE TABLE IF NOT EXISTS user_config (
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (user_id, key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 5. Data Migration

On first run with multi-user code:
1. Check if old single-user database exists
2. If yes, migrate:
   - Create "admin" user from existing master_password
   - Add user_id = 1 to all existing notes
   - Add user_id = 1 to all existing tags
3. If no, create fresh database with "admin" user

### 6. Security Considerations

1. **User Isolation**: Users can only see/modify their own notes
2. **Password Hashing**: Each user has their own Argon2id hash
3. **Session Isolation**: Each user has separate unlock state
4. **Admin Role**: First user created is "admin" but no special privileges initially
5. **Deletion Safety**: Cannot delete last user (at least one must exist)

### 7. Backward Compatibility

- Single-user mode: Works exactly as before (implicit user "admin")
- Migration: Automatic, no data loss
- CLI: Most existing commands work with minimal changes

### 8. Implementation Priority

1. Database schema changes
2. UserRepository implementation
3. Updated SessionRepository with user context
4. Update NoteRepository for user filtering
5. User commands (create, switch, list, delete, current)
6. Update all note commands to use user context
7. Migration logic for existing data
8. Tests

### 9. File Changes

- `src/db/database.ts`: Add new tables
- `src/db/repository.ts`: Add UserRepository, update other repositories
- `src/utils/session.ts`: Update for user context
- `src/index.ts`: Add user commands
- `src/commands/user.ts`: New file for user management commands
- `src/commands/init.ts`: Update for first-run user creation
- `src/commands/unlock.ts`: Update for user-specific unlock
- `src/commands/add.ts`, `list.ts`, `show.ts`, `edit.ts`, `delete.ts`, `search.ts`, `tag.ts`: Update for user context

### 10. Testing Requirements

- Unit tests for UserRepository
- Integration tests for user creation/switching
- Note operations with user isolation
- Migration from single-user to multi-user
- CLI command tests for new user commands
