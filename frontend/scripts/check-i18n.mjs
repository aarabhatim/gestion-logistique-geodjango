#!/usr/bin/env node
/**
 * scripts/check-i18n.mjs
 * Verifie la coherence des dictionnaires i18n.
 * Usage : npm run i18n:check
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, extname, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// Resolve paths correctly even when directory contains spaces
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');
const I18N_DIR   = join(ROOT, 'src', 'i18n');
const SRC_DIR    = join(ROOT, 'src');

// ── 1. Load dictionaries by reading + evaluating the JS files ─────────────────
// Using a simple regex extraction to avoid ESM dynamic-import path issues with spaces.
function loadDictSync(file) {
  const src = readFileSync(join(I18N_DIR, file), 'utf8');
  // Extract the object literal between "= {" and closing "};"
  const match = src.match(/export const \w+ = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error('Cannot parse dict from ' + file);
  // Evaluate the object literal in a safe context
  return Function('"use strict"; return (' + match[1] + ')')();
}

const FR = loadDictSync('fr.js');
const EN = loadDictSync('en.js');
const AR = loadDictSync('ar.js');
const ES = loadDictSync('es.js');

const DICTS  = { fr: FR, en: EN, ar: AR, es: ES };
const frKeys = Object.keys(FR);

let errors   = 0;
let warnings = 0;

function err(msg)  { console.error('  [ERREUR]', msg); errors++; }
function warn(msg) { console.warn ('  [AVERT.]', msg); warnings++; }
function ok(msg)   { console.log  ('  [OK]', msg); }

// ── 2. Key parity check ───────────────────────────────────────────────────────
console.log('\n-- Parite des cles -------------------------------------------------');
for (const [lang, dict] of Object.entries(DICTS)) {
  if (lang === 'fr') { ok(`FR -- ${frKeys.length} cles (reference)`); continue; }
  const dictKeys = Object.keys(dict);
  const missing  = frKeys.filter(k => !(k in dict));
  const extra    = dictKeys.filter(k => !(k in FR));
  if (missing.length === 0 && extra.length === 0) {
    ok(`${lang.toUpperCase()} -- ${dictKeys.length} cles, parite parfaite`);
  } else {
    if (missing.length) err(`${lang.toUpperCase()} manque ${missing.length} cle(s) : ${missing.slice(0,10).join(', ')}${missing.length>10?' ...':''}`);
    if (extra.length)   warn(`${lang.toUpperCase()} a ${extra.length} cle(s) en plus : ${extra.slice(0,5).join(', ')}`);
  }
}

// ── 3. Empty values check ─────────────────────────────────────────────────────
console.log('\n-- Valeurs vides ---------------------------------------------------');
let emptyFound = false;
for (const [lang, dict] of Object.entries(DICTS)) {
  const empty = Object.entries(dict).filter(([,v]) => v === '' || v == null);
  if (empty.length) {
    err(`${lang.toUpperCase()} a ${empty.length} valeur(s) vide(s) : ${empty.map(([k])=>k).slice(0,5).join(', ')}`);
    emptyFound = true;
  }
}
if (!emptyFound) ok('Aucune valeur vide dans les 4 dicts');

// ── 4. Key usage scan ─────────────────────────────────────────────────────────
console.log('\n-- Cles utilisees dans src/ ----------------------------------------');

function walkFiles(dir, exts = ['.jsx', '.js', '.tsx', '.ts']) {
  const results = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'i18n') continue;
      results.push(...walkFiles(full, exts));
    } else if (exts.includes(extname(name))) {
      results.push(full);
    }
  }
  return results;
}

const files    = walkFiles(SRC_DIR);
const usedKeys = new Set();

const T_RE        = /\bt\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g;
const TSTATUS_RE   = /\btStatus\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(T_RE))       usedKeys.add(m[1]);
  for (const m of src.matchAll(TSTATUS_RE))  usedKeys.add('status_' + m[1]);
}

const missingInFR  = [...usedKeys].filter(k => !(k in FR));
const unusedInCode = frKeys.filter(k => !usedKeys.has(k));

if (missingInFR.length) {
  err(`${missingInFR.length} cle(s) utilisee(s) dans le code mais absente(s) de FR :`);
  missingInFR.slice(0, 20).forEach(k => console.error('    -', k));
} else {
  ok(`Toutes les cles t('...') du code existent dans FR`);
}

if (unusedInCode.length) {
  warn(`${unusedInCode.length} cle(s) de FR non detectees dans le code (peuvent etre dynamiques)`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n--------------------------------------------------------------------');
console.log(`Resultat : ${errors} erreur(s), ${warnings} avertissement(s)`);
if (errors > 0) {
  console.error('\nECHEC -- corrigez les erreurs ci-dessus.');
  process.exit(1);
} else {
  console.log('\nSUCCES -- tous les dicts sont coherents.');
  process.exit(0);
}
