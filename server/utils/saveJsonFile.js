import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

export async function saveJsonFile(relativePath, value) {
  const absolutePath = path.join(serverRoot, relativePath);
  const directoryPath = path.dirname(absolutePath);

  await mkdir(directoryPath, { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
