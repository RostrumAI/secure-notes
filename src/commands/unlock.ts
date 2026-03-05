import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { ConfigRepository, SessionRepository } from '../db/repository';
import { verifyPassword } from '../crypto/encryption';

export async function unlockCommand(password?: string): Promise<void> {
  console.log('');

  const db = getDatabase();
  const configRepo = new ConfigRepository(db);
  const sessionRepo = new SessionRepository(db);

  const storedPassword = configRepo.get('master_password');
  if (!storedPassword) {
    p.outro('Database not initialized. Run `secure-notes init` first.');
    db.close();
    process.exit(1);
  }

  if (sessionRepo.isUnlocked()) {
    p.outro('Already unlocked');
    db.close();
    return;
  }

  if (!password) {
    password = await p.password({
      message: 'Enter master password',
    });

    if (p.isCancel(password)) {
      p.cancel('Operation cancelled');
      db.close();
      process.exit(0);
    }
  }

  const isValid = await verifyPassword(storedPassword, password);

  if (!isValid) {
    p.outro('Invalid password');
    db.close();
    process.exit(1);
  }

  sessionRepo.unlock();
  db.close();

  p.outro('Unlocked successfully');
}
