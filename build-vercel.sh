#!/bin/bash
set -e

echo "🚀 Starting Vercel build process..."

# Navigate to web UI package
cd packages/web/buildingai-ui

echo "📦 Building web UI (static generation)..."
# Build the web UI using static generation
NODE_OPTIONS=--max-old-space-size=8192 NUXT_BUILD_SSR=false NUXT_BUILD_ENV=production pnpm nuxt generate --dotenv ../../../.env

echo "✅ Build completed successfully!"
echo "📁 Output directory: packages/web/buildingai-ui/.output/public"
