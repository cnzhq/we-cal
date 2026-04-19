#!/bin/bash
# 服务器 ICS 日历同步配置脚本
# 适用于 Ubuntu 24.04 LTS + Nginx
# 运行方式: sudo bash setup-calendar-sync.sh

set -e

# 配置变量（请根据实际情况修改）
GITHUB_USER="cnzhq"
REPO_NAME="we-cal"
DOMAIN="wetcm.org.cn"
SYNC_INTERVAL="0 * * * *"  # 每小时执行
LOCAL_PATH="/var/www/html/calendar"
GITHUB_TOKEN=""  # 可选：用于私有仓库

echo "=== ICS 日历同步配置脚本 ==="

# 1. 安装必要软件
echo "[1/6] 安装必要软件..."
apt-get update
apt-get install -y git cron nginx

# 2. 创建目录
echo "[2/6] 创建日历目录..."
mkdir -p $LOCAL_PATH
chown -R www-data:www-data $LOCAL_PATH

# 3. 配置 Git
echo "[3/6] 配置 Git..."
if ! command -v git &> /dev/null; then
    echo "错误：Git 安装失败"
    exit 1
fi

# 配置 git 安全目录（避免权限问题）
git config --global --add safe.directory $LOCAL_PATH

# 4. 克隆仓库
echo "[4/6] 克隆 GitHub 仓库..."
cd /tmp

if [ -z "$GITHUB_TOKEN" ]; then
    REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
else
    REPO_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
fi

if [ -d "$LOCAL_PATH/.git" ]; then
    echo "目录已存在，跳过克隆"
else
    rm -rf $LOCAL_PATH/*
    git clone $REPO_URL $LOCAL_PATH
    chown -R www-data:www-data $LOCAL_PATH
fi

# 5. 配置 Cron 定时任务
echo "[5/6] 配置定时同步任务..."
CRON_JOB="${SYNC_INTERVAL} cd ${LOCAL_PATH} && git pull origin main >> /var/log/calendar-sync.log 2>&1"

# 检查是否已存在
if crontab -l 2>/dev/null | grep -q "calendar-sync"; then
    echo "Cron 任务已存在，跳过"
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "已添加 Cron 任务：每小时同步一次"
fi

# 确保日志文件存在
touch /var/log/calendar-sync.log
chmod 644 /var/log/calendar-sync.log

# 6. 配置 Nginx
echo "[6/6] 配置 Nginx..."

NGINX_CONF="/etc/nginx/sites-available/calendar"
cat > $NGINX_CONF << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # HTTP 重定向到 HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # SSL 证书路径（使用 Let's Encrypt 标准路径）
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout 1d;

    # 日历订阅路由
    location /calendar.ics {
        alias /var/www/html/calendar/calendar.ics;
        
        # 设置正确的 MIME 类型
        default_type text/calendar;
        
        # 允许跨域（CORS）
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
        
        # 缓存控制（建议客户端每小时检查更新）
        add_header Cache-Control "public, must-revalidate, max-age=3600";
        
        # 支持 gzip
        gzip on;
        gzip_types text/calendar text/plain;
    }

    # 可选：提供简单的 HTML 说明页面
    location /calendar {
        alias /var/www/html/calendar/;
        index index.html;
        try_files \$uri \$uri/ =404;
    }
}
EOF

# 启用站点
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/calendar

# 删除默认配置（如果存在）
rm -f /etc/nginx/sites-enabled/default

# 测试并重载 Nginx
nginx -t && systemctl reload nginx

# 启动 cron 服务
systemctl enable cron
systemctl start cron

echo ""
echo "=== 配置完成 ==="
echo ""
echo "日历订阅地址：http://${DOMAIN}/calendar.ics"
echo ""
echo "下一步操作："
echo "1. 修改本脚本顶部的配置变量（GITHUB_USER, REPO_NAME, DOMAIN）"
echo "2. 在 GitHub 创建仓库 ${REPO_NAME} 并上传 calendar.ics"
echo "3. 重新运行此脚本"
echo "4. 测试订阅链接是否正常"
echo ""
echo "日志文件：/var/log/calendar-sync.log"
echo "手动同步命令：cd ${LOCAL_PATH} && git pull"