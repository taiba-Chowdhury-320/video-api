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
      status: "Online",
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

    // API 1: YouTube Video FAST Downloader
    try {
      const { data } = await axios.get(
        `https://youtube-video-fast-downloader-24-7.p.rapidapi.com/get-videos-info/${videoID}`,
        {
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "youtube-video-fast-downloader-24-7.p.rapidapi.com",
          },
          timeout: 20000,
        }
      );

      if (data) {
        // Find 720p or best quality
        let downloadUrl = null;
        let quality = "720p";
        let title = data.title || "Unknown";

        if (data.formats) {
          const fmt = data.formats.find(f => f.qualityLabel === "720p" && f.mimeType && f.mimeType.includes("video/mp4"))
            || data.formats.find(f => f.mimeType && f.mimeType.includes("video/mp4"))
            || data.formats[0];
          if (fmt) {
            downloadUrl = fmt.url;
            quality = fmt.qualityLabel || "720p";
          }
        } else if (data.url) {
          downloadUrl = data.url;
        } else if (data.downloadUrl) {
          downloadUrl = data.downloadUrl;
        }

        if (downloadUrl) {
          return res.status(200).json({
            success: true,
            owner: API_OWNER,
            videoID,
            title,
            thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
            quality,
            downloadLink: downloadUrl,
            format: "mp4",
          });
        }
      }
    } catch (e) { /* try next */ }

    // API 2: YouTube MP36 (MP3 fallback)
    try {
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
      if (data && data.link) {
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
      }
    } catch (e) { /* failed */ }

    return res.status(500).json({
      success: false,
      owner: API_OWNER,
      error: "All APIs failed. Try again.",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      owner: API_OWNER,
      error: err.message || "Internal server error",
    });
  }
};
