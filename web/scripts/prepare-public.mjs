import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
if (process.env.VITE_PUBLIC_PREVIEW === 'true' && !process.env.VITE_API_URL) {
  const source = readFileSync(new URL('../../src/CareLink.Infrastructure/Data/CategoryCatalog.cs', import.meta.url), 'utf8');
  const tuples = [...source.matchAll(/\("([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"\)/g)];
  const categories = tuples.map(([, name, slug, icon, groupKey, description], index) => ({ id: index + 1, name, slug, icon, groupKey, description }));
  if (categories.length !== 45) throw new Error('Public catalog must contain the 45 authored community fields.');
  const parent = new URL('../public/', import.meta.url);
  if (!existsSync(parent)) throw new Error('The public assets directory does not exist.');
  writeFileSync(fileURLToPath(new URL('../public/catalog.json', import.meta.url)), JSON.stringify(categories), 'utf8');
  console.log(`Prepared ${categories.length} public fields. Authenticated operations require a backend.`);
}
