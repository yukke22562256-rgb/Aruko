# Aruko - プロジェクトメモリ

## プロジェクト概要（プロフィール）

- **名称**: Aruko（朝の挨拶 & Google Workspace CLI）
- **バージョン**: 1.0.0
- **言語**: TypeScript (Node.js)
- **目的**: 朝の挨拶と今日の予定を表示し、Google Workspace を CLI から統合管理するツール

## Aruko 哲学

- **「朝から整える」**: 一日のはじまりに、カレンダー・メール・ファイルを一目で把握し、スムーズに動き出せる状態をつくる
- **シンプルな CLI**: ブラウザを開かずに、ターミナル一つで Google Workspace 全体を操作できる
- **自動通知**: 30分以内の予定をデスクトップ通知で知らせ、うっかりを防ぐ
- **生徒管理との統合**: 教育事業（塾・個別指導）の日常業務をコマンド一つでこなせるようにする

## 事業計画（ビジネスコンテキスト）

### 対象ビジネス
個別指導塾・家庭教師業

### 生徒管理システム（Google スプレッドシート連携）

**生徒マスタ** (`生徒マスタ` シート):
- 生徒ID、生徒名、保護者名、連絡先（Tel・Mail）
- 学年、学校名、担当講師、科目
- 授業曜日・時間、月謝、入会日、状態（在籍/休会/退会）、備考

**授業記録** (`授業記録` シート):
- 日付、生徒ID、生徒名、担当講師
- 実施内容、宿題、次回の目標、保護者への連絡事項

### ワークフロー（日次運用）
1. 毎朝 `npm run dev` → 今日の予定を確認（挨拶 + カレンダー）
2. `npm run remind` → cron で自動リマインダー通知
3. 授業後に `npm run lesson-add` → 授業記録をシートに追記
4. 保護者連絡事項はシートで一元管理

## 技術スタック

| カテゴリ | 内容 |
|---|---|
| 言語 | TypeScript 5.x |
| ランタイム | Node.js |
| 主要ライブラリ | googleapis 144.x, dotenv, node-notifier, date-fns |
| 認証 | Google OAuth 2.0 (Desktop App) |
| データストア | Google スプレッドシート |

## Google API スコープ（認証）

- `calendar` - カレンダーの読み書き
- `gmail.readonly` - 未読メール取得
- `drive` - Driveファイル一覧・検索
- `documents` - Googleドキュメントの読み書き
- `spreadsheets` - スプレッドシートの読み書き（生徒管理）

## 利用可能なコマンド一覧

| コマンド | 説明 |
|---|---|
| `npm run dev` | 今日のカレンダー予定を表示（朝の挨拶） |
| `npm run add` | カレンダーにイベントを追加 |
| `npm run remind` | 30分以内の予定を通知 |
| `npm run dev mail` | 未読メールを表示 |
| `npm run dev drive` | Driveファイル一覧または検索 |
| `npm run dev doc <ID>` | Googleドキュメントを表示 |
| `npm run dev sheet <ID>` | スプレッドシートを表示 |
| `npm run student-init` | 生徒管理シートのヘッダー初期化 |
| `npm run student-list` | 在籍生徒一覧を表示 |
| `npm run student-add` | 新しい生徒を登録 |
| `npm run lesson-add` | 授業記録を追加 |
| `npm run lesson-history` | 生徒の授業履歴を表示 |

## 環境変数（.env）

```
GOOGLE_CLIENT_ID=         # OAuth クライアントID
GOOGLE_CLIENT_SECRET=     # OAuth クライアントシークレット
GOOGLE_REDIRECT_URI=      # デフォルト: urn:ietf:wg:oauth:2.0:oob
GOOGLE_CALENDAR_ID=       # デフォルト: primary
TIMEZONE=                 # デフォルト: Asia/Tokyo
STUDENT_SHEET_ID=         # 生徒管理スプレッドシートのID
```

## 開発上の重要事項

- トークンは `token.json` に保存（gitignore 済み）
- 初回起動時に自動で OAuth フロー開始
- `exchange-token.ts` で認証コードを手動交換することも可能
- cron 運用推奨: 毎朝8時に挨拶、毎時リマインダーチェック
