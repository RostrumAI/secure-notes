import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { NoteRepository, SessionRepository } from '../db/repository';
import { isUnlocked, updateActivity } from '../utils/session';
import { decryptNote } from '../crypto/encryption';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export async function exportCommand(id: number, options: { output?: string }): Promise<void> {
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
      message: 'Enter note password to export',
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
  }

  const outputPath = options.output || `${note.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
  const fullPath = resolve(outputPath);

  const exportContent = `# ${note.title}\n# Created: ${new Date(note.created_at).toLocaleString()}\n# Updated: ${new Date(note.updated_at).toLocaleString()}\n\n${content}`;

  try {
    writeFileSync(fullPath, exportContent, { mode: 0o600 });
    updateActivity(sessionRepo);
    db.close();
    p.outro(`Note exported to ${fullPath}`);
  } catch (error) {
    db.close();
    p.outro(`Failed to export note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}
