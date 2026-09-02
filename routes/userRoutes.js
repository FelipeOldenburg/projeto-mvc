const router = require('express').Router();
const controller = require('../controllers/userControllers');

router.use(controller.session);
router.get('/', controller.index);
router.get('/login', controller.loginPage);
router.post('/login', controller.login);
router.get('/cadastro', controller.registerPage);
router.post('/cadastro', controller.register);
router.post('/logout', controller.logout);
router.get('/eventos/novo', controller.requireRole('organizador'), controller.newPage);
router.post('/eventos', controller.requireRole('organizador'), controller.createEvent);
router.get('/eventos/:id', controller.details);
router.get('/eventos/:id/editar', controller.requireRole('organizador'), controller.editPage);
router.post('/eventos/:id/editar', controller.requireRole('organizador'), controller.updateEvent);
router.post('/eventos/:id/excluir', controller.requireRole('organizador'), controller.deleteEvent);
router.post('/eventos/:id/inscricoes', controller.requireRole('participante'), controller.enroll);
router.get('/version', (req, res) => res.json({ app: 'EventHub', version: '1.0.0' }));

module.exports = router;
