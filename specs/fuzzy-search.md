# fuzzy-search

本実装は、../farert/app/alps/azusa.cpp,h として実装しました。
PWAからは、WebAssembly 経由で使用することになりました。

## 現状

---
• はい、現状は本当に「仮実装」です。
  該当は azusa.cpp の normalize_station_token() で、コメントにも

  - 仮実装: UTF-8完全正規化は行わず、主要な表記ゆれのみ吸収する

  とあります。

  つまり今は「主要パターン対応版」で、完全な Unicode 正規化や網羅的な異体字辞書までは入っていません。
  実運用としては使えますが、厳密には暫定実装です。

  本実装化するなら次の順で進めるのが安全です。

  1. 正規化仕様を固定（どの文字を同一視するかを表で確定）
  2. farert マスター側に正規化ロジックを寄せる（copy 連鎖の起点）
  3. test_azusa.cpp に表記ゆれ回帰テストを追加
  4. farert-wasm へ同期して PWA で確認

  必要なら、このまま「仮実装コメントを外せる品質」まで一気に詰めます。


 どれくらいのボリュームになりますか？前にも聞きましたけどDBテーブル化は不要ですか？


• 目安は3段階です。

  1. 最小（現行の仮実装を本実装扱いに引き上げ）

  - 内容: ルール整理、既存コード整理、回帰テスト追加
  - ボリューム: 0.5〜1.5日
  - 変更: azusa.cpp/h, test_azusa.cpp, specs/fuzzy-search.md

  2. 標準（実運用向け）

  - 内容: 正規化ルールを拡張（追加ゆれ対応）、スコア微調整、CLI/WASM/PWAで同一挙動確認
  - ボリューム: 2〜4日
  - 変更: 上記＋WASM連携箇所とPWA側テスト

  3. 強化（将来保守重視）

  - 内容: 同一視ルールをデータ駆動化、回帰データセット拡充、性能測定
  - ボリューム: 4〜7日

  DBテーブル化について:

  - 結論: 今すぐは不要です。
  - 理由: 現在の規模ならコード内ルール＋テストで十分回せるため。
  - ただし、将来「運用で継続追加する」「非エンジニアも更新したい」ならDB/外部定義化は有効です。

  実務的な推奨は「まず標準（2〜4日）で固める」「運用で追加が増えたらテーブル化」です。
---

## 目的
発駅選択の駅名直接入力で、表記ゆれ・空白混入・一部誤字に対して候補選択できるようにする。

例:
- お茶の水 / 御茶ノ水 / おち ゃの水
- 茅ケ崎 / 茅ヶ崎
- 龍ヶ崎 / 竜ケ崎 / 竜が崎
- 總持寺 / 総持寺 / 総持時（誤字入力）

## 対象データ
`jrdbNewest.db` の `t_station` を使用。

```sql
select name, kana, samename from t_station;
```

- `name`: 正式駅名
- `kana`: 駅かな
- `samename`: 同名駅の補助表記（空文字でない場合あり）
  - 例: `横川(信)`, `横川(陽)`

## 検索キー設計
候補1件ごとに以下を検索キーとして扱う。

- `name`
- `kana`
- `samename`（`samename <> ''` のとき）

注意:
- `samename` は別名文字列として扱う。
- `samename` 個別のかな列がないため、かなは行の `kana` を共通で紐づける。
  - 例: `横川(陽)` のかなは `よこがわ`。

## 正規化ルール（現行実装）
入力・駅キーの両方に同じ正規化を適用する。

1. 空白・改行除去（半角/全角）
2. 記号ゆれ吸収（`（ ）`、`・`、長音・ハイフン類）
3. かな揺れ吸収（`ヂ/ヅ`、`ぢ/づ`、一部カナ→ひらがな）
4. 代表文字への寄せ:
- `ノ/の/之` を同一視
- `ケ/ヶ/け/が` を同一視
- `竜/龍` を同一視
- `総/總` を同一視
- `沢/澤` を同一視
- `崎/﨑/嵜` を同一視
- `斉/齊/斎` を同一視
- `渡/亘` を同一視

## マッチング手順
1. 正規化一致（完全・前方・部分）
2. `name/kana/samename` を横断した候補統合
3. 既存APIフォールバック（`search_station_by_keyword`）の候補を統合
4. かな末尾一致フォールバック（例: `わしのす` -> `のす`）

## スコアリング（現行実装）
小さいほど高優先。

- 0: `name` 正規化完全一致
- 1: `name` 正規化前方一致
- 2: `name` 正規化部分一致
- 3: `kana` 正規化前方一致
- 4: `kana` 正規化部分一致
- 5: `samename` 正規化前方一致
- 6: `samename` 正規化部分一致
- 7/8: かな部分一致（かなのみ抽出）
- 10/11: `search_station_by_keyword` 経由候補
- 12: かな末尾一致候補（`kana_suffix`）

同点時は `name` 昇順（`localeCompare('ja')`）で安定化する。

## UI表示方針
- 候補の主表示は `name`
- 必要に応じて補助表示:
  - `kana`
  - `samename`（存在時）
- 誤字救済候補は自動確定せず、候補としてのみ提示する。

## WASM API化提案（CLI共用を想定）
検索ロジックをWASM側へ寄せ、UI/CLIから共通利用する。

### 関数案

```ts
searchStationFuzzy(keyword: string, limit?: number): string
```

### 戻り値JSON案

```json
{
  "results": [
    {
      "name": "横川",
      "kana": "よこがわ",
      "samename": ["横川(信)", "横川(陽)"],
      "score": 1,
      "matchedBy": "samename"
    }
  ]
}
```

- `matchedBy`: `name | kana | samename | keyword | kana_suffix`
- `score`: UI側並び替えに使える一貫した数値

### 使い方

#### UI (Svelte/TypeScript)

```ts
import { searchStationFuzzy } from '$lib/wasm';

type FuzzySearchResult = {
  name: string;
  kana: string;
  samename: string[];
  score: number;
  matchedBy: 'name' | 'kana' | 'samename' | 'keyword' | 'kana_suffix';
};

type FuzzySearchResponse = {
  results: FuzzySearchResult[];
};

const payload = searchStationFuzzy('おち ゃの水', 20);
const data = JSON.parse(payload) as FuzzySearchResponse;
const candidates = data.results;
```

#### CLI (Node.js 例)

```js
// wasm 初期化済みを前提
const payload = wasm.searchStationFuzzy('竜が崎', 10);
const data = JSON.parse(payload);

for (const item of data.results) {
  console.log(`${item.name}\t${item.kana}\t${item.matchedBy}\t${item.score}`);
}
```

#### 返却値の解釈

- `results` は `score` 昇順（小さいほど高一致）
- `matchedBy='keyword'|'kana_suffix'` は補助候補のため、UI上は低優先で提示する
- `samename` がある場合は候補詳細表示に使う（例: `横川(信)`, `横川(陽)`）

## テスト観点
1. 表記ゆれ
- `茅ケ崎` 入力で `茅ヶ崎` を候補化
- `竜が崎` 入力で `龍ヶ崎` / `竜ケ崎` を候補化

2. 空白混入
- `おち ゃの水` 入力で `御茶ノ水` を候補化

3. 旧字体
- `總持寺` 入力で `総持寺` を候補化

4. 同名補助
- `横川(陽)` 入力で該当候補を提示し、かなは `よこがわ` を表示

5. かな末尾一致
- `わしのす` 入力で `鳩ノ巣` など `のす` を含む候補を提示
