import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { NoteRepository, SessionRepository } from '../db/repository';
import { isUnlocked, updateActivity } from '../utils/session';

export async function deleteCommand(id: number): Promise<void> {
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

  const confirm = await p.confirm({
    message: `Delete note "${note.title}"?`,
    initialValue: false,
  });

  if (p.isCancel(confirm)) {
    p.cancel('Operation cancelled');
    db.close();
    process.exit(0);
  }

  if (!confirm) {
    p.outro('Operation cancelled');
    db.close();
    return;
  }

  noteRepo.deleteNote(id);
  updateActivity(sessionRepo);
  db.close();

  p.outro('Note deleted');
}
