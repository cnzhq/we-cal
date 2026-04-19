# ICS 日历同步 - 部署清单

**配置信息**
- GitHub 仓库：`cnzhq/we-cal`
- 域名：`wetcm.org.cn`
- 订阅地址：`https://wetcm.org.cn/calendar.ics`

---

## 第一步：创建 GitHub 仓库

```bash
# 1. 访问 https://github.com/new 创建仓库
#    名称：we-cal
#    类型：Public 或 Private（建议 Public，无需 Token）

# 2. 本地初始化并上传 calendar.ics
cd ~/Downloads  # 或其他目录
mkdir we-cal && cd we-cal
git init
git remote add origin https://github.com/cnzhq/we-cal.git

# 复制本目录的 calendar.ics 文件进来
cp /path/to/calendar-sync/calendar.ics .

git add calendar.ics
git commit -m "Initial calendar"
git push -u origin main
```

---

## 第二步：服务器部署

SSH 登录阿里云服务器后执行：

```bash
# 下载配置脚本
cd /tmp
curl -O https://raw.githubusercontent.com/cnzhq/we-cal/main/setup-calendar-sync.sh

# 运行配置（自动安装 git/nginx/cron，配置定时同步）
sudo bash setup-calendar-sync.sh
```

---

## 第三步：验证部署

```bash
# 检查同步日志
tail /var/log/calendar-sync.log

# 测试订阅链接
curl -I https://wetcm.org.cn/calendar.ics

# 手动强制同步（如需立即更新）
cd /var/www/html/calendar && sudo git pull
```

---

## 第四步：添加日历订阅

### Apple 日历 (Mac/iPhone/iPad)
1. 打开「日历」应用
2. 文件 → 新建日历订阅
3. 输入：`https://wetcm.org.cn/calendar.ics`

### Google 日历
1. 访问 https://calendar.google.com
2. 左侧「其他日历」→ 点击 `+` → 「从网址添加」
3. 输入：`https://wetcm.org.cn/calendar.ics`

### Outlook
1. 打开 Outlook → 日历视图
2. 主页 → 添加日历 → 从 Internet
3. 输入：`https://wetcm.org.cn/calendar.ics`

---

## 日常维护

| 操作 | 命令/位置 |
|------|----------|
| 修改日程 | 在 GitHub 编辑 `calendar.ics` |
| 查看同步日志 | `tail -f /var/log/calendar-sync.log` |
| 手动同步 | `cd /var/www/html/calendar && sudo git pull` |
| 修改同步频率 | `sudo crontab -e` |

---

## 故障排查

**404 Not Found**
```bash
# 检查文件是否存在
ls -la /var/www/html/calendar/calendar.ics

# 检查 Nginx 配置
sudo nginx -t
sudo systemctl status nginx
```

**同步失败**
```bash
# 查看详细日志
cat /var/log/calendar-sync.log

# 测试 git 连接
cd /var/www/html/calendar
sudo git pull
```

**HTTPS 问题**（如使用 HTTPS）
- 确保证书配置正确，或先使用 HTTP 测试
- Let's Encrypt 证书：`sudo certbot --nginx -d wetcm.org.cn`