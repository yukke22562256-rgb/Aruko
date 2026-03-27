import * as readline from 'readline';
import { appendToSheet, readSheet, writeSheet } from './sheets';

// ─────────────────────────────────────────────
// シート構造
//
// [曲マスタ] シート名: "曲マスタ"
//   A: 曲ID  B: タイトル  C: 作曲者  D: ジャンル  E: テンポ(BPM)
//   F: 調    G: 作成日    H: 備考
// ─────────────────────────────────────────────

const SHEET_ID = process.env.STUDENT_SHEET_ID ?? '';

const SONG_SHEET = '曲マスタ';

const SONG_HEADER = [
  '曲ID', 'タイトル', '作曲者', 'ジャンル', 'テンポ(BPM)', '調', '作成日', '備考',
];

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));
}

function generateId(): string {
  return `M${Date.now().toString().slice(-6)}`;
}

function today(): string {
  return new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-');
}

// ─── ヘッダー初期化 ────────────────────────────────────────
export async function initSongSheet(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  await writeSheet(SHEET_ID, `${SONG_SHEET}!A1`, [SONG_HEADER]);
  console.log('\n✅ 曲マスタシートのヘッダーを初期化しました。\n');
}

// ─── 曲一覧 ──────────────────────────────────────────────
export async function listSongs(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rows = await readSheet(SHEET_ID, `${SONG_SHEET}!A1:H`);
  if (rows.length <= 1) {
    console.log('\n🎵 登録されている曲はありません。\n');
    return;
  }

  const songs = rows.slice(1);
  console.log(`\n🎵 曲一覧 (${songs.length}曲):\n`);
  console.log('  ID       | タイトル         | 作曲者     | ジャンル   | BPM  | 調    | 作成日');
  console.log('  ' + '-'.repeat(80));

  for (const r of songs) {
    const [id, title, composer, genre, bpm, key, date] = r;
    const line = [
      (id ?? '').padEnd(8),
      (title ?? '').padEnd(16),
      (composer ?? '').padEnd(10),
      (genre ?? '').padEnd(10),
      (bpm ?? '').padEnd(5),
      (key ?? '').padEnd(6),
      date ?? '',
    ].join(' | ');
    console.log(`  ${line}`);
  }
  console.log();
}

// ─── 曲追加 ──────────────────────────────────────────────
export async function addSong(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n🎵 新しい曲を登録します。\n');

  const title    = await prompt(rl, 'タイトル: ');
  if (!title) { rl.close(); console.log('タイトルは必須です。'); return; }

  const composer = await prompt(rl, '作曲者: ');
  const genre    = await prompt(rl, 'ジャンル (例: ポップス, クラシック, ジャズ): ');
  const bpm      = await prompt(rl, 'テンポ BPM (省略可): ');
  const key      = await prompt(rl, '調 (例: Cメジャー, Aマイナー, 省略可): ');
  const note     = await prompt(rl, '備考 (省略可): ');

  rl.close();

  const id = generateId();
  const row = [id, title, composer, genre, bpm, key, today(), note];

  await appendToSheet(SHEET_ID, `${SONG_SHEET}!A:H`, [row]);

  console.log(`\n✅ 曲を登録しました！`);
  console.log(`   ID: ${id}  タイトル: ${title}  作曲者: ${composer}\n`);
}

// ─── 初期２曲を登録 ──────────────────────────────────────
export async function seedTwoSongs(): Promise<void> {
  if (!SHEET_ID) throw new Error('STUDENT_SHEET_ID が .env に設定されていません');

  const songs = [
    {
      id: generateId(),
      title: '春の旋律',
      composer: '山田花子',
      genre: 'ポップス',
      bpm: '120',
      key: 'Cメジャー',
      date: today(),
      note: '今日新しく作った曲。明るく軽やかなメロディー。',
    },
    {
      id: `M${(Date.now() + 1).toString().slice(-6)}`,
      title: '夜想曲 No.1',
      composer: '山田花子',
      genre: 'クラシック',
      bpm: '60',
      key: 'Aマイナー',
      date: today(),
      note: '今日新しく作った曲。静かで感情的なバラード。',
    },
  ];

  const rows = songs.map(s => [s.id, s.title, s.composer, s.genre, s.bpm, s.key, s.date, s.note]);
  await appendToSheet(SHEET_ID, `${SONG_SHEET}!A:H`, rows);

  console.log('\n🎵 今日作った２曲を登録しました！\n');
  for (const s of songs) {
    console.log(`  ♪ ${s.title} (${s.genre} / ${s.key} / ${s.bpm} BPM)`);
    console.log(`    ${s.note}`);
  }
  console.log();
}
