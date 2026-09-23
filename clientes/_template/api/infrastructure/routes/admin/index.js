
const express = require("express");
const router = express.Router();

const UserController = require("../../Controllers/UsuarioController");
const authUser = require("../../gateways/middleware/authUser");
const authIntegracao = require("../../gateways/middleware/authIntegracao");
const checkLimitOfset = require("../../gateways/middleware/checkLimitOfsett");
const ForgotController = require('../../Controllers/ForgotController')
const RequestsController = require('../../Controllers/RequestsController')
const LogsController = require('../../Controllers//LogsDoSistemaController')

router.get('/requests', authUser.admin, checkLimitOfset, RequestsController.getRequestsByQuery);
router.get('/requests/metrics', authUser.admin, RequestsController.getRequestsMetrics);
router.get('/logs', authUser.admin, checkLimitOfset, LogsController.getLogsByQuery);

//Testar as rotas, testar a autenticacao da api e dps boa
router.get("/user", authIntegracao.admin, checkLimitOfset, UserController.getUsuarioQuery);
router.get('/userForgot', authUser.admin, checkLimitOfset, ForgotController.getForgotLimit);
router.get("/user/changeemail", authUser.All2FA, UserController.getUsuarioQueryEmail);



router.get("/user/checkLink/:token", UserController.checkLink);
router.get("/user/logOut", authUser.All, UserController.logOut)
router.get("/user/check", authUser.All, UserController.verifyLogin);



router.post("/user/forgotPassword", UserController.forgotPassword);
router.post("/user/forgotChangePass", UserController.changePasswordForgot);
router.post("/user/changePassword", authUser.All, UserController.changePasswordLoged);
router.post("/user/changeemail", authUser.gerente, UserController.changeEmail);

router.post("/user/create", authIntegracao.admin, UserController.createUser)

router.patch("/user/authEmail/:token", UserController.authEmail);
router.patch("/user/changeemail/:token", UserController.resetEmailConfirm);
router.patch("/user/role/:id", authUser.admin, UserController.chageRole)
router.patch("/user/blockUnlock/:id", authUser.admin, UserController.blockUnlock)
router.delete("/user/:id", authUser.admin, UserController.deleteUser)


router.get("/user/login", UserController.loginNonce)
router.post("/user/login", UserController.login)
router.post("/user/login2FA", authUser.All, UserController.login2FA)

router.get("/user/dois-fatores/config", authUser.All, UserController.getDoisFatoresConfig);
router.post("/user/dois-fatores/config", authUser.All, UserController.confirmacaoDoisFatoresConfig);


const PerfilUsuarioController = require('../../Controllers/PerfilUsuarioController');
router.get('/perfil', authUser.All2FA, PerfilUsuarioController.getPerfilUsuario);
router.get('/perfil/solicitacao', authUser.All2FA, PerfilUsuarioController.getPerfilUsuarioSolicitacao);
router.post('/perfil', authUser.All2FA, PerfilUsuarioController.postPerfilUsuario);


const PerfilBiometricaController = require('../../Controllers/PerfilBiometriaController');
router.get('/perfil-biometria/solicitacao', authUser.All2FA, PerfilBiometricaController.solicitacaoPerfilBiometria);
router.post('/perfil-biometria/cadastro', authUser.All2FA, PerfilBiometricaController.confirmacaoPerfilBiometria);
router.get('/perfil-biometria/me', authUser.All2FA, PerfilBiometricaController.getMinhaBiometria);

//Depois da rota de verificacao deve ter a rota de registro de aprovacao para opt e depois com o token a aprovacao
router.get('/perfil-biometria/aprovacao/pendentes', authUser.aprovadorBiometria, PerfilBiometricaController.getPendentesAprovacao);
router.get('/perfil-biometria/aprovacao/:usuario_id', authUser.aprovadorBiometria, PerfilBiometricaController.buscaImagemSolicitacaoPerfilBiometria);
router.get('/perfil-biometria/aprovacao/solicitacao/:usuario_id', authUser.aprovadorBiometria, PerfilBiometricaController.solicitacaoAprovacaoPerfilBiometria);
router.post('/perfil-biometria/aprovacao', authUser.aprovadorBiometria, PerfilBiometricaController.confirmacaoAlteracaoStatusPerfilBiometria);


//MIDDLEWARE -> FAÇA ELE FUNCIONAL, IDENTIFICANDO DESAFIO, USUARIO. FACA LOGIN COM COOKIE TROCADO PARA VALIDAR  
//REGRAS DE AMBIENTE E BANCO DE DADOS! MUITA CAUTELA.

const TermoResponsabilidadeController = require('../../Controllers/TermoResponsabilidadeController');
router.get('/termo-responsabilidade/solicitacao', authUser.All2FA, TermoResponsabilidadeController.solicitacaoPostTermoResponsabilidade);
router.post('/termo-responsabilidade', authUser.All2FA, TermoResponsabilidadeController.postTermoResponsabilidade);


router.get('/termo-responsabilidade', authIntegracao.All2FA, TermoResponsabilidadeController.getTermoResponsabilidadeByQuery);
router.get('/termo-responsabilidade/:id', authUser.All2FA, TermoResponsabilidadeController.getTermoResponsabilidade);
router.post('/termo-responsabilidade/aceite-imagem', authUser.All2FA, TermoResponsabilidadeController.indexTermoResponsabilidadeAceiteCadastroImagem);
router.post('/termo-responsabilidade/aceite', authUser.All2FA, TermoResponsabilidadeController.indexTermoResponsabilidadeAceiteCadastroImagem);
router.patch('/termo-responsabilidade/:id', authUser.All2FA, TermoResponsabilidadeController.patchTermoResponsabilidade);



const DocumentosController = require('../../Controllers/DocumentosController');
router.post('/documentos/solicitacao', authIntegracao.gerente, DocumentosController.postDocumentoSolicitacao);
router.put('/documentos/solicitacao/:id', authIntegracao.gerente, DocumentosController.putDocumentoConfirmacao);
router.patch('/documentos/:id/cancelar', authIntegracao.gerente, DocumentosController.patchCancelarDocumento);

const SignatariosController = require('../../Controllers/SignatariosController');
router.post('/documentos/:id/signatarios', authIntegracao.gerente, SignatariosController.postSignatarios);

const AuditoriaCertificadoController = require('../../Controllers/AuditoriaCertificadoController');
router.get('/documentos/:id/auditoria', authUser.admin, AuditoriaCertificadoController.getPorDocumentoId);

const PainelController = require('../../Controllers/PainelController');
router.get('/solicitacoes', authIntegracao.gerente, checkLimitOfset, PainelController.getSolicitacoes);
router.get('/solicitacoes/:id', authIntegracao.gerente, PainelController.getSolicitacaoDetalhe);
router.get('/contratos', authUser.All2FA, checkLimitOfset, PainelController.getContratos);
router.get('/documentos/:id/download', authIntegracao.All2FA, PainelController.getDocumentoDownload);
router.get('/usuarios/busca', authIntegracao.gerente, PainelController.getUsuariosBusca);

const ChaveIntegracaoController = require('../../Controllers/ChaveIntegracaoController');
router.post('/integracao/chaves', authUser.gerente, ChaveIntegracaoController.postChave);
router.get('/integracao/usuarios', authUser.gerente, ChaveIntegracaoController.getUsuariosDestino);
router.get('/integracao/chaves', authUser.gerente, ChaveIntegracaoController.getChaves);
router.delete('/integracao/chaves/:id', authUser.gerente, ChaveIntegracaoController.deleteChave);
router.post('/integracao/chaves/solicitacao', authUser.All2FA, ChaveIntegracaoController.postSolicitacao);
router.get('/integracao/me', authIntegracao.All2FA, ChaveIntegracaoController.getMe);

const AlertaUsuarioController = require('../../Controllers/AlertaUsuarioController');
router.get('/alertas', authUser.All2FA, AlertaUsuarioController.getAlertas);
router.patch('/alertas/:id/lido', authUser.All2FA, AlertaUsuarioController.patchAlertaLido);

const AssinaturaController = require('../../Controllers/AssinaturaController');


//BIOMETRIA ENTRA AQUI => METE MARCHA! DEPOIS VAI NO MIDDLEWARE E EMBEDDING DOS ROSTOS.
// Cerimonia aceita cookie (site) ou lsak_ do signatario (Workspace) — authIntegracao.assinatura.
// Aceite do termo na cerimonia: mesmo handler do site, mas autenticado pela lsak_
// (o POST /termo-responsabilidade/aceite continua exclusivo do login por cookie).
router.post('/assinatura/termos/aceite', authIntegracao.assinatura, TermoResponsabilidadeController.indexTermoResponsabilidadeAceiteCadastroImagem);
router.post('/assinatura/sessao', authIntegracao.assinatura, AssinaturaController.postSessao);
router.post('/assinatura/sessao/2fa', authIntegracao.assinatura, AssinaturaController.postSessao2FA); //Retorna aqui o id para validar 
router.post('/assinatura/sessao/confirmarFoto', authIntegracao.assinatura, AssinaturaController.postConfirmarRecebimentoFoto); //Retorna aqui o id para validar 
router.get('/assinatura/sessao/statusFoto', authIntegracao.assinatura, AssinaturaController.getStatusFoto);
router.get('/assinatura/sessao/progresso', authIntegracao.assinatura, AssinaturaController.getProgressoSessao);
router.post('/assinatura/documentos/:id/estampa-url', authIntegracao.assinatura, AssinaturaController.postEstampaUploadUrl);
router.post('/assinatura/documentos/:id/assinar', authIntegracao.assinatura, AssinaturaController.postAssinar);


//Validar 

router.get('/assinatura/documentos/:id', authIntegracao.assinatura, AssinaturaController.getDocumento);
router.get('/assinatura/documentos/:id/status', authIntegracao.assinatura, AssinaturaController.getStatus);
router.get('/assinatura/documentos/:id/download', authIntegracao.assinatura, AssinaturaController.getDownload);



/* DADOS DO SISTEMA  */
const EstatisticasController = require('../../Controllers/EstatisticasController');//76c04b80-1e2f-4809-886d-49606ea3d6c1
router.get('/dadosSistema/recuperacaoSenha', authUser.gerente, EstatisticasController.getRecuperacaoSenha);
router.get('/dadosSistema/usuarios', authUser.admin, EstatisticasController.getUsuarios);
router.get('/dadosSistema/logs', authUser.admin, EstatisticasController.getLogs);
router.get('/dadosSistema/dashBoard', authUser.gerente, EstatisticasController.getDashBoard);

module.exports = router;

