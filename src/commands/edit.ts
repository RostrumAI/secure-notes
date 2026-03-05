import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { NoteRepository, SessionRepository } from '../db/repository';
import { isUnlocked, updateActivity } from '../utils/session';
import { getEditor } from '../config/config';
import { encryptNote, decryptNote } from '../crypto/encryption';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

export async function editCommand(id: number, options: { title?: string; content?: string }): Promise<void> {
  console.log('');

  const db = getDatabase();
  const sessionRepo = new SessionRepository(db);
  const noteRepo = new NoteRepository(db);

  if (!isUnlocked(sessionRepo)) {
    p.outro('Database is locked. Run `secure-notes unlock` first.');
    db.close();
    process.exit(1);
  }

  const note = noteRepo.getNoteById(id);

  if (!note) {
    p.outro('Note not found');
    db.close();
    process.exit(1);
  }

  let content = note.content;

  if (note.encrypted) {
    const notePassword = await p.password({
      message: 'Enter note password to edit',
    });

    if (p.isCancel(notePassword)) {
      p.cancel('Operation cancelled');
      db.close();
      process.exit(0);
    }

    try {
      content = decryptNote(note.encrypted_content!, notePassword, note.encryption_salt!);
    } catch {
      p.outro('Invalid password');
      db.close();
      process.exit(1);
    }

    if (options.content) {
      const encrypted = encryptNote(options.content, notePassword);
      noteRepo.updateNote(id, options.title, undefined, encrypted.encryptedContent, encrypted.salt);
    } else {
      const tempFile = join(tmpdir(), `note-${Date.now()}.txt`);
      writeFileSync(tempFile, content, { mode: 0o600 });

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

        const newContent = readFileSync(tempFile, 'utf-8');
        unlinkSync(tempFile);

        if (newContent.trim().length === 0) {
          p.outro('Note content cannot be empty');
          db.close();
          process.exit(1);
        }

        const encrypted = encryptNote(newContent, notePassword);
        noteRepo.updateNote(id, options.title, undefined, encrypted.encryptedContent, encrypted.salt);
      } catch (error) {
        spinner.stop('Failed to open editor');
        unlinkSync(tempFile);
        db.close();
        process.exit(1);
      }
    }
  } else {
    if (options.content) {
      noteRepo.updateNote(id, options.title, options.content);
    } else {
      const tempFile = join(tmpdir(), `note-${Date.now()}.txt`);
      writeFileSync(tempFile, content || '', { mode: 0o600 });

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

        const newContent = readFileSync(tempFile, 'utf-8');
        unlinkSync(tempFile);

        if (newContent.trim().length === 0) {
          p.outro('Note content cannot be empty');
          db.close();
          process.exit(1);
        }

        noteRepo.updateNote(id, options.title, newContent);
      } catch (error) {
        spinner.stop('Failed to open editor');
        unlinkSync(tempFile);
        db.close();
        process.exit(1);
      }
    }
  }

  updateActivity(sessionRepo);
  db.close();

  p.outro('Note updated');
}
