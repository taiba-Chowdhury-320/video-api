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

async function getVideoMP4(videoID) {
  // Try RapidAPI YouTube MP4 downloader
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
    if (data && data.link) {
      return { title: data.title, link: data.link, quality: "128kbps", format: "mp3" };
    }
    throw new Error("No link");
  } catch (e) {
    throw new Error("Download failed: " + e.message);
  }
}

module.exports = async (req, res) => {
  const { url, query, format = "mp4" } = req.query;

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

    // Try multiple download APIs
    let downloadLink, title, quality, fmt;

    // API 1: y2mate
    try {
      const { data } = await axios.post(
        "https://www.y2mate.com/mates/analyzeV2/ajax",
        `k_query=https://www.youtube.com/watch?v=${videoID}&k_page=home&hl=en&q_auto=1`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
          },
          timeout: 15000,
        }
      );
      if (data && data.links && data.links.mp4) {
        const qualities = Object.values(data.links.mp4);
        const best = qualities.find(q => q.q === "720p") || qualities[0];
        if (best && best.k) {
          const { data: dl } = await axios.post(
            "https://www.y2mate.com/mates/convertV2/index",
            `vid=${videoID}&k=${best.k}`,
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0",
              },
              timeout: 15000,
            }
          );
          if (dl && dl.dlink) {
            downloadLink = dl.dlink;
            title = data.title;
            quality = best.q || "720p";
            fmt = "mp4";
          }
        }
      }
    } catch (e) { /* try next */ }

    // API 2: savefrom style
    if (!downloadLink) {
      try {
        const { data } = await axios.get(
          `https://api.vevioz.com/api/button/mp4/720/${videoID}`,
          { timeout: 15000 }
        );
        if (data && data.url) {
          downloadLink = data.url;
          title = data.title || "Video";
          quality = "720p";
          fmt = "mp4";
        }
      } catch (e) { /* try next */ }
    }

    // API 3: RapidAPI YouTube Video
    if (!downloadLink) {
      try {
        const { data } = await axios.get(
          `https://youtube-video-download-info.p.rapidapi.com/dl?id=${videoID}`,
          {
            headers: {
              "x-rapidapi-key": RAPIDAPI_KEY,
              "x-rapidapi-host": "youtube-video-download-info.p.rapidapi.com",
            },
            timeout: 20000,
          }
        );
        if (data && data.link && data.link["137"]) {
          downloadLink = data.link["137"][0];
          title = data.title;
          quality = "1080p";
          fmt = "mp4";
        } else if (data && data.link && data.link["22"]) {
          downloadLink = data.link["22"][0];
          title = data.title;
          quality = "720p";
          fmt = "mp4";
        }
      } catch (e) { /* try next */ }
    }

    // Fallback: MP3 via RapidAPI
    if (!downloadLink) {
      const mp3 = await getVideoMP4(videoID);
      downloadLink = mp3.link;
      title = mp3.title;
      quality = mp3.quality;
      fmt = "mp3";
    }

    return res.status(200).json({
      success: true,
      owner: API_OWNER,
      videoID,
      title: title || "Unknown Title",
      thumbnail: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
      quality: quality || "720p",
      downloadLink,
      format: fmt || "mp4",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      owner: API_OWNER,
      error: err.message || "Internal server error",
    });
  }
};
