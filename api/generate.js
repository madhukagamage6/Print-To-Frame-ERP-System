import { GoogleGenAI } from '@google/genai';

// Only real, production Gemini models — ordered by preference
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

// Vercel Serverless max body ≈ 4.5MB. Base64 inflates binary by ~33%.
// So raw audio files larger than ~3.3MB will exceed the limit.
const MAX_AUDIO_BASE64_LENGTH = 4_500_000;

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

    // Validate audio payload size before sending to Gemini
    if (audioData && audioData.length > MAX_AUDIO_BASE64_LENGTH) {
      const sizeMB = (audioData.length / 1_000_000).toFixed(1);
      console.error(`Audio payload too large: ${sizeMB}MB (max ~4.5MB base64)`);
      return res.status(413).json({
        error: `Audio file is too large (${sizeMB}MB encoded). Please compress or use a shorter recording (under 3MB).`
      });
    }

    // Validate MIME type for audio payloads
    const SUPPORTED_AUDIO_TYPES = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
      'audio/aac', 'audio/flac'
    ];
    if (audioData && mimeType && !SUPPORTED_AUDIO_TYPES.includes(mimeType)) {
      console.warn(`Unsupported audio MIME type received: ${mimeType}`);
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

    // Try candidate models with proper error differentiation
    let lastError = null;
    let lastErrorStatus = 502;
    let responseText = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        console.log(`Attempting model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents,
        });

        if (response && response.text) {
          console.log(`Success with model: ${model}`);
          responseText = response.text;
          break;
        }
      } catch (err) {
        lastError = err;
        const errMsg = err.message || '';
        console.warn(`Model ${model} failed: ${errMsg}`);

        // If this is a data/validation error (400), don't try other models
        // — the same bad payload will fail on all of them
        if (errMsg.includes('400') || errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('Bad Request')) {
          lastErrorStatus = 400;
          console.error(`Data validation error on ${model} — skipping remaining models`);
          break;
        }

        // For 503/429 (transient), continue to next model
        if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          lastErrorStatus = 503;
          continue;
        }

        // For other errors, record and continue
        lastErrorStatus = 502;
      }
    }

    if (responseText) {
      return res.status(200).json({ text: responseText });
    }

    // Return the REAL error with its actual status code — not a blanket 503
    const errorMsg = lastError?.message || 'All AI models failed. Please try again.';
    console.error(`All models failed [${lastErrorStatus}]: ${errorMsg}`);
    return res.status(lastErrorStatus).json({ error: errorMsg });

  } catch (err) {
    console.error('API Proxy Error:', err.message);
    res.status(502).json({ error: err.message });
  }
}

