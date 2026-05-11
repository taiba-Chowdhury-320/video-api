// index.js
// Owner: Rocky Chowdhury
// Main Entry Point

const express = require("express");
const videoHandler = require("./video");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({
    name: "Video API",
    owner: "Rocky Chowdhury",
    version: "1.0.0",
    status: "🟢 Online",
    endpoints: {
      video_by_url: "/api/video?url=YOUTUBE_URL",
      video_by_search: "/api/video?query=SONG_NAME",
      video_mp3: "/api/video?query=SONG_NAME&format=mp3",
    },
    examples: {
      search: "/api/video?query=shape+of+you",
      url: "/api/video?url=https://youtu.be/JGwWNGJdvx8",
    },
    author: "Rocky Chowdhury",
    description: "YouTube Video & Audio Download API",
  });
});

// Video API route
app.get("/api/video", videoHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    owner: "Rocky Chowdhury",
    error: "Route not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Video API by Rocky Chowdhury running on port ${PORT}`);
});

module.exports = app;
