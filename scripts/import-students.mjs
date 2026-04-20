import { readFileSync } from 'fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const { Pool } = pg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL not set');

const pool = new Pool({ connectionString: DB_URL });

// ── Track → gradeLevel mapping
function mapTrack(track, studentId) {
  const t = (track || '').trim();
  if (t.includes('التاسع'))    return 'grade9';
  if (t.includes('بكالوريا'))  return 'baccalaureate';
  if (t.includes('مخرجات'))    return 'outcomes';
  if (t.includes('1000') || t.includes('خطوة')) return 'steps1000';
  if (t.toLowerCase().includes('ielts')) return 'ielts';
  // Fallback: infer from studentId prefix
  const id = (studentId || '').toUpperCase();
  if (id.startsWith('G9'))  return 'grade9';
  if (id.startsWith('BAC')) return 'baccalaureate';
  if (id.startsWith('OUT')) return 'outcomes';
  if (id.startsWith('STP')) return 'steps1000';
  if (id.startsWith('IEL')) return 'ielts';
  return 'grade9';
}

// ── Parse CSV (handles multiline quoted fields)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\n') {
        row.push(field.trim()); rows.push(row);
        row = []; field = '';
      } else if (ch !== '\r') { field += ch; }
    }
  }
  if (row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows;
}

const csvPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'attached_assets', 'najm_t9_template_quiz_-_Students_1775465931695.csv');
const raw = readFileSync(csvPath, 'utf-8');
const rows = parseCSV(raw);

// Only keep rows where col[0] matches a student ID pattern (e.g. G9-0001)
const studentRows = rows.filter(r => r[0] && /^[A-Z][A-Z0-9]*-\d+$/.test(r[0].trim()));
console.log(`Found ${studentRows.length} student records in CSV\n`);

// Hash password once — reuse for all students
const passwordHash = await bcrypt.hash('123456', 10);

let created = 0, updated = 0, errors = 0;

for (const row of studentRows) {
  const studentId  = row[0]?.trim();
  const fullName   = row[1]?.trim();
  const phone      = (row[2]?.trim() || '').replace(/^\+/, '');
  const email      = row[3]?.trim() || `${studentId.toLowerCase()}@sync.najm-edu`;
  const track      = row[4]?.trim();
  const gradeLevel = mapTrack(track, studentId);

  if (!studentId || !fullName) continue;

  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE student_id = $1', [studentId]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE users SET full_name=$1, phone=$2, grade_level=$3 WHERE student_id=$4',
        [fullName, phone, gradeLevel, studentId]
      );
      console.log(`  ↻ ${studentId} — ${fullName} (updated)`);
      updated++;
    } else {
      await pool.query(
        `INSERT INTO users (student_id, email, password_hash, full_name, phone, grade_level, access_role, stars_balance)
         VALUES ($1, $2, $3, $4, $5, $6, 'free', 0)`,
        [studentId, email, passwordHash, fullName, phone, gradeLevel]
      );
      console.log(`  ✓ ${studentId} — ${fullName} → ${gradeLevel}`);
      created++;
    }
  } catch (err) {
    console.error(`  ✗ ${studentId} ERROR: ${err.message}`);
    errors++;
  }
}

await pool.end();

console.log('\n═══════════════════════════════');
console.log(`  ✓ Created : ${created} students`);
console.log(`  ↻ Updated : ${updated} students`);
console.log(`  ✗ Errors  : ${errors}`);
console.log(`  TOTAL     : ${created + updated} students imported`);
console.log('═══════════════════════════════');
console.log('\nDefault password for all students: 123456');
