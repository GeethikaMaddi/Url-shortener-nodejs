
import 'dotenv/config'; // Loads environment variables from .env
import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import dns from 'dns';
import validUrl from 'valid-url';

require("dotenv").config();
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/urlshortener', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// URL model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const Url = mongoose.model('Url', urlSchema);

// Home route
app.get('/', (_req, res) => {
  res.send('URL Shortener Microservice API');
});

// POST /api/shorturl
app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;

  // Validate URL
  if (!validUrl.isWebUri(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  const urlObj = new URL(originalUrl);
  dns.lookup(urlObj.hostname, async (err) => {
    if (err) return res.json({ error: 'invalid url' });

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
  });
});

// GET /api/shorturl/:short_url
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = req.params.short_url;
  const url = await Url.findOne({ short_url: shortUrl });
  if (!url) return res.json({ error: 'No short URL found' });
  res.redirect(url.original_url);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
