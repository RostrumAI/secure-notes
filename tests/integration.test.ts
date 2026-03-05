import { test, expect, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { spawn, spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';

const CLI_PATH = join(import.meta.dir, '../src/index.ts');
const BUN_PATH = 'bun';

describe('Integration Tests', () => {
  let testDir: string;
  let originalEnv: string | undefined;

  beforeAll(() => {
    testDir = join(tmpdir(), `secure-notes-integration-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    originalEnv = process.env.SECURE_NOTES_HOME;
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    if (originalEnv !== undefined) {
      process.env.SECURE_NOTES_HOME = originalEnv;
    } else {
      delete process.env.SECURE_NOTES_HOME;
    }
  });

  beforeEach(() => {
    process.env.SECURE_NOTES_HOME = testDir;
    if (existsSync(join(testDir, 'notes.db'))) {
      rmSync(join(testDir, 'notes.db'));
    }
    if (existsSync(join(testDir, 'notes.db-wal'))) {
      rmSync(join(testDir, 'notes.db-wal'));
    }
    if (existsSync(join(testDir, 'notes.db-shm'))) {
      rmSync(join(testDir, 'notes.db-shm'));
    }
    if (existsSync(join(testDir, 'config.json'))) {
      rmSync(join(testDir, 'config.json'));
    }
  });

  function runCLI(args: string[], input?: string): { stdout: string; stderr: string; exitCode: number } {
    const result = spawnSync(BUN_PATH, [CLI_PATH, ...args], {
      env: { ...process.env, SECURE_NOTES_HOME: testDir },
      input: input,
      encoding: 'utf-8',
      timeout: 10000,
    });

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.status || 0,
    };
  }

  describe('Help and Version', () => {
    test('should show help', () => {
      const result = runCLI(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('A secure CLI notes application');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('add');
      expect(result.stdout).toContain('list');
    });

    test('should show version', () => {
      const result = runCLI(['--version']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('1.0.0');
    });

    test('should show help for specific command', () => {
      const result = runCLI(['help', 'add']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Create a new note');
      expect(result.stdout).toContain('--encrypted');
      expect(result.stdout).toContain('--content');
    });
  });

  describe('Configuration', () => {
    test('should set editor', () => {
      const result = runCLI(['config', '--editor', 'nano']);
      expect(result.stdout).toContain('Editor set to: nano');
    });

    test('should set autolock', () => {
      const result = runCLI(['config', '--autolock', '30']);
      expect(result.stdout).toContain('Auto-lock set to 30 minutes');
    });

    test('should disable autolock', () => {
      const result = runCLI(['config', '--autolock', 'off']);
      expect(result.stdout).toContain('Auto-lock disabled');
    });

    test('should show config', () => {
      runCLI(['config', '--editor', 'vim']);
      runCLI(['config', '--autolock', '20']);
      const result = runCLI(['config']);
      expect(result.stdout).toContain('Editor: vim');
      expect(result.stdout).toContain('Auto-lock: 20 minutes');
    });
  });

  describe('Lock/Unlock', () => {
    test('should lock successfully', () => {
      const result = runCLI(['lock']);
      expect(result.stdout).toContain('Locked successfully');
    });

    test('should require unlock before operations', () => {
      const result = runCLI(['list']);
      expect(result.stdout).toContain('Database is locked');
    });
  });

  describe('Note Operations', () => {
    beforeEach(() => {
      runCLI(['init', '--password', 'testpass123']);
      runCLI(['unlock', '--password', 'testpass123']);
    });

    test('should add a note', () => {
      const result = runCLI(['add', 'Test Note', '--content', 'This is test content']);
      expect(result.stdout).toContain('Note created with ID:');
    });

    test('should list notes', () => {
      runCLI(['add', 'Note 1', '--content', 'Content 1']);
      runCLI(['add', 'Note 2', '--content', 'Content 2']);
      const result = runCLI(['list']);
      expect(result.stdout).toContain('Note 1');
      expect(result.stdout).toContain('Note 2');
    });

    test('should show a note', () => {
      runCLI(['add', 'My Note', '--content', 'Secret content here']);
      const result = runCLI(['show', '1']);
      expect(result.stdout).toContain('My Note');
      expect(result.stdout).toContain('Secret content here');
    });

    test('should edit a note title', () => {
      runCLI(['add', 'Original Title', '--content', 'Content']);
      const result = runCLI(['edit', '1', '--title', 'Updated Title', '--content', 'Updated content']);
      expect(result.stdout).toContain('Note updated');
      
      const listResult = runCLI(['list']);
      expect(listResult.stdout).toContain('Updated Title');
    });

    test('should delete a note', () => {
      runCLI(['add', 'To Delete', '--content', 'Delete me']);
      const result = runCLI(['delete', '1'], 'y\n');
      expect(result.stdout).toContain('Note deleted');
      
      const listResult = runCLI(['list']);
      expect(listResult.stdout).not.toContain('To Delete');
    });

    test('should handle non-existent note', () => {
      const result = runCLI(['show', '999']);
      expect(result.stdout).toContain('Note not found');
    });
  });

  describe('Encrypted Notes', () => {
    beforeEach(() => {
      runCLI(['init', '--password', 'testpass123']);
      runCLI(['unlock', '--password', 'testpass123']);
    });

    test('should add encrypted note', () => {
      const result = runCLI(
        ['add', 'Secret', '--encrypted', '--content', 'Secret data', '--note-password', 'notepass']
      );
      expect(result.stdout).toContain('Note created with ID:');
      
      const listResult = runCLI(['list']);
      expect(listResult.stdout).toContain('🔒');
    });

    test('should show encrypted note with password', () => {
      runCLI(
        ['add', 'Secret', '--encrypted', '--content', 'Secret data', '--note-password', 'notepass']
      );
      const result = runCLI(['show', '1', '--password', 'notepass']);
      expect(result.stdout).toContain('Secret data');
    });

    test('should reject wrong password for encrypted note', () => {
      runCLI(
        ['add', 'Secret', '--encrypted', '--content', 'Secret data', '--note-password', 'notepass']
      );
      const result = runCLI(['show', '1', '--password', 'wrongpass']);
      expect(result.stdout).toContain('Invalid password');
    });
  });

  describe('Tags', () => {
    beforeEach(() => {
      runCLI(['init', '--password', 'testpass123']);
      runCLI(['unlock', '--password', 'testpass123']);
    });

    test('should add tag to note', () => {
      runCLI(['add', 'Note 1', '--content', 'Content']);
      const result = runCLI(['tag', '1', 'personal']);
      expect(result.stdout).toContain('added to note');
    });

    test('should remove tag from note', () => {
      runCLI(['add', 'Note 1', '--content', 'Content']);
      runCLI(['tag', '1', 'personal']);
      const result = runCLI(['untag', '1', 'personal']);
      expect(result.stdout).toContain('removed from note');
    });

    test('should filter by tag', () => {
      runCLI(['add', 'Note 1', '--content', 'Content']);
      runCLI(['add', 'Note 2', '--content', 'Content']);
      runCLI(['tag', '1', 'personal']);
      runCLI(['tag', '2', 'work']);
      
      const result = runCLI(['list', '--tag', 'personal']);
      expect(result.stdout).toContain('Note 1');
      expect(result.stdout).not.toContain('Note 2');
    });
  });

  describe('Search', () => {
    beforeEach(() => {
      runCLI(['init', '--password', 'testpass123']);
      runCLI(['unlock', '--password', 'testpass123']);
    });

    test('should search notes', () => {
      runCLI(['add', 'Shopping List', '--content', 'Buy milk']);
      runCLI(['add', 'Todo List', '--content', 'Do homework']);
      
      const result = runCLI(['search', 'List']);
      expect(result.stdout).toContain('Shopping List');
      expect(result.stdout).toContain('Todo List');
    });

    test('should search note content', () => {
      runCLI(['add', 'Note 1', '--content', 'Important meeting tomorrow']);
      
      const result = runCLI(['search', 'meeting']);
      expect(result.stdout).toContain('Note 1');
    });
  });

  describe('Import/Export', () => {
    beforeEach(() => {
      runCLI(['init', '--password', 'testpass123']);
      runCLI(['unlock', '--password', 'testpass123']);
    });

    test('should export a note', () => {
      runCLI(['add', 'Export Test', '--content', 'Export this content']);
      const exportPath = join(testDir, 'exported.txt');
      
      const result = runCLI(['export', '1', '--output', exportPath]);
      expect(result.stdout).toContain('exported to');
      expect(existsSync(exportPath)).toBe(true);
      
      const content = readFileSync(exportPath, 'utf-8');
      expect(content).toContain('Export Test');
      expect(content).toContain('Export this content');
    });

    test('should import a note', () => {
      const importPath = join(testDir, 'import.txt');
      writeFileSync(importPath, 'Imported content here');
      
      const result = runCLI(['import', importPath, '--title', 'Imported Note']);
      expect(result.stdout).toContain('Note imported');
      
      const listResult = runCLI(['list']);
      expect(listResult.stdout).toContain('Imported Note');
    });

    test('should import as encrypted', () => {
      const importPath = join(testDir, 'import.txt');
      writeFileSync(importPath, 'Secret imported content');
      
      const result = runCLI(
        ['import', importPath, '--encrypted', '--title', 'Secret Import', '--note-password', 'importpass']
      );
      expect(result.stdout).toContain('Note imported');
      
      const listResult = runCLI(['list']);
      expect(listResult.stdout).toContain('🔒');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing note gracefully', () => {
      runCLI(['init', '--password', 'testpass123']);
      runCLI(['unlock', '--password', 'testpass123']);
      
      const result = runCLI(['show', '999']);
      expect(result.stdout).toContain('Note not found');
    });

    test('should require init before operations', () => {
      const result = runCLI(['unlock', '--password', 'testpass123']);
      expect(result.stdout).toContain('Database not initialized');
    });

    test('should handle invalid autolock value', () => {
      const result = runCLI(['config', '--autolock', 'invalid']);
      expect(result.stdout).toContain('Invalid autolock value');
    });
  });
});
