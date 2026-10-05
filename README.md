# MLPTCG デッキビルド

マイリトルポニー トレーディングカードゲーム（日本語版）のデッキ構築ツール。非公式ファンツールです。
カード画像・テキストの権利は各権利者に帰属します。

## 構成

- `app/` … Web アプリ本体（Vite + React + TypeScript）
- `docs/` … 調査メモ・議事録・仕様書

## 開発

```bash
cd app
npm install
npm run dev          # 開発サーバー
npm test             # ルール判定のテスト
npm run build        # 公開用ビルド（app/dist）
npm run fetch-cards  # 公式サイトからカードデータを再取得（新弾追加時）
```

## カードデータの更新手順

1. `npm run fetch-cards` を実行（`app/src/data/cards.json` が更新される）
   - 「日常マーク未確認のシーン」の警告が出たら、そのカード画像の名前帯の上に「日常」マークがあるか確認し、
     `app/src/data/overrides.json` の `dailyCardNos`（ある）か `nonDailyCardNos`（ない）に登録して再実行
2. `npm test` が通ることを確認
3. コミットして main に push すると GitHub Pages に自動公開される

公式データに無い情報（キーワードに無い日常タグなど）は `app/src/data/overrides.json` に手で追記する。
