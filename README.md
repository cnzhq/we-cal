# ICS 日历同步方案

通过 GitHub 中转，实现服务器日历订阅服务。

## 文件说明

| 文件 | 用途 |
|------|------|
| `calendar.ics` | 日历数据文件（上传到 GitHub） |
| `setup-calendar-sync.sh` | 服务器一键配置脚本 |
| `ICS_EDIT_GUIDE.md` | ICS 文件编辑指南 |

## 部署步骤

### 1. GitHub 端配置

```bash
# 在 GitHub 创建新仓库（例如：my-calendar）
# 然后本地执行：
git clone https://github.com/yourname/my-calendar.git
cd my-calendar
cp /path/to/calendar.ics .
git add calendar.ics
git commit -m "Initial calendar"
git push origin main
```

### 2. 服务器端配置

```bash
# 1. 下载脚本
wget https://raw.githubusercontent.com/yourname/my-calendar/main/setup-calendar-sync.sh

# 2. 编辑配置变量
nano setup-calendar-sync.sh
# 修改：GITHUB_USER, REPO_NAME, DOMAIN

# 3. 运行配置脚本
sudo bash setup-calendar-sync.sh
```

### 3. 验证部署

```bash
# 查看同步日志
tail -f /var/log/calendar-sync.log

# 手动测试同步
cd /var/www/html/calendar && git pull

# 测试订阅链接
curl -I http://your-domain.com/calendar.ics
```

## 订阅地址

```
http://your-domain.com/calendar.ics
```

## 添加到日历应用

### Apple 日历 (iPhone/Mac)
1. 打开「日历」应用
2. 文件 → 新建日历订阅
3. 输入订阅地址：`http://your-domain.com/calendar.ics`

### Google 日历
1. 访问 [Google 日历网页版](https://calendar.google.com)
2. 左侧「其他日历」→ 点击 `+` → 「通过网址添加」
3. 输入订阅地址

### Outlook
1. 打开 Outlook 日历
2. 主页 → 添加日历 → 从 Internet
3. 输入订阅地址

## 日常维护

| 操作 | 方式 |
|------|------|
| 添加/修改日程 | 在 GitHub 直接编辑 `calendar.ics` |
| 查看同步状态 | `tail /var/log/calendar-sync.log` |
| 手动同步 | `cd /var/www/html/calendar && git pull` |
| 修改同步频率 | `crontab -e` 编辑定时任务 |

## 故障排查

**订阅链接返回 404**
```bash
# 检查 Nginx 配置
sudo nginx -t
sudo systemctl status nginx

# 检查文件是否存在
ls -la /var/www/html/calendar/calendar.ics
```

**同步失败**
```bash
# 检查日志
cat /var/log/calendar-sync.log

# 手动测试 git pull
cd /var/www/html/calendar
sudo -u www-data git pull
```

**时区问题**
- 确保 ICS 文件使用 `TZID=Asia/Shanghai`
- 服务器时区：`timedatectl set-timezone Asia/Shanghai`

## 安全建议

1. 使用私有 GitHub 仓库保护日程隐私
2. 配置防火墙限制不必要的访问
3. 考虑使用 HTTPS（Let's Encrypt）
4. 定期备份 ICS 文件