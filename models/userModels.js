const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loja',
    ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
    waitForConnections: true,
    connectionLimit: 10
});

exports.getCategorias = async () => {
    const [rows] = await db.execute(
        'SELECT id_categoria AS id, nome FROM categorias ORDER BY nome'
    );
    return rows;
};

exports.getProdutos = async () => {
    const [rows] = await db.execute(
        `SELECT p.id_produto AS id, p.nome, p.valor, p.estoque,
            c.id_categoria AS categoria_id, c.nome AS categoria
         FROM produtos p
         JOIN categorias c ON c.id_categoria = p.categorias_id_categoria
         ORDER BY p.id_produto DESC`
    );
    return rows;
};

exports.getProdutoById = async (id) => {
    const [rows] = await db.execute(
        `SELECT id_produto AS id, nome, valor, estoque,
            categorias_id_categoria AS categoria_id
         FROM produtos
         WHERE id_produto = ?
         LIMIT 1`,
        [id]
    );
    return rows[0];
};

exports.addProduto = async ({ nome, valor, estoque, categoria_id }) => {
    await db.execute(
        'INSERT INTO produtos (nome, valor, estoque, categorias_id_categoria) VALUES (?, ?, ?, ?)',
        [nome, valor, estoque, categoria_id]
    );
};

exports.updateProduto = async (id, { nome, valor, estoque, categoria_id }) => {
    await db.execute(
        'UPDATE produtos SET nome = ?, valor = ?, estoque = ?, categorias_id_categoria = ? WHERE id_produto = ?',
        [nome, valor, estoque, categoria_id, id]
    );
};
