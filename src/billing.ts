import * as readline from 'readline';
import { appendToSheet, readSheet, writeSheet } from './sheets';

// ─────────────────────────────────────────────
// シート構造
//
// [請求管理] シート名: "請求管理"
//   A: 月(YYYY-MM)  B: 生徒ID  C: 生徒名  D: 月謝
//   E: 支払日       F: 支払方法(現金/振込)  G: 状態(未払/支払済)  H: 備考
// ─────────────────────────────────────────────

const SHEET_ID = process.env.STUDENT_SHEET_ID ?? '';
const MASTER_SHEET = '生徒マスタ';
const BILLING_SHEET = '請求管理';

const BILLING_HEADER = [
  '月', '生徒ID', '生徒名', '月謝', '支払日', '支払方法', '状態', '備考',
];

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function today(): string {
  return new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-');
}

// ─── 請求管理シートのヘッダー初期化 ─────────────────────────────
export async function initBillingSheet(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');
  await writeSheet(SHEET_ID, `${BILLING_SHEET}!A1`, [BILLING_HEADER]);
  console.log('\n✅ 請求管理シートのヘッダーを初期化しました。\n');
}

// ─── 月次請求エントリを生徒マスタから一括生成 ────────────────────
export async function generateMonthlyBilling(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const month = (await prompt(rl, `対象月 (デフォルト: ${currentMonth()}): `)) || currentMonth();
  rl.close();

  // 生徒マスタから在籍生徒を取得
  const rows = await readSheet(SHEET_ID, `${MASTER_SHEET}!A1:O`);
  const students = rows.slice(1).filter(r => r[13] === '在籍');

  if (students.length === 0) {
    console.log('\n在籍生徒がいません。\n');
    return;
  }

  // 既存の請求エントリを確認（重複防止）
  const existing = await readSheet(SHEET_ID, `${BILLING_SHEET}!A1:H`);
  const existingKeys = new Set(
    existing.slice(1).map(r => `${r[0]}_${r[1]}`)
  );

  const newRows: string[][] = [];
  const skipped: string[] = [];

  for (const s of students) {
    const [id, name, , , , , , , , , , fee] = s;
    const key = `${month}_${id}`;
    if (existingKeys.has(key)) {
      skipped.push(name);
      continue;
    }
    newRows.push([month, id, name, fee ?? '', '', '', '未払', '']);
  }

  if (newRows.length === 0) {
    console.log(`\n⚠️  ${month} の請求エントリはすでに全員分生成済みです。\n`);
    return;
  }

  await appendToSheet(SHEET_ID, `${BILLING_SHEET}!A:H`, newRows);

  console.log(`\n✅ ${month} の請求エントリを生成しました！`);
  console.log(`   生成: ${newRows.length}件  スキップ(重複): ${skipped.length}件\n`);
}

// ─── 月次請求一覧の表示 ──────────────────────────────────────────
export async function listBilling(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const month = (await prompt(rl, `対象月 (デフォルト: ${currentMonth()}): `)) || currentMonth();
  rl.close();

  const rows = await readSheet(SHEET_ID, `${BILLING_SHEET}!A1:H`);
  const records = rows.slice(1).filter(r => r[0] === month);

  if (records.length === 0) {
    console.log(`\n📋 ${month} の請求データがありません。`);
    console.log('   先に "npm run billing-generate" で請求エントリを生成してください。\n');
    return;
  }

  const unpaid = records.filter(r => r[6] !== '支払済');
  const paid   = records.filter(r => r[6] === '支払済');
  const totalFee   = records.reduce((sum, r) => sum + (parseInt(r[3], 10) || 0), 0);
  const paidFee    = paid.reduce((sum, r) => sum + (parseInt(r[3], 10) || 0), 0);
  const unpaidFee  = totalFee - paidFee;

  console.log(`\n💰 ${month} 月謝請求一覧 (計${records.length}名):\n`);
  console.log(`  ${'生徒名'.padEnd(10)} | ${'月謝'.padStart(7)} | ${'状態'.padEnd(5)} | 支払日        | 支払方法`);
  console.log('  ' + '-'.repeat(62));

  for (const r of records) {
    const [, , name, fee, payDate, method, status] = r;
    const statusMark = status === '支払済' ? '✅' : '⬜';
    console.log(
      `  ${statusMark} ${(name ?? '').padEnd(9)} | ${(fee ?? '').padStart(7)}円 | ${(status ?? '').padEnd(4)} | ${(payDate ?? '  (未記録)  ').padEnd(12)} | ${method ?? ''}`,
    );
  }

  console.log('\n  ' + '-'.repeat(62));
  console.log(`  合計月謝:  ${totalFee.toLocaleString()}円`);
  console.log(`  支払済:    ${paidFee.toLocaleString()}円 (${paid.length}名)`);
  console.log(`  未払:      ${unpaidFee.toLocaleString()}円 (${unpaid.length}名)\n`);
}

// ─── 支払い済みに更新 ────────────────────────────────────────────
export async function markAsPaid(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const month = (await prompt(rl, `対象月 (デフォルト: ${currentMonth()}): `)) || currentMonth();

  // 未払い一覧を表示
  const allRows = await readSheet(SHEET_ID, `${BILLING_SHEET}!A1:H`);
  const header = allRows[0];
  const dataRows = allRows.slice(1);
  const unpaidRows = dataRows
    .map((r, i) => ({ row: r, index: i + 2 })) // +2: 1行目ヘッダー + 1-indexed
    .filter(({ row }) => row[0] === month && row[6] !== '支払済');

  if (unpaidRows.length === 0) {
    rl.close();
    console.log(`\n✅ ${month} の未払い生徒はいません。\n`);
    return;
  }

  console.log(`\n💴 ${month} 未払い生徒:\n`);
  unpaidRows.forEach(({ row }, i) =>
    console.log(`  ${i + 1}. ${row[2]}  ${row[3]}円`)
  );
  console.log();

  const indexStr = await prompt(rl, '支払いを記録する生徒番号 (カンマ区切りで複数可): ');
  const indices = indexStr.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => !isNaN(i) && i >= 0 && i < unpaidRows.length);

  if (indices.length === 0) {
    rl.close();
    console.log('無効な番号です。');
    return;
  }

  const payDate  = (await prompt(rl, `支払日 (デフォルト: ${today()}): `)) || today();
  const method   = (await prompt(rl, '支払方法 (1:現金 / 2:振込): ')) === '2' ? '振込' : '現金';
  const note     = await prompt(rl, '備考 (省略可): ');
  rl.close();

  for (const idx of indices) {
    const { row, index: sheetRow } = unpaidRows[idx];
    const updatedRow = [row[0], row[1], row[2], row[3], payDate, method, '支払済', note];
    await writeSheet(SHEET_ID, `${BILLING_SHEET}!A${sheetRow}:H${sheetRow}`, [updatedRow]);
    console.log(`  ✅ ${row[2]} の支払いを記録しました。`);
  }
  console.log();
}

// ─── 月次収入レポート ────────────────────────────────────────────
export async function billingReport(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rows = await readSheet(SHEET_ID, `${BILLING_SHEET}!A1:H`);
  const data = rows.slice(1);

  if (data.length === 0) {
    console.log('\n📊 請求データがありません。\n');
    return;
  }

  // 月ごとに集計
  const monthMap = new Map<string, { total: number; paid: number; unpaid: number; count: number; paidCount: number }>();
  for (const r of data) {
    const month = r[0] ?? '';
    const fee = parseInt(r[3], 10) || 0;
    const isPaid = r[6] === '支払済';
    if (!monthMap.has(month)) {
      monthMap.set(month, { total: 0, paid: 0, unpaid: 0, count: 0, paidCount: 0 });
    }
    const entry = monthMap.get(month)!;
    entry.total += fee;
    entry.count += 1;
    if (isPaid) { entry.paid += fee; entry.paidCount += 1; }
    else { entry.unpaid += fee; }
  }

  const months = [...monthMap.keys()].sort();

  console.log('\n📊 月次収入レポート:\n');
  console.log(`  ${'月'.padEnd(8)} | ${'請求総額'.padStart(9)} | ${'入金済'.padStart(9)} | ${'未回収'.padStart(9)} | 回収率`);
  console.log('  ' + '-'.repeat(62));

  for (const month of months) {
    const { total, paid, unpaid, count, paidCount } = monthMap.get(month)!;
    const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
    const rateBar = '█'.repeat(Math.floor(rate / 10)) + '░'.repeat(10 - Math.floor(rate / 10));
    console.log(
      `  ${month.padEnd(8)} | ${total.toLocaleString().padStart(8)}円 | ${paid.toLocaleString().padStart(8)}円 | ${unpaid.toLocaleString().padStart(8)}円 | ${rate}% ${rateBar}`
    );
  }
  console.log();
}
