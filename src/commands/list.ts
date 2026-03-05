import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { NoteRepository, SessionRepository } from '../db/repository';
import { isUnlocked, updateActivity } from '../utils/session';

export async function listCommand(options: { tag?: string }): Promise<void> {
  console.log('');

  const db = getDatabase();
  const sessionRepo = new SessionRepository(db);
  const noteRepo = new NoteRepository(db);

  if (!isUnlocked(sessionRepo)) {
    p.outro('Database is locked. Run `secure-notes unlock` first.');
    db.close();
    process.exit(1);
  }

  const notes = options.tag
    ? noteRepo.getNotesByTag(options.tag)
    : noteRepo.getAllNotes();

  updateActivity(sessionRepo);
  db.close();

  if (notes.length === 0) {
    p.outro('No notes found');
    return;
  }

  console.log('');
  console.log('  ID  | Encrypted | Title                    | Updated');
  console.log('  ' + '-'.repeat(60));

  for (const note of notes) {
    const encrypted = note.encrypted ? '🔒' : '  ';
    const title = note.title.length > 25 ? note.title.substring(0, 22) + '...' : note.title.padEnd(25);
    const updated = new Date(note.updated_at).toLocaleDateString();
    console.log(`  ${String(note.id).padStart(3)} |    ${encrypted}     | ${title} | ${updated}`);
  }

  console.log('');
}
