const express = require("express");
const videoHandler = require("./video");

const app = express();

app.use(express.json());

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
    }
  });
});

app.get("/api/video", videoHandler);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    owner: "Rocky Chowdhury",
    error: "Route not found",
  });
});

module.exports = app;
