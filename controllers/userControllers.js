const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const EventHub = require('../models/userModels');

const COOKIE = 'eventhub_session';
const secret = () => process.env.SESSION_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : '');
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (value) => crypto.createHmac('sha256', secret()).update(value).digest('base64url');

const readSession = (req) => {
    const raw = (req.headers.cookie || '').split('; ').find((item) => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!raw || !secret()) return null;
    const [payload, signature] = raw.split('.');
    const expected = sign(payload);
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.exp > Date.now() ? session : null;
};

const writeSession = (res, usuario) => {
    if (!secret()) throw new Error('SESSION_SECRET nao configurado');
    const payload = encode({ id: usuario.id, nome: usuario.nome, papel: usuario.papel, exp: Date.now() + 7 * 86400000 });
    res.setHeader('Set-Cookie', `${COOKIE}=${payload}.${sign(payload)}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
};

const eventoPayload = (body) => ({
    titulo: (body.titulo || '').trim(),
    descricao: (body.descricao || '').trim(),
    local: (body.local || '').trim(),
    dataEvento: body.data_evento,
    vagas: Number(body.vagas)
});

const eventoInvalido = (evento) => !evento.titulo || !evento.descricao || !evento.local || !evento.dataEvento || !Number.isInteger(evento.vagas) || evento.vagas < 1;
const renderError = (res, view, status, error, data = {}) => res.status(status).render(view, { ...data, error });

/** @async @param {import('express').Request} req @param {import('express').Response} res @returns {Promise<void>} @throws {Error} Falha de banco. */
exports.index = async (req, res) => {
    try {
        res.render('index', { eventos: await EventHub.listEventos(), error: null, sucesso: req.query.sucesso });
    } catch (error) {
        console.error('Erro ao listar eventos:', error.message);
        renderError(res, 'index', 500, 'Nao foi possivel carregar os eventos.', { eventos: [], sucesso: null });
    }
};

exports.session = (req, res, next) => {
    try { req.usuario = readSession(req); } catch { req.usuario = null; }
    res.locals.usuario = req.usuario;
    next();
};

exports.requireRole = (papel) => (req, res, next) => req.usuario?.papel === papel ? next() : res.redirect('/login?erro=Acesso restrito');
exports.loginPage = (req, res) => res.render('login', { error: req.query.erro });
exports.registerPage = (req, res) => res.render('cadastro', { error: null });

/** @async @param {import('express').Request} req @param {import('express').Response} res @returns {Promise<void>} @throws {Error} Falha de cadastro. */
exports.register = async (req, res) => {
    const usuario = { nome: (req.body.nome || '').trim(), email: (req.body.email || '').trim().toLowerCase(), papel: req.body.papel };
    if (!usuario.nome || !/^\S+@\S+\.\S+$/.test(usuario.email) || !['organizador', 'participante'].includes(usuario.papel) || String(req.body.senha || '').length < 6) {
        return renderError(res, 'cadastro', 400, 'Preencha os campos corretamente; a senha deve ter ao menos 6 caracteres.');
    }
    try {
        const criado = await EventHub.createUsuario({ ...usuario, senhaHash: await bcrypt.hash(req.body.senha, 10) });
        writeSession(res, criado);
        res.redirect('/?sucesso=Cadastro realizado');
    } catch (error) {
        console.error('Erro ao cadastrar:', error.message);
        renderError(res, 'cadastro', error.code === 'ER_DUP_ENTRY' ? 409 : 500, error.code === 'ER_DUP_ENTRY' ? 'E-mail ja cadastrado.' : 'Nao foi possivel cadastrar.');
    }
};

/** @async @param {import('express').Request} req @param {import('express').Response} res @returns {Promise<void>} @throws {Error} Falha de autenticacao. */
exports.login = async (req, res) => {
    try {
        const usuario = await EventHub.findUsuarioByEmail((req.body.email || '').trim().toLowerCase());
        if (!usuario || !(await bcrypt.compare(req.body.senha || '', usuario.senha_hash))) return renderError(res, 'login', 401, 'E-mail ou senha invalidos.');
        writeSession(res, usuario);
        res.redirect('/?sucesso=Login realizado');
    } catch (error) {
        console.error('Erro ao entrar:', error.message);
        renderError(res, 'login', 500, 'Nao foi possivel entrar.');
    }
};

exports.logout = (req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
    res.redirect('/');
};

/** @async @param {import('express').Request} req @param {import('express').Response} res @returns {Promise<void>} @throws {Error} Falha ao carregar evento. */
exports.details = async (req, res) => {
    try {
        const evento = await EventHub.findEventoById(req.params.id);
        if (!evento) return res.status(404).render('erro', { mensagem: 'Evento nao encontrado.' });
        res.render('evento-detalhes', { evento, error: req.query.erro, sucesso: req.query.sucesso });
    } catch (error) {
        console.error('Erro ao abrir evento:', error.message);
        res.status(500).render('erro', { mensagem: 'Nao foi possivel carregar o evento.' });
    }
};

exports.newPage = (req, res) => res.render('evento-form', { evento: null, error: null });

/** @async @param {import('express').Request} req @param {import('express').Response} res @returns {Promise<void>} @throws {Error} Falha ao salvar evento. */
exports.createEvent = async (req, res) => {
    const evento = eventoPayload(req.body);
    if (eventoInvalido(evento)) return renderError(res, 'evento-form', 400, 'Preencha todos os campos corretamente.', { evento: req.body });
    try {
        const id = await EventHub.createEvento({ ...evento, organizadorId: req.usuario.id });
        res.redirect(`/eventos/${id}?sucesso=Evento criado`);
    } catch (error) {
        console.error('Erro ao criar evento:', error.message);
        renderError(res, 'evento-form', 500, 'Nao foi possivel criar o evento.', { evento: req.body });
    }
};

exports.editPage = async (req, res) => {
    try {
        const evento = await EventHub.findEventoById(req.params.id);
        if (!evento || Number(evento.organizador_id) !== Number(req.usuario.id)) return res.status(404).render('erro', { mensagem: 'Evento nao encontrado.' });
        res.render('evento-form', { evento, error: null });
    } catch (error) {
        console.error('Erro ao editar evento:', error.message);
        res.status(500).render('erro', { mensagem: 'Nao foi possivel carregar o evento.' });
    }
};

exports.updateEvent = async (req, res) => {
    const evento = eventoPayload(req.body);
    if (eventoInvalido(evento)) return renderError(res, 'evento-form', 400, 'Preencha todos os campos corretamente.', { evento: { ...req.body, id: req.params.id } });
    try {
        if (!(await EventHub.updateEvento(req.params.id, evento, req.usuario.id))) return res.status(404).render('erro', { mensagem: 'Evento nao encontrado.' });
        res.redirect(`/eventos/${req.params.id}?sucesso=Evento atualizado`);
    } catch (error) {
        console.error('Erro ao atualizar evento:', error.message);
        renderError(res, 'evento-form', 500, 'Nao foi possivel atualizar o evento.', { evento: { ...req.body, id: req.params.id } });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        await EventHub.deleteEvento(req.params.id, req.usuario.id);
        res.redirect('/?sucesso=Evento excluido');
    } catch (error) {
        console.error('Erro ao excluir evento:', error.message);
        res.status(500).render('erro', { mensagem: 'Nao foi possivel excluir o evento.' });
    }
};

exports.enroll = async (req, res) => {
    try {
        await EventHub.createInscricao(req.params.id, req.usuario.id);
        res.redirect(`/eventos/${req.params.id}?sucesso=Inscricao confirmada`);
    } catch (error) {
        console.error('Erro ao inscrever:', error.message);
        const mensagem = error.code === 'ER_DUP_ENTRY' ? 'Voce ja esta inscrito neste evento.' : error.message;
        res.redirect(`/eventos/${req.params.id}?erro=${encodeURIComponent(mensagem)}`);
    }
};
