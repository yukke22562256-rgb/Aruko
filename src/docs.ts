import { google } from 'googleapis';
import { authorize } from './auth';

export async function readDocument(documentId: string): Promise<string> {
  const auth = await authorize();
  const docs = google.docs({ version: 'v1', auth });

  const res = await docs.documents.get({ documentId });
  const body = res.data.body;
  if (!body?.content) return '';

  const lines: string[] = [];
  for (const element of body.content) {
    if (element.paragraph?.elements) {
      const text = element.paragraph.elements
        .map(e => e.textRun?.content ?? '')
        .join('');
      lines.push(text);
    }
  }

  return lines.join('').trim();
}

export async function appendToDocument(documentId: string, text: string): Promise<void> {
  const auth = await authorize();
  const docs = google.docs({ version: 'v1', auth });

  const docRes = await docs.documents.get({ documentId });
  const endIndex = docRes.data.body?.content?.slice(-1)[0]?.endIndex ?? 1;

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: endIndex - 1 },
            text: '\n' + text,
          },
        },
      ],
    },
  });
}

export function printDocument(content: string, title = 'ドキュメント内容'): void {
  console.log(`\n📄 ${title}:\n`);
  console.log('-'.repeat(50));
  console.log(content || '（内容が空です）');
  console.log('-'.repeat(50));
  console.log();
}
