import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { Database } from 'bun:sqlite';
import { hashPassword, verifyPassword, encryptNote, decryptNote, encrypt, decrypt, generateKey } from '../src/crypto/encryption';
import { NoteRepository, ConfigRepository, SessionRepository } from '../src/db/repository';
import { createDatabase, initializeSchema, getDatabasePath } from '../src/db/database';

describe('Encryption Module', () => {
  test('hashPassword should create a valid hash', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  test('verifyPassword should return true for correct password', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(hash, password);
    expect(isValid).toBe(true);
  });

  test('verifyPassword should return false for incorrect password', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(hash, 'wrongpassword');
    expect(isValid).toBe(false);
  });

  test('encrypt and decrypt should work correctly', () => {
    const key = generateKey();
    const plaintext = 'This is a secret message';
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  test('encryptNote and decryptNote should work correctly', () => {
    const content = 'Secret note content';
    const password = 'notepassword';
    const encrypted = encryptNote(content, password);
    const decrypted = decryptNote(encrypted.encryptedContent, password, encrypted.salt);
    expect(decrypted).toBe(content);
  });

  test('decryptNote should fail with wrong password', () => {
    const content = 'Secret note content';
    const password = 'correctpassword';
    const encrypted = encryptNote(content, password);
    expect(() => {
      decryptNote(encrypted.encryptedContent, 'wrongpassword', encrypted.salt);
    }).toThrow();
  });
});

describe('Database Layer', () => {
  let testDir: string;
  let dbPath: string;
  let db: Database;

  beforeAll(() => {
    testDir = join(tmpdir(), `secure-notes-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    process.env.SECURE_NOTES_HOME = testDir;
    db = new Database(dbPath);
    initializeSchema(db);
  });

  afterAll(() => {
    db.close();
    rmSync(testDir, { recursive: true, force: true });
    delete process.env.SECURE_NOTES_HOME;
  });

  test('Database should be created', () => {
    expect(existsSync(dbPath)).toBe(true);
  });

  test('Tables should be initialized', () => {
    const tables = db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('notes');
    expect(tableNames).toContain('tags');
    expect(tableNames).toContain('note_tags');
    expect(tableNames).toContain('config');
    expect(tableNames).toContain('session');
  });
});

describe('NoteRepository', () => {
  let testDir: string;
  let db: Database;
  let noteRepo: NoteRepository;

  beforeAll(() => {
    testDir = join(tmpdir(), `secure-notes-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.env.SECURE_NOTES_HOME = testDir;
    const dbPath = join(testDir, 'test.db');
    db = new Database(dbPath);
    initializeSchema(db);
    noteRepo = new NoteRepository(db);
  });

  afterAll(() => {
    db.close();
    rmSync(testDir, { recursive: true, force: true });
    delete process.env.SECURE_NOTES_HOME;
  });

  test('createNote should create a note', () => {
    const note = noteRepo.createNote('Test Note', 'Test content');
    expect(note).toBeDefined();
    expect(note.id).toBeGreaterThan(0);
    expect(note.title).toBe('Test Note');
    expect(note.content).toBe('Test content');
    expect(note.encrypted).toBe(0);
  });

  test('getNoteById should retrieve a note', () => {
    const created = noteRepo.createNote('Another Note', 'More content');
    const retrieved = noteRepo.getNoteById(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Another Note');
  });

  test('getAllNotes should return all notes', () => {
    noteRepo.createNote('Note 1', 'Content 1');
    noteRepo.createNote('Note 2', 'Content 2');
    const notes = noteRepo.getAllNotes();
    expect(notes.length).toBeGreaterThan(0);
  });

  test('updateNote should update a note', () => {
    const created = noteRepo.createNote('Original Title', 'Original content');
    const updated = noteRepo.updateNote(created.id, 'Updated Title', 'Updated content');
    expect(updated).toBeDefined();
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.content).toBe('Updated content');
  });

  test('deleteNote should delete a note', () => {
    const created = noteRepo.createNote('To Delete', 'Delete me');
    const deleted = noteRepo.deleteNote(created.id);
    expect(deleted).toBe(true);
    const retrieved = noteRepo.getNoteById(created.id);
    expect(retrieved).toBeNull();
  });

  test('searchNotes should find matching notes', () => {
    noteRepo.createNote('Searchable Note', 'Find this content');
    const results = noteRepo.searchNotes('Searchable');
    expect(results.length).toBeGreaterThan(0);
  });

  test('addTagToNote should add a tag', () => {
    const note = noteRepo.createNote('Tagged Note', 'Content');
    noteRepo.addTagToNote(note.id, 'personal');
    const tags = noteRepo.getTagsForNote(note.id);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0].name).toBe('personal');
  });

  test('removeTagFromNote should remove a tag', () => {
    const note = noteRepo.createNote('Tagged Note 2', 'Content');
    noteRepo.addTagToNote(note.id, 'work');
    noteRepo.removeTagFromNote(note.id, 'work');
    const tags = noteRepo.getTagsForNote(note.id);
    expect(tags.length).toBe(0);
  });

  test('getNotesByTag should filter by tag', () => {
    const note = noteRepo.createNote('Filtered Note', 'Content');
    noteRepo.addTagToNote(note.id, 'special');
    const notes = noteRepo.getNotesByTag('special');
    expect(notes.length).toBeGreaterThan(0);
  });
});

describe('ConfigRepository', () => {
  let testDir: string;
  let db: Database;
  let configRepo: ConfigRepository;

  beforeAll(() => {
    testDir = join(tmpdir(), `secure-notes-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.env.SECURE_NOTES_HOME = testDir;
    const dbPath = join(testDir, 'test.db');
    db = new Database(dbPath);
    initializeSchema(db);
    configRepo = new ConfigRepository(db);
  });

  afterAll(() => {
    db.close();
    rmSync(testDir, { recursive: true, force: true });
    delete process.env.SECURE_NOTES_HOME;
  });

  test('set and get should work', () => {
    configRepo.set('test_key', 'test_value');
    const value = configRepo.get('test_key');
    expect(value).toBe('test_value');
  });

  test('get should return null for non-existent key', () => {
    const value = configRepo.get('non_existent_key');
    expect(value).toBeNull();
  });

  test('delete should remove a key', () => {
    configRepo.set('to_delete', 'value');
    configRepo.delete('to_delete');
    const value = configRepo.get('to_delete');
    expect(value).toBeNull();
  });
});

describe('SessionRepository', () => {
  let testDir: string;
  let db: Database;
  let sessionRepo: SessionRepository;

  beforeAll(() => {
    testDir = join(tmpdir(), `secure-notes-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.env.SECURE_NOTES_HOME = testDir;
    const dbPath = join(testDir, 'test.db');
    db = new Database(dbPath);
    initializeSchema(db);
    sessionRepo = new SessionRepository(db);
  });

  afterAll(() => {
    db.close();
    rmSync(testDir, { recursive: true, force: true });
    delete process.env.SECURE_NOTES_HOME;
  });

  test('unlock should set session', () => {
    sessionRepo.unlock();
    const session = sessionRepo.getSession();
    expect(session?.unlocked_at).not.toBeNull();
    expect(session?.last_activity).not.toBeNull();
  });

  test('lock should clear session', () => {
    sessionRepo.unlock();
    sessionRepo.lock();
    const session = sessionRepo.getSession();
    expect(session?.unlocked_at).toBeNull();
    expect(session?.last_activity).toBeNull();
  });

  test('isUnlocked should return correct status', () => {
    sessionRepo.lock();
    expect(sessionRepo.isUnlocked()).toBe(false);
    sessionRepo.unlock();
    expect(sessionRepo.isUnlocked()).toBe(true);
  });

  test('updateActivity should update last_activity', async () => {
    sessionRepo.unlock();
    const before = sessionRepo.getSession()?.last_activity;
    await new Promise(resolve => setTimeout(resolve, 10));
    sessionRepo.updateActivity();
    const after = sessionRepo.getSession()?.last_activity;
    expect(after).toBeGreaterThan(before!);
  });
});
