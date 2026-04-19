# 📅 多日历自动同步使用指南

## 目录结构

```
we-cal/
└── calendars/              ← 把你的 .ics 文件放在这里
    ├── calendar.ics        ← 默认日历
    ├── new-game.ics        ← 游戏日历
    ├── work.ics            ← 工作日历
    └── personal.ics        ← 个人日历
```

## 🚀 使用方法

### 添加新日历

**方法 1：GitHub 网页上传（推荐）**

1. 访问 https://github.com/cnzhq/we-cal/tree/main/calendars
2. 点击 **"Add file"** → **"Upload files"**
3. 选择你的 `.ics` 文件
4. 点击 **"Commit changes"**
5. **自动部署**：每小时自动同步到服务器

**方法 2：本地编辑后推送**

```bash
cd /path/to/we-cal
cp /path/to/your-calendar.ics calendars/
git add calendars/
git commit -m "添加新日历: your-calendar"
git push origin main
```

## 📱 订阅地址

部署后，每个 `.ics` 文件都有独立的订阅地址：

| 文件 | 订阅地址 |
|------|----------|
| `calendars/calendar.ics` | `https://cal.wetcm.org.cn/calendar.ics` |
| `calendars/new-game.ics` | `https://cal.wetcm.org.cn/new-game.ics` |
| `calendars/work.ics` | `https://cal.wetcm.org.cn/work.ics` |
| `calendars/xxx.ics` | `https://cal.wetcm.org.cn/xxx.ics` |

**访问根目录查看所有日历**：https://cal.wetcm.org.cn/

## ⏰ 同步机制

- **自动同步**：每小时整点自动部署
- **手动同步**：在 `wetcm-org-cn` 仓库 → Actions → "Sync Calendars" → "Run workflow"

## 📝 注意事项

1. **文件名规范**：使用英文、数字、连字符，不要有特殊字符
2. **文件格式**：必须是标准的 `.ics` 格式
3. **无需配置**：新增/删除文件无需修改任何配置，完全自动化

## 🔧 故障排查

**404 Not Found**
- 检查文件是否在 `calendars` 文件夹中
- 访问 https://cal.wetcm.org.cn/ 查看已部署的文件列表
- 检查 GitHub Actions 运行状态

**同步延迟**
- 自动同步每小时一次
- 如需立即更新，手动触发 workflow