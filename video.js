// video.js
// Owner: Rocky Chowdhury

const axios = require("axios");

const API_OWNER = "Rocky Chowdhury";
const API_NAME = "Video API";
const RAPIDAPI_KEY = "59e10dd197mshb490a9bab23a36dp102ad9jsna74fceef3523";

function getVideoID(url) {
  const checkurl =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
  const match = url.match(checkurl);
  return match ? match[1] : null;
}

async function searchYoutube(query) {
  try {
    const response = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 10000,
      }
    );
    const html = response.data;
    const videoIDs = [...html.matchAll(/\/watch\?v=([\w-]{11})/g)].map((m) => m[1]);
    return [...new Set(videoIDs)].slice(0, 10);
  } catch (err) {
    throw new Error("YouTube search failed: " + err.message);
  }
}

async function handleVideoRequest(req, res) {
  const { url, query, format = "mp3" } = req.query;

  if (!url && !query) {
    return res.status(400).json({
      success: false,
      owner: API_OWNER,
      api: API_NAME,
      error: "Please provide 'url' or 'query' parameter",
      example1: "/api/video?url=https://youtu.be/VIDEO_ID",
      example2: "/api/video?query=song+name",
      example3: "/api/video?query=song+name&format=mp3",
    });
  }

  try {
    let videoID;

    if (url) {
      videoID = getVideoID(url);
      if (!videoID) {
        return res.status(400).json({
          success: false,
          owner: API_OWNER,
          error: "Invalid YouTube URL",
        });
      }
    } else {
      const results = await searchYoutube(query);
      if (!results.length) {
        return res.status(404).json({
          success: false,
          owner: API_OWNER,
          error: "No video found for: " + query,
        });
      }
      videoID = results[0];
    }

    const { data } = await axios.get(
      `https://youtube-mp36.p.rapidapi.com/dl?id=${videoID}`,
      {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "youtube-mp36.p.rapidapi.com",
        },
        timeout: 20000,
      }
    );

    if (!data || !data.link) {
      return res.status(500).json({
        success: false,
        owner: API_OWNER,
        error: "Download link not found. Try again.",
      });
    }

    return res.status(200).json({
      success: true,
      owner: API_OWNER,
      api: API_NAME,
      videoID,
      title: data.title || "Unknown Title",
      thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
      quality: "128kbps",
      downloadLink: data.link,
      format: "mp3",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      owner: API_OWNER,
      error: err.message || "Internal server error",
    });
  }
}

module.exports = handleVideoRequest;
