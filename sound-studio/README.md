# Sound Studio

Scratch の音声エディタ（[`scratch-gui`](https://github.com/scratchfoundation/scratch-gui) のサウンドエディタ）を、単体で使える Web アプリとして包んだ非公式のサウンド編集ツールです。Scratch のアカウントやサーバーは不要で、音声はすべてブラウザ内で処理されます。

> **非公式ツールです。** Scratch Foundation とは提携・承認関係にありません。Scratch は Scratch Foundation の商標です。

## 現在できること

- Scratch と同じ音声編集 UI（波形表示・範囲選択・トリミング）
- 波形のクリックで再生位置（紫の線）を指定。再生はその位置から始まり、停止後も線が残ります
- 再生中に波形をクリックすると、その位置へ移動して再生を続けます
- 上部に小さなスペクトラム表示（再生中にリアルタイム更新）
- 波形の上でホイールを回すと拡大（最大512倍）、Shift+ホイールで横スクロール
- 拡大すると、音量の棒ではなく実際のサンプルのピーク波形を表示
- 再生位置 / 音声の長さ、ステレオ・モノラルの別、ファイルサイズの表示（TurboWarp の表示を移植）
- 再生 / 停止、元に戻す / やり直す
- コピー / 貼り付け / 選択範囲の削除 / 別サウンドとしてコピー
- 複数サウンドの管理（上部の「サウンド」選択で切り替え、ファイルメニューから削除）
- エフェクト（速く・遅く・大きく・小さく・無音・フェードイン・フェードアウト・逆再生・ロボット・エコー・ローパス・ハイパス）
- 「調整」でピッチ（半音単位、-36〜+36）と音量（0〜200%）を変更。プレビュー付き
- 「フォーマット」でサンプルレートを変更（音声全体のリサンプル、または選択範囲だけの帯域変換）
- 音声ファイルの読み込み（WAV / MP3 / OGG / M4A など、ブラウザがデコードできる形式）
- 読み込んだ形式（WAV / MP3 など）とサンプルレートを表示。MP3 などを編集すると WAV に変換される旨を警告
- ステレオ音声をそのまま読み込み・再生・編集・WAV 書き出し（Scratch の音声エディタは左チャンネルだけを使っていました）
- Scratch の 10MB 制限を外しているため、3分超の長い音声も編集できます（編集後は WAV 相当のサイズを表示）
- WAV での書き出し
- ファイルのドラッグ＆ドロップ

## 起動

```sh
npm install
npm start        # http://localhost:5174/
npm run build    # dist/ に出力
npm run preview  # ビルド結果を http://localhost:4173/ で確認
```

Node.js 20 以上が必要です（`.nvmrc` は 22）。

## 構成

- `src/containers/sound-editor.jsx` — Scratch の音声エディタのコンテナを、VM ではなくローカルの音声データで動くようにしたもの
- `src/components/` — Scratch GUI から移植したサウンドエディタ、波形、トリマー、フォームなどの UI
- `src/lib/audio/` — 波形計算、エフェクト、再生、リサンプル（Scratch GUI / PenguinMod から移植）
- `src/components/sound-editor/modify-modal.jsx` — ピッチ・音量の調整モーダル
- `src/components/sound-editor/format-modal.jsx` — サンプルレート変更モーダル
- `src/App.jsx` — ページ上部のバー（サウンド選択 / ファイルメニュー / WAV 保存）と複数サウンドの状態管理

## ライセンス

AGPL-3.0-only。`scratch-gui` と PenguinMod から移植したコードを含みます。詳細は [LICENSE](LICENSE) と [NOTICE](NOTICE) を参照してください。
