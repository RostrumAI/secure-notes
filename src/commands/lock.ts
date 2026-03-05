import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { SessionRepository } from '../db/repository';

export async function lockCommand(): Promise<void> {
  console.log('');

  const db = getDatabase();
  const sessionRepo = new SessionRepository(db);

  sessionRepo.lock();
  db.close();

  p.outro('Locked successfully');
}
