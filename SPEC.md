# Specification: Multi-User Support for Secure Notes CLI

## 1. Overview

**Issue:** Support multiple users in the CLI  
**Description:** Currently the CLI only supports a single user. This spec outlines adding the ability for multiple users to have their own notes, with each user having their own password-protected vault.

## 2. Problem Statement

The current implementation:
- Stores all notes in a single database at `~/.secure-notes/notes.db`
- Uses a single master password for the entire application
- Has no concept of user identity or isolation
- All notes are accessible to anyone who knows the master password

This approach does not support:
- Multiple family members sharing the same machine
- Multiple projects or contexts requiring separate note stores
- Privacy between different users on the same system

## 3. Solution Overview

Introduce a user management system where:
- Each user has their own encrypted vault
- Users are identified by username
- Each user has their own password
- Notes are associated with users via foreign key
- The system maintains a "current user" context
- Switching users requires re-authentication

## 4. Database Schema Changes

### 4.1 New Tables

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_login INTEGER
);

-- Track current active user
CREATE TABLE IF NOT EXISTS active_user (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Notes now reference users
ALTER TABLE notes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notes ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### 4.2 Migration Strategy

- Create migration system to upgrade existing single-user database
- Existing notes will be migrated to user_id = 1 (default user)
- Create a default user "default" with existing password

## 5. New Commands

### 5.1 User Management Commands

| Command | Description | Example |
|---------|-------------|---------|
| `user add <username>` | Create a new user | `secure-notes user add alice` |
| `user switch <username>` | Switch to another user | `secure-notes user switch alice` |
| `user list` | List all users | `secure-notes user list` |
| `user delete <username>` | Delete a user and their notes | `secure-notes user delete alice` |
| `user current` | Show current user | `secure-notes user current` |

### 5.2 Command Modifications

All existing commands should work with the current user's context:
- `init`: Creates the first user (renamed behavior)
- `unlock`: Authenticates the current user
- `lock`: Locks current user's session
- Other commands (add, list, show, etc.): Work on current user's notes only

## 6. Data Storage Structure

```
~/.secure-notes/
├── config.json          # App-level config (editor, autolock)
├── notes.db             # SQLite database (shared)
└── sessions/            # Session files per user
    ├── default.session
    ├── alice.session
    └── bob.session
```

Alternatively, use subdirectories per user:
```
~/.secure-notes/
├── config.json
├── default/
│   ├── notes.db
│   └── session
├── alice/
│   ├── notes.db
│   └── session
└── bob/
    ├── notes.db
    └── session
```

**Decision:** Use per-user database directories for better isolation. Each user gets their own `notes.db` file.

## 7. API/Implementation Details

### 7.1 User Repository

```typescript
interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: number;
  last_login: number | null;
}

class UserRepository {
  createUser(username: string, password: string): User
  getUserByUsername(username: string): User | null
  getUserById(id: number): User | null
  getAllUsers(): User[]
  deleteUser(username: string): boolean
  updateLastLogin(userId: number): void
}
```

### 7.2 Active User Management

```typescript
class ActiveUserRepository {
  setActiveUser(userId: number): void
  getActiveUser(): User | null
  clearActiveUser(): void
}
```

### 7.3 Database Path Resolution

```typescript
function getUserDatabasePath(username: string): string {
  const BASE_DIR = process.env.SECURE_NOTES_HOME || join(homedir(), '.secure-notes');
  return join(BASE_DIR, username, 'notes.db');
}

function ensureUserDatabaseDir(username: string): void {
  const dir = join(getBaseDir(), username);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}
```

## 8. Security Considerations

1. **Password Storage**: Use bcrypt/argon2 for password hashing
2. **Directory Permissions**: Each user directory should be `0700` (owner only)
3. **Session Isolation**: Sessions are per-user, not global
4. **User Deletion**: When deleting a user, cascade delete their notes and directory

## 9. Backward Compatibility

- Single-user installations should continue to work
- Migration script will detect single-user setup and convert automatically
- Default user "default" will be created for existing installations
- CLI should work without modification for single-user scenarios

## 10. User Experience

### 10.1 First Run (New Multi-User Setup)

```
$ secure-notes init
Welcome to Secure Notes!
Creating a new vault. This will be the admin user.

Enter username: alice
Create a master password: ********
Confirm master password: ********

✓ Vault initialized
✓ Logged in as alice
```

### 10.2 Adding a New User

```
$ secure-notes user add bob
Enter username: bob
Create a master password: ********
Confirm master password: ********

✓ User bob created
```

### 10.3 Switching Users

```
$ secure-notes user switch bob
Enter password for bob: ********

✓ Switched to user bob
```

### 10.4 Listing Notes (User-Specific)

```
$ secure-notes list
Notes for alice:
1. Grocery List (encrypted)
2. Meeting Notes

$ secure-notes user switch bob
$ secure-notes list
Notes for bob:
1. Project Ideas
```

## 11. Implementation Phases

### Phase 1: Database & Core Infrastructure
- Add users table to schema
- Implement UserRepository
- Implement ActiveUserRepository
- Update database path resolution

### Phase 2: User Management Commands
- Implement `user add` command
- Implement `user switch` command
- Implement `user list` command
- Implement `user delete` command
- Implement `user current` command

### Phase 3: Authentication Updates
- Update unlock command for multi-user
- Add user context to session management
- Update lock command for multi-user

### Phase 4: Migration & Backward Compatibility
- Create migration script for existing databases
- Test upgrade path
- Verify single-user mode works

### Phase 5: Testing & Documentation
- Unit tests for new repositories
- Integration tests for user workflows
- Update README with multi-user documentation

## 12. Acceptance Criteria

1. ✓ Multiple users can be created with unique usernames and passwords
2. ✓ Users can switch between accounts with authentication
3. ✓ Each user can only see and modify their own notes
4. ✓ Users can be deleted (with confirmation), removing all their notes
5. ✓ Existing single-user installations can upgrade seamlessly
6. ✓ Session management works correctly per user
7. ✓ All existing commands (add, list, show, edit, delete, etc.) work with multi-user context
8. ✓ Security is maintained (proper file permissions, password hashing)

## 13. Open Questions

- Should users be able to share notes with other users? (Out of scope for v1)
- Should there be an admin user with ability to view all users? (Out of scope for v1)
- How to handle password change for users? (Already covered by change-password command)
