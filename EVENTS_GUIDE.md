# 📝 JSON 事件编辑器使用指南

## 快速开始

### 1. 创建事件文件

在 `events/` 文件夹中创建 `.json` 文件：

```json
{
  "calendarName": "日历名称",
  "timezone": "Asia/Shanghai",
  "description": "日历描述",
  "events": [
    {
      "title": "事件标题",
      "start": "2024-08-28T10:00:00",
      "end": "2024-08-28T12:00:00",
      "description": "事件描述",
      "location": "地点",
      "reminder": 15
    }
  ]
}
```

### 2. 生成 ICS 文件

```bash
npm run build
```

### 3. 推送到 GitHub

```bash
git add .
git commit -m "更新游戏日历"
git push origin main
```

---

## 字段说明

### 日历级别字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `calendarName` | string | 是 | 日历显示名称 |
| `timezone` | string | 否 | 时区，默认 `Asia/Shanghai` |
| `description` | string | 否 | 日历描述 |
| `events` | array | 是 | 事件列表 |

### 事件字段

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `title` | string | 是 | 事件标题 | `"原神版本更新"` |
| `start` | string | 是 | 开始时间（ISO格式） | `"2024-08-28T10:00:00"` |
| `end` | string | 否 | 结束时间 | `"2024-08-28T12:00:00"` |
| `duration` | string | 否 | 持续时间（ISO 8601） | `"PT2H"`（2小时） |
| `allDay` | boolean | 否 | 是否全天事件 | `true` / `false` |
| `description` | string | 否 | 详细描述 | `"版本更新内容..."` |
| `location` | string | 否 | 地点 | `"线上"` |
| `reminder` | number | 否 | 提前提醒分钟数 | `15` |
| `rrule` | string | 否 | 重复规则 | 见下方 |
| `uid` | string | 否 | 唯一标识符（自动生成） | - |

---

## 重复规则（RRULE）

| 规则 | 说明 | 示例 |
|------|------|------|
| `FREQ=DAILY` | 每天 | `"FREQ=DAILY;COUNT=5"`（5天） |
| `FREQ=WEEKLY` | 每周 | `"FREQ=WEEKLY;BYDAY=MO,FR"`（每周一、五） |
| `FREQ=MONTHLY` | 每月 | `"FREQ=MONTHLY;BYMONTHDAY=15"`（每月15日） |
| `FREQ=YEARLY` | 每年 | `"FREQ=YEARLY"`（每年同一天） |

**星期代码**：MO（一）、TU（二）、WE（三）、TH（四）、FR（五）、SA（六）、SU（日）

---

## 示例

### 示例 1：单次会议

```json
{
  "title": "项目周会",
  "start": "2024-08-28T14:00:00",
  "end": "2024-08-28T15:30:00",
  "description": "讨论本周进度",
  "location": "会议室A",
  "reminder": 10
}
```

### 示例 2：每周例会

```json
{
  "title": "周会",
  "start": "2024-08-28T10:00:00",
  "duration": "PT1H",
  "rrule": "FREQ=WEEKLY;BYDAY=WE;COUNT=10",
  "description": "每周三例会",
  "location": "线上",
  "reminder": 15
}
```

### 示例 3：全天事件（生日）

```json
{
  "title": "张三生日",
  "start": "2024-09-01",
  "allDay": true,
  "rrule": "FREQ=YEARLY",
  "description": "记得买礼物",
  "reminder": 1440
}
```

### 示例 4：游戏活动

```json
{
  "title": "限时活动",
  "start": "2024-09-15T10:00:00",
  "end": "2024-09-25T03:59:00",
  "description": "活动持续10天",
  "location": "游戏内",
  "reminder": 60
}
```

---

## 命令

```bash
# 生成所有 ICS 文件
npm run build

# 监听文件变化，自动重新生成
npm run build:watch

# 清理生成的文件
npm run clean
```

---

## 工作流程

```
1. 编辑 events/xxx.json
        ↓
2. 运行 npm run build
        ↓
3. 生成 calendars/xxx.ics
        ↓
4. git add . && git commit && git push
        ↓
5. 自动部署到服务器
        ↓
6. 订阅地址更新
```

---

## 注意事项

1. **时间格式**：使用 ISO 8601 格式 `YYYY-MM-DDTHH:MM:SS`
2. **时区**：默认使用 `Asia/Shanghai`，跨时区事件请指定
3. **文件名**：`events/xxx.json` 会生成 `calendars/xxx.ics`
4. **验证**：生成后可以用 https://icalendar.org/validator.html 验证