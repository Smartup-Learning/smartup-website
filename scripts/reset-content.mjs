import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (process.env.NODE_ENV === 'production') { console.error('Refusing to reset content in production.'); process.exit(1); }
const file = path.join(process.env.DATA_DIR || 'data', 'smartup.sqlite');
const db = new DatabaseSync(file);
for (const table of ['seed_log', 'settings', 'stats', 'timeline_entries', 'growth_points', 'leaders', 'results', 'testimonials', 'jobs', 'centres']) db.exec(`DROP TABLE IF EXISTS ${table}`);
db.close();
console.log(`Content cleared in ${file}. It is re-seeded from data-seed/content.json on the next start.`);
