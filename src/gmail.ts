import { google, gmail_v1 } from 'googleapis';
import { authorize } from './auth';

export interface MailSummary {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

export async function getUnreadMails(maxResults = 10): Promise<MailSummary[]> {
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return [];

  const mails = await Promise.all(
    messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });
      const headers = detail.data.payload?.headers;
      return {
        id: msg.id ?? '',
        subject: getHeader(headers, 'Subject') || '（件名なし）',
        from: getHeader(headers, 'From'),
        date: getHeader(headers, 'Date'),
        snippet: detail.data.snippet ?? '',
      };
    })
  );

  return mails;
}

export function printUnreadMails(mails: MailSummary[]): void {
  if (mails.length === 0) {
    console.log('\n📬 未読メールはありません。\n');
    return;
  }

  console.log(`\n📬 未読メール (${mails.length}件):\n`);
  for (const mail of mails) {
    console.log(`  📧 ${mail.subject}`);
    console.log(`     差出人: ${mail.from}`);
    console.log(`     日時:   ${mail.date}`);
    if (mail.snippet) {
      const preview = mail.snippet.slice(0, 80) + (mail.snippet.length > 80 ? '...' : '');
      console.log(`     概要:   ${preview}`);
    }
    console.log();
  }
}
