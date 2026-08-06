const Loja = require('../models/userModels');

const produtoPayload = (body) => ({
    nome: (body.nome || '').trim(),
    valor: Number(body.valor),
    estoque: Number(body.estoque || 0),
    categoria_id: Number(body.categoria_id)
});

const produtoInvalido = (produto) =>
    !produto.nome ||
    !Number.isFinite(produto.valor) ||
    produto.valor < 0 ||
    !Number.isInteger(produto.estoque) ||
    produto.estoque < 0 ||
    !Number.isInteger(produto.categoria_id) ||
    produto.categoria_id <= 0;

exports.index = (req, res) => {
    res.render('index');
};

exports.about = (req, res) => {
    res.render('about');
};

exports.contato = (req, res) => {
    res.render('contato');
};

exports.produtos = async (req, res) => {
    try {
        const [produtos, categorias] = await Promise.all([
            Loja.getProdutos(),
            Loja.getCategorias()
        ]);

        res.render('produtos', { produtos, categorias, error: null });
    } catch (error) {
        res.status(500).render('produtos', { produtos: [], categorias: [], error: error.message });
    }
};

exports.createProduto = async (req, res) => {
    const produto = produtoPayload(req.body);

    if (produtoInvalido(produto)) {
        return res.status(400).send('Dados invalidos');
    }

    await Loja.addProduto(produto);
    res.redirect('/produtos');
};

exports.editProduto = async (req, res) => {
    const [produto, categorias] = await Promise.all([
        Loja.getProdutoById(req.params.id),
        Loja.getCategorias()
    ]);

    if (!produto) return res.status(404).send('Produto nao encontrado');

    res.render('editar-produto', { produto, categorias });
};

exports.updateProduto = async (req, res) => {
    const produto = produtoPayload(req.body);

    if (produtoInvalido(produto)) {
        return res.status(400).send('Dados invalidos');
    }

    await Loja.updateProduto(req.params.id, produto);
    res.redirect('/produtos');
};
