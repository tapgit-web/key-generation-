const http = require('http');

const data = JSON.stringify({
  key: "TEST-KEY-1234",
  licenseType: "Lifetime",
  brandName: "Test"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/admin/add',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': 'admin-secret-token-12345',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => { resData += chunk; });
  res.on('end', () => {
    console.log('Local Server Response:', resData);
  });
});

req.write(data);
req.end();
