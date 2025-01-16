const fs = require('fs');
const path = require('path');

const directories = [
  'Vente/components',
  'Vente/api.tsx',
  'Vente/app'
];

const isCodeLine = (line) => {
  const trimmedLine = line.trim();
  return trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*') && !trimmedLine.startsWith('*');
};

const countLines = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  return lines.filter(isCodeLine).length;
};

const processDirectory = (dirPath) => {
  let totalLines = 0;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalLines += processDirectory(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      totalLines += countLines(filePath);
    }
  });

  return totalLines;
};

const main = () => {
  let totalLines = 0;

  directories.forEach((dir) => {
    const stat = fs.statSync(dir);

    if (stat.isDirectory()) {
      totalLines += processDirectory(dir);
    } else if (stat.isFile()) {
      totalLines += countLines(dir);
    }
  });

  console.log(`Total effective lines of code: ${totalLines}`);
};

main();