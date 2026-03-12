import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { getOAuth2Client } from './auth';
import * as fs from 'fs';

const code = process.argv[2];
if (!code) {
  console.error('使い方: ts-node src/exchange-token.ts <認証コード>');
  process.exit(1);
}

async function main() {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync('token.json', JSON.stringify(tokens));
  console.log('✅ 認証完了！token.json を保存しました。');
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
