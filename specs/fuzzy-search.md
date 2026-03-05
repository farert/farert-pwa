# fuzzy-search

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
