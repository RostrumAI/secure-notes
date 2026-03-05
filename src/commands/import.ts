import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { NoteRepository, SessionRepository } from '../db/repository';
import { isUnlocked, updateActivity } from '../utils/session';
import { encryptNote } from '../crypto/encryption';
import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

export async function importCommand(filePath: string, options: { encrypted?: boolean; title?: string; notePassword?: string }): Promise<void> {
  console.log('');

  const db = getDatabase();
  const sessionRepo = new SessionRepository(db);
  const noteRepo = new NoteRepository(db);

  if (!isUnlocked(sessionRepo)) {
    p.outro('Database is locked. Run `secure-notes unlock` first.');
    db.close();
    process.exit(1);
  }

  const fullPath = resolve(filePath);

  if (!existsSync(fullPath)) {
    p.outro('File not found');
    db.close();
    process.exit(1);
  }

  let content: string;
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch (error) {
    p.outro('Failed to read file');
    db.close();
    process.exit(1);
  }

  const title = options.title || basename(filePath, '.txt');

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

  p.outro(`Note imported with ID: ${note.id}`);
}
