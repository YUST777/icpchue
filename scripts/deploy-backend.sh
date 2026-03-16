#!/bin/bash
echo "🚀 Deploying backend to production server..."
ssh root@your-server-ip << 'ENDSSH'
cd /root/01studio/icpchue
echo "📥 Pulling latest changes..."
git pull origin main
echo "🔄 Restarting PM2 server..."
pm2 restart icpchue-server
echo "✅ Deployment complete!"
pm2 logs icpchue-server --lines 20
ENDSSH
