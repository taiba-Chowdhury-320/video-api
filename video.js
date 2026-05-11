// video.js
// Owner: Rocky Chowdhury
// Video Download API

const axios = require("axios");

const API_OWNER = "Rocky Chowdhury";
const API_NAME = "Video API";

function getVideoID(url) {
  const checkurl =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
  const match = url.match(checkurl);
  return match ? match[1] : null;
}

async function getBaseApi() {
  const { data } = await axios.get(
    "https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json"
  );
  return data.api;
}

async function searchYoutube(query) {
  try {
    const response = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 10000,
      }
    );
    const html = response.data;
    const videoIDs = [...html.matchAll(/\/watch\?v=([\w-]{11})/g)].map(
      (m) => m[1]
    );
    return [...new Set(videoIDs)].slice(0, 10);
  } catch (err) {
    throw new Error("YouTube search failed: " + err.message);
  }
}

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

    // Use diptoApi - same as original bot
    const baseApi = await getBaseApi();
    const { data } = await axios.get(
      `${baseApi}/ytDl3?link=${videoID}&format=${format}`,
      { timeout: 15000 }
    );

    if (!data || !data.downloadLink) {
      return res.status(500).json({
        success: false,
        owner: API_OWNER,
        error: "Download link not found",
      });
    }

    return res.status(200).json({
      success: true,
      owner: API_OWNER,
      api: API_NAME,
      videoID,
      title: data.title || "Unknown Title",
      thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
      quality: data.quality || format,
      downloadLink: data.downloadLink,
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
