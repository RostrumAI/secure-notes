import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { ConfigRepository } from '../db/repository';

const DEFAULT_CONFIG_DIR = join(homedir(), '.secure-notes');
const CONFIG_DIR = process.env.SECURE_NOTES_HOME || DEFAULT_CONFIG_DIR;
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface AppConfig {
  editor?: string;
  autolockMinutes?: number;
}

const DEFAULT_CONFIG: AppConfig = {
  editor: undefined,
  autolockMinutes: 15,
};

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadConfig(): AppConfig {
  ensureConfigDir();
  
  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function getEditor(): string {
  const config = loadConfig();
  return config.editor || process.env.EDITOR || process.env.VISUAL || 'nano';
}

export function getAutolockMinutes(): number | null {
  const config = loadConfig();
  return config.autolockMinutes ?? 15;
}

export function setAutolockMinutes(minutes: number | null): void {
  const config = loadConfig();
  config.autolockMinutes = minutes;
  saveConfig(config);
}

export function setEditor(editor: string): void {
  const config = loadConfig();
  config.editor = editor;
  saveConfig(config);
}
