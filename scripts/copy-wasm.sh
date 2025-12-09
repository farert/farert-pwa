#!/bin/bash
# WASM files copy script
# farert-wasmプロジェクトからWASMファイルをコピー

# CI環境ではスキップ（デプロイ時は既存のコミット済みWASMファイルを使用）
if [ "$CI" = "true" ] || [ "$SKIP_WASM_COPY" = "true" ]; then
  echo "⏭️  Skipping WASM copy (CI environment detected)"
  echo "Using existing WASM files in static/ directory"
  exit 0
fi

# コンテナ内かどうかをチェック（/workspace ディレクトリの存在で判定）
if [ -d "/workspace" ]; then
  # DevContainer内: ../workspace-wasm/dist を使用
  WASM_SOURCE="../workspace-wasm/dist"
else
  # macOS/ローカル環境: ../farert-wasm/dist を使用
  WASM_SOURCE="../farert-wasm/dist"
fi

STATIC_DIR="static"

echo "Copying WASM files from ${WASM_SOURCE} to ${STATIC_DIR}..."

# ファイルが存在するか確認
if [ ! -f "${WASM_SOURCE}/farert.wasm" ]; then
    echo "Error: ${WASM_SOURCE}/farert.wasm not found"
    echo "Please build farert-wasm project first: cd ../farert-wasm && npm run build"
    exit 1
fi

# コピー実行
cp "${WASM_SOURCE}/farert.wasm" "${STATIC_DIR}/"
cp "${WASM_SOURCE}/farert.js" "${STATIC_DIR}/"
cp "${WASM_SOURCE}/farert.data" "${STATIC_DIR}/"

echo "✅ WASM files copied successfully!"
echo "  - farert.wasm"
echo "  - farert.js"
echo "  - farert.data"
