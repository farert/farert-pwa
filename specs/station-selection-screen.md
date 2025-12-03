# 駅選択関連画面の概要

このドキュメントは、Farert PWAにおける駅選択に関連する各画面の役割と、それぞれの詳細仕様への参照を提供します。以前の `station-selection-screen.md` は、複数の異なる駅選択シナリオを単一画面で扱おうとしていましたが、**コンセプトA（コンポーネントベースの複数画面アプローチ）** に則り、責務を分割した以下の3つの画面で駅選択機能を提供します。

## 1. 発着駅選択画面 (`/station-select`)

-   **役割**: アプリ起動時や経路リセット後の最初の発駅選択、または自動経路探索における着駅の選択を行います。
-   **特徴**:
    -   JRグループ、都道府県、履歴のタブ切り替え
    -   インクリメンタル検索バーによる駅検索
    -   選択した駅をメイン画面に返します。
-   **詳細仕様**: `specs/terminal-selection-screen.md` を参照してください。
-   **画面フロー**: `screen-flow-and-io.md` の `/station-select` セクションを参照してください。

## 2. 路線内駅リスト画面 (`/station-list`)

-   **役割**: 特定の路線に属する駅の一覧を表示し、その中から駅を選択します。主に、発着駅選択画面から路線が選択された後に遷移します。
-   **特徴**:
    -   選択された路線に属する全駅を表示。
    -   選択した駅をメイン画面に返します。
-   **詳細仕様**: この画面の具体的なコンポーネントやレイアウトは、`component-design.md` の `StationList` コンポーネントをベースとします。機能的な詳細は `screen-flow-and-io.md` の `/station-list` セクションで定義されます。

## 3. 経路追加用駅選択画面 (`/route-station-select`)

-   **役割**: 既存の経路に次の区間を追加する際に、通過する分岐駅または終点駅を選択します。
-   **特徴**:
    -   指定された路線における、現在の経路の終点駅（発駅として反転表示）と、そこから選択可能な分岐駅や終点駅を表示します。
    -   分岐駅モードと終点駅モードの切り替え機能を持つ可能性があります。
-   **詳細仕様**: この画面の具体的なレイアウトと機能は `screen-flow-and-io.md` の `/route-station-select` セクションで定義されます。コンポーネントは `StationList` をベースとします。

---

**WASM APIへの依存:**

これらの画面は、駅や路線情報の取得、検索のために以下のWASM APIに依存します。

-   `getPrefects()`
-   `getCompanys()`
-   `getLinesByPrefect(prefecture: string)`
-   `getLinesByCompany(company: string)`
-   `getLinesByStation(station: string)`
-   `getStationsByLine(lineName: string)`
-   `getStationsByCompanyAndLine(jrgroup: string, lineName: string)`
-   `getStationsByPrefectureAndLine(prefecture: string, lineName: string)`
-   `getBranchStationsByLine(lineName: string, stationName: string)`
-   `searchStationByKeyword(keyword: string)`
-   `getPrefectureByStation(stationName: string)`
-   `getKanaByStation(stationName: string)`

詳細については `specs/API.md` を参照してください。