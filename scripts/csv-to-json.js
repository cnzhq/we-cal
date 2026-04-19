#!/usr/bin/env node
/**
 * CSV to JSON Calendar Converter
 * 将 csv/ 目录下的 CSV 文件转换为 events/ 目录下的 JSON 文件
 * 支持中文日期解析和自动年份推断
 */

const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '..', 'csv');
const EVENTS_DIR = path.join(__dirname, '..', 'events');

// 确保目录存在
if (!fs.existsSync(CSV_DIR)) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
}
if (!fs.existsSync(EVENTS_DIR)) {
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
}

// 从文件名提取年份（如：苏超2026常规赛程.csv → 2026）
function extractYearFromFilename(filename) {
  const match = filename.match(/(\d{4})/);
  return match ? parseInt(match[1]) : new Date().getFullYear();
}

// 从 CSV 表头提取日历名称（移除年份和扩展名）
function extractCalendarName(filename) {
  return filename
    .replace(/\.csv$/i, '')
    .replace(/\d{4}/, '')
    .replace(/常规?赛程?$/, '')
    .trim() || '日历';
}

// 解析中文日期（如：4月11日 → 2026-04-11）
function parseChineseDate(dateStr, year) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const match = dateStr.match(/(\d{1,2})月(\d{1,2})日?/);
  if (!match) return null;
  
  const month = parseInt(match[1]);
  const day = parseInt(match[2]);
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 解析时间（如：1935 → 19:35:00）
function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  const time = String(timeStr).trim();
  if (time.length === 4) {
    const hours = time.substring(0, 2);
    const minutes = time.substring(2, 4);
    return `${hours}:${minutes}:00`;
  }
  
  // 如果已经是 HH:MM 格式
  if (time.match(/^\d{1,2}:\d{2}$/)) {
    const [hours, minutes] = time.split(':');
    return `${String(hours).padStart(2, '0')}:${minutes}:00`;
  }
  
  return null;
}

// 构建 ISO 8601 日期时间
function buildISODatetime(dateStr, timeStr, year) {
  const date = parseChineseDate(dateStr, year);
  const time = parseTime(timeStr);
  
  if (!date) return null;
  if (!time) return `${date}T00:00:00`;
  
  return `${date}T${time}`;
}

// 构建持续时间字符串（如：2 → PT2H）
function buildDuration(hoursStr) {
  const hours = parseInt(hoursStr);
  if (isNaN(hours) || hours <= 0) return 'PT2H'; // 默认2小时
  return `PT${hours}H`;
}

// 构建地点字符串
function buildLocation(venue, district, city) {
  const parts = [venue, district, city].filter(p => p && String(p).trim());
  return parts.join('，');
}

// 构建描述
function buildDescription(week, matchNum, homeTeam, broadcast) {
  const parts = [`苏超第${week}周（总第${matchNum}场）：${homeTeam}队主场`];
  if (broadcast) {
    parts.push(`转播：${broadcast}`);
  }
  return parts.join('。');
}

// 解析 CSV 行（处理引号和逗号）
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // 跳过下一个引号
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// 读取 CSV 文件
function readCSV(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV 文件至少需要包含表头和一行数据');
  }
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    // 跳过空行（所有字段都为空）
    if (values.every(v => !v.trim())) continue;
    
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

// 转换单行数据为事件
function convertRowToEvent(row, year) {
  // 字段映射（支持灵活的列名）
  const week = row['周次'] || row['周'] || row['week'] || '';
  const matchNum = row['场次'] || row['场'] || row['match'] || '';
  const date = row['日期'] || row['date'] || '';
  const time = row['开球时间'] || row['时间'] || row['time'] || '';
  const duration = row['持续小时'] || row['时长'] || row['duration'] || '2';
  const homeTeam = row['主队'] || row['主场'] || row['home'] || '';
  const awayTeam = row['客队'] || row['客场'] || row['away'] || '';
  const venue = row['比赛场地'] || row['场地'] || row['venue'] || '';
  const district = row['区县'] || row['区'] || row['district'] || '';
  const city = row['地级市'] || row['城市'] || row['city'] || '';
  const broadcast = row['转播'] || row['直播'] || row['broadcast'] || '';
  
  // 检查必要字段
  if (!date || !homeTeam || !awayTeam) {
    return null;
  }
  
  const start = buildISODatetime(date, time, year);
  if (!start) {
    console.warn(`  ⚠️  无法解析日期: ${date}`);
    return null;
  }
  
  return {
    title: `⚽ ${homeTeam} vs ${awayTeam}`,
    start: start,
    duration: buildDuration(duration),
    description: buildDescription(week, matchNum, homeTeam, broadcast),
    location: buildLocation(venue, district, city),
    reminder: 30
  };
}

// 处理单个 CSV 文件
function processCSVFile(filename) {
  const filepath = path.join(CSV_DIR, filename);
  const basename = path.basename(filename, '.csv');
  const outputPath = path.join(EVENTS_DIR, `${basename}.json`);
  
  try {
    console.log(`\n📄 Processing: ${filename}`);
    
    const year = extractYearFromFilename(filename);
    console.log(`  📅 年份: ${year}`);
    
    const { rows } = readCSV(filepath);
    console.log(`  📊 数据行数: ${rows.length}`);
    
    const events = [];
    let skipped = 0;
    
    rows.forEach((row, index) => {
      const event = convertRowToEvent(row, year);
      if (event) {
        events.push(event);
      } else {
        skipped++;
        console.log(`  ⚠️  跳过第 ${index + 1} 行: 数据不完整`);
      }
    });
    
    if (events.length === 0) {
      console.log(`  ❌ 没有有效的赛事数据`);
      return false;
    }
    
    // 构建 JSON 结构
    const calendarData = {
      calendarName: `${extractCalendarName(filename)}赛程`,
      timezone: "Asia/Shanghai",
      description: `${year}年${extractCalendarName(filename)}完整赛程，包含比赛时间、主客队、场地、转播信息`,
      events: events
    };
    
    // 检查是否已有 JSON 文件，保留可能的手动修改
    let finalData = calendarData;
    if (fs.existsSync(outputPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        // 保留现有的事件，只更新从 CSV 解析的部分
        if (existing.events && Array.isArray(existing.events)) {
          // 合并：CSV 的事件为基础，保留现有 JSON 中 CSV 没有的事件
          const csvTitles = new Set(events.map(e => e.title + e.start));
          const existingOnly = existing.events.filter(e => !csvTitles.has(e.title + e.start));
          finalData.events = [...events, ...existingOnly];
          console.log(`  🔄 合并现有 JSON: +${existingOnly.length} 个手动添加的事件`);
        }
        // 保留其他元数据
        finalData.calendarName = existing.calendarName || calendarData.calendarName;
        finalData.timezone = existing.timezone || calendarData.timezone;
        finalData.description = existing.description || calendarData.description;
      } catch (e) {
        console.log(`  ⚠️  现有 JSON 解析失败，将覆盖`);
      }
    }
    
    // 写入 JSON 文件
    fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2), 'utf8');
    
    console.log(`  ✅ Generated: ${basename}.json (${finalData.events.length} events)`);
    if (skipped > 0) {
      console.log(`  ⚠️  跳过: ${skipped} 行`);
    }
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error processing ${filename}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🚀 Converting CSV to JSON...\n');
  
  // 获取所有 CSV 文件
  const files = fs.readdirSync(CSV_DIR)
    .filter(f => f.endsWith('.csv'));
  
  if (files.length === 0) {
    console.log('⚠️  No CSV files found in csv/ directory');
    console.log('   Create a .csv file in csv/ to get started');
    console.log('');
    console.log('   CSV format example:');
    console.log('   周次,场次,日期,开球时间,持续小时,主队,客队,比赛场地,区县,地级市,转播');
    console.log('   1,1,4月11日,1935,2,常州,南通,常州奥体中心体育场,新北区,常州市,转播信息');
    return;
  }
  
  let successCount = 0;
  
  files.forEach(file => {
    if (processCSVFile(file)) {
      successCount++;
    }
  });
  
  console.log(`\n✨ Done! ${successCount}/${files.length} CSV files converted.`);
  console.log(`📁 Output directory: ${EVENTS_DIR}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Check the generated JSON files in events/');
  console.log('  2. Manually edit if needed');
  console.log('  3. Run: npm run build  (to generate ICS files)');
}

// 如果带 --watch 参数，则监听文件变化
if (process.argv.includes('--watch')) {
  console.log('👀 Watching for changes...\n');
  main();
  
  fs.watch(CSV_DIR, (eventType, filename) => {
    if (filename && filename.endsWith('.csv')) {
      console.log(`\n📝 ${filename} changed, converting...`);
      processCSVFile(filename);
    }
  });
} else {
  main();
}