import * as p from '@clack/prompts';
import { getDatabase, initializeSchema } from '../db/database';
import { ConfigRepository } from '../db/repository';
import { hashPassword } from '../crypto/encryption';

export async function initCommand(password?: string): Promise<void> {
  console.log('');
  
  if (!password) {
    const intro = p.intro('Welcome to Secure Notes');

    password = await p.password({
      message: 'Create a master password',
      validate: (value) => {
        if (value.length < 8) return 'Password must be at least 8 characters';
      },
    });

    if (p.isCancel(password)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    const confirmPassword = await p.password({
      message: 'Confirm master password',
    });

    if (p.isCancel(confirmPassword)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    if (password !== confirmPassword) {
      p.outro('Passwords do not match');
      process.exit(1);
    }
  } else {
    if (password.length < 8) {
      console.log('Password must be at least 8 characters');
      process.exit(1);
    }
  }

  const spinner = p.spinner();
  spinner.start('Initializing database...');

  try {
    const db = getDatabase();
    initializeSchema(db);

    const configRepo = new ConfigRepository(db);
    const hashedPassword = await hashPassword(password);
    configRepo.set('master_password', hashedPassword);

    db.close();

    spinner.stop('Database initialized');
    p.outro('Secure Notes is ready to use!');
  } catch (error) {
    spinner.stop('Failed to initialize database');
    p.outro(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}
