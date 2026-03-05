import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { NoteRepository, SessionRepository } from '../db/repository';
import { isUnlocked, updateActivity } from '../utils/session';
import { getEditor } from '../config/config';
import { encryptNote } from '../crypto/encryption';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

export async function addCommand(title: string, options: { encrypted?: boolean; content?: string; notePassword?: string }): Promise<void> {
  console.log('');

  const db = getDatabase();
  const sessionRepo = new SessionRepository(db);
  const noteRepo = new NoteRepository(db);

  if (!isUnlocked(sessionRepo)) {
    p.outro('Database is locked. Run `secure-notes unlock` first.');
    db.close();
    process.exit(1);
  }

  let content = options.content;

  if (!content) {
    const tempFile = join(tmpdir(), `note-${Date.now()}.txt`);
    writeFileSync(tempFile, '', { mode: 0o600 });

    const editor = getEditor();
    const spinner = p.spinner();
    spinner.start('Opening editor...');

    try {
      const proc = Bun.spawn([editor, tempFile], {
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit',
      });

      await proc.exited;
      spinner.stop('Editor closed');

      content = readFileSync(tempFile, 'utf-8');
      unlinkSync(tempFile);
    } catch (error) {
      spinner.stop('Failed to open editor');
      unlinkSync(tempFile);
      db.close();
      process.exit(1);
    }
  }

  if (!content || content.trim().length === 0) {
    p.outro('Note content cannot be empty');
    db.close();
    process.exit(1);
  }

  let encryptedContent: string | undefined;
  let encryptionSalt: string | undefined;

  if (options.encrypted) {
    let notePassword = options.notePassword;
    
    if (!notePassword) {
      notePassword = await p.password({
        message: 'Create a password for this note',
        validate: (value) => {
          if (value.length < 4) return 'Password must be at least 4 characters';
        },
      });

      if (p.isCancel(notePassword)) {
        p.cancel('Operation cancelled');
        db.close();
        process.exit(0);
      }

      const confirmNotePassword = await p.password({
        message: 'Confirm note password',
      });

      if (p.isCancel(confirmNotePassword)) {
        p.cancel('Operation cancelled');
        db.close();
        process.exit(0);
      }

      if (notePassword !== confirmNotePassword) {
        p.outro('Passwords do not match');
        db.close();
        process.exit(1);
      }
    } else {
      if (notePassword.length < 4) {
        p.outro('Password must be at least 4 characters');
        db.close();
        process.exit(1);
      }
    }

    const encrypted = encryptNote(content, notePassword);
    encryptedContent = encrypted.encryptedContent;
    encryptionSalt = encrypted.salt;
  }

  const note = noteRepo.createNote(
    title,
    options.encrypted ? '' : content,
    options.encrypted || false,
    encryptedContent,
    encryptionSalt
  );

  updateActivity(sessionRepo);
  db.close();

  p.outro(`Note created with ID: ${note.id}`);
}
