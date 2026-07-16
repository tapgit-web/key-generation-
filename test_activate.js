const https = require('https');

const data = JSON.stringify({
  key: "TEST-KEY-1234",
  hwid: "TEST-HWID"
});

const options = {
  hostname: 'key-generation-wuh2.onrender.com',
  path: '/activate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => { resData += chunk; });
  res.on('end', () => {
    console.log('Live Server Response:', resData);
  });
});

req.write(data);
req.end();
