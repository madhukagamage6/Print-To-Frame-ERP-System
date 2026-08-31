import { GoogleGenAI } from '@google/genai';

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-3.7-flash'
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on the server' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { prompt, mimeType, audioData } = req.body || {};
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing "prompt" field in request body' });
    }

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    
    if (mimeType && audioData) {
      contents[0].parts.push({
        inlineData: {
          mimeType: mimeType,
          data: audioData
        }
      });
    }

    let lastError = null;
    let responseText = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} unavailable (${err.message}). Trying fallback...`);
      }
    }

    if (responseText) {
      return res.status(200).json({ text: responseText });
    }

    const errorMsg = lastError?.message || 'Gemini models temporarily unavailable. Please try again shortly.';
    console.error('All Gemini candidate models failed:', errorMsg);
    return res.status(503).json({ error: errorMsg });

  } catch (err) {
    console.error('API Proxy Error:', err.message);
    res.status(502).json({ error: err.message });
  }
}
