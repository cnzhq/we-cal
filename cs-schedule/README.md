# CS赛程日历生成器

CS2国际大型电竞赛事赛程日历生成工具，直接读取CSV文件生成ICS日历。

## 目录结构

```
cs-schedule/
├── data/                          # 存放CSV源数据
│   └── CS2026国际大赛赛程.csv      # 你的赛程数据
├── scripts/
│   └── cs-csv-to-ics.js          # 专用转换脚本
└── README.md                      # 本文件

calendars/
└── CS2026国际大赛赛程.ics         # 生成的日历（自动输出到这里）
```

## 使用方法

### 1. 准备CSV文件

将CSV文件放入 `cs-schedule/data/` 目录，字段格式如下：

| 字段 | 说明 | 示例 |
|------|------|------|
| 系列赛中文名 | 赛事中文名称 | BLAST竞争赛2026第1季 |
| 系列赛英文名 | 赛事英文名称 | BLAST Rivals 2026 Season 1 |
| 日期 | 月日格式 | 4月29日（自动补2026年） |
| 时间 | 24小时制 | 2300（表示23:00） |
| 战队1 | 第一支队伍 | Vitality |
| 战队2 | 第二支队伍 | FUT |
| 赛制 | 1/3/5 | 3（BO3，自动计算2小时时长） |
| 地点 | 比赛地点 | 美国德克萨斯州 |
| 备注 | 额外说明 | 超一线对阵新秀冠军 |
| 期望显示的SUMMARY | ICS标题 | Vitality - FUT |
| 期望显示的DESCRIPTION | ICS描述 | 系列赛中英文名｜备注 |
| 期望显示的LOCATION | ICS地点 | 美国德克萨斯州 |

### 2. 生成日历

```bash
node cs-schedule/scripts/cs-csv-to-ics.js
```

生成的ICS文件会自动保存到 `calendars/` 目录，文件名与CSV文件名一致。

### 3. 监听模式（自动重建）

```bash
node cs-schedule/scripts/cs-csv-to-ics.js --watch
```

CSV文件变动时自动重新生成ICS。

## 赛制时长

| 赛制 | 时长 |
|------|------|
| BO1 (1) | 40分钟 |
| BO3 (3) | 2小时 |
| BO5 (5) | 4小时 |

## 时间处理

- 输入时间：北京时间（+08:00）
- 输出时间：自动转换为UTC时间
- 年份：自动补2026年
- 提醒：默认提前30分钟

## 示例CSV

```csv
系列赛中文名,系列赛英文名,日期,时间,战队1,战队2,赛制,地点,备注,期望显示的SUMMARY,期望显示的DESCRIPTION,期望显示的LOCATION
BLAST竞争赛2026第1季,BLAST Rivals 2026 Season 1,4月29日,2300,Vitality,FUT,3,美国德克萨斯州,超一线对阵新秀冠军,Vitality - FUT,BLAST竞争赛2026第1季｜BLAST Rivals 2026 Season 1｜超一线对阵新秀冠军,美国德克萨斯州
```

## 注意事项

1. CSV文件必须使用UTF-8编码
2. 日期格式严格为 "X月X日"
3. 时间格式严格为4位数字（如2300）
4. 所有字段都建议填写，避免显示异常