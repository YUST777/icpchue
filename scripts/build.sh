#!/bin/bash
cd /root/01studio/icpchue
rm -rf dist
npm run build
echo "Build completed with exit code: $?"
ls -la dist/ | head -10





