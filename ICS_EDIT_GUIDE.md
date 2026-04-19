# ICS 日历文件编辑指南

## 文件结构说明

```
BEGIN:VCALENDAR      ← 日历开始
  VTIMEZONE          ← 时区定义（必需）
  VEVENT             ← 事件1
  VEVENT             ← 事件2
  ...
END:VCALENDAR        ← 日历结束
```

## 如何添加新事件

复制以下模板，修改内容后插入到 `END:VCALENDAR` 之前：

```ics
BEGIN:VEVENT
UID:unique-id-001@yourdomain.com          ← 唯一标识符，不能重复
DTSTAMP:20250419T080000Z                  ← 创建时间（UTC）
DTSTART;TZID=Asia/Shanghai:20250420T100000 ← 开始时间
DTEND;TZID=Asia/Shanghai:20250420T120000   ← 结束时间
SUMMARY:事件标题
DESCRIPTION:事件描述内容
LOCATION:地点信息
STATUS:CONFIRMED                          ← 状态：CONFIRMED/TENTATIVE/CANCELLED
SEQUENCE:0                                ← 版本号，修改时+1
END:VEVENT
```

## 时间格式说明

| 类型 | 格式 | 示例 |
|------|------|------|
| 普通时间 | `YYYYMMDDTHHMMSS` | `20250420T100000` (2025年4月20日 10:00:00) |
| UTC时间 | 加 `Z` 后缀 | `20250420T020000Z` (UTC+8 的10点) |
| 全天事件 | `VALUE=DATE` | `DTSTART;VALUE=DATE:20250420` |

## 常用字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `SUMMARY` | 标题 | `SUMMARY:团队周会` |
| `DESCRIPTION` | 描述 | `DESCRIPTION:讨论项目进度` |
| `LOCATION` | 地点 | `LOCATION:会议室A / 腾讯会议123456` |
| `URL` | 链接 | `URL:https://meeting.zoom.us/xxx` |
| `RRULE` | 重复规则 | `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR` |

## 重复事件（RRULE）

```ics
RRULE:FREQ=DAILY;COUNT=5              # 每天，共5次
RRULE:FREQ=WEEKLY;BYDAY=TU;COUNT=10   # 每周二，共10次
RRULE:FREQ=MONTHLY;BYMONTHDAY=15      # 每月15日
RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=8  # 每年3月8日
```

## 提醒设置

```ics
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:提醒内容
TRIGGER:-PT15M     ← 事件前15分钟（P=周期，T=时间，M=分钟）
END:VALARM
```

## 编辑注意事项

1. **UID 必须唯一**：每个事件的 UID 不能重复，建议格式 `uuid@yourdomain.com`
2. **DTSTAMP 用 UTC**：格式为 `YYYYMMDDTHHMMSSZ`
3. **时间带时区**：使用 `TZID=Asia/Shanghai` 避免时区混乱
4. **多行内容**：长文本用 `\n` 表示换行
5. **特殊字符**：逗号、分号、反斜杠需转义（`\,` `;` `\\`）

## 在线工具推荐

- **验证 ICS 文件**：https://icalendar.org/validator.html
- **可视化编辑**：https://jquense.github.io/react-big-calendar/examples/index.html?path=/docs/guides-understanding-date-equality--page

## 快速测试

编辑完成后，在 GitHub 提交修改，服务器会在下个整点自动同步。测试订阅链接：

```
http://your-domain.com/calendar.ics
```

可在 Apple 日历、Google 日历、Outlook 中添加订阅。