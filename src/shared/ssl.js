const fs = require("fs");

const domain = "commonwealth.zubatomic.com";
const path = `/etc/letsencrypt/live/${domain}`;

let https = true;

try {
  if (!fs.existsSync(`${path}/privkey.pem`)) {
    https = false;
  }
} catch {
  https = false;
}

if (https) {

  console.log("[ssl] HTTPS");

  const files = {
    cert: fs.readFileSync(`${path}/cert.pem`),
    chain: fs.readFileSync(`${path}/chain.pem`),
    fullchain: fs.readFileSync(`${path}/fullchain.pem`),
    privkey: fs.readFileSync(`${path}/privkey.pem`),
  }
  
  module.exports = {
    expressSSLConfig: {
      key: files.privkey,
      cert: files.fullchain,
    },
    allSSLConfig: files,
    usingHttps: https
  }

} else {
  module.exports = {
    usingHttps: https
  }
}