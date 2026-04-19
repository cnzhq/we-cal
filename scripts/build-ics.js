#!/usr/bin/env node
/**
 * JSON to ICS Calendar Generator
 * 将 events/ 目录下的 JSON 文件转换为 calendars/ 目录下的 ICS 文件
 */

const fs = require('fs');
const path = require('path');

const EVENTS_DIR = path.join(__dirname, '..', 'events');
const CALENDARS_DIR = path.join(__dirname, '..', 'calendars');

// 确保目录存在
if (!fs.existsSync(EVENTS_DIR)) {
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
}
if (!fs.existsSync(CALENDARS_DIR)) {
  fs.mkdirSync(CALENDARS_DIR, { recursive: true });
}

// 生成唯一 ID
function generateUID() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@we-cal`;
}

// 格式化日期时间为 ICS 格式
function formatDateTime(dateStr, timezone = 'Asia/Shanghai') {
  const date = new Date(dateStr);
  // 转换为 YYYYMMDDTHHMMSS 格式
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// 转义 ICS 文本
function escapeText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// 生成单个事件的 VEVENT 块
function generateEvent(event, index) {
  const uid = event.uid || generateUID();
  const now = formatDateTime(new Date().toISOString()) + 'Z';
  
  let vevent = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ];

  // 开始时间
  if (event.start) {
    if (event.allDay) {
      vevent.push(`DTSTART;VALUE=DATE:${event.start.replace(/-/g, '')}`);
    } else {
      vevent.push(`DTSTART;TZID=${event.timezone || 'Asia/Shanghai'}:${formatDateTime(event.start)}`);
    }
  }

  // 结束时间
  if (event.end) {
    if (event.allDay) {
      vevent.push(`DTEND;VALUE=DATE:${event.end.replace(/-/g, '')}`);
    } else {
      vevent.push(`DTEND;TZID=${event.timezone || 'Asia/Shanghai'}:${formatDateTime(event.end)}`);
    }
  } else if (event.duration) {
    // 如果有持续时间但没有结束时间
    vevent.push(`DURATION:${event.duration}`);
  }

  // 重复规则
  if (event.rrule) {
    vevent.push(`RRULE:${event.rrule}`);
  }

  // 标题
  if (event.title) {
    vevent.push(`SUMMARY:${escapeText(event.title)}`);
  }

  // 描述
  if (event.description) {
    vevent.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  // 地点
  if (event.location) {
    vevent.push(`LOCATION:${escapeText(event.location)}`);
  }

  // 状态
  vevent.push('STATUS:CONFIRMED');
  vevent.push(`SEQUENCE:${event.sequence || 0}`);

  // 提醒
  if (event.reminder) {
    const trigger = event.reminder > 0 ? `-PT${event.reminder}M` : `PT${Math.abs(event.reminder)}M`;
    vevent.push('BEGIN:VALARM');
    vevent.push('ACTION:DISPLAY');
    vevent.push(`DESCRIPTION:${escapeText(event.title || '提醒')}`);
    vevent.push(`TRIGGER:${trigger}`);
    vevent.push('END:VALARM');
  }

  vevent.push('END:VEVENT');
  
  return vevent.join('\r\n');
}

// 生成完整的 ICS 文件
function generateICS(calendarData) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//We-Cal//Calendar Generator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarData.calendarName || '我的日历')}`,
    `X-WR-TIMEZONE:${calendarData.timezone || 'Asia/Shanghai'}`,
    `X-WR-CALDESC:${escapeText(calendarData.description || '由 We-Cal 生成的日历')}`,
    '',
    'BEGIN:VTIMEZONE',
    `TZID:${calendarData.timezone || 'Asia/Shanghai'}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  // 添加所有事件
  if (calendarData.events && Array.isArray(calendarData.events)) {
    calendarData.events.forEach((event, index) => {
      lines.push('');
      lines.push(generateEvent(event, index));
    });
  }

  lines.push('');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

// 处理单个 JSON 文件
function processJSONFile(filename) {
  const filepath = path.join(EVENTS_DIR, filename);
  const basename = path.basename(filename, '.json');
  
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const data = JSON.parse(content);
    
    const icsContent = generateICS(data);
    const outputPath = path.join(CALENDARS_DIR, `${basename}.ics`);
    
    fs.writeFileSync(outputPath, icsContent, 'utf8');
    console.log(`✅ Generated: ${basename}.ics (${data.events?.length || 0} events)`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🚀 Building ICS calendars...\n');
  
  // 获取所有 JSON 文件
  const files = fs.readdirSync(EVENTS_DIR)
    .filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('⚠️  No JSON files found in events/ directory');
    console.log('   Create a .json file in events/ to get started');
    return;
  }
  
  let successCount = 0;
  
  files.forEach(file => {
    if (processJSONFile(file)) {
      successCount++;
    }
  });
  
  console.log(`\n✨ Done! ${successCount}/${files.length} calendars generated.`);
  console.log(`📁 Output directory: ${CALENDARS_DIR}`);
}

// 如果带 --watch 参数，则监听文件变化
if (process.argv.includes('--watch')) {
  console.log('👀 Watching for changes...\n');
  main();
  
  fs.watch(EVENTS_DIR, (eventType, filename) => {
    if (filename && filename.endsWith('.json')) {
      console.log(`\n📝 ${filename} changed, rebuilding...`);
      processJSONFile(filename);
    }
  });
} else {
  main();
}