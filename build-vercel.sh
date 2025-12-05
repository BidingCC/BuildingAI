#!/bin/bash
set -e

echo "Building workspace dependencies..."
pnpm --filter @buildingai/buildingai-ui^... build

echo "Generating Nuxt static site..."
cd packages/web/buildingai-ui

NODE_OPTIONS=--max-old-space-size=8192 \
NUXT_BUILD_SSR=false \
NUXT_BUILD_ENV=production \
pnpm exec nuxt generate

echo "Running release script..."
NUXT_BUILD_SSR=false node ../../../scripts/release.mjs

echo "Build complete!"
