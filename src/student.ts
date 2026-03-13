import * as readline from 'readline';
import { appendToSheet, readSheet, writeSheet } from './sheets';

// ─────────────────────────────────────────────
// シート構造
//
// [生徒マスタ] シート名: "生徒マスタ"
//   A: 生徒ID  B: 生徒名  C: 保護者名  D: 連絡先Tel  E: 連絡先Mail
//   F: 学年    G: 学校名  H: 担当講師  I: 科目       J: 授業曜日
//   K: 授業時間 L: 月謝   M: 入会日   N: 状態(在籍/休会/退会)  O: 備考
//
// [授業記録] シート名: "授業記録"
//   A: 日付  B: 生徒ID  C: 生徒名  D: 担当講師  E: 実施内容
//   F: 宿題  G: 次回目標  H: 保護者への連絡事項
// ─────────────────────────────────────────────

const SHEET_ID = process.env.STUDENT_SHEET_ID ?? '';

const MASTER_SHEET = '生徒マスタ';
const LESSON_SHEET = '授業記録';

const MASTER_HEADER = [
  '生徒ID', '生徒名', '保護者名', '連絡先Tel', '連絡先Mail',
  '学年', '学校名', '担当講師', '科目', '授業曜日',
  '授業時間', '月謝', '入会日', '状態', '備考',
];

const LESSON_HEADER = [
  '日付', '生徒ID', '生徒名', '担当講師',
  '実施内容', '宿題', '次回目標', '保護者への連絡事項',
];

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));
}

function generateId(): string {
  return `S${Date.now().toString().slice(-6)}`;
}

function today(): string {
  return new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-');
}

// ─── ヘッダー初期化 ────────────────────────────────────────
export async function initSheets(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  await writeSheet(SHEET_ID, `${MASTER_SHEET}!A1`, [MASTER_HEADER]);
  await writeSheet(SHEET_ID, `${LESSON_SHEET}!A1`, [LESSON_HEADER]);
  console.log('\n✅ シートのヘッダーを初期化しました。');
  console.log('  ・生徒マスタ');
  console.log('  ・授業記録\n');
}

// ─── 生徒一覧 ───────────────────────────────────────────────
export async function listStudents(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rows = await readSheet(SHEET_ID, `${MASTER_SHEET}!A1:O`);
  if (rows.length <= 1) {
    console.log('\n📋 登録されている生徒はいません。\n');
    return;
  }

  const students = rows.slice(1).filter(r => r[13] !== '退会');
  console.log(`\n📋 在籍生徒一覧 (${students.length}名):\n`);
  console.log('  ID       | 生徒名   | 学年  | 担当講師  | 科目  | 授業曜日・時間  | 状態');
  console.log('  ' + '-'.repeat(78));

  for (const r of students) {
    const [id, name, , , , grade, , tutor, subject, day, time, , , status] = r;
    const line = [
      (id ?? '').padEnd(8),
      (name ?? '').padEnd(8),
      (grade ?? '').padEnd(5),
      (tutor ?? '').padEnd(9),
      (subject ?? '').padEnd(5),
      `${day ?? ''} ${time ?? ''}`.padEnd(15),
      status ?? '',
    ].join(' | ');
    console.log(`  ${line}`);
  }
  console.log();
}

// ─── 生徒追加 ───────────────────────────────────────────────
export async function addStudent(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n👤 新しい生徒を登録します。\n');

  const name       = await prompt(rl, '生徒名: ');
  if (!name) { rl.close(); console.log('生徒名は必須です。'); return; }

  const guardian   = await prompt(rl, '保護者名: ');
  const tel        = await prompt(rl, '連絡先Tel: ');
  const mail       = await prompt(rl, '連絡先Mail: ');
  const grade      = await prompt(rl, '学年 (例: 中2, 高1): ');
  const school     = await prompt(rl, '学校名: ');
  const tutor      = await prompt(rl, '担当講師名: ');
  const subject    = await prompt(rl, '科目 (例: 数学・英語): ');
  const day        = await prompt(rl, '授業曜日 (例: 火・木): ');
  const time       = await prompt(rl, '授業時間 (例: 19:00-20:30): ');
  const fee        = await prompt(rl, '月謝 (例: 20000): ');
  const note       = await prompt(rl, '備考 (省略可): ');

  rl.close();

  const id = generateId();
  const row = [
    id, name, guardian, tel, mail,
    grade, school, tutor, subject, day,
    time, fee, today(), '在籍', note,
  ];

  await appendToSheet(SHEET_ID, `${MASTER_SHEET}!A:O`, [row]);

  console.log(`\n✅ 生徒を登録しました！`);
  console.log(`   ID: ${id}  氏名: ${name}  担当: ${tutor}\n`);
}

// ─── 授業記録を追加 ──────────────────────────────────────────
export async function addLessonReport(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // 生徒一覧を表示して選択しやすくする
  const rows = await readSheet(SHEET_ID, `${MASTER_SHEET}!A1:O`);
  const students = rows.slice(1).filter(r => r[13] === '在籍');

  if (students.length === 0) {
    rl.close();
    console.log('\n在籍生徒がいません。\n');
    return;
  }

  console.log('\n📝 授業記録を追加します。\n');
  console.log('在籍生徒:');
  students.forEach((r, i) => console.log(`  ${i + 1}. ${r[0]} ${r[1]} (${r[7]})`));
  console.log();

  const indexStr  = await prompt(rl, '生徒番号を選択: ');
  const idx       = parseInt(indexStr, 10) - 1;

  if (isNaN(idx) || idx < 0 || idx >= students.length) {
    rl.close();
    console.log('無効な番号です。');
    return;
  }

  const student    = students[idx];
  const studentId  = student[0];
  const studentName = student[1];
  const tutorName  = student[7];

  const date       = (await prompt(rl, `授業日 (デフォルト: ${today()}): `)) || today();
  const content    = await prompt(rl, '実施内容: ');
  const homework   = await prompt(rl, '宿題: ');
  const nextGoal   = await prompt(rl, '次回の目標: ');
  const parentNote = await prompt(rl, '保護者への連絡事項 (省略可): ');

  rl.close();

  const row = [date, studentId, studentName, tutorName, content, homework, nextGoal, parentNote];
  await appendToSheet(SHEET_ID, `${LESSON_SHEET}!A:H`, [row]);

  console.log(`\n✅ 授業記録を追加しました！`);
  console.log(`   ${date}  ${studentName}  担当: ${tutorName}\n`);
}

// ─── 生徒の授業履歴を表示 ────────────────────────────────────
export async function showLessonHistory(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const studentName = await prompt(rl, '生徒名 (部分一致可): ');
  rl.close();

  const rows = await readSheet(SHEET_ID, `${LESSON_SHEET}!A1:H`);
  const records = rows.slice(1).filter(r => (r[2] ?? '').includes(studentName));

  if (records.length === 0) {
    console.log(`\n「${studentName}」の授業記録はありません。\n`);
    return;
  }

  console.log(`\n📖 ${studentName} の授業記録 (${records.length}件):\n`);
  for (const r of records) {
    console.log(`  ▶ ${r[0]}  担当: ${r[3]}`);
    console.log(`    実施内容: ${r[4]}`);
    if (r[5]) console.log(`    宿題:     ${r[5]}`);
    if (r[6]) console.log(`    次回目標: ${r[6]}`);
    if (r[7]) console.log(`    保護者へ: ${r[7]}`);
    console.log();
  }
}
