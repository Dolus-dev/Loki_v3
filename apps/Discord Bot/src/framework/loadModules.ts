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

export async function loadModules(dir: string): Promise<LoadedModule[]> {
  const files = await findModuleFiles(dir);

  return Promise.all(
    files.map(async (file) => {
      // import() needs a file:// URL rather than a path, otherwise Windows paths (C:\...) break
      const module = await import(pathToFileURL(file).href);
      return { file, value: module.default };
    }),
  );
}
