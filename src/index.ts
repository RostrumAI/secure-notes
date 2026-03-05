#!/usr/bin/env bun
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { unlockCommand } from './commands/unlock';
import { lockCommand } from './commands/lock';
import { addCommand } from './commands/add';
import { listCommand } from './commands/list';
import { showCommand } from './commands/show';
import { editCommand } from './commands/edit';
import { deleteCommand } from './commands/delete';
import { tagCommand, untagCommand } from './commands/tag';
import { searchCommand } from './commands/search';
import { exportCommand } from './commands/export';
import { importCommand } from './commands/import';
import { configCommand, changePasswordCommand, changeNotePasswordCommand } from './commands/config';

const program = new Command();

program
  .name('secure-notes')
  .description('A secure CLI notes application with encryption support')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize the database and set up master password')
  .option('-p, --password <password>', 'Master password (for testing)')
  .action(async (options: { password?: string }) => {
    await initCommand(options.password);
  });

program
  .command('unlock')
  .description('Unlock the database with master password')
  .option('-p, --password <password>', 'Master password (for testing)')
  .action(async (options: { password?: string }) => {
    await unlockCommand(options.password);
  });

program
  .command('lock')
  .description('Lock the database')
  .action(async () => {
    await lockCommand();
  });

program
  .command('add <title>')
  .description('Create a new note')
  .option('-e, --encrypted', 'Create an encrypted note')
  .option('-c, --content <content>', 'Note content (bypasses editor)')
  .option('-p, --note-password <password>', 'Note password for encrypted notes (for testing)')
  .action(async (title: string, options: { encrypted?: boolean; content?: string; notePassword?: string }) => {
    await addCommand(title, options);
  });

program
  .command('list')
  .description('List all notes')
  .option('-t, --tag <tag>', 'Filter by tag')
  .action(async (options: { tag?: string }) => {
    await listCommand(options);
  });

program
  .command('show <id>')
  .description('Display a specific note')
  .option('-p, --password <password>', 'Note password for encrypted notes (for testing)')
  .action(async (id: string, options: { password?: string }) => {
    await showCommand(parseInt(id), options.password);
  });

program
  .command('edit <id>')
  .description('Edit an existing note')
  .option('-t, --title <title>', 'New title')
  .option('-c, --content <content>', 'New content (bypasses editor)')
  .action(async (id: string, options: { title?: string; content?: string }) => {
    await editCommand(parseInt(id), options);
  });

program
  .command('delete <id>')
  .description('Delete a note')
  .action(async (id: string) => {
    await deleteCommand(parseInt(id));
  });

program
  .command('tag <id> <tag>')
  .description('Add a tag to a note')
  .action(async (id: string, tag: string) => {
    await tagCommand(parseInt(id), tag);
  });

program
  .command('untag <id> <tag>')
  .description('Remove a tag from a note')
  .action(async (id: string, tag: string) => {
    await untagCommand(parseInt(id), tag);
  });

program
  .command('search <query>')
  .description('Search notes by title and content')
  .action(async (query: string) => {
    await searchCommand(query);
  });

program
  .command('export <id>')
  .description('Export a note to a file')
  .option('-o, --output <file>', 'Output file path')
  .action(async (id: string, options: { output?: string }) => {
    await exportCommand(parseInt(id), options);
  });

program
  .command('import <file>')
  .description('Import a note from a file')
  .option('-e, --encrypted', 'Import as encrypted note')
  .option('-t, --title <title>', 'Note title')
  .option('-p, --note-password <password>', 'Note password for encrypted notes (for testing)')
  .action(async (file: string, options: { encrypted?: boolean; title?: string; notePassword?: string }) => {
    await importCommand(file, options);
  });

program
  .command('config')
  .description('Show or edit configuration')
  .option('-e, --editor <editor>', 'Set default editor')
  .option('-a, --autolock <minutes>', 'Set auto-lock timeout (number or "off")')
  .action(async (options: { editor?: string; autolock?: string }) => {
    await configCommand(options);
  });

program
  .command('change-password')
  .description('Change master password')
  .action(async () => {
    await changePasswordCommand();
  });

program
  .command('change-note-password <id>')
  .description('Change password for an encrypted note')
  .action(async (id: string) => {
    await changeNotePasswordCommand(parseInt(id));
  });

program.parse();
