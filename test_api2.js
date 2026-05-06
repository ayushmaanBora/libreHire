const http = require('http');

const data = JSON.stringify({
  searchMode: 'deterministic',
  jobProfile: 'Systems / Kernel',
  languages: ['C', 'C++', 'Rust'],
  country: 'India',
  state: 'Karnataka',
  city: 'Bangalore',
  githubToken: ''
});

const req = http.request('http://localhost:3000/api/hunt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', body.substring(0, 500)));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
