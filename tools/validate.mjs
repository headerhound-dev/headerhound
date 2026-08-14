#!/usr/bin/env node
/**
 * HeaderHound validator — dependency-free.
 * Checks every fingerprint against the schema's core constraints and confirms
 * each `pattern` compiles as a valid regex and each `id` is unique.
 *
 * Usage: node tools/validate.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'fingerprints.json'), 'utf8'));
const allowData = JSON.parse(readFileSync(join(root, 'allowlist.json'), 'utf8'));

const CATEGORIES = ['cold-email-platform', 'sales-engagement', 'mail-merge', 'deliverability-warmup'];
const CONFIDENCE = ['high', 'medium', 'low'];
const SCOPES = ['headers', 'received', 'body'];
const ALLOW_CATEGORIES = ['saas-notifications', 'developer-tools', 'productivity', 'scheduling', 'finance', 'communication', 'storage', 'esp-transactional', 'other'];
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

const errors = [];

// ---- fingerprints ----
const ids = new Set();
const list = data.fingerprints || [];
list.forEach((fp, i) => {
  const at = `fingerprint #${i} (${fp.id ?? 'no-id'})`;
  const req = ['id', 'name', 'category', 'confidence', 'pattern', 'scope', 'lastVerified'];
  for (const k of req) if (fp[k] === undefined) errors.push(`${at}: missing required field '${k}'`);

  if (fp.id && !ID_RE.test(fp.id)) errors.push(`${at}: id not kebab-case`);
  if (fp.id) { if (ids.has(fp.id)) errors.push(`${at}: duplicate id '${fp.id}'`); ids.add(fp.id); }
  if (fp.category && !CATEGORIES.includes(fp.category)) errors.push(`${at}: bad category '${fp.category}'`);
  if (fp.confidence && !CONFIDENCE.includes(fp.confidence)) errors.push(`${at}: bad confidence '${fp.confidence}'`);
  if (fp.scope && !SCOPES.includes(fp.scope)) errors.push(`${at}: bad scope '${fp.scope}'`);
  if (fp.lastVerified && !DATE_RE.test(fp.lastVerified)) errors.push(`${at}: lastVerified not YYYY-MM-DD`);

  if (fp.pattern !== undefined) {
    try { new RegExp(fp.pattern, 'i'); }
    catch (e) { errors.push(`${at}: invalid regex — ${e.message}`); }
  }
});

// ---- allowlist ----
const domains = new Set();
const allow = allowData.allow || [];
allow.forEach((a, i) => {
  const at = `allowlist #${i} (${a.domain ?? 'no-domain'})`;
  for (const k of ['domain', 'notes', 'lastVerified']) if (a[k] === undefined) errors.push(`${at}: missing required field '${k}'`);
  if (a.domain && !DOMAIN_RE.test(a.domain)) errors.push(`${at}: not a bare registrable domain`);
  if (a.domain) { if (domains.has(a.domain)) errors.push(`${at}: duplicate domain '${a.domain}'`); domains.add(a.domain); }
  if (a.category && !ALLOW_CATEGORIES.includes(a.category)) errors.push(`${at}: bad category '${a.category}'`);
  if (a.lastVerified && !DATE_RE.test(a.lastVerified)) errors.push(`${at}: lastVerified not YYYY-MM-DD`);
});

if (errors.length) {
  console.error(`✗ HeaderHound validation FAILED (${errors.length} problem(s)):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✓ HeaderHound OK — ${list.length} fingerprints (${ids.size} unique ids), ${allow.length} allowlist domains (${domains.size} unique), all patterns compile.`);
