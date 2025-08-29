
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dns = require('dns');
const validUrl = require('valid-url');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve frontend (index.html + CSS)
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/urlshortener', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// URL Schema & Model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const Url = mongoose.model('Url', urlSchema);

// Home route
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST /api/shorturl → create short URL
app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;

  if (!validUrl.isWebUri(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  const urlObj = new URL(originalUrl);
  dns.lookup(urlObj.hostname, async (err) => {
    if (err) return res.json({ error: 'invalid url' });

    try {
      let foundUrl = await Url.findOne({ original_url: originalUrl });
      if (foundUrl) {
        return res.json({
          original_url: foundUrl.original_url,
          short_url: foundUrl.short_url
        });
      }

      const count = await Url.countDocuments({});
      const newUrl = new Url({
        original_url: originalUrl,
        short_url: count + 1
      });
      await newUrl.save();

      res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// GET /api/shorturl/:short_url → redirect to original URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  try {
    const shortUrl = req.params.short_url;
    const url = await Url.findOne({ short_url: shortUrl });
    if (!url) return res.json({ error: 'No short URL found' });
    res.redirect(url.original_url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
