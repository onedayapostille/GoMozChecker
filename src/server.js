import express from 'express';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MozApiService } from './mozApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_PATH = join(__dirname, '..', 'moz-config.json');

const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/api/config', (req, res) => {
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    const hasCredentials = config.accessId &&
                          config.secretKey &&
                          config.accessId !== 'YOUR_MOZ_ACCESS_ID' &&
                          config.secretKey !== 'YOUR_MOZ_SECRET_KEY';

    res.json({
      configured: hasCredentials,
      accessId: hasCredentials ? config.accessId.substring(0, 10) + '...' : null
    });
  } catch (error) {
    res.json({ configured: false });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const { accessId, secretKey } = req.body;

    if (!accessId || !secretKey) {
      return res.status(400).json({
        error: 'Both Access ID and Secret Key are required'
      });
    }

    if (accessId.trim().length < 10 || secretKey.trim().length < 10) {
      return res.status(400).json({
        error: 'Invalid credentials format'
      });
    }

    const config = {
      accessId: accessId.trim(),
      secretKey: secretKey.trim()
    };

    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    res.json({
      success: true,
      message: 'Credentials saved successfully'
    });

  } catch (error) {
    console.error('Config save error:', error);
    res.status(500).json({
      error: 'Failed to save credentials'
    });
  }
});

app.post('/api/check-urls', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: 'Please provide an array of URLs'
      });
    }

    if (urls.length > 1000) {
      return res.status(400).json({
        error: 'Maximum 1000 URLs allowed per request'
      });
    }

    const mozService = new MozApiService();
    const results = await mozService.checkUrls(urls);

    res.json({
      success: true,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process URLs'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Moz API server running on http://localhost:${PORT}`);
});
