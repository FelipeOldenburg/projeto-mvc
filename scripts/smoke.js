const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

const request = (port, path) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path }, (res) => {
        let raw = '';

        res.on('data', (chunk) => {
            raw += chunk;
        });

        res.on('end', () => {
            resolve({ status: res.statusCode, body: raw });
        });
    });

    req.on('error', reject);
    req.end();
});

(async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));

    try {
        const port = server.address().port;
        const response = await request(port, '/version');
        const home = await request(port, '/');
        const about = await request(port, '/about');
        const contato = await request(port, '/contato');

        assert.equal(response.status, 200);
        assert.match(response.body, /version: 1\.0\.0/);
        assert.equal(home.status, 200);
        assert.match(home.body, /Loja organizada/);
        assert.equal(about.status, 200);
        assert.match(about.body, /Projeto MVC/);
        assert.equal(contato.status, 200);
        assert.match(contato.body, /Canais da loja/);

        console.log('smoke ok');
    } finally {
        server.close();
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
