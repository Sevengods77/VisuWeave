const express = require("express");
const path = require("path");
const app = express();

// Serve images from /public/images directory
app.use("/images", express.static(path.join(__dirname, "public/images")));

app.listen(5000, () => {
  console.log("Server running at http://localhost:5000");
});

