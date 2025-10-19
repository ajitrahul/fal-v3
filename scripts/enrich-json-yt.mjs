const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const API_KEY = 'YOUR_YOUTUBE_API_KEY'; // Replace with your actual key
const filePath = path.join(__dirname, 'tools.json');
const cachePath = path.join(__dirname, 'video_cache.json');

let cache = fs.existsSync(cachePath) ? fs.readJsonSync(cachePath) : {};

function extractQuery(url) {
  const match = url.match(/search_query=([^&]+)/);
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
}

async function fetchTopVideo(query) {
  if (cache[query]) return cache[query];

  const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${API_KEY}`;
  try {
    const response = await axios.get(apiUrl);
    const items = response.data.items;
    if (items && items.length > 0) {
      const videoUrl = `https://www.youtube.com/watch?v=${items[0].id.videoId}`;
      cache[query] = videoUrl;
      return videoUrl;
    }
  } catch (err) {
    console.error(`❌ Error fetching video for "${query}":`, err.message);
  }
  return null;
}

async function updateFile() {
  const data = await fs.readJson(filePath);
  const tools = data.tools || [];

  for (const tool of tools) {
    const url = tool.tutorial_url;
    if (url && url.includes('search_query=')) {
      const query = extractQuery(url);
      const videoUrl = await fetchTopVideo(query);
      if (videoUrl) {
        tool.tutorial_url = videoUrl;
        console.log(`🔄 Updated "${query}" → ${videoUrl}`);
      }
    }
  }

  await fs.writeJson(filePath, data, { spaces: 2 });
  await fs.writeJson(cachePath, cache, { spaces: 2 });

  console.log(`✅ tools.json updated in place`);
}

updateFile();
