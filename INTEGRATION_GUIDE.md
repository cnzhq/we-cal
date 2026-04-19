# ICS 日历集成指南

本文档说明如何将 we-cal 日历集成到现有的 wetcm-org-cn 网站中。

## 架构

```
GitHub (we-cal/calendar.ics) 
    ↓ 定时触发
GitHub Actions (wetcm-org-cn)
    ↓ SCP 部署
服务器 (/var/www/html/calendar/calendar.ics)
    ↓ Nginx 服务
订阅地址: https://cal.wetcm.org.cn/calendar.ics
```

## 已生成的文件

| 文件 | 用途 | 目标位置 |
|------|------|----------|
| `sync-calendar.yml` | GitHub Actions 工作流 | `wetcm-org-cn/.github/workflows/` |
| `nginx-calendar.conf` | Nginx 配置文件 | 服务器 `/etc/nginx/sites-available/calendar` |

---

## 操作步骤

### 步骤 1：复制 Workflow 文件

```bash
# 进入 wetcm-org-cn 仓库
cd /path/to/wetcm-org-cn

# 创建工作流目录
mkdir -p .github/workflows

# 复制 workflow 文件（从 we-cal 项目）
cp /path/to/we-cal/sync-calendar.yml .github/workflows/

# 提交并推送
git add .github/workflows/sync-calendar.yml
git commit -m "Add calendar sync workflow"
git push origin main
```

### 步骤 2：配置服务器 Nginx

SSH 登录服务器后执行：

```bash
# 创建日历目录
mkdir -p /var/www/html/calendar

# 复制 Nginx 配置
cat > /etc/nginx/sites-available/calendar << 'EOF'
server {
    listen 80;
    server_name cal.wetcm.org.cn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cal.wetcm.org.cn;
    
    ssl_certificate /etc/letsencrypt/live/cal.wetcm.org.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cal.wetcm.org.cn/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout 1d;

    location /calendar.ics {
        alias /var/www/html/calendar/calendar.ics;
        default_type text/calendar;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
        add_header Cache-Control "public, must-revalidate, max-age=3600";
        gzip on;
        gzip_types text/calendar text/plain;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/calendar /etc/nginx/sites-enabled/

# 测试并重载配置
nginx -t && systemctl reload nginx
```

### 步骤 3：添加 GitHub Secrets

在 `cnzhq/wetcm-org-cn` 仓库的 Settings → Secrets and variables → Actions 中添加：

| Secret 名称 | 说明 |
|-------------|------|
| `SSH_HOST` | 服务器 IP 地址或域名 |
| `SSH_USER` | SSH 用户名（如 root） |
| `SSH_KEY` | SSH 私钥内容（完整文本） |

### 步骤 4：手动触发测试

1. 进入 `wetcm-org-cn` 仓库的 Actions 页面
2. 找到 "Sync Calendar ICS" 工作流
3. 点击 "Run workflow" 手动触发

### 步骤 5：验证部署

```bash
# 测试订阅链接
curl -I https://cal.wetcm.org.cn/calendar.ics

# 预期返回 HTTP 200，Content-Type: text/calendar
```

---

## 日常使用

| 操作 | 方式 |
|------|------|
| 修改日程 | 在 GitHub `we-cal/calendar.ics` 直接编辑 |
| 查看同步状态 | 访问 `wetcm-org-cn` 的 Actions 页面 |
| 手动同步 | 点击 "Run workflow" 按钮 |
| 修改同步频率 | 编辑 workflow 文件的 `cron` 表达式 |

---

## 故障排查

**Workflow 运行失败**
- 检查 GitHub Secrets 是否正确配置
- 查看 Actions 日志中的详细错误

**404 Not Found**
```bash
# 检查文件是否存在
ls -la /var/www/html/calendar/calendar.ics

# 检查 Nginx 配置
nginx -t
systemctl status nginx
```

**SSL 证书错误**
- 确保证书已生成：`certbot certificates | grep cal.wetcm.org.cn`
- 如未生成，运行：`certbot --nginx -d cal.wetcm.org.cn`

---

## 订阅地址

```
https://cal.wetcm.org.cn/calendar.ics
```

可在 Apple 日历、Google 日历、Outlook 中添加订阅。