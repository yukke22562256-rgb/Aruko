# Aruko - 朝の挨拶 & Google Calendar 同期

## Arukoの哲学

[PHILOSOPHY.md](./PHILOSOPHY.md) をご覧ください。

Google Calendar と同期して、朝の挨拶と今日の予定を表示する TypeScript CLI アプリです。

## 機能

- 🌅 朝の挨拶と今日の予定を一覧表示
- ➕ インタラクティブにイベントを追加
- 🔔 30分以内の予定のデスクトップ通知

## セットアップ

### 1. Google Cloud Console で認証情報を作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成（または既存のものを選択）
3. **APIとサービス** → **ライブラリ** → **Google Calendar API** を有効化
4. **APIとサービス** → **認証情報** → **認証情報を作成** → **OAuth 2.0 クライアント ID**
5. アプリケーションの種類: **デスクトップアプリ**
6. クライアントID とクライアントシークレットをコピー

### 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` を編集して認証情報を入力:

```env
GOOGLE_CLIENT_ID=あなたのクライアントID
GOOGLE_CLIENT_SECRET=あなたのクライアントシークレット
GOOGLE_CALENDAR_ID=primary
TIMEZONE=Asia/Tokyo
```

### 3. 依存関係をインストール

```bash
npm install
```

### 4. 初回認証

初回起動時に自動的に認証フローが始まります。

## 使い方

### 今日の予定を表示（朝の挨拶）

```bash
npm run dev
# または
npm start
```

### イベントを追加

```bash
npm run add
# または
npm run dev -- add
```

### リマインダー通知を確認

```bash
npm run remind
# または
npm run dev -- remind
```

### cron でリマインダーを自動実行（例: 毎時チェック）

```bash
# crontab -e で以下を追加:
0 * * * * cd /path/to/aruko && npm run remind >> /var/log/aruko.log 2>&1

# 毎朝8時に挨拶と予定を表示:
0 8 * * * cd /path/to/aruko && npm run dev >> /var/log/aruko.log 2>&1
```

## ビルド

```bash
npm run build
node dist/index.js
```
