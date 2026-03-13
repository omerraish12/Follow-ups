#!/usr/bin/env node

/**
 * Simple migration runner for Postgres (Supabase).
 * Applies all .sql files in migrations/ in name order, wrapped in a transaction.
 */
const fs = require('fs');
const path = require('path');
const { supabase } = require('../src/db');

const migrationsDir = path.join(__dirname, '..', 'migrations');

/**
 * Supabase REST/JS cannot execute raw SQL files.
 * This runner:
 *  - lists the SQL files to apply manually (Supabase SQL editor/CLI)
 *  - performs a best-effort table existence check (whatsapp_sessions)
 *  - never calls pg.connect (avoids the old error)
 */
const run = async () => {
  const files = (await fs.promises.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('No migration files found.');
    return;
  }

  console.log('Supabase-only mode: apply these SQL files in the Supabase SQL Editor or CLI:');
  files.forEach((f) => console.log(` - migrations/${f}`));

  // Best-effort schema check; don't crash on fetch/env issues.
  try {
    const { error } = await supabase
      .from('whatsapp_sessions')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    if (error) {
      console.warn('Schema check failed (likely migrations not applied):', error.message);
      process.exitCode = 1;
    } else {
      console.log('Schema check passed (whatsapp_sessions table is accessible).');
    }
  } catch (err) {
    console.warn('Schema check skipped (Supabase fetch failed):', err.message);
    process.exitCode = 1;
  }
};

run().catch((err) => {
  console.error('Migration runner error:', err.message || err);
  process.exit(1);
});
