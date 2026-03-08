#!/bin/bash
echo "🚀 Bootstrapping Mobclowd - Local AI Development Platform..."

# Create Next.js app
npx create-next-app@latest mobclowd --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm

cd mobclowd

# Install core dependencies
echo "📦 Installing Professional Developer Tools..."
npm install ollama @monaco-editor/react framer-motion lucide-react zustand
npm install chokidar clsx tailwind-merge react-markdown remark-gfm

# Create workspace directory
mkdir .mobclowd-workspace
mkdir -p components/{chat,editor,preview,workspace,ui}
mkdir -p lib
mkdir -p app/api/{chat,fs,workspace}

echo "✅ Mobclowd base ready! Copy the code blocks below to complete the setup."
