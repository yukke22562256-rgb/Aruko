import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import { getTodayEvents, addEvent, getUpcomingReminders } from './calendar';
import { printMorningGreeting, sendNotification } from './notify';
import { getUnreadMails, printUnreadMails } from './gmail';
import { listRecentFiles, searchFiles, printFiles } from './drive';
import { readDocument, appendToDocument, printDocument } from './docs';
import { readSheet, appendToSheet, printSheet } from './sheets';
import { initSheets, listStudents, addStudent, addLessonReport, showLessonHistory } from './student';
import { initBillingSheet, generateMonthlyBilling, listBilling, markAsPaid, billingReport } from './billing';
import { getAuthUrl } from './auth';

const command = process.argv[2];
const arg = process.argv[3];

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function toLocalISOString(dateStr: string, timeStr: string): string {
  const dt = new Date(`${dateStr}T${timeStr}:00`);
  const offset = -dt.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const offsetStr = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return `${dateStr}T${timeStr}:00${offsetStr}`;
}

async function showTodayEvents(): Promise<void> {
  console.log('\n⏳ カレンダーを取得中...');
  const events = await getTodayEvents();
  printMorningGreeting(events);
}

async function addNewEvent(): Promise<void> {
  console.log('\n📝 新しいイベントを追加します。\n');
  const summary = await promptUser('イベント名: ');
  if (!summary) { console.log('イベント名は必須です。'); return; }
  const today = new Date().toISOString().slice(0, 10);
  const date = (await promptUser(`日付 (例: ${today}): `)) || today;
  const startTime = await promptUser('開始時間 (例: 09:00): ');
  const endTime = await promptUser('終了時間 (例: 10:00): ');
  if (!startTime || !endTime) { console.log('時間は必須です。'); return; }
  const location = await promptUser('場所 (省略可): ');
  const description = await promptUser('メモ (省略可): ');
  const reminderInput = await promptUser('リマインダー (分前、省略可): ');

  console.log('\n⏳ イベントを追加中...');
  const event = await addEvent({
    summary,
    startDateTime: toLocalISOString(date, startTime),
    endDateTime: toLocalISOString(date, endTime),
    location: location || undefined,
    description: description || undefined,
    reminderMinutes: reminderInput ? parseInt(reminderInput, 10) : undefined,
  });

  console.log(`\n✅ イベントを追加しました！`);
  console.log(`   📌 ${event.summary}`);
  console.log(`   ⏰ ${event.start} ～ ${event.end}`);
}

async function checkReminders(): Promise<void> {
  console.log('\n⏳ 近くの予定を確認中...');
  const events = await getUpcomingReminders(30);
  if (events.length === 0) { console.log('🔔 今後30分以内の予定はありません。\n'); return; }
  for (const event of events) sendNotification(event);
}

async function showUnreadMails(): Promise<void> {
  console.log('\n⏳ 未読メールを取得中...');
  const mails = await getUnreadMails(10);
  printUnreadMails(mails);
}

async function showDriveFiles(): Promise<void> {
  if (arg) {
    console.log(`\n⏳ "${arg}" を検索中...`);
    const files = await searchFiles(arg);
    printFiles(files, `"${arg}" の検索結果`);
  } else {
    console.log('\n⏳ 最近のファイルを取得中...');
    const files = await listRecentFiles(10);
    printFiles(files, '最近のファイル');
  }
}

async function showDocument(): Promise<void> {
  const docId = arg || await promptUser('ドキュメントID: ');
  if (!docId) { console.log('ドキュメントIDは必須です。'); return; }
  console.log('\n⏳ ドキュメントを取得中...');
  const content = await readDocument(docId);
  printDocument(content);
}

async function appendDoc(): Promise<void> {
  const docId = arg || await promptUser('ドキュメントID: ');
  if (!docId) { console.log('ドキュメントIDは必須です。'); return; }
  const text = await promptUser('追記するテキスト: ');
  if (!text) { console.log('テキストは必須です。'); return; }
  console.log('\n⏳ ドキュメントに追記中...');
  await appendToDocument(docId, text);
  console.log('✅ 追記しました。');
}

async function showSheet(): Promise<void> {
  const sheetId = arg || await promptUser('スプレッドシートID: ');
  if (!sheetId) { console.log('スプレッドシートIDは必須です。'); return; }
  const range = await promptUser('範囲 (例: Sheet1!A1:D10): ');
  if (!range) { console.log('範囲は必須です。'); return; }
  console.log('\n⏳ スプレッドシートを取得中...');
  const data = await readSheet(sheetId, range);
  printSheet(data);
}

async function appendSheet(): Promise<void> {
  const sheetId = arg || await promptUser('スプレッドシートID: ');
  if (!sheetId) { console.log('スプレッドシートIDは必須です。'); return; }
  const range = await promptUser('シート名 (例: Sheet1): ');
  const rowInput = await promptUser('追加するデータ (カンマ区切り、例: 値1,値2,値3): ');
  const values = [rowInput.split(',').map(v => v.trim())];
  console.log('\n⏳ データを追加中...');
  await appendToSheet(sheetId, range, values);
  console.log('✅ データを追加しました。');
}

function printHelp(): void {
  console.log('\nAruko - Google Workspace CLI\n');
  console.log('使い方: npm run dev [コマンド] [引数]\n');
  console.log('コマンド:');
  console.log('  (なし)          今日のカレンダー予定を表示');
  console.log('  add             カレンダーにイベントを追加');
  console.log('  remind          30分以内の予定を通知');
  console.log('  mail            未読メールを表示');
  console.log('  drive [検索語]  Driveファイル一覧または検索');
  console.log('  doc <ID>        Googleドキュメントを表示');
  console.log('  doc-append <ID> Googleドキュメントに追記');
  console.log('  sheet <ID>      スプレッドシートを表示');
  console.log('  sheet-append <ID> スプレッドシートに行を追加');
  console.log('  auth-url        新しい認証URLを表示');
  console.log('  help            このヘルプを表示');
  console.log('\n生徒管理:');
  console.log('  student-init    生徒管理シートのヘッダーを初期化');
  console.log('  student-list    在籍生徒一覧を表示');
  console.log('  student-add     新しい生徒を登録');
  console.log('  lesson-add      授業記録を追加');
  console.log('  lesson-history  生徒の授業履歴を表示');
  console.log('\n月謝・請求管理:');
  console.log('  billing-init    請求管理シートのヘッダーを初期化');
  console.log('  billing-generate 月次請求エントリを生成（生徒マスタから一括）');
  console.log('  billing-list    月次請求一覧を表示（未払/支払済）');
  console.log('  billing-paid    支払い済みとして記録');
  console.log('  billing-report  月次収入レポートを表示\n');
}

async function main(): Promise<void> {
  switch (command) {
    case 'add':          await addNewEvent(); break;
    case 'remind':       await checkReminders(); break;
    case 'mail':         await showUnreadMails(); break;
    case 'drive':        await showDriveFiles(); break;
    case 'doc':          await showDocument(); break;
    case 'doc-append':   await appendDoc(); break;
    case 'sheet':        await showSheet(); break;
    case 'sheet-append':    await appendSheet(); break;
    case 'student-init':    await initSheets(); break;
    case 'student-list':    await listStudents(); break;
    case 'student-add':     await addStudent(); break;
    case 'lesson-add':      await addLessonReport(); break;
    case 'lesson-history':  await showLessonHistory(); break;
    case 'billing-init':    await initBillingSheet(); break;
    case 'billing-generate': await generateMonthlyBilling(); break;
    case 'billing-list':    await listBilling(); break;
    case 'billing-paid':    await markAsPaid(); break;
    case 'billing-report':  await billingReport(); break;
    case 'auth-url':
      console.log('\n🔐 認証URL:\n');
      console.log(getAuthUrl());
      console.log();
      break;
    case 'help':         printHelp(); break;
    default:             await showTodayEvents(); break;
  }
}

main().catch((err) => {
  console.error('\n❌ エラーが発生しました:', err.message);
  process.exit(1);
});
