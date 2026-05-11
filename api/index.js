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
  try {
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
  } catch (err) {
    throw new Error("Search failed: " + err.message);
  }
}

async function getMP3(videoID) {
  // Try RapidAPI youtube-mp36
  try {
    const { data } = await axios.get(
      `https://youtube-mp36.p.rapidapi.com/dl?id=${videoID}`,
      {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "youtube-mp36.p.rapidapi.com",
        },
        timeout: 25000,
      }
    );
    if (data && data.link) return { title: data.title, link: data.link };
    throw new Error("No link");
  } catch {
    // Fallback: cobalt API
    const { data } = await axios.post(
      "https://api.cobalt.tools/api/json",
      {
        url: `https://www.youtube.com/watch?v=${videoID}`,
        vCodec: "h264",
        vQuality: "720",
        aFormat: "mp3",
        isAudioOnly: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 20000,
      }
    );
    if (data && data.url) return { title: data.filename || "audio", link: data.url };
    throw new Error("All APIs failed");
  }
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

    const mp3data = await getMP3(videoID);

    if (!mp3data || !mp3data.link) {
      return res.status(500).json({
        success: false,
        owner: API_OWNER,
        error: "Download link not found.",
      });
    }

    return res.status(200).json({
      success: true,
      owner: API_OWNER,
      videoID,
      title: mp3data.title || "Unknown Title",
      thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
      quality: "128kbps",
      downloadLink: mp3data.link,
      format: "mp3",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      owner: API_OWNER,
      error: err.message || "Internal server error",
    });
  }
};
