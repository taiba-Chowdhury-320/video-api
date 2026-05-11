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
      const results = await searchYoutube(query);
      if (!results.length) {
        return res.status(404).json({
          success: false,
          owner: API_OWNER,
          error: "No video found",
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
        error: "Download link not found",
      });
    }

    return res.status(200).json({
      success: true,
      owner: API_OWNER,
      videoID,
      title: data.title || "Unknown",
      thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
      quality: "128kbps",
      downloadLink: data.link,
      format: "mp3",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      owner: API_OWNER,
      error: err.message,
    });
  }
};
