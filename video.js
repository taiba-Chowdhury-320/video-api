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

async function searchYoutube(query) {
  try {
    const response = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
      }
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

async function getDownloadLink(videoID, format = "mp4") {
  const apis = [
    // API 1: yt-api.p.rapidapi style (free alternative)
    async () => {
      const { data } = await axios.get(
        `https://ytdl.vreden.web.id/ytdl?id=${videoID}&format=${format}`,
        { timeout: 10000 }
      );
      if (data && data.url) {
        return {
          title: data.title || "Unknown",
          quality: data.quality || format,
          downloadLink: data.url,
        };
      }
      throw new Error("No data");
    },
    // API 2: y2mate alternative
    async () => {
      const { data } = await axios.get(
        `https://api.siputzx.my.id/api/d/ytmp4?url=https://www.youtube.com/watch?v=${videoID}`,
        { timeout: 10000 }
      );
      if (data && data.data && data.data.dl) {
        return {
          title: data.data.title || "Unknown",
          quality: "720p",
          downloadLink: data.data.dl,
        };
      }
      throw new Error("No data");
    },
    // API 3: another free API
    async () => {
      const { data } = await axios.get(
        `https://api.nyxs.pw/dl/ytmp4?url=https://www.youtube.com/watch?v=${videoID}`,
        { timeout: 10000 }
      );
      if (data && data.result && data.result.dl_url) {
        return {
          title: data.result.title || "Unknown",
          quality: data.result.quality || "720p",
          downloadLink: data.result.dl_url,
        };
      }
      throw new Error("No data");
    },
  ];

  for (const apiFn of apis) {
    try {
      const result = await apiFn();
      if (result && result.downloadLink) return result;
    } catch (e) {
      continue;
    }
  }

  throw new Error("All download APIs failed");
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

    const result = await getDownloadLink(videoID, format);

    return res.status(200).json({
      success: true,
      owner: API_OWNER,
      api: API_NAME,
      videoID,
      title: result.title,
      thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
      quality: result.quality,
      downloadLink: result.downloadLink,
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
