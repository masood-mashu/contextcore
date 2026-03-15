const http = require('http');

const body = JSON.stringify({
  mood: 4,
  energy: 3,
  note: 'building contextcore'
});

const options = {
  hostname: '127.0.0.1',
  port: 7337,
  path: '/mood',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-ContextCore-Token': 'cc-dev-token-2024',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.write(body);
req.end();