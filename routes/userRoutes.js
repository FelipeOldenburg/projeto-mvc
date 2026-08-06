const express = require('express');
const router = express.Router();
const userControllers = require('../controllers/userControllers');

router.get('/', userControllers.index);
router.get('/about', userControllers.about);
router.get('/contato', userControllers.contato);
router.get('/produtos', userControllers.produtos);
router.post('/produtos', userControllers.createProduto);
router.get('/produtos/:id/editar', userControllers.editProduto);
router.post('/produtos/:id', userControllers.updateProduto);

router.use("/version", (req, res) => {
    res.send( "<h1> version: 1.0.0 </h1>");
});

module.exports = router;
