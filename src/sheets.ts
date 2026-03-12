import { google } from 'googleapis';
import { authorize } from './auth';

export async function readSheet(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return (res.data.values ?? []) as string[][];
}

export async function writeSheet(
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function appendToSheet(
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

export function printSheet(data: string[][], title = 'スプレッドシート'): void {
  if (data.length === 0) {
    console.log('\n📊 データがありません。\n');
    return;
  }

  console.log(`\n📊 ${title}:\n`);

  const colWidths = data.reduce((widths, row) => {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] ?? 0, cell.length);
    });
    return widths;
  }, [] as number[]);

  for (const row of data) {
    const line = row.map((cell, i) => cell.padEnd(colWidths[i] ?? 0)).join(' | ');
    console.log(`  ${line}`);
  }
  console.log();
}
