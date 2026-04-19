#!/usr/bin/env node
/**
 * CS赛程CSV转ICS专用脚本
 * 直接读取cs-schedule/data/下的CSV文件，生成calendars/下的ICS文件
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'calendars');

// 赛制转时长(分钟)
const FORMAT_DURATION = {
  '1': 40,    // BO1
  '3': 120,   // BO3 - 2小时
  '5': 240    // BO5 - 4小时
};

// 生成唯一ID
function generateUID() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@cs-schedule`;
}

// 转义ICS文本
function escapeText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// 转换为UTC时间字符串
function toUTCString(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
}

// 解析日期和时间
function parseDateTime(dateStr, timeStr) {
  // 解析日期: "4月29日" -> 2026年4月29日
  const match = dateStr.match(/(\d+)月(\d+)日/);
  if (!match) throw new Error(`无法解析日期: ${dateStr}`);
  
  const month = parseInt(match[1]);
  const day = parseInt(match[2]);
  
  // 解析时间: "2300" -> 23:00
  const hour = parseInt(timeStr.substring(0, 2));
  const minute = parseInt(timeStr.substring(2, 4));
  
  // 创建北京时间日期对象
  const date = new Date(2026, month - 1, day, hour, minute, 0);
  
  // 转换为UTC (北京时区是UTC+8)
  const utcDate = new Date(date.getTime() - 8 * 60 * 60 * 1000);
  
  return utcDate;
}

// 生成单个VEVENT
function generateEvent(row) {
  const {
    '系列赛中文名': seriesCN,
    '系列赛英文名': seriesEN,
    '日期': dateStr,
    '时间': timeStr,
    '战队1': team1,
    '战队2': team2,
    '赛制': format,
    '地点': location,
    '备注': note,
    '期望显示的SUMMARY': summary,
    '期望显示的DESCRIPTION': description,
    '期望显示的LOCATION': displayLocation
  } = row;

  // 解析开始时间
  const startTime = parseDateTime(dateStr, timeStr);
  
  // 计算结束时间
  const duration = FORMAT_DURATION[format] || 120; // 默认2小时
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  
  // 使用期望显示的字段
  const eventSummary = summary || `${team1} - ${team2}`;
  const eventDesc = description || `${seriesCN}｜${seriesEN}${note ? '｜' + note : ''}`;
  const eventLocation = displayLocation || location;

  const uid = generateUID();
  const now = toUTCString(new Date());

  let vevent = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toUTCString(startTime)}`,
    `DTEND:${toUTCString(endTime)}`,
    `SUMMARY:${escapeText(eventSummary)}`,
    `DESCRIPTION:${escapeText(eventDesc)}`,
    `LOCATION:${escapeText(eventLocation)}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(eventSummary)}`,
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT'
  ];

  return vevent.join('\r\n');
}

// 生成完整ICS
function generateICS(filename, events) {
  // 从文件名提取日历名称
  const calName = filename.replace('.csv', '');
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//We-Cal//CS Schedule Generator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `NAME:${escapeText(calName)}`,
    `X-WR-CALNAME:${escapeText(calName)}`,
    `CALNAME:${escapeText(calName)}`,
    'X-WR-TIMEZONE:Asia/Shanghai',
    `X-WR-CALDESC:${escapeText('CS2国际大型电竞赛事赛程')}`,
    ...events,
    'END:VCALENDAR'
  ];

  return lines.join('\r\n');
}

// 处理单个CSV文件
function processCSV(filename) {
  const filepath = path.join(DATA_DIR, filename);
  
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`📄 Processing: ${filename}`);
    console.log(`  📊 数据行数: ${records.length}`);
    
    // 生成所有事件
    const events = records.map((row, index) => {
      try {
        return generateEvent(row);
      } catch (error) {
        console.error(`  ❌ 第${index + 1}行错误:`, error.message);
        return null;
      }
    }).filter(e => e !== null);
    
    // 生成ICS
    const icsContent = generateICS(filename, events);
    const outputFilename = filename.replace('.csv', '.ics');
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    
    fs.writeFileSync(outputPath, icsContent, 'utf8');
    
    console.log(`  ✅ Generated: ${outputFilename} (${events.length} events)`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🎮 Building CS Schedule ICS calendars...\n');
  
  // 确保目录存在
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // 获取所有CSV文件
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.csv'));
  
  if (files.length === 0) {
    console.log('⚠️  No CSV files found in cs-schedule/data/');
    console.log('   Create a .csv file in cs-schedule/data/ to get started');
    return;
  }
  
  let successCount = 0;
  
  files.forEach(file => {
    if (processCSV(file)) {
      successCount++;
    }
  });
  
  console.log(`\n✨ Done! ${successCount}/${files.length} calendars generated.`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

// 如果带 --watch 参数，则监听文件变化
if (process.argv.includes('--watch')) {
  console.log('👀 Watching for changes...\n');
  main();
  
  fs.watch(DATA_DIR, (eventType, filename) => {
    if (filename && filename.endsWith('.csv')) {
      console.log(`\n📝 ${filename} changed, rebuilding...`);
      processCSV(filename);
    }
  });
} else {
  main();
}