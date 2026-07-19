import fs from 'fs';

let content = fs.readFileSync('src/services/gemini.js', 'utf8');

const oldFunc = `async function callProxy(prompt, mimeType = null, audioData = null) {
  const payload = { prompt };
  if (mimeType && audioData) {
    payload.mimeType = mimeType;
    payload.audioData = audioData;
  }
  
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = \`API Proxy error (\${response.status})\`;
    try {
      const err = await response.json();
      
      // Handle the massive 429 Gemini Quota error cleanly
      if (response.status === 429 || (err.error && typeof err.error === 'string' && err.error.includes('429'))) {
        errMsg = "Google AI Free Tier rate limit reached. Please wait about 30 seconds and try again.";
      } else {
        errMsg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
      }
    } catch (e) {
      // Fallback
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.text;
}`;

const newFunc = `async function callProxy(prompt, mimeType = null, audioData = null) {
  const payload = { prompt };
  if (mimeType && audioData) {
    payload.mimeType = mimeType;
    payload.audioData = audioData;
  }
  
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (!response.ok) {
      throw new Error(\`API Proxy error (\${response.status}): \${text.substring(0, 100)}\`);
    }
    throw new Error(\`Invalid JSON from server. Status: \${response.status}. Body: \${text.substring(0, 100)}\`);
  }

  if (!response.ok) {
    let errMsg = \`API Proxy error (\${response.status})\`;
    if (response.status === 429 || (data.error && typeof data.error === 'string' && data.error.includes('429'))) {
      errMsg = "Google AI Free Tier rate limit reached. Please wait about 30 seconds and try again.";
    } else {
      errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    }
    throw new Error(errMsg);
  }

  return data.text;
}`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync('src/services/gemini.js', content, 'utf8');
console.log("Fixed callProxy");
