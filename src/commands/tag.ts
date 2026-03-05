import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { NoteRepository, SessionRepository } from '../db/repository';
import { isUnlocked, updateActivity } from '../utils/session';

export async function tagCommand(id: number, tagName: string): Promise<void> {
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

  noteRepo.addTagToNote(id, tagName);
  updateActivity(sessionRepo);
  db.close();

  p.outro(`Tag "${tagName}" added to note ${id}`);
}

export async function untagCommand(id: number, tagName: string): Promise<void> {
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

  noteRepo.removeTagFromNote(id, tagName);
  updateActivity(sessionRepo);
  db.close();

  p.outro(`Tag "${tagName}" removed from note ${id}`);
}
