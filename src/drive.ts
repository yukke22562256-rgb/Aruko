import { google } from 'googleapis';
import { authorize } from './auth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

const MIME_LABELS: Record<string, string> = {
  'application/vnd.google-apps.folder': '📁 フォルダ',
  'application/vnd.google-apps.document': '📄 ドキュメント',
  'application/vnd.google-apps.spreadsheet': '📊 スプレッドシート',
  'application/vnd.google-apps.presentation': '📑 スライド',
  'application/pdf': '📋 PDF',
  'image/jpeg': '🖼 画像',
  'image/png': '🖼 画像',
};

function mimeLabel(mimeType: string): string {
  return MIME_LABELS[mimeType] ?? '📎 ファイル';
}

export async function listRecentFiles(maxResults = 10): Promise<DriveFile[]> {
  const auth = await authorize();
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    pageSize: maxResults,
    orderBy: 'modifiedTime desc',
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    q: "trashed = false",
  });

  return (res.data.files ?? []).map(f => ({
    id: f.id ?? '',
    name: f.name ?? '',
    mimeType: f.mimeType ?? '',
    modifiedTime: f.modifiedTime ?? '',
    webViewLink: f.webViewLink ?? undefined,
  }));
}

export async function searchFiles(query: string, maxResults = 10): Promise<DriveFile[]> {
  const auth = await authorize();
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    pageSize: maxResults,
    q: `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
    orderBy: 'modifiedTime desc',
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
  });

  return (res.data.files ?? []).map(f => ({
    id: f.id ?? '',
    name: f.name ?? '',
    mimeType: f.mimeType ?? '',
    modifiedTime: f.modifiedTime ?? '',
    webViewLink: f.webViewLink ?? undefined,
  }));
}

export function printFiles(files: DriveFile[], title = 'ファイル一覧'): void {
  if (files.length === 0) {
    console.log('\n📂 ファイルが見つかりませんでした。\n');
    return;
  }

  console.log(`\n📂 ${title} (${files.length}件):\n`);
  for (const file of files) {
    const label = mimeLabel(file.mimeType);
    const date = new Date(file.modifiedTime).toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
    console.log(`  ${label} ${file.name}`);
    console.log(`     更新日: ${date}`);
    if (file.webViewLink) {
      console.log(`     リンク: ${file.webViewLink}`);
    }
    console.log();
  }
}
