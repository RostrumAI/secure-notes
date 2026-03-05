# Secure Notes CLI

A secure command-line notes application with encryption support, built with Bun and SQLite.

## Features

- **Secure Storage**: All notes are stored in a local SQLite database
- **Master Password**: Database is protected by a master password
- **Encrypted Notes**: Individual notes can have their own encryption password
- **Auto-Lock**: Automatic locking after configurable timeout
- **Tagging**: Organize notes with tags
- **Search**: Full-text search across notes
- **Import/Export**: Import and export notes to/from files

## Installation

```bash
# Clone or download the repository
cd secure-notes

# Install dependencies
bun install

# Make the CLI available globally (optional)
bun link
```

## Building

Build a standalone executable:

```bash
# Build for current platform
bun run build

# Build for specific platforms
bun run build:macos    # macOS (ARM64)
bun run build:linux   # Linux (x64)
bun run build:windows # Windows (x64)

# Build for all platforms
bun run build:all
```

The compiled binary will be created in the project directory.

## Testing

Run all tests:

```bash
bun test
```

Run specific test suites:

```bash
# Unit tests only
bun run test:unit

# Integration tests only
bun run test:integration
```

## Usage

### Initialize the Database

First time setup:

```bash
bun run src/index.ts init
```

You'll be prompted to create a master password (minimum 8 characters).

### Unlock the Database

Before using most commands, unlock the database:

```bash
bun run src/index.ts unlock
```

Enter your master password when prompted.

### Lock the Database

Manually lock the database:

```bash
bun run src/index.ts lock
```

### Create a Note

Create a regular note:

```bash
bun run src/index.ts add "My Note Title" --content "Note content here"
```

Or create an encrypted note:

```bash
bun run src/index.ts add "Secret Note" --encrypted --content "Secret content"
```

You'll be prompted to create a password for the encrypted note.

If you omit the `--content` flag, your default editor will open.

### List Notes

List all notes:

```bash
bun run src/index.ts list
```

Filter by tag:

```bash
bun run src/index.ts list --tag personal
```

### Show a Note

Display a note's content:

```bash
bun run src/index.ts show 1
```

For encrypted notes, you'll be prompted for the note's password.

### Edit a Note

Edit an existing note:

```bash
bun run src/index.ts edit 1
```

Update the title:

```bash
bun run src/index.ts edit 1 --title "New Title"
```

### Delete a Note

Delete a note (with confirmation):

```bash
bun run src/index.ts delete 1
```

### Tags

Add a tag to a note:

```bash
bun run src/index.ts tag 1 personal
bun run src/index.ts tag 1 important
```

Remove a tag:

```bash
bun run src/index.ts untag 1 personal
```

### Search

Search notes by title and content:

```bash
bun run src/index.ts search "keyword"
```

Note: Encrypted note content is not searched.

### Export a Note

Export a note to a file:

```bash
bun run src/index.ts export 1 --output mynote.txt
```

### Import a Note

Import a note from a file:

```bash
bun run src/index.ts import mynote.txt --title "Imported Note"
```

Import as encrypted:

```bash
bun run src/index.ts import mynote.txt --encrypted --title "Secret"
```

### Configuration

View current configuration:

```bash
bun run src/index.ts config
```

Set default editor:

```bash
bun run src/index.ts config --editor vim
```

Set auto-lock timeout (in minutes):

```bash
bun run src/index.ts config --autolock 30
```

Disable auto-lock:

```bash
bun run src/index.ts config --autolock off
```

### Change Passwords

Change master password:

```bash
bun run src/index.ts change-password
```

Change password for an encrypted note:

```bash
bun run src/index.ts change-note-password 1
```

## Security Features

### Master Password

- The master password is hashed using Argon2id
- Database operations require unlocking with the master password
- Auto-lock feature prevents unauthorized access

### Encrypted Notes

- Individual notes can have their own encryption password
- Uses XChaCha20-Poly1305 for encryption
- Each encrypted note has a unique salt
- Password derived using PBKDF2 with 100,000 iterations

### Auto-Lock

- Database automatically locks after a configurable timeout
- Default timeout: 15 minutes
- Can be disabled or customized via config

## Data Storage

All data is stored locally in:

- Database: `~/.secure-notes/notes.db`
- Configuration: `~/.secure-notes/config.json`

You can override the storage location with the `SECURE_NOTES_HOME` environment variable.

## Development

### Run Tests

```bash
bun test
```

### Project Structure

```
secure-notes/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # Command handlers
│   ├── db/                # Database layer
│   ├── crypto/            # Encryption utilities
│   ├── config/            # Config management
│   └── utils/             # Shared utilities
├── tests/                 # Test files
├── package.json
└── README.md
```

## Technologies

- **Runtime**: Bun
- **Database**: SQLite (via `bun:sqlite`)
- **CLI Framework**: Commander.js
- **Prompts**: @clack/prompts
- **Encryption**: @noble/ciphers (XChaCha20-Poly1305)
- **Password Hashing**: argon2

## License

MIT
