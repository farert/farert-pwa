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
    libnspr4 \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# グローバルnpmパッケージ
RUN npm install -g pnpm

# nodeユーザーに切り替え
USER node

# 作業ディレクトリ
WORKDIR /workspace

# デフォルトシェル
CMD ["/bin/bash"]
