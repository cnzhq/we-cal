#!/usr/bin/env node
/**
 * JSON to ICS Calendar Generator
 * 将 events/ 目录下的 JSON 文件转换为 calendars/ 目录下的 ICS 文件
 * 支持展开 RRULE 为独立事件（提高兼容性）
 */

const fs = require('fs');
const path = require('path');
const { RRule, rrulestr } = require('rrule');

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

// 转义 ICS 文本
function escapeText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// 将本地时间转换为 UTC 时间字符串
function toUTCString(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
}

// 全局限制
const MAX_EVENTS_PER_RRULE = 50; // 单个 RRULE 最大展开事件数

// 解析 RRULE 并生成所有日期
function expandRRule(rruleStr, startDate, originalCount) {
  try {
    // 检查是否为 YEARLY 且没有 COUNT
    const isYearly = rruleStr.includes('FREQ=YEARLY');
    const hasCount = rruleStr.includes('COUNT=');
    
    let effectiveRRule = rruleStr;
    let count = originalCount;
    
    // YEARLY 无 COUNT 时，自动限制为 10 年
    if (isYearly && !hasCount) {
      effectiveRRule = rruleStr + ';COUNT=10';
      count = 10;
      console.log(`  ⚠️  YEARLY without COUNT, auto-limited to 10 years`);
    }
    
    // 如果 COUNT 超过最大值，进行限制
    if (count && count > MAX_EVENTS_PER_RRULE) {
      console.log(`  ⚠️  COUNT(${count}) exceeds max(${MAX_EVENTS_PER_RRULE}), limiting...`);
      // 修改 RRULE 中的 COUNT
      effectiveRRule = effectiveRRule.replace(/COUNT=\d+/, `COUNT=${MAX_EVENTS_PER_RRULE}`);
      count = MAX_EVENTS_PER_RRULE;
    }
    
    // 构建完整的 RRULE 字符串
    const fullRRule = `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')}\nRRULE:${effectiveRRule}`;
    const rule = rrulestr(fullRRule);
    
    // 获取所有日期
    const dates = rule.all();
    
    // 限制返回数量
    const limit = Math.min(count || dates.length, MAX_EVENTS_PER_RRULE);
    return dates.slice(0, limit);
  } catch (error) {
    console.warn(`  ⚠️  Failed to parse RRULE: ${rruleStr}`, error.message);
    return [startDate]; // 返回原始日期
  }
}

// 生成单个事件的 VEVENT 块
function generateSingleEvent(event, startTime, endTime, sequence = 0) {
  const uid = generateUID();
  const now = toUTCString(new Date());
  
  let vevent = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ];

  // 开始时间
  if (event.allDay) {
    const dateStr = startTime.toISOString().split('T')[0].replace(/-/g, '');
    vevent.push(`DTSTART;VALUE=DATE:${dateStr}`);
  } else {
    vevent.push(`DTSTART:${toUTCString(startTime)}`);
  }

  // 结束时间
  if (endTime) {
    if (event.allDay) {
      const dateStr = endTime.toISOString().split('T')[0].replace(/-/g, '');
      vevent.push(`DTEND;VALUE=DATE:${dateStr}`);
    } else {
      vevent.push(`DTEND:${toUTCString(endTime)}`);
    }
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
  vevent.push(`SEQUENCE:${sequence}`);

  vevent.push('END:VEVENT');
  
  return vevent.join('\r\n');
}

// 生成事件（支持展开 RRULE）
function generateEvent(event, index) {
  const events = [];
  
  // 解析开始时间
  const startTime = new Date(event.start);
  
  // 计算结束时间或持续时间
  let endTime = null;
  if (event.end) {
    endTime = new Date(event.end);
  } else if (event.duration) {
    // 解析 ISO 8601 持续时间，如 PT2H
    const match = event.duration.match(/PT(\d+)H/);
    if (match) {
      const hours = parseInt(match[1]);
      endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
    } else {
      // 默认 1 小时
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    }
  } else {
    // 默认 1 小时
    endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  }
  
  // 计算持续时间（毫秒）
  const duration = endTime.getTime() - startTime.getTime();
  
  // 如果有 RRULE，展开为多个事件
  if (event.rrule) {
    // 解析 COUNT
    const countMatch = event.rrule.match(/COUNT=(\d+)/);
    const count = countMatch ? parseInt(countMatch[1]) : null;
    
    // 展开日期
    const dates = expandRRule(event.rrule, startTime, count);
    
    console.log(`  📅 Expanding "${event.title}": ${dates.length} instances`);
    
    // 为每个日期生成独立事件
    dates.forEach((date, i) => {
      const instanceStart = new Date(date);
      const instanceEnd = new Date(instanceStart.getTime() + duration);
      
      events.push(generateSingleEvent(event, instanceStart, instanceEnd, i));
    });
  } else {
    // 普通事件
    events.push(generateSingleEvent(event, startTime, endTime, 0));
  }
  
  return events;
}

// 生成完整的 ICS 文件
function generateICS(calendarData) {
  const calName = escapeText(calendarData.calendarName || '我的日历');
  const calDesc = escapeText(calendarData.description || '由 We-Cal 生成的日历');
  const timezone = calendarData.timezone || 'Asia/Shanghai';
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//We-Cal//Calendar Generator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // 多种日历名称字段（提高兼容性）
    `NAME:${calName}`,
    `X-WR-CALNAME:${calName}`,
    `CALNAME:${calName}`,
    `X-WR-TIMEZONE:${timezone}`,
    `X-WR-CALDESC:${calDesc}`,
  ];

  // 添加所有事件（展开后的）
  if (calendarData.events && Array.isArray(calendarData.events)) {
    calendarData.events.forEach((event, index) => {
      const expandedEvents = generateEvent(event, index);
      expandedEvents.forEach(vevent => {
        lines.push(vevent);
      });
    });
  }

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
    
    // 计算总事件数（展开后）
    let totalEvents = 0;
    if (data.events) {
      data.events.forEach(event => {
        if (event.rrule) {
          const countMatch = event.rrule.match(/COUNT=(\d+)/);
          totalEvents += countMatch ? parseInt(countMatch[1]) : 1;
        } else {
          totalEvents += 1;
        }
      });
    }
    
    console.log(`✅ Generated: ${basename}.ics (${totalEvents} total events)`);
    
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