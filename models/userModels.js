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

let schemaPromise;

/**
 * Inicializa o schema do EventHub quando o banco configurado ainda está vazio.
 * A criação é idempotente e não altera tabelas já existentes.
 */
const initializeSchema = async () => {
    if (process.env.NODE_ENV === 'test') return;
    if (!schemaPromise) {
        schemaPromise = (async () => {
            await db.execute(`CREATE TABLE IF NOT EXISTS usuarios (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(190) NOT NULL UNIQUE,
                senha_hash VARCHAR(100) NOT NULL,
                papel ENUM('organizador', 'participante') NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB`);
            await db.execute(`CREATE TABLE IF NOT EXISTS eventos (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                titulo VARCHAR(120) NOT NULL,
                descricao TEXT NOT NULL,
                local VARCHAR(160) NOT NULL,
                data_evento DATETIME NOT NULL,
                vagas INT UNSIGNED NOT NULL,
                organizador_id INT UNSIGNED NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_eventos_organizador FOREIGN KEY (organizador_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB`);
            await db.execute(`CREATE TABLE IF NOT EXISTS inscricoes (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                evento_id INT UNSIGNED NOT NULL,
                participante_id INT UNSIGNED NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_evento_participante (evento_id, participante_id),
                CONSTRAINT fk_inscricoes_evento FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
                CONSTRAINT fk_inscricoes_participante FOREIGN KEY (participante_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB`);
        })().catch((error) => {
            schemaPromise = null;
            throw error;
        });
    }
    return schemaPromise;
};

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

module.exports = { initializeSchema, findUsuarioByEmail, createUsuario, listEventos, findEventoById, createEvento, updateEvento, deleteEvento, createInscricao };
