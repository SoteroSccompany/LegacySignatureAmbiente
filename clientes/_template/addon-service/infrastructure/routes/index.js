
const express = require("express");
const router = express.Router();

const authAdmin = require("../gateways/middleware/authAdmin");
const authInstalacao = require("../gateways/middleware/authInstalacao");
const authChaveAssinatura = require("../gateways/middleware/authChaveAssinatura");
const InstalacaoController = require("../Controllers/InstalacaoController");

router.get("/healthcheck", (req, res) => {
    res.status(200).json({ status: true, msg: "addon-service ok" });
});

// Dados da própria instalação (o card usa a pasta raiz configurada no admin).
// A chave da API nunca sai daqui.
router.get("/instalacao", authInstalacao, (req, res) => {
    res.status(200).json({
        status: true,
        data: {
            nome: req.instalacao.nome,
            email_usuario: req.instalacao.email_usuario,
            chave_admin: req.instalacao.chave_admin,
            escopo: req.instalacao.escopo,
            pasta_raiz_drive: req.instalacao.pasta_raiz_drive,
        },
    });
});
router.get("/instalacao/eu", authInstalacao, InstalacaoController.getEu.bind(InstalacaoController));

// Consentimento do usuário pro Drive — obrigatório antes do vínculo (DWD
// sozinho não libera). Público: o card abre /start e o próprio Google chega
// no /callback (redirect_uri cadastrado no cliente OAuth do GCP).
const OauthController = require("../Controllers/OauthController");
router.get("/oauth/start", OauthController.getStart.bind(OauthController));
router.get("/oauth/callback", OauthController.getCallback.bind(OauthController));

// Vínculo self-service: cada conta Google cola a própria lsak_ (emitida pelo
// gerente) e recebe a lsic_ que o Addon guarda em UserProperties. Sem chave
// não vincula; vincular de novo para o mesmo e-mail invalida a anterior.
router.post("/instalacoes/vincular", InstalacaoController.postVincular);

// Admin do serviço: gerenciar instalações (suporte/operação, fora do Workspace)
const AdminController = require("../Controllers/AdminController");
router.post("/admin/instalacoes", authAdmin, AdminController.postInstalacao);
router.get("/admin/instalacoes", authAdmin, AdminController.getInstalacoes);
router.delete("/admin/instalacoes/:id", authAdmin, AdminController.deleteInstalacao);

// Rotas do Addon (credencial de instalação). Pedido exige escopo solicitante
// — conferido de novo dentro do use case, além da checagem redundante na API.
const PedidoController = require("../Controllers/PedidoController");
router.post("/pedidos", authInstalacao, PedidoController.postPedido);
router.get("/pedidos", authInstalacao, PedidoController.getPedidos);
router.post("/pedidos/:id/status", authInstalacao, PedidoController.postPedidoStatus);

// Documentos em que o e-mail desta instalação é signatário (recebeu
// convite) — alimenta o card "Documentos para assinar" no Workspace.
router.get("/assinatura/pendencias", authInstalacao, PedidoController.getPendencias);

const UsuarioController = require("../Controllers/UsuarioController");
router.post("/usuarios", authInstalacao, UsuarioController.postUsuario);
router.get("/usuarios", authInstalacao, UsuarioController.getUsuarios);

const TermoController = require("../Controllers/TermoController");
router.get("/termos", authInstalacao, TermoController.getTermos);

// Entrada da cerimônia (Web App do convite). Sem login/senha: convite HMAC +
// e-mail da chave === e-mail do convite.
const AssinaturaSessaoController = require("../Controllers/AssinaturaSessaoController");
router.get("/assinatura/convite", AssinaturaSessaoController.getConvite);
router.post("/assinatura/convite/chave", AssinaturaSessaoController.postValidarChave);
// Conta Google com lsic_ já vinculada — confirma que o convite é desta mesma
// pessoa sem exigir colar a lsak_ de novo (usada pelo Web App e pelo card).
router.post("/assinatura/convite/instalacao", authInstalacao, AssinaturaSessaoController.postValidarInstalacao);

// Cerimônia (OTP + facial + PAdES) — autenticada com a própria lsak_ do
// signatário no header x-integracao-key (authChaveAssinatura). Quem valida de
// fato é a API; este serviço só repassa.
const CerimoniaController = require("../Controllers/CerimoniaController");
router.get("/assinatura/termos", authChaveAssinatura, CerimoniaController.getTermos);
router.post("/assinatura/termos/aceite", authChaveAssinatura, CerimoniaController.postTermoAceite);
router.get("/assinatura/sessao/progresso", authChaveAssinatura, CerimoniaController.getProgresso);
router.post("/assinatura/sessao", authChaveAssinatura, CerimoniaController.postSessao);
router.post("/assinatura/sessao/2fa", authChaveAssinatura, CerimoniaController.postSessao2FA);
router.post("/assinatura/sessao/confirmarFoto", authChaveAssinatura, CerimoniaController.postConfirmarFoto);
router.get("/assinatura/sessao/statusFoto", authChaveAssinatura, CerimoniaController.getStatusFoto);
router.get("/assinatura/documentos/:id/pdf", authChaveAssinatura, CerimoniaController.getDocumentoPdf);
router.get("/assinatura/documentos/:id", authChaveAssinatura, CerimoniaController.getDocumento);
router.post("/assinatura/documentos/:id/estampa-url", authChaveAssinatura, CerimoniaController.postEstampaUrl);
router.post("/assinatura/documentos/:id/assinar", authChaveAssinatura, CerimoniaController.postAssinar);
router.get("/assinatura/documentos/:id/status", authChaveAssinatura, CerimoniaController.getStatusAssinatura);
router.get("/assinatura/documentos/:id/download", authChaveAssinatura, CerimoniaController.getDownload);

module.exports = router;
