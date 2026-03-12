import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import { getTodayEvents, addEvent, getUpcomingReminders } from './calendar';
import { printMorningGreeting, sendNotification } from './notify';

const command = process.argv[2];

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
  const tz = process.env.TIMEZONE || 'Asia/Tokyo';
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
  if (!summary) {
    console.log('イベント名は必須です。');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const dateInput = await promptUser(`日付 (例: ${today}): `);
  const date = dateInput || today;

  const startTime = await promptUser('開始時間 (例: 09:00): ');
  const endTime = await promptUser('終了時間 (例: 10:00): ');

  if (!startTime || !endTime) {
    console.log('開始時間と終了時間は必須です。');
    return;
  }

  const location = await promptUser('場所 (省略可): ');
  const description = await promptUser('メモ (省略可): ');
  const reminderInput = await promptUser('リマインダー (分前、省略可): ');
  const reminderMinutes = reminderInput ? parseInt(reminderInput, 10) : undefined;

  console.log('\n⏳ イベントを追加中...');

  const event = await addEvent({
    summary,
    startDateTime: toLocalISOString(date, startTime),
    endDateTime: toLocalISOString(date, endTime),
    location: location || undefined,
    description: description || undefined,
    reminderMinutes,
  });

  console.log(`\n✅ イベントを追加しました！`);
  console.log(`   📌 ${event.summary}`);
  console.log(`   ⏰ ${event.start} ～ ${event.end}`);
  if (event.location) console.log(`   📍 ${event.location}`);
}

async function checkReminders(): Promise<void> {
  console.log('\n⏳ 近くの予定を確認中...');
  const events = await getUpcomingReminders(30);

  if (events.length === 0) {
    console.log('🔔 今後30分以内の予定はありません。\n');
    return;
  }

  console.log(`\n🔔 今後30分以内の予定 (${events.length}件):\n`);
  for (const event of events) {
    sendNotification(event);
  }
}

async function main(): Promise<void> {
  switch (command) {
    case 'add':
      await addNewEvent();
      break;
    case 'remind':
      await checkReminders();
      break;
    default:
      await showTodayEvents();
      break;
  }
}

main().catch((err) => {
  console.error('\n❌ エラーが発生しました:', err.message);
  process.exit(1);
});
