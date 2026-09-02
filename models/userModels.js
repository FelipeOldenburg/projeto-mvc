const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eventhub',
    ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
    waitForConnections: true,
    connectionLimit: 10
});

const findUsuarioByEmail = async (email) => {
    const [rows] = await db.execute(
        'SELECT id, nome, email, senha_hash, papel FROM usuarios WHERE email = ? LIMIT 1',
        [email]
    );
    return rows[0];
};

const createUsuario = async ({ nome, email, senhaHash, papel }) => {
    const [result] = await db.execute(
        'INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)',
        [nome, email, senhaHash, papel]
    );
    return { id: result.insertId, nome, email, papel };
};

const listEventos = async () => {
    const [rows] = await db.execute(
        `SELECT e.id, e.titulo, e.descricao, e.local, e.data_evento, e.vagas,
                u.nome AS organizador, COUNT(i.id) AS inscritos,
                GREATEST(e.vagas - COUNT(i.id), 0) AS vagas_disponiveis
         FROM eventos e
         JOIN usuarios u ON u.id = e.organizador_id
         LEFT JOIN inscricoes i ON i.evento_id = e.id
         GROUP BY e.id, u.nome ORDER BY e.data_evento ASC`
    );
    return rows;
};

const findEventoById = async (id) => {
    const [rows] = await db.execute(
        `SELECT e.id, e.titulo, e.descricao, e.local, e.data_evento, e.vagas,
                e.organizador_id, u.nome AS organizador, COUNT(i.id) AS inscritos,
                GREATEST(e.vagas - COUNT(i.id), 0) AS vagas_disponiveis
         FROM eventos e
         JOIN usuarios u ON u.id = e.organizador_id
         LEFT JOIN inscricoes i ON i.evento_id = e.id
         WHERE e.id = ? GROUP BY e.id, u.nome LIMIT 1`,
        [id]
    );
    return rows[0];
};

const createEvento = async ({ titulo, descricao, local, dataEvento, vagas, organizadorId }) => {
    const [result] = await db.execute(
        'INSERT INTO eventos (titulo, descricao, local, data_evento, vagas, organizador_id) VALUES (?, ?, ?, ?, ?, ?)',
        [titulo, descricao, local, dataEvento, vagas, organizadorId]
    );
    return result.insertId;
};

const updateEvento = async (id, evento, organizadorId) => {
    const [result] = await db.execute(
        `UPDATE eventos SET titulo = ?, descricao = ?, local = ?, data_evento = ?, vagas = ?
         WHERE id = ? AND organizador_id = ?`,
        [evento.titulo, evento.descricao, evento.local, evento.dataEvento, evento.vagas, id, organizadorId]
    );
    return result.affectedRows > 0;
};

const deleteEvento = async (id, organizadorId) => {
    const [result] = await db.execute('DELETE FROM eventos WHERE id = ? AND organizador_id = ?', [id, organizadorId]);
    return result.affectedRows > 0;
};

const createInscricao = async (eventoId, participanteId) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [eventos] = await connection.execute('SELECT vagas FROM eventos WHERE id = ? FOR UPDATE', [eventoId]);
        if (!eventos[0]) throw Object.assign(new Error('Evento nao encontrado.'), { status: 404 });
        const [[ocupacao]] = await connection.execute('SELECT COUNT(*) AS inscritos FROM inscricoes WHERE evento_id = ?', [eventoId]);
        if (Number(ocupacao.inscritos) >= eventos[0].vagas) throw Object.assign(new Error('Este evento nao possui vagas.'), { status: 409 });
        await connection.execute('INSERT INTO inscricoes (evento_id, participante_id) VALUES (?, ?)', [eventoId, participanteId]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = { findUsuarioByEmail, createUsuario, listEventos, findEventoById, createEvento, updateEvento, deleteEvento, createInscricao };
