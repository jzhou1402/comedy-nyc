#!/bin/bash
# One-command setup for comedy-nyc on Oracle Cloud VM (Ubuntu 20.04, x86_64)
# Usage: bash scripts/setup_oracle.sh
set -e

echo "=== Creating 2G swap file ==="
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
    echo "Swap already exists"
fi

echo "=== Installing system packages ==="
sudo apt update
sudo apt install -y git nginx cron

echo "=== Installing Node.js 20 ==="
if node --version 2>/dev/null | grep -q "v20"; then
    echo "Node.js 20 already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "=== Installing npm packages ==="
npm install

echo "=== Building ==="
npm run build

echo "=== Setting up nginx ==="
sudo cp scripts/comedy-nyc.nginx /etc/nginx/sites-available/comedy-nyc
sudo ln -sf /etc/nginx/sites-available/comedy-nyc /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "=== Setting up systemd service ==="
sudo cp scripts/comedy-nyc.service /etc/systemd/system/comedy-nyc.service
sudo systemctl daemon-reload
sudo systemctl enable comedy-nyc

echo "=== Opening firewall port 80 ==="
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo sh -c "iptables-save > /etc/iptables/rules.v4" 2>/dev/null || true

echo "=== Setting up cron (daily scrape at 6 AM UTC) ==="
sudo systemctl enable cron
sudo systemctl start cron
(crontab -l 2>/dev/null | grep -v "scrape.ts"; echo '0 6 * * * cd /home/ubuntu/comedy-nyc && /usr/bin/npx tsx scripts/scrape.ts >> /home/ubuntu/comedy-nyc/scrape.log 2>&1') | crontab -

echo ""
echo "=== Setup complete! ==="
echo "Remaining steps:"
echo "  1. Create .env file with API keys"
echo "  2. npm run build"
echo "  3. sudo systemctl start comedy-nyc"
echo "  4. Point DNS A record to this server's IP"
echo "  5. Open port 80 in OCI Security List"
