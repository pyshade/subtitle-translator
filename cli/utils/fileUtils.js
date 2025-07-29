const fs = require('fs');
const path = require('path');

function createOutputDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function processFiles(inputPath) {
  const files = [];
  
  function walkDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  
  if (fs.statSync(inputPath).isDirectory()) {
    walkDir(inputPath);
  } else {
    files.push(inputPath);
  }
  
  return files;
}

function isSubtitleFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.srt', '.ass', '.vtt', '.lrc'].includes(ext);
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  createOutputDir,
  processFiles,
  isSubtitleFile,
  getFileSize,
  formatFileSize
};