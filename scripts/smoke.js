process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'smoke-secret';
const assert = require('node:assert/strict');
const http = require('node:http');
const bcrypt = require('bcryptjs');
const model = require('../models/userModels');

const evento = { id: 1, titulo: 'Encontro de Tecnologia', descricao: 'Conteudo do evento', local: 'Auditorio', data_evento: new Date('2027-01-10T14:00:00Z'), vagas: 30, inscritos: 2, vagas_disponiveis: 28, organizador: 'Organizador', organizador_id: 1 };
model.listEventos = async () => [evento];
model.findEventoById = async () => evento;
model.findUsuarioByEmail = async () => ({ id: 1, nome: 'Organizador', email: 'org@example.com', papel: 'organizador', senha_hash: bcrypt.hashSync('123456', 4) });
model.createEvento = async () => 1;
model.updateEvento = async () => true;
model.deleteEvento = async () => true;
const app = require('../server');

const request = (port, path, options = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, ...options }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, location: res.headers.location, body }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
});

(async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    try {
        const port = server.address().port;
        const [version, home, details, cadastro, protectedPage] = await Promise.all([
            request(port, '/version'), request(port, '/'), request(port, '/eventos/1'), request(port, '/cadastro'), request(port, '/eventos/novo')
        ]);
        assert.equal(version.status, 200);
        assert.match(version.body, /EventHub/);
        assert.equal(home.status, 200);
        assert.match(home.body, /Encontro de Tecnologia/);
        assert.equal(details.status, 200);
        assert.match(details.body, /Auditorio/);
        assert.equal(cadastro.status, 200);
        assert.match(cadastro.body, /Crie sua conta/);
        assert.equal(protectedPage.status, 302);
        assert.match(protectedPage.location, /^\/login/);
        const login = await request(port, '/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'email=org%40example.com&senha=123456' });
        const cookie = login.headers['set-cookie'][0].split(';')[0];
        assert.match(login.headers['set-cookie'][0], /HttpOnly/);
        assert.equal((await request(port, '/eventos/novo', { headers: { Cookie: cookie } })).status, 200);
        assert.equal((await request(port, '/eventos', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'titulo=Evento&descricao=Descricao&local=Sala&data_evento=2027-01-10T10%3A00&vagas=20' })).status, 302);
        assert.equal((await request(port, '/eventos/1/editar', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'titulo=Evento&descricao=Descricao&local=Sala&data_evento=2027-01-10T10%3A00&vagas=20' })).status, 302);
        assert.equal((await request(port, '/eventos/1/excluir', { method: 'POST', headers: { Cookie: cookie } })).status, 302);
        console.log('smoke ok');
    } finally { server.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
