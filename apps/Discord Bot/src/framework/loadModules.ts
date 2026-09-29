import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Finds every command/event file in a directory tree and imports it.
 *
 * - Subfolders are searched recursively, so commands can be grouped (`commands/moderation/ban.ts`).
 * - Files and folders whose name starts with `_` are skipped. Use that for helpers that sit next
 *   to commands but aren't commands themselves (`commands/moderation/_shared.ts`).
 * - Both `.ts` and `.js` are accepted: in dev, `tsx` runs the TypeScript sources from `src/`, and
 *   in production Node runs the compiled JavaScript from `dist/`.
 * - Files are loaded in alphabetical path order, so startup behaves the same on every machine.
 *
 * This only imports the files. Checking that each one exports the right shape is left to the
 * caller (commands.ts / events.ts), since the two kinds have different requirements.
 */

const MODULE_EXTENSIONS = new Set(['.ts', '.js']);

export interface LoadedModule {
  /** Absolute path of the file, for error messages. */
  file: string;
  /** Whatever the file exported as `default`. Not validated yet. */
  value: unknown;
}

async function findModuleFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    // A missing folder just means there's nothing of that kind yet
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findModuleFiles(fullPath)));
    } else if (MODULE_EXTENSIONS.has(path.extname(entry.name)) && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

/**
 * @param options.fresh Re-import files even if they were imported before, to pick up changes made
 * on disk while the bot is running. Node caches every module by URL for the life of the process,
 * so a changed query string (`?reload=...`) is the only way to get a new copy.
 *
 * Only the files found here are re-imported. Whatever *they* import (src/app/lib, framework,
 * etc.) is still served from the cache, i.e. the version loaded at startup; changes there need
 * a restart. Old copies also stay in memory (ES modules can't be unloaded), which is fine for
 * an occasional manual reload.
 */
export async function loadModules(dir: string, options: { fresh?: boolean } = {}): Promise<LoadedModule[]> {
  const files = await findModuleFiles(dir);
  const query = options.fresh ? `?reload=${Date.now()}` : '';

  return Promise.all(
    files.map(async (file) => {
      // import() needs a file:// URL rather than a path, otherwise Windows paths (C:\...) break
      const module = await import(pathToFileURL(file).href + query);
      return { file, value: module.default };
    }),
  );
}
