# Node.js LTS版を使用
FROM node:20-bullseye

# 必要なパッケージをインストール
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    vim \
    curl \
    wget \
    ca-certificates \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# グローバルnpmパッケージ
RUN npm install -g pnpm

# nodeユーザーに切り替え
USER node

# 作業ディレクトリ
WORKDIR /workspace

# デフォルトシェル
CMD ["/bin/bash"]
