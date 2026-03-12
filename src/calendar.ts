import { google, calendar_v3 } from 'googleapis';
import { authorize } from './auth';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
const TIMEZONE = process.env.TIMEZONE || 'Asia/Tokyo';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  allDay: boolean;
}

function formatEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  const startRaw = event.start?.dateTime ?? event.start?.date ?? '';
  const endRaw = event.end?.dateTime ?? event.end?.date ?? '';
  const allDay = !event.start?.dateTime;

  return {
    id: event.id ?? '',
    summary: event.summary ?? '（タイトルなし）',
    start: startRaw,
    end: endRaw,
    location: event.location ?? undefined,
    description: event.description ?? undefined,
    allDay,
  };
}

export function formatTime(dateStr: string, allDay: boolean): string {
  if (allDay) return '終日';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const auth = await authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: TIMEZONE,
  });

  const events = response.data.items ?? [];
  return events.map(formatEvent);
}

export async function addEvent(params: {
  summary: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  description?: string;
  reminderMinutes?: number;
}): Promise<CalendarEvent> {
  const auth = await authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  const eventBody: calendar_v3.Schema$Event = {
    summary: params.summary,
    location: params.location,
    description: params.description,
    start: {
      dateTime: params.startDateTime,
      timeZone: TIMEZONE,
    },
    end: {
      dateTime: params.endDateTime,
      timeZone: TIMEZONE,
    },
    reminders: {
      useDefault: params.reminderMinutes === undefined,
      overrides: params.reminderMinutes !== undefined
        ? [{ method: 'popup', minutes: params.reminderMinutes }]
        : undefined,
    },
  };

  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: eventBody,
  });

  return formatEvent(response.data);
}

export async function getUpcomingReminders(withinMinutes = 30): Promise<CalendarEvent[]> {
  const auth = await authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const future = new Date(now.getTime() + withinMinutes * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: TIMEZONE,
  });

  const events = response.data.items ?? [];
  return events.map(formatEvent);
}
