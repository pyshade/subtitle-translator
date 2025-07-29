/**
 * Subtitle format conversion utilities
 * Converts between SRT, VTT, ASS, and LRC formats
 */

import { assHeader, convertTimeToAss } from './subtitleUtils';

export interface SubtitleEntry {
  index?: number;
  startTime: string;
  endTime: string;
  text: string;
}

/**
 * Parse subtitle content into structured entries
 */
export const parseSubtitleContent = (content: string, format: string): SubtitleEntry[] => {
  const lines = content.split('\n');
  const entries: SubtitleEntry[] = [];

  switch (format) {
    case 'srt':
      return parseSRT(lines);
    case 'vtt':
      return parseVTT(lines);
    case 'ass':
      return parseASS(lines);
    case 'lrc':
      return parseLRC(lines);
    default:
      return [];
  }
};

/**
 * Convert subtitle entries to target format
 */
export const convertToFormat = (entries: SubtitleEntry[], targetFormat: string, bilingualSubtitle: boolean = false): string => {
  switch (targetFormat) {
    case 'srt':
      return convertToSRT(entries);
    case 'vtt':
      return convertToVTT(entries);
    case 'ass':
      return convertToASS(entries, bilingualSubtitle);
    case 'lrc':
      return convertToLRC(entries);
    default:
      return '';
  }
};

/**
 * Parse SRT format
 */
const parseSRT = (lines: string[]): SubtitleEntry[] => {
  const entries: SubtitleEntry[] = [];
  let currentEntry: Partial<SubtitleEntry> = {};
  let textLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (currentEntry.startTime && currentEntry.endTime && textLines.length > 0) {
        entries.push({
          index: currentEntry.index,
          startTime: currentEntry.startTime,
          endTime: currentEntry.endTime,
          text: textLines.join('\n')
        });
      }
      currentEntry = {};
      textLines = [];
      continue;
    }
    
    if (/^\d+$/.test(line)) {
      currentEntry.index = parseInt(line);
    } else if (line.includes(' --> ')) {
      const [start, end] = line.split(' --> ');
      currentEntry.startTime = start;
      currentEntry.endTime = end;
    } else {
      textLines.push(line);
    }
  }
  
  // Handle last entry
  if (currentEntry.startTime && currentEntry.endTime && textLines.length > 0) {
    entries.push({
      index: currentEntry.index,
      startTime: currentEntry.startTime,
      endTime: currentEntry.endTime,
      text: textLines.join('\n')
    });
  }
  
  return entries;
};

/**
 * Parse VTT format
 */
const parseVTT = (lines: string[]): SubtitleEntry[] => {
  const entries: SubtitleEntry[] = [];
  let currentEntry: Partial<SubtitleEntry> = {};
  let textLines: string[] = [];
  let inContent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('WEBVTT')) {
      inContent = true;
      continue;
    }
    
    if (!inContent) continue;
    
    if (!line) {
      if (currentEntry.startTime && currentEntry.endTime && textLines.length > 0) {
        entries.push({
          startTime: currentEntry.startTime,
          endTime: currentEntry.endTime,
          text: textLines.join('\n')
        });
      }
      currentEntry = {};
      textLines = [];
      continue;
    }
    
    if (line.includes(' --> ')) {
      const [start, end] = line.split(' --> ');
      currentEntry.startTime = start;
      currentEntry.endTime = end;
    } else if (!line.startsWith('#')) {
      textLines.push(line);
    }
  }
  
  // Handle last entry
  if (currentEntry.startTime && currentEntry.endTime && textLines.length > 0) {
    entries.push({
      startTime: currentEntry.startTime,
      endTime: currentEntry.endTime,
      text: textLines.join('\n')
    });
  }
  
  return entries;
};

/**
 * Parse ASS format (simplified)
 */
const parseASS = (lines: string[]): SubtitleEntry[] => {
  const entries: SubtitleEntry[] = [];
  
  for (const line of lines) {
    if (line.startsWith('Dialogue:')) {
      const parts = line.split(',');
      if (parts.length >= 10) {
        entries.push({
          startTime: parts[1],
          endTime: parts[2],
          text: parts.slice(9).join(',')
        });
      }
    }
  }
  
  return entries;
};

/**
 * Parse LRC format
 */
const parseLRC = (lines: string[]): SubtitleEntry[] => {
  const entries: SubtitleEntry[] = [];
  
  for (const line of lines) {
    const match = line.match(/^\[(\d{2}:\d{2}(?:\.\d{2,3})?)\](.*)$/);
    if (match) {
      const [, time, text] = match;
      entries.push({
        startTime: time,
        endTime: time, // LRC doesn't have end times
        text: text.trim()
      });
    }
  }
  
  return entries;
};

/**
 * Convert to SRT format
 */
const convertToSRT = (entries: SubtitleEntry[]): string => {
  return entries.map((entry, index) => {
    const srtIndex = entry.index || (index + 1);
    const startTime = normalizeTimeToSRT(entry.startTime);
    const endTime = normalizeTimeToSRT(entry.endTime);
    
    return `${srtIndex}\n${startTime} --> ${endTime}\n${entry.text}\n`;
  }).join('\n');
};

/**
 * Convert to VTT format
 */
const convertToVTT = (entries: SubtitleEntry[]): string => {
  const header = 'WEBVTT\n\n';
  const content = entries.map(entry => {
    const startTime = normalizeTimeToVTT(entry.startTime);
    const endTime = normalizeTimeToVTT(entry.endTime);
    
    return `${startTime} --> ${endTime}\n${entry.text}\n`;
  }).join('\n');
  
  return header + content;
};

/**
 * Convert to ASS format
 */
const convertToASS = (entries: SubtitleEntry[], bilingualSubtitle: boolean = false): string => {
  const content = entries.map(entry => {
    const startTime = convertTimeToAss(entry.startTime);
    const endTime = convertTimeToAss(entry.endTime);
    const style = bilingualSubtitle ? 'Default' : 'Default';
    
    return `Dialogue: 0,${startTime},${endTime},${style},,0,0,0,,${entry.text}`;
  }).join('\n');
  
  return assHeader + '\n' + content;
};

/**
 * Convert to LRC format
 */
const convertToLRC = (entries: SubtitleEntry[]): string => {
  return entries.map(entry => {
    const time = normalizeTimeToLRC(entry.startTime);
    return `[${time}]${entry.text}`;
  }).join('\n');
};

/**
 * Normalize time formats
 */
const normalizeTimeToSRT = (time: string): string => {
  // Convert VTT time (with dots) to SRT time (with commas)
  return time.replace(/\./g, ',').replace(/^(\d{1}):/, '0$1:');
};

const normalizeTimeToVTT = (time: string): string => {
  // Convert SRT time (with commas) to VTT time (with dots)
  return time.replace(/,/g, '.').replace(/^0(\d):/, '$1:');
};

const normalizeTimeToLRC = (time: string): string => {
  // Convert to LRC format (mm:ss.xx)
  const match = time.match(/(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (match) {
    const [, hours, minutes, seconds, ms] = match;
    const totalMinutes = (parseInt(hours || '0') * 60) + parseInt(minutes);
    const centiseconds = ms.length >= 2 ? ms.substring(0, 2) : ms.padStart(2, '0');
    return `${totalMinutes.toString().padStart(2, '0')}:${seconds}.${centiseconds}`;
  }
  return time;
};

/**
 * Get available target formats for conversion
 */
export const getAvailableFormats = () => [
  { value: 'srt', label: 'SRT', description: 'SubRip Subtitle' },
  { value: 'vtt', label: 'VTT', description: 'WebVTT' },
  { value: 'ass', label: 'ASS', description: 'Advanced SubStation Alpha' },
  { value: 'lrc', label: 'LRC', description: 'Lyric File' }
];

/**
 * Check if format conversion is supported
 */
export const isConversionSupported = (fromFormat: string, toFormat: string): boolean => {
  const supportedFormats = ['srt', 'vtt', 'ass', 'lrc'];
  return supportedFormats.includes(fromFormat) && supportedFormats.includes(toFormat);
};