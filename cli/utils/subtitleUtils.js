// Ported from src/app/utils/subtitleUtils.ts

// 用于匹配 VTT/SRT 时间行（支持默认小时省略、多位数小时以及 1 到 3 位毫秒值）
const VTT_SRT_TIME = /^(?:\d+:)?\d{2}:\d{2}[,.]\d{1,3} --> (?:\d+:)?\d{2}:\d{2}[,.]\d{1,3}$/;
// LRC 格式的时间标记正则表达式
const LRC_TIME_REGEX = /^\[\d{2}:\d{2}(\.\d{2,3})?\]/;
const LRC_METADATA_REGEX = /^\[(ar|ti|al|by|offset|re|ve):/i;

// 识别字幕文件的类型
const detectSubtitleFormat = (lines) => {
  // 获取前 50 行，并去除其中的空行
  const nonEmptyLines = lines.slice(0, 50).filter((line) => line.trim().length > 0);
  let assCount = 0,
    vttCount = 0,
    srtCount = 0,
    lrcCount = 0;

  for (let i = 0; i < nonEmptyLines.length; i++) {
    const trimmed = nonEmptyLines[i].trim();

    // ASS 格式判断：如果存在 [script info]，或对话行符合 ASS 格式
    if (/^\[script info\]/i.test(trimmed)) return "ass";

    // 如果第一行是 WEBVTT 标识，则为 VTT 格式
    if (i === 0 && /^WEBVTT($|\s)/i.test(trimmed)) return "vtt";

    if (/^dialogue:\s*\d+,[^,]*,[^,]*,/i.test(trimmed)) {
      assCount++;
    }
    // 匹配时间行
    if (VTT_SRT_TIME.test(trimmed)) {
      if (trimmed.includes(",")) {
        srtCount++;
      } else if (trimmed.includes(".")) {
        vttCount++;
      }
    }
    // 检测LRC格式的时间标记
    if (LRC_TIME_REGEX.test(trimmed)) {
      lrcCount++;
    }
    if (LRC_METADATA_REGEX.test(trimmed)) {
      lrcCount++;
    }
  }

  // 根据时间行分隔符数量判断
  if (assCount > 0 && assCount >= Math.max(vttCount, srtCount, lrcCount)) {
    return "ass";
  }
  if (lrcCount > 0 && lrcCount >= Math.max(vttCount, srtCount)) {
    return "lrc";
  }
  if (vttCount > srtCount) return "vtt";
  if (srtCount > 0) return "srt";
  return "error";
};

const getOutputFileExtension = (fileType, bilingualSubtitle) => {
  if (fileType === "lrc") {
    return "lrc";
  } else if (bilingualSubtitle || fileType === "ass") {
    return "ass";
  } else if (fileType === "vtt") {
    return "vtt";
  } else {
    return "srt";
  }
};

// 预编译正则表达式用于检测纯数字行
const INTEGER_REGEX = /^\d+$/;
// 检测当前行是否为整数和空行
const isValidSubtitleLine = (str) => {
  const trimmedStr = str.trim();
  return trimmedStr !== "" && !INTEGER_REGEX.test(trimmedStr);
};

const filterSubLines = (lines, fileType) => {
  const contentLines = [];
  const contentIndices = [];
  const styleBlockLines = [];
  let startExtracting = false;
  let assContentStartIndex = 9;
  let formatFound = false;

  if (fileType === "ass") {
    const eventIndex = lines.findIndex((line) => line.trim() === "[Events]");
    if (eventIndex !== -1) {
      for (let i = eventIndex; i < lines.length; i++) {
        if (lines[i].startsWith("Format:")) {
          const formatLine = lines[i];
          assContentStartIndex = formatLine.split(",").length - 1;
          formatFound = true;
          break;
        }
      }
    }

    if (!formatFound) {
      const dialogueLines = lines.filter((line) => line.startsWith("Dialogue:")).slice(0, 100);
      if (dialogueLines.length > 0) {
        const commaCounts = dialogueLines.map((line) => line.split(",").length - 1);
        assContentStartIndex = Math.min(...commaCounts);
      }
    }
  }

  lines.forEach((line, index) => {
    let isContent = false;
    let extractedContent = "";
    const trimmedLine = line.trim();

    if (fileType === "srt" || fileType === "vtt") {
      if (!startExtracting) {
        const isTimecode = /^[\d:,]+ --> [\d:,]+$/.test(line) || /^[\d:.]+ --> [\d:.]+$/.test(line);
        if (isTimecode) {
          startExtracting = true;
        }
      }

      if (startExtracting) {
        if (fileType === "vtt") {
          const isTimecode = /^[\d:.]+ --> [\d:.]+$/.test(trimmedLine);
          const isWebVTTHeader = trimmedLine.startsWith("WEBVTT");
          const isComment = trimmedLine.startsWith("#");
          isContent = isValidSubtitleLine(line) && !isTimecode && !isWebVTTHeader && !isComment;
          extractedContent = line;
        } else {
          const isTimecode = /^[\d:,]+ --> [\d:,]+$/.test(trimmedLine);
          isContent = isValidSubtitleLine(line) && !isTimecode;
          extractedContent = line;
        }
      }
    } else if (fileType === "lrc") {
      if (!startExtracting && LRC_TIME_REGEX.test(trimmedLine)) {
        startExtracting = true;
      }

      if (startExtracting) {
        extractedContent = trimmedLine.replace(/\[\d{2}:\d{2}(\.\d{2,3})?\]/g, "").trim();
        // 只有当去除时间标记后内容不为空时，才认为是有效内容
        isContent = isValidSubtitleLine(line);
      }
    } else if (fileType === "ass") {
      if (!startExtracting && trimmedLine.startsWith("Dialogue:")) {
        startExtracting = true;
      }

      if (startExtracting) {
        const parts = line.split(",");
        if (line.startsWith("Dialogue:") && parts.length > assContentStartIndex) {
          extractedContent = parts.slice(assContentStartIndex).join(",").trim();
          isContent = isValidSubtitleLine(line);
        }
      }
    }

    if (isContent) {
      contentLines.push(extractedContent);
      contentIndices.push(index);
    }
  });

  return { contentLines, contentIndices, styleBlockLines };
};

module.exports = {
  detectSubtitleFormat,
  getOutputFileExtension,
  filterSubLines,
  VTT_SRT_TIME,
  LRC_TIME_REGEX
};