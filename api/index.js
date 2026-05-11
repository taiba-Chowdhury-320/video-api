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
      if (!videoID) return res.status(400).json({ success: false, owner: API_OWNER, error: "Invalid YouTube URL" });
    } else {
      videoID = await searchYoutube(query);
    }

    const ytURL = `https://www.youtube.com/watch?v=${videoID}`;

    // API 1: YouTube Video FAST Downloader - Get Video Download URL endpoint
    try {
      const { data } = await axios.get(
        `https://youtube-video-fast-downloader-24-7.p.rapidapi.com/get-video-download-url`,
        {
          params: { url: ytURL, quality: "720p" },
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "youtube-video-fast-downloader-24-7.p.rapidapi.com",
          },
          timeout: 20000,
        }
      );
      if (data && (data.url || data.downloadUrl || data.link)) {
        const dlLink = data.url || data.downloadUrl || data.link;
        return res.status(200).json({
          success: true,
          owner: API_OWNER,
          videoID,
          title: data.title || "Unknown Title",
          thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
          quality: data.quality || "720p",
          downloadLink: dlLink,
          format: "mp4",
        });
      }
    } catch (e) { /* try next */ }

    // API 2: YouTube Video FAST Downloader - different endpoint
    try {
      const { data } = await axios.get(
        `https://youtube-video-fast-downloader-24-7.p.rapidapi.com/get-video-info`,
        {
          params: { url: ytURL },
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "youtube-video-fast-downloader-24-7.p.rapidapi.com",
          },
          timeout: 20000,
        }
      );
      if (data) {
        let dlLink = null;
        let title = data.title || "Unknown";
        let quality = "720p";

        if (data.formats && Array.isArray(data.formats)) {
          const mp4 = data.formats.find(f => f.ext === "mp4" && f.height >= 480)
            || data.formats.find(f => f.ext === "mp4")
            || data.formats[0];
          if (mp4) { dlLink = mp4.url; quality = mp4.height ? mp4.height + "p" : "720p"; }
        } else if (data.url) dlLink = data.url;
        else if (data.downloadUrl) dlLink = data.downloadUrl;

        if (dlLink) {
          return res.status(200).json({
            success: true,
            owner: API_OWNER,
            videoID,
            title,
            thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
            quality,
            downloadLink: dlLink,
            format: "mp4",
          });
        }
      }
    } catch (e) { /* try next */ }

    // Fallback: MP3
    const { data: mp3 } = await axios.get(
      `https://youtube-mp36.p.rapidapi.com/dl?id=${videoID}`,
      {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "youtube-mp36.p.rapidapi.com",
        },
        timeout: 20000,
      }
    );

    if (mp3 && mp3.link) {
      return res.status(200).json({
        success: true,
        owner: API_OWNER,
        videoID,
        title: mp3.title || "Unknown",
        thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
        quality: "128kbps",
        downloadLink: mp3.link,
        format: "mp3",
      });
    }

    throw new Error("All APIs failed");

  } catch (err) {
    return res.status(500).json({
      success: false,
      owner: API_OWNER,
      error: err.message,
    });
  }
};
