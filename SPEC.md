# Specification: Multi-User Support

## Issue
- **Issue Number**: 7
- **Title**: Support multiple users in the CLI
- **Description**: We need to add support for multiple users within the CLI. Each user should have their own credentials and notes.
- **Author**: Stephen-PP

## Overview

This specification outlines the implementation of multi-user support for the Secure Notes CLI application. Currently, the application operates as a single-user system with one master password and a shared database. The multi-user feature will allow multiple users to create separate accounts, each with their own credentials and isolated notes.

## Current Architecture Analysis

### Existing Components
- **Entry Point**: `src/index.ts` - Commander.js CLI setup
- **Commands**: Individual command handlers in `src/commands/`
- **Database**: SQLite with repository pattern in `src/db/`
- **Encryption**: XChaCha20-Poly1305 with Argon2id password hashing
- **Config**: JSON-based configuration management in `src/config/config.ts`
- **Session**: Single-row session table in database

### Current Database Schema
```sql
- notes: id, title, content, encrypted, encrypted_content, encryption_salt, created_at, updated_at
- tags: id, name
- note_tags: note_id, tag_id
- config: key, value
- session: id, unlocked_at, last_activity
```

### Current Data Storage
- Database: `~/.secure-notes/notes.db`
- Config: `~/.secure-notes/config.json`

## Requirements

### 1. User Management
- **Create User**: Allow creation of new users with unique usernames and passwords
- **Delete User**: Allow deletion of users and their associated data
- **List Users**: Allow listing all users (admin view, without showing passwords)
- **Switch User**: Allow switching between users without restarting the CLI

### 2. User Isolation
- Each user must have their own master password
- Each user must have their own set of notes (isolated from other users)
- Each user must have their own session state
- Users cannot access other users' notes without authentication

### 3. User Authentication
- Each user has their own master password
- Passwords are hashed using Argon2id (same as current implementation)
- Session management per user (not global)

### 4. Data Separation
- Options for data separation:
  - **Option A**: Single database with user_id foreign key on all tables
  - **Option B**: Separate database files per user in `~/.secure-notes/users/<username>/`
  - **Option C**: Single database with separate schemas/namespaces per user

### 5. CLI Interface Changes
- New `user` command group for user management
- User context stored in session/config
- Commands work on current user's data by default

## Proposed Design

### Database Schema Changes

#### Option A: Single Database with User ID (Recommended)
```sql
-- Add users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Add user_id to existing tables
ALTER TABLE notes ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE tags ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE note_tags ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE config ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE session ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Create index for faster queries
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_session_user_id ON session(user_id);
```

#### Alternative: Per-User Database
- Store each user's data in `~/.secure-notes/users/<username>/notes.db`
- Each user has their own complete database schema
- Shared config for global settings only

### CLI Commands

#### New User Management Commands
```bash
# Create a new user
secure-notes user create <username>

# Delete a user
secure-notes user delete <username>

# List all users
secure-notes user list

# Switch to a different user
secure-notes user switch <username>

# Show current user
secure-notes user current
```

#### Modified Existing Commands
All existing commands should work with the current user's context:
```bash
secure-notes init        # Initialize current user's database (first user setup)
secure-notes unlock      # Unlock current user's session
secure-notes add <title> # Add note to current user's notes
secure-notes list        # List current user's notes
# ... etc
```

### Configuration Changes

#### Global Config (`~/.secure-notes/config.json`)
```json
{
  "currentUser": "username",
  "editor": "nano",
  "autolockMinutes": 15
}
```

#### User-Specific Data
- User credentials stored in database (hashed passwords)
- Each user's notes, tags, and session stored in database with user_id

### Implementation Plan

#### Phase 1: Database Schema Updates
1. Add `users` table
2. Add `user_id` foreign keys to existing tables
3. Create migration script for existing single-user data

#### Phase 2: User Management Commands
1. Implement `user create` command
2. Implement `user delete` command  
3. Implement `user list` command
4. Implement `user switch` command
5. Implement `user current` command

#### Phase 3: Session Management Updates
1. Update session repository to work per user
2. Update lock/unlock commands for multi-user
3. Update auto-lock to work per user session

#### Phase 4: Command Integration
1. Update all existing commands to use current user's context
2. Add user context to config
3. Update initialization flow

#### Phase 5: Testing
1. Unit tests for new user functionality
2. Integration tests for user isolation
3. Manual testing of multi-user workflows

## Security Considerations

1. **Password Storage**: Continue using Argon2id for password hashing
2. **User Isolation**: Ensure queries are always scoped to current user
3. **Session Security**: Each user has separate session state
4. **Data Deletion**: When deleting a user, cascade delete all associated data

## Backward Compatibility

- Existing single-user installations should migrate seamlessly
- First run prompts for creating the initial user
- Migration script to assign existing data to first user

## File Changes

### New Files
- `src/commands/user.ts` - User management commands

### Modified Files
- `src/db/database.ts` - Add users table and user_id columns
- `src/db/repository.ts` - Add UserRepository class, update queries
- `src/config/config.ts` - Add current user tracking
- `src/index.ts` - Add user command group
- `src/utils/session.ts` - Update for per-user sessions
- `src/commands/init.ts` - Update for multi-user init flow
- `src/commands/unlock.ts` - Update for user-specific unlock
- `src/commands/lock.ts` - Update for per-user lock

## Acceptance Criteria

1. ✅ Can create multiple users with unique usernames and passwords
2. ✅ Can switch between users
3. ✅ Each user's notes are isolated from other users
4. ✅ Can delete users and their data
5. ✅ Can list all users
6. ✅ Session management works per user
7. ✅ Existing single-user mode works after migration
8. ✅ All existing commands work with multi-user context

## Edge Cases

1. **Last User Deletion**: Prevent deleting the last user (system must have at least one user)
2. **Username Validation**: Validate username format (alphanumeric, underscores)
3. **Password Requirements**: Enforce minimum password length per user
4. **Concurrent Sessions**: Handle switching users while notes are open
5. **Empty State**: Handle first-time setup with multi-user flow

