
const express = require("express");
const router = express.Router();

const ApplicationController = require("../Controllers/ApplicationController")
router.get("/csrftoken", ApplicationController.getCsrf)

router.get("/healthcheck", ApplicationController.healthCheck);

const AuditoriaCertificadoController = require("../Controllers/AuditoriaCertificadoController");
const rateLimitVerificacao = require("../gateways/middleware/rateLimitVerificacao");
router.get("/verificar/:codigo", rateLimitVerificacao, AuditoriaCertificadoController.getPorCodigo);
router.post("/verificar/:codigo/documento", rateLimitVerificacao, express.raw({ type: 'application/pdf', limit: '20mb' }), AuditoriaCertificadoController.validarDocumentoEnviado);

router.get("/hello", async (req, res) => {
    res.status(200).json({
        status: true,
        msg: "Hello World"
    });
});


module.exports = router;