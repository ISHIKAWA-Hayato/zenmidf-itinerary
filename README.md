# zenmidf-itinerary

行程表アプリの仕様・設計・MVPタスクをまとめたリポジトリです。

## 概要
- 1日1ページ（1d1p）切替型の行程表UI
- 表中心のUI。タイムラインはPDF生成時に自動構成
- JSON 入出力・PDF出力対応（MVP）

## 仕様（抜粋）
- item.type: move | place | do
- move.transport: train | local-bus | highway-bus | aircraft | ship | taxi | rent-a-car | on-foot | bicycle | other
- place.kind: station | bus-stop | airport | port | spot | hotel | restaurant | other
- do.category: transfer | visit | sight-seeing | food | stay | shopping | event | work | other
- 日単位の区切り時刻は任意変更可（例: 06:00-翌06:00）
- PDFダウンロードは出力日や範囲を柔軟に選択可能

## JSON スキーマ（canonical）
- `schema_v0.json` を参照

## サンプルデータ
- `docs/sample_itinerary_v0.json` を参照

## MVPタスク（Issue）
- #1 行程表アプリ仕様ドラフト
- #2 JSONスキーマと属性定義
- #3 表UI/1d1p Dayタブ 構築
- #4 JSON入出力実装
- #5 PDF出力（1d1p/範囲選択対応・表＆タイムライン）

## 開発メモ
- UIは表中心で、行の追加/複製/削除・セル直接編集を想定
- タイムラインはPDF出力時のみ自動生成

## Issue
- https://github.com/ISHIKAWA-Hayato/zenmidf-itinerary/issues
