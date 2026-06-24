/**
 * Smoke test for the searching engine.
 * Run via: npx ts-node -O '{"module":"commonjs"}' scripts/smoke-test-search.ts
 */
import path from 'path';
import fs from 'fs';
import os from 'os';
import Database from 'better-sqlite3';

// We'll import from the source files to test logic integrity
import { getDb } from '../src/search/db/connection';
import { upsertFile, searchFiles } from '../src/search/db/queries';

async function runTest() {
  const tmpDir = path.join(os.tmpdir(), 'aigenius-search-test-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const dbPath = path.join(tmpDir, 'test.db');
  const sampleFilePath = path.join(tmpDir, 'test-doc.txt');

  console.log('--- SEARCH SMOKE TEST ---');
  console.log('1. Initializing DB at', dbPath);
  const db = new Database(dbPath);
  // Manual schema load since we aren't in the full registerSearchModule lifecycle
  const schema = fs.readFileSync(path.join(__dirname, '..', 'src', 'search', 'schema.sql'), 'utf8');
  db.exec(schema);

  console.log('2. Creating sample file with "AIGenius is super powerful"');
  fs.writeFileSync(sampleFilePath, 'AIGenius is a super powerful local search engine!');

  console.log('3. Indexing file...');
  upsertFile(db, {
    path: sampleFilePath,
    name: 'test-doc.txt',
    mtime: Date.now(),
    content: 'AIGenius is a super powerful local search engine!',
    tags: 'test smoke'
  });

  console.log('4. Searching for "powerful"...');
  const results = searchFiles(db, 'powerful');

  console.log('\nResults Found:', results.length);
  if (results.length > 0) {
    console.log('Result #1:');
    console.log(' - Name:', results[0].name);
    console.log(' - Excerpt:', results[0].excerpt);
    console.log(' - Rank:', results[0].rank);
    console.log('\n✅ TEST PASSED: Search engine indexed and retrieved content correctly.');
  } else {
    console.log('❌ TEST FAILED: Result not found.');
    process.exit(1);
  }

  // Cleanup
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

runTest().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
