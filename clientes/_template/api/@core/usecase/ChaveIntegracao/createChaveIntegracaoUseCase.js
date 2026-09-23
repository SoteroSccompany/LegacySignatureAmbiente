
const knex = require('../../../infrastructure/db/config/databaseConection')();
const repositorioChave = require('../../../infrastructure/db/services/ChaveIntegracaoRepository');
const repositorioUsuario = require('../../../infrastructure/db/services/UsuarioRepositorio');
const repositorioLogin = require('../../../infrastructure/db/services/LoginRepositorio');
const repositorioDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
const repositorioPerfil = require('../../../infrastructure/db/services/PerfilUsuarioRepository');
const repositorioBiometria = require('../../../infrastructure/db/services/PerfilBiometriaRepository');
const domainChave = require('../../domain/ChaveIntegracao');
const domainHistorico = require('../../domain/Historico');
const Alerta = require('../../../infrastructure/gateways/helpers/Alerta');
const logExeption = require('../Logs/exeption/exeptionChaveIntegracao');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const crypto = require('crypto');
const moment = require('moment');
const { roles, confiDoisFatores, historico, alertaUsuario, assinaturaSessao } = require('../../../certs/index');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');

// Escopo de quem pede (gerente/admin, dono da chave) e de quem assina (usuário
// normal). Só existem esses dois — não confundir com a role do dono na plataforma.
const ESCOPO_ADDON_SOLICITANTE = 'addon_solicitante';
const ESCOPO_ADDON_SIGNATARIO = 'addon_signatario';

class createChaveIntegracaoUseCase {

    async indexChaveIntegracao(data) {
        try {
            if (!data.user_id) return { status: false, msg: "Usuário não autenticado." }
            if (!data.desafio_id) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
            if (!data.session_id) return { status: false, revokeLogin: true, msg: "Sessão inválida. Faça o login novamente." }
            const checkUsuario = await repositorioUsuario.getById({ id: data.user_id })
            if (!checkUsuario.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkUsuario.exit) return { status: false, revokeLogin: true, msg: "Usuario não encontrado. Entre em contato com o suporte." }
            const usuario = checkUsuario.data[0];
            if (usuario.bloqueado) return { status: false, revokeLogin: true, msg: "Usuário bloqueado. Entre em contato com o suporte." }
            // Só gerente/admin emite. Usuário normal nem a própria chave gera — só solicita (solicitarChave).
            if (usuario.role !== roles.admin) return { status: false, msg: "Você não pode gerar chave de integração. Solicite a um gerente." }
            const checkLogin = await repositorioLogin.getLoginByUserId({ id: data.user_id })
            if (!checkLogin.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkLogin.exit) return { status: false, revokeLogin: true, msg: "Usuario não encontrado. Entre em contato com o suporte." }
            const login = checkLogin.data;
            if (!login.desafio_id) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
            if (login.desafio_id !== data.desafio_id) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida. Faça o login novamente." }
            const checkDesafio = await repositorioDesafio.getDesafioAutenticacaoById({ id: data.desafio_id })
            if (!checkDesafio.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkDesafio.exit) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
            if (checkDesafio.data.tipo_desafio !== confiDoisFatores.desafio.login) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
            // Onboarding do próprio emissor: precisa estar completo pra emitir chave de ninguém.
            if (!usuario.codigo_hash || usuario.dois_fatores !== 1) return { status: false, msg: "Configure a autenticação de dois fatores antes de emitir a chave." }
            const checkPerfilEmissor = await repositorioPerfil.getPerfilUsuarioByUserId({ user_id: usuario.id })
            if (!checkPerfilEmissor.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkPerfilEmissor.exit) return { status: false, msg: "Complete seu cadastro de perfil antes de emitir a chave." }
            if (assinaturaSessao.biometriaObrigatoria) {
                const checkBiometriaEmissor = await repositorioBiometria.getPerfilBiometriaByPerfilId({ perfil_id: checkPerfilEmissor.data.id })
                if (!checkBiometriaEmissor.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                if (!checkBiometriaEmissor.exit) return { status: false, msg: "Cadastre sua biometria antes de emitir a chave." }
                if (!checkBiometriaEmissor.data.aprovado_por) return { status: false, msg: "Sua biometria ainda está em análise." }
            }
            // Sem alvo (ou alvo = ele mesmo): o gerente emite a própria, escopo solicitante.
            // Com alvo de outro: emite a do usuário, escopo signatário — gerente não emite pra outro gerente/admin.
            let dono = usuario;
            let escopo = ESCOPO_ADDON_SOLICITANTE;
            if (data.alvo_user_id && data.alvo_user_id !== data.user_id) {
                const checkAlvo = await repositorioUsuario.getById({ id: data.alvo_user_id })
                if (!checkAlvo.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                if (!checkAlvo.exit) return { status: false, msg: "Usuário de destino não encontrado." }
                const alvo = checkAlvo.data[0];
                if (alvo.bloqueado) return { status: false, msg: "Usuário de destino está bloqueado." }
                if (alvo.role === roles.admin) return { status: false, msg: "Gerente emite a própria chave." }
                if (!alvo.codigo_hash || alvo.dois_fatores !== 1) return { status: false, msg: "O usuário de destino precisa ter autenticação de dois fatores ativa." }
                const checkPerfilAlvo = await repositorioPerfil.getPerfilUsuarioByUserId({ user_id: alvo.id })
                if (!checkPerfilAlvo.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                if (!checkPerfilAlvo.exit) return { status: false, msg: "O usuário de destino precisa ter perfil cadastrado." }
                if (assinaturaSessao.biometriaObrigatoria) {
                    const checkBiometriaAlvo = await repositorioBiometria.getPerfilBiometriaByPerfilId({ perfil_id: checkPerfilAlvo.data.id })
                    if (!checkBiometriaAlvo.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                    if (!checkBiometriaAlvo.exit) return { status: false, msg: "O usuário de destino precisa ter biometria cadastrada." }
                    if (!checkBiometriaAlvo.data.aprovado_por) return { status: false, msg: "A biometria do usuário de destino ainda está em análise." }
                }
                dono = alvo;
                escopo = ESCOPO_ADDON_SIGNATARIO;
            }
            // Onboarding do dono da chave, de novo — redundância intencional mesmo quando dono === usuario.
            if (!dono.codigo_hash || dono.dois_fatores !== 1) return { status: false, msg: dono.id === usuario.id ? "Configure a autenticação de dois fatores antes de emitir a chave." : "O usuário de destino precisa ter autenticação de dois fatores ativa." }
            const checkPerfilDono = await repositorioPerfil.getPerfilUsuarioByUserId({ user_id: dono.id })
            if (!checkPerfilDono.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkPerfilDono.exit) return { status: false, msg: dono.id === usuario.id ? "Complete seu cadastro de perfil antes de emitir a chave." : "O usuário de destino precisa ter perfil cadastrado." }
            if (assinaturaSessao.biometriaObrigatoria) {
                const checkBiometriaDono = await repositorioBiometria.getPerfilBiometriaByPerfilId({ perfil_id: checkPerfilDono.data.id })
                if (!checkBiometriaDono.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                if (!checkBiometriaDono.exit) return { status: false, msg: dono.id === usuario.id ? "Cadastre sua biometria antes de emitir a chave." : "O usuário de destino precisa ter biometria cadastrada." }
                if (!checkBiometriaDono.data.aprovado_por) return { status: false, msg: dono.id === usuario.id ? "Sua biometria ainda está em análise." : "A biometria do usuário de destino ainda está em análise." }
            }
            const segredo = `lsak_${crypto.randomBytes(24).toString('hex')}`;
            const sha = new SHA(process.env.SHA);
            const chave = new domainChave({
                user_id: dono.id,
                prefixo: segredo.slice(0, 12),
                hash: sha.hash(segredo),
                escopo,
                email_usuario: dono.email,
                desafio_id: data.desafio_id,
                session_id: data.session_id,
            });
            const trx = await knex.transaction();
            try {
                const revogadas = await repositorioChave.revogarChavesAtivasByUserId({ user_id: dono.id }, trx)
                if (!revogadas.status) throw new Error(revogadas.msg)
                const responseInsert = await repositorioChave.createChaveIntegracao(chave.getChaveIntegracao(), trx)
                if (!responseInsert.status) throw new Error(responseInsert.msg)
                await trx('tab_historico').insert(new domainHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: { ...chave.getChaveIntegracao(), hash: undefined },
                    user_id: data.user_id,
                }).getHistorico());
                for (const antiga of revogadas.data) {
                    await trx('tab_historico').insert(new domainHistorico({
                        transformacao: historico.trnasformcao.update.value,
                        dado_antigo: { ...antiga, data_criacao: moment(antiga.data_criacao).format('YYYY-MM-DD HH:mm:ss'), data_atualizacao: moment(antiga.data_atualizacao).format('YYYY-MM-DD HH:mm:ss') },
                        dado_atual: { ...antiga, revogada: true, data_atualizacao: dateNow() },
                        user_id: data.user_id,
                    }).getHistorico());
                }
                await trx.commit();
            } catch (error) {
                await trx.rollback();
                console.log(error);
                return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
            }
            const object = chave.getChaveIntegracao();
            delete object.hash;
            const msg = dono.id === usuario.id
                ? "Chave de integração criada. Guarde o segredo, ele não será exibido novamente."
                : `Chave de integração criada para ${dono.email}. Guarde o segredo, ele não será exibido novamente.`;
            return { status: true, msg, data: { chave: segredo, prefixo: chave.prefixo, id: chave.id, escopo }, object }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case ChaveIntegracao - createChaveIntegracaoUseCase - indexChaveIntegracao', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    // Usuário normal não gera: só avisa o(s) gerente/admin pra alguém emitir a dele.
    async solicitarChave(data) {
        try {
            if (!data.user_id) return { status: false, msg: "Usuário não autenticado." }
            const checkUsuario = await repositorioUsuario.getById({ id: data.user_id })
            if (!checkUsuario.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkUsuario.exit) return { status: false, revokeLogin: true, msg: "Usuario não encontrado. Entre em contato com o suporte." }
            const usuario = checkUsuario.data[0];
            if (usuario.bloqueado) return { status: false, revokeLogin: true, msg: "Usuário bloqueado. Entre em contato com o suporte." }
            if (usuario.role === roles.admin) return { status: false, msg: "Gerentes emitem a própria chave em Integração." }
            if (!usuario.codigo_hash || usuario.dois_fatores !== 1) return { status: false, msg: "Configure a autenticação de dois fatores antes de solicitar a chave." }
            const checkPerfilSolicitante = await repositorioPerfil.getPerfilUsuarioByUserId({ user_id: usuario.id })
            if (!checkPerfilSolicitante.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkPerfilSolicitante.exit) return { status: false, msg: "Complete seu cadastro de perfil antes de solicitar a chave." }
            if (assinaturaSessao.biometriaObrigatoria) {
                const checkBiometriaSolicitante = await repositorioBiometria.getPerfilBiometriaByPerfilId({ perfil_id: checkPerfilSolicitante.data.id })
                if (!checkBiometriaSolicitante.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                if (!checkBiometriaSolicitante.exit) return { status: false, msg: "Cadastre sua biometria antes de solicitar a chave." }
                if (!checkBiometriaSolicitante.data.aprovado_por) return { status: false, msg: "Sua biometria ainda está em análise." }
            }
            const checkGerentes = await repositorioUsuario.getAllAdmin()
            if (!checkGerentes.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkGerentes.exit) return { status: false, msg: "Nenhum gerente disponível para atender a solicitação. Contate o suporte." }
            const trx = await knex.transaction();
            try {
                const alerta = new Alerta(trx);
                await alerta.criar({
                    tipo: 'chave_integracao_solicitada',
                    titulo: 'Solicitação de chave de integração',
                    mensagem: `${usuario.email} solicitou uma chave de integração para o Addon do Workspace.`,
                    referencia_tipo: alertaUsuario.referencia.usuario,
                    referencia_id: usuario.id,
                    user_ids: checkGerentes.data.map((g) => g.id),
                    meta_dados: { solicitante_user_id: usuario.id, solicitante_email: usuario.email },
                });
                await trx.commit();
                alerta.enviarEmails();
            } catch (error) {
                await trx.rollback();
                console.log(error);
                return { status: false, msg: error.message || 'Erro ao registrar solicitação de chave.' }
            }
            return { status: true, msg: "Solicitação enviada. Um gerente vai gerar sua chave." }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case ChaveIntegracao - createChaveIntegracaoUseCase - solicitarChave', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    // Vínculo no Workspace (addon-service): qualquer lsak_ viva devolve quem é o dono e o escopo.
    // Nome/CPF/telefone vêm do perfil (cifrados no MySQL) — quem já consome o GET
    // continua vendo email/role/escopo/user_id; campos novos vazios se não houver perfil.
    async getMinhaChave(data) {
        try {
            if (!data.integracao) return { status: false, msg: "Chave de integração não informada." }
            let nome = ''
            let cpf = ''
            let telefone = ''
            const checkPerfil = await repositorioPerfil.getPerfilUsuarioByUserId({ user_id: data.integracao.user_id })
            if (!checkPerfil.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (checkPerfil.exit) {
                const sha = new SHA()
                const perfil = checkPerfil.data
                nome = perfil.nome ? String(perfil.nome) : ''
                try { cpf = String(sha.decrypt(perfil.cpf) || '').replace(/\D/g, '') } catch (errDecrypt) { cpf = '' }
                try { telefone = String(sha.decrypt(perfil.telefone) || '').replace(/\D/g, '') } catch (errDecrypt) { telefone = '' }
                // Cadastro grava dígitos em claro (encryptTelefone não é persistido; VARCHAR(64) não cabe AES-GCM).
                if (!telefone) {
                    const telefoneBruto = String(perfil.telefone || '').replace(/\D/g, '')
                    if (telefoneBruto.length === 10 || telefoneBruto.length === 11) telefone = telefoneBruto
                }
            }
            return { status: true, msg: "Chave válida.", data: { email: data.integracao.email, role: data.integracao.role, escopo: data.integracao.escopo, user_id: data.integracao.user_id, nome, cpf, telefone } }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    // Combo da tela Integração: destinatários (não-admin) com o nome do perfil.
    async listarUsuariosDestino(data) {
        try {
            if (!data.user_id) return { status: false, msg: "Usuário não autenticado." }
            const checkUsuario = await repositorioUsuario.getById({ id: data.user_id })
            if (!checkUsuario.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkUsuario.exit) return { status: false, revokeLogin: true, msg: "Usuario não encontrado. Entre em contato com o suporte." }
            const usuario = checkUsuario.data[0];
            if (usuario.bloqueado) return { status: false, revokeLogin: true, msg: "Usuário bloqueado. Entre em contato com o suporte." }
            if (usuario.role !== roles.admin) return { status: false, msg: "Você não pode gerar chave de integração. Solicite a um gerente." }
            const rows = await knex('tab_usuarios as u')
                .leftJoin('tab_perfil_usuario as p', function () {
                    this.on('p.user_id', '=', 'u.id').andOn('p.deletado', '=', knex.raw('0'))
                })
                .select('u.id', 'u.email', 'p.nome')
                .where('u.deletado', false)
                .andWhere('u.bloqueado', false)
                .whereNot('u.role', roles.admin)
                .whereNot('u.id', data.user_id)
                .orderByRaw('p.nome is null, p.nome asc, u.email asc')
            return { status: true, data: rows, msg: "Usuários listados com sucesso." }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case ChaveIntegracao - createChaveIntegracaoUseCase - listarUsuariosDestino', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async listarChaves(data) {
        try {
            if (!data.user_id) return { status: false, msg: "Usuário não autenticado." }
            const response = await repositorioChave.getChavesIntegracaoByUserId({ user_id: data.user_id })
            if (!response.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            return { status: true, data: response.data, msg: "Chaves de integração listadas com sucesso." }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case ChaveIntegracao - createChaveIntegracaoUseCase - listarChaves', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async revogarChave(data) {
        try {
            if (!data.user_id) return { status: false, msg: "Usuário não autenticado." }
            if (!data.id) return { status: false, msg: "Chave de integração não informada." }
            const checkChave = await repositorioChave.getChaveIntegracaoById({ id: data.id })
            if (!checkChave.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkChave.exit) return { status: false, msg: "Chave de integração não encontrada." }
            const checkUsuario = await repositorioUsuario.getById({ id: data.user_id })
            if (!checkUsuario.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkUsuario.exit) return { status: false, revokeLogin: true, msg: "Usuario não encontrado. Entre em contato com o suporte." }
            const usuario = checkUsuario.data[0];
            if (checkChave.data.user_id !== data.user_id && usuario.role !== roles.admin) return { status: false, msg: "Chave de integração não pertence ao usuário." }
            if (checkChave.data.revogada) return { status: false, msg: "Chave de integração já está revogada." }
            const oldChave = { ...checkChave.data };
            const responseUpdate = await repositorioChave.updateChaveIntegracao({ id: data.id, revogada: true, data_atualizacao: dateNow() })
            if (!responseUpdate.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            const object = { ...oldChave, revogada: true };
            delete object.hash;
            delete oldChave.hash;
            return { status: true, msg: "Chave de integração revogada com sucesso.", oldObject: oldChave, object }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case ChaveIntegracao - createChaveIntegracaoUseCase - revogarChave', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new createChaveIntegracaoUseCase();
