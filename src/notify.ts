import notifier from 'node-notifier';
import { CalendarEvent, formatTime } from './calendar';

export function sendNotification(event: CalendarEvent): void {
  const time = formatTime(event.start, event.allDay);
  const message = event.allDay
    ? `終日イベント: ${event.summary}`
    : `${time} - ${event.summary}`;

  notifier.notify({
    title: '📅 カレンダーリマインダー',
    message,
    sound: true,
    wait: false,
  });

  console.log(`\n🔔 通知送信: ${message}`);
}

export function printMorningGreeting(events: CalendarEvent[]): void {
  const now = new Date();
  const hour = now.getHours();

  let greeting: string;
  if (hour < 10) {
    greeting = 'おはようございます！';
  } else if (hour < 17) {
    greeting = 'こんにちは！';
  } else {
    greeting = 'こんばんは！';
  }

  const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: process.env.TIMEZONE || 'Asia/Tokyo',
  });

  console.log('\n' + '='.repeat(50));
  console.log(`  ${greeting} 今日は ${dateStr} です。`);
  console.log('='.repeat(50));

  if (events.length === 0) {
    console.log('\n📅 今日の予定はありません。良い一日をお過ごしください！\n');
    return;
  }

  console.log(`\n📅 今日の予定 (${events.length}件):\n`);

  for (const event of events) {
    const startTime = formatTime(event.start, event.allDay);
    const endTime = formatTime(event.end, event.allDay);
    const timeStr = event.allDay ? '終日' : `${startTime} ～ ${endTime}`;

    console.log(`  ⏰ ${timeStr}`);
    console.log(`     📌 ${event.summary}`);
    if (event.location) {
      console.log(`     📍 ${event.location}`);
    }
    if (event.description) {
      console.log(`     📝 ${event.description}`);
    }
    console.log();
  }
}
