#!/bin/bash
# Clean build script
rm -rf dist
rm -rf node_modules/.vite
npm run build
echo "Build complete. Check dist/assets for the new bundle."
