const fs = require('fs');
const http = require('http');

const audioData = fs.readFileSync('public/Test-Customer-Call-P2F-Kusumawathi-v2.mp3').toString('base64');
const data = JSON.stringify({ 
  prompt: 'Extract details', 
  mimeType: 'audio/mp3',
  audioData: audioData
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('BODY:', body.substring(0, 100));
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
