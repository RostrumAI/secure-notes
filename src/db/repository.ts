import { Database } from 'bun:sqlite';
import { getDatabase } from './database';

export interface Note {
  id: number;
  title: string;
  content: string | null;
  encrypted: number;
  encrypted_content: string | null;
  encryption_salt: string | null;
  created_at: number;
  updated_at: number;
}

export interface Tag {
  id: number;
  name: string;
}

export class NoteRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  createNote(title: string, content: string, encrypted = false, encryptedContent?: string, encryptionSalt?: string): Note {
    const now = Date.now();
    const query = this.db.query<{
      id: number;
      title: string;
      content: string | null;
      encrypted: number;
      encrypted_content: string | null;
      encryption_salt: string | null;
      created_at: number;
      updated_at: number;
    }>(`
      INSERT INTO notes (title, content, encrypted, encrypted_content, encryption_salt, created_at, updated_at)
      VALUES ($title, $content, $encrypted, $encryptedContent, $encryptionSalt, $createdAt, $updatedAt)
      RETURNING *
    `);

    const result = query.get({
      $title: title,
      $content: encrypted ? null : content,
      $encrypted: encrypted ? 1 : 0,
      $encryptedContent: encryptedContent || null,
      $encryptionSalt: encryptionSalt || null,
      $createdAt: now,
      $updatedAt: now,
    });

    return result!;
  }

  getNoteById(id: number): Note | null {
    const query = this.db.query<Note>('SELECT * FROM notes WHERE id = $id');
    return query.get({ $id: id });
  }

  getAllNotes(): Note[] {
    const query = this.db.query<Note>('SELECT * FROM notes ORDER BY updated_at DESC');
    return query.all();
  }

  getNotesByTag(tagName: string): Note[] {
    const query = this.db.query<Note>(`
      SELECT n.* FROM notes n
      JOIN note_tags nt ON n.id = nt.note_id
      JOIN tags t ON nt.tag_id = t.id
      WHERE t.name = $tagName
      ORDER BY n.updated_at DESC
    `);
    return query.all({ $tagName: tagName });
  }

  updateNote(id: number, title?: string, content?: string, encryptedContent?: string, encryptionSalt?: string): Note | null {
    const note = this.getNoteById(id);
    if (!note) return null;

    const updates: string[] = ['updated_at = $updatedAt'];
    const params: Record<string, any> = {
      $id: id,
      $updatedAt: Date.now(),
    };

    if (title !== undefined) {
      updates.push('title = $title');
      params.$title = title;
    }

    if (content !== undefined) {
      updates.push('content = $content');
      params.$content = content;
    }

    if (encryptedContent !== undefined) {
      updates.push('encrypted_content = $encryptedContent');
      params.$encryptedContent = encryptedContent;
    }

    if (encryptionSalt !== undefined) {
      updates.push('encryption_salt = $encryptionSalt');
      params.$encryptionSalt = encryptionSalt;
    }

    const query = this.db.query<Note>(`
      UPDATE notes SET ${updates.join(', ')}
      WHERE id = $id
      RETURNING *
    `);

    return query.get(params);
  }

  deleteNote(id: number): boolean {
    const query = this.db.query('DELETE FROM notes WHERE id = $id');
    const result = query.run({ $id: id });
    return result.changes > 0;
  }

  searchNotes(query: string): Note[] {
    const searchQuery = this.db.query<Note>(`
      SELECT * FROM notes
      WHERE title LIKE $query
      OR (encrypted = 0 AND content LIKE $query)
      ORDER BY updated_at DESC
    `);
    return searchQuery.all({ $query: `%${query}%` });
  }

  addTagToNote(noteId: number, tagName: string): void {
    let tag = this.getTagByName(tagName);
    if (!tag) {
      tag = this.createTag(tagName);
    }

    const query = this.db.query(`
      INSERT OR IGNORE INTO note_tags (note_id, tag_id)
      VALUES ($noteId, $tagId)
    `);
    query.run({ $noteId: noteId, $tagId: tag.id });
  }

  removeTagFromNote(noteId: number, tagName: string): void {
    const query = this.db.query(`
      DELETE FROM note_tags
      WHERE note_id = $noteId
      AND tag_id = (SELECT id FROM tags WHERE name = $tagName)
    `);
    query.run({ $noteId: noteId, $tagName: tagName });
  }

  getTagsForNote(noteId: number): Tag[] {
    const query = this.db.query<Tag>(`
      SELECT t.* FROM tags t
      JOIN note_tags nt ON t.id = nt.tag_id
      WHERE nt.note_id = $noteId
      ORDER BY t.name
    `);
    return query.all({ $noteId: noteId });
  }

  private createTag(name: string): Tag {
    const query = this.db.query<Tag>('INSERT INTO tags (name) VALUES ($name) RETURNING *');
    return query.get({ $name: name })!;
  }

  private getTagByName(name: string): Tag | null {
    const query = this.db.query<Tag>('SELECT * FROM tags WHERE name = $name');
    return query.get({ $name: name });
  }

  close(): void {
    this.db.close();
  }
}

export class ConfigRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  get(key: string): string | null {
    const query = this.db.query<{ value: string }>('SELECT value FROM config WHERE key = $key');
    const result = query.get({ $key: key });
    return result?.value || null;
  }

  set(key: string, value: string): void {
    const query = this.db.query(`
      INSERT INTO config (key, value) VALUES ($key, $value)
      ON CONFLICT(key) DO UPDATE SET value = $value
    `);
    query.run({ $key: key, $value: value });
  }

  delete(key: string): void {
    const query = this.db.query('DELETE FROM config WHERE key = $key');
    query.run({ $key: key });
  }

  close(): void {
    this.db.close();
  }
}

export class SessionRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  unlock(): void {
    const now = Date.now();
    const query = this.db.query(`
      UPDATE session SET unlocked_at = $now, last_activity = $now WHERE id = 1
    `);
    query.run({ $now: now });
  }

  lock(): void {
    const query = this.db.query('UPDATE session SET unlocked_at = NULL, last_activity = NULL WHERE id = 1');
    query.run();
  }

  updateActivity(): void {
    const now = Date.now();
    const query = this.db.query('UPDATE session SET last_activity = $now WHERE id = 1');
    query.run({ $now: now });
  }

  getSession(): { unlocked_at: number | null; last_activity: number | null } | null {
    const query = this.db.query<{ unlocked_at: number | null; last_activity: number | null }>(
      'SELECT unlocked_at, last_activity FROM session WHERE id = 1'
    );
    return query.get();
  }

  isUnlocked(): boolean {
    const session = this.getSession();
    return session?.unlocked_at !== null;
  }

  close(): void {
    this.db.close();
  }
}
