import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { NoteRepository, SessionRepository } from '../db/repository';
import { isUnlocked, updateActivity } from '../utils/session';
import { decryptNote } from '../crypto/encryption';

export async function showCommand(id: number, password?: string): Promise<void> {
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
    if (!password) {
      password = await p.password({
        message: 'Enter note password',
      });

      if (p.isCancel(password)) {
        p.cancel('Operation cancelled');
        db.close();
        process.exit(0);
      }
    }

    try {
      content = decryptNote(note.encrypted_content!, password, note.encryption_salt!);
    } catch {
      p.outro('Invalid password');
      db.close();
      process.exit(1);
    }
  }

  updateActivity(sessionRepo);
  db.close();

  console.log('');
  console.log(`  Title: ${note.title}`);
  console.log(`  Created: ${new Date(note.created_at).toLocaleString()}`);
  console.log(`  Updated: ${new Date(note.updated_at).toLocaleString()}`);
  console.log('');
  console.log('  ' + '-'.repeat(60));
  console.log('');
  console.log(content!.split('\n').map(line => '  ' + line).join('\n'));
  console.log('');
}
