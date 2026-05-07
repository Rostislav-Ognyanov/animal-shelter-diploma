import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

export async function loadJsonFile(relativePath) {
  const absolutePath = path.join(serverRoot, relativePath);
  const fileContent = await readFile(absolutePath, 'utf8');
  const sanitizedContent = fileContent.replace(/^\uFEFF/, '');

  return JSON.parse(sanitizedContent);
}
