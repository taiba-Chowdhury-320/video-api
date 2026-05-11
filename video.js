// video.js
// Owner: Rocky Chowdhury
// Video Download API

const axios = require("axios");

const API_OWNER = "Rocky Chowdhury";
const API_NAME = "Video API";

// YouTube Video ID extractor
function getVideoID(url) {
  const checkurl =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
  const match = url.match(checkurl);
  return match ? match[1] : null;
}

// YouTube Search
async function searchYoutube(query) {
  try {
    const response = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    );
    const html = response.data;
    const videoIDs = [...html.matchAll(/\/watch\?v=([\w-]{11})/g)].map(
      (m) => m[1]
    );
    const unique = [...new Set(videoIDs)];
    return unique.slice(0, 10);
  } catch (err) {
    throw new Error("YouTube search failed: " + err.message);
  }
}

// Main video download handler
async function handleVideoRequest(req, res) {
  const { url, query, format = "mp4" } = req.query;

  if (!url && !query) {
    return res.status(400).json({
      success: false,
      owner: API_OWNER,
      api: API_NAME,
      error: "Please provide 'url' or 'query' parameter",
      example1: "/api/video?url=https://youtu.be/VIDEO_ID",
      example2: "/api/video?query=song+name",
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
      videoID = results[Math.floor(Math.random() * results.length)];
    }

    // Fetch download link
    const apiBase = "https://api.agatz.xyz/api";
    const { data } = await axios.get(
      `${apiBase}/ytdlp?url=https://www.youtube.com/watch?v=${videoID}&format=${format}`
    );

    if (!data || !data.data) {
      return res.status(500).json({
        success: false,
        owner: API_OWNER,
        error: "Failed to fetch download link",
      });
    }

    const result = data.data;

    return res.status(200).json({
      success: true,
      owner: API_OWNER,
      api: API_NAME,
      videoID,
      title: result.title || "Unknown Title",
      thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
      duration: result.duration || "N/A",
      quality: result.quality || format,
      downloadLink: result.url || result.downloadLink,
      format,
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
