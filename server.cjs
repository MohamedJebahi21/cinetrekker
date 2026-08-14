const http = require('http'); const fs = require('fs'); http.createServer((req, res) => { res.writeHead(200); fs.createReadStream('cinetrekker.tar.gz').pipe(res); }).listen(8002);
