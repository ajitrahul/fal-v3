import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory containing JSON files
const inputDir = path.join(__dirname, 'batches'); // adjust as needed
const outputFile = path.join(__dirname, 'data/extracted.txt');

const extractFields = async () => {
  const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.json'));
  const outputLines = [];

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      const json = JSON.parse(content);
      const { name, website_url, slug } = json;

      if (name && website_url && slug) {
        const formatted = `{ "name":"${name}", "website_url":"${website_url}", "slug":"${slug}" }`;
        outputLines.push(formatted);
      }
    } catch (err) {
      console.error(`❌ Error parsing ${file}:`, err.message);
    }
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf-8');
  console.log(`✅ Extracted ${outputLines.length} entries to ${outputFile}`);
};

extractFields();
