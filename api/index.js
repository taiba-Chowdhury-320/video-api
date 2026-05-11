// api/index.js
// Owner: Rocky Chowdhury

const axios = require("axios");

const API_OWNER = "Rocky Chowdhury";
const RAPIDAPI_KEY = "59e10dd197mshb490a9bab23a36dp102ad9jsna74fceef3523";

function getVideoID(url) {
  const checkurl =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
  const match = url.match(checkurl);
  return match ? match[1] : null;
}

async function searchYoutube(query) {
  const searchQuery = query + " song";
  const { data: html } = await axios.get(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    }
  );
  const match = html.match(/\/watch\?v=([\w-]{11})/);
  if (!match) throw new Error("No video found for: " + query);
  return match[1];
}

module.exports = async (req, res) => {
  const { url, query } = req.query;

  if (!url && !query) {
    return res.status(200).json({
      name: "Video API",
      owner: API_OWNER,
      status: "🟢 Online",
      examples: {
        search: "/api/index?query=shape+of+you",
        url: "/api/index?url=https://youtu.be/JGwWNGJdvx8",
      },
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
      videoID = await searchYoutube(query);
    }

    // Get Video Download URL
    const { data } = await axios.get(
      `https://youtube-video-fast-downloader-24-7.p.rapidapi.com/get-video-download-url`,
      {
        params: {
          videoId: videoID,
          quality: "720",
        },
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "youtube-video-fast-downloader-24-7.p.rapidapi.com",
          "Content-Type": "application/json",
        },
        timeout: 25000,
      }
    );

    if (!data || !data.downloadUrl) {
      return res.status(500).json({
        success: false,
        owner: API_OWNER,
        error: "Download URL not found",
      });
    }

    return res.status(200).json({
      success: true,
      owner: API_OWNER,
      videoID,
      title: data.title || "Unknown Title",
      thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
      quality: data.quality || "720p",
      downloadLink: data.downloadUrl,
      format: "mp4",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      owner: API_OWNER,
      error: err.message || "Internal server error",
    });
  }
};
