import * as p from '@clack/prompts';
import { getDatabase } from '../db/database';
import { ConfigRepository, SessionRepository, NoteRepository } from '../db/repository';
import { isUnlocked, updateActivity } from '../utils/session';
import { loadConfig, saveConfig, getEditor, getAutolockMinutes, setAutolockMinutes, setEditor } from '../config/config';
import { hashPassword, verifyPassword, decryptNote, encryptNote } from '../crypto/encryption';

export async function configCommand(options: { editor?: string; autolock?: string }): Promise<void> {
  console.log('');

  if (options.editor) {
    setEditor(options.editor);
    p.outro(`Editor set to: ${options.editor}`);
    return;
  }

  if (options.autolock !== undefined) {
    if (options.autolock === 'off') {
      setAutolockMinutes(null);
      p.outro('Auto-lock disabled');
    } else {
      const minutes = parseInt(options.autolock);
      if (isNaN(minutes) || minutes < 1) {
        p.outro('Invalid autolock value. Use a number or "off"');
        process.exit(1);
      }
      setAutolockMinutes(minutes);
      p.outro(`Auto-lock set to ${minutes} minutes`);
    }
    return;
  }

  const config = loadConfig();
  const autolock = getAutolockMinutes();
  const editor = getEditor();

  console.log('');
  console.log('  Current Configuration:');
  console.log('');
  console.log(`  Editor: ${editor}`);
  console.log(`  Auto-lock: ${autolock === null ? 'Disabled' : `${autolock} minutes`}`);
  console.log('');
}

export async function changePasswordCommand(): Promise<void> {
  console.log('');

  const db = getDatabase();
  const configRepo = new ConfigRepository(db);
  const sessionRepo = new SessionRepository(db);

  if (!isUnlocked(sessionRepo)) {
    p.outro('Database is locked. Run `secure-notes unlock` first.');
    db.close();
    process.exit(1);
  }

  const storedPassword = configRepo.get('master_password');
  if (!storedPassword) {
    p.outro('Database not initialized');
    db.close();
    process.exit(1);
  }

  const currentPassword = await p.password({
    message: 'Enter current master password',
  });

  if (p.isCancel(currentPassword)) {
    p.cancel('Operation cancelled');
    db.close();
    process.exit(0);
  }

  const isValid = await verifyPassword(storedPassword, currentPassword);

  if (!isValid) {
    p.outro('Invalid password');
    db.close();
    process.exit(1);
  }

  const newPassword = await p.password({
    message: 'Enter new master password',
    validate: (value) => {
      if (value.length < 8) return 'Password must be at least 8 characters';
    },
  });

  if (p.isCancel(newPassword)) {
    p.cancel('Operation cancelled');
    db.close();
    process.exit(0);
  }

  const confirmNewPassword = await p.password({
    message: 'Confirm new master password',
  });

  if (p.isCancel(confirmNewPassword)) {
    p.cancel('Operation cancelled');
    db.close();
    process.exit(0);
  }

  if (newPassword !== confirmNewPassword) {
    p.outro('Passwords do not match');
    db.close();
    process.exit(1);
  }

  const hashedPassword = await hashPassword(newPassword);
  configRepo.set('master_password', hashedPassword);

  updateActivity(sessionRepo);
  db.close();

  p.outro('Master password changed');
}

export async function changeNotePasswordCommand(id: number): Promise<void> {
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

  if (!note.encrypted) {
    p.outro('This note is not encrypted');
    db.close();
    process.exit(1);
  }

  const currentPassword = await p.password({
    message: 'Enter current note password',
  });

  if (p.isCancel(currentPassword)) {
    p.cancel('Operation cancelled');
    db.close();
    process.exit(0);
  }

  let content: string;
  try {
    content = decryptNote(note.encrypted_content!, currentPassword, note.encryption_salt!);
  } catch {
    p.outro('Invalid password');
    db.close();
    process.exit(1);
  }

  const newPassword = await p.password({
    message: 'Enter new note password',
    validate: (value) => {
      if (value.length < 4) return 'Password must be at least 4 characters';
    },
  });

  if (p.isCancel(newPassword)) {
    p.cancel('Operation cancelled');
    db.close();
    process.exit(0);
  }

  const confirmNewPassword = await p.password({
    message: 'Confirm new note password',
  });

  if (p.isCancel(confirmNewPassword)) {
    p.cancel('Operation cancelled');
    db.close();
    process.exit(0);
  }

  if (newPassword !== confirmNewPassword) {
    p.outro('Passwords do not match');
    db.close();
    process.exit(1);
  }

  const encrypted = encryptNote(content, newPassword);
  noteRepo.updateNote(id, undefined, undefined, encrypted.encryptedContent, encrypted.salt);

  updateActivity(sessionRepo);
  db.close();

  p.outro('Note password changed');
}
