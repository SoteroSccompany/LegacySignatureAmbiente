
const repositorioInstalacao = require('../../../infrastructure/db/services/InstalacaoRepository');
const repositorioEvento = require('../../../infrastructure/db/services/EventoRastreioRepository');
const repositorioOauthDrive = require('../../../infrastructure/db/services/OauthDriveRepository');
const domainInstalacao = require('../../domain/Instalacao');
const domainEvento = require('../../domain/EventoRastreio');
const apiLegacy = require('../../../infrastructure/gateways/ApiLegacy');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const crypto = require('crypto');
const { statusInstalacao, eventoRastreio } = require('../../../config');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const logs = require('../../../Logs');

class createInstalacaoUseCase {

    async indexInstalacao(data) {
        try {
            if (!data.nome || data.nome.trim() === '') return { status: false, msg: "Nome da instalação não pode ser vazio." }
            if (!data.chave_api || typeof data.chave_api !== 'string') return { status: false, msg: "Chave de integração não pode ser vazia." }
            if (!data.chave_api.startsWith('lsak_')) return { status: false, msg: "Chave de integração inválida. Emita a chave na tela Integração do site." }
            if (!data.email_usuario || data.email_usuario.trim() === '') return { status: false, msg: "E-mail da conta Google não pode ser vazio." }
            const emailGoogle = data.email_usuario.trim().toLowerCase();
            // A verdade da chave é a própria API: quem ela é, e-mail e escopo (solicitante/signatário).
            const checkMe = await apiLegacy.get('/api/admin/integracao/me', data.chave_api)
            if (checkMe.statusHttp === 403) return { status: false, msg: "A API recusou a chave de integração. Confira se ela está ativa na tela Integração." }
            if (!checkMe.status) return { status: false, msg: "Ocorreu um erro interno ao validar a chave na API, tente novamente em instantes." }
            const dadosChave = checkMe.data?.data || {};
            if (!dadosChave.email || dadosChave.email.trim().toLowerCase() !== emailGoogle) {
                return { status: false, msg: "A chave pertence a outro e-mail. Cole a chave gerada para esta conta Google." }
            }
            // Ordem obrigatória: Autorizar Drive → consentimento Google → Vincular. Sem
            // essa etapa a conta de serviço (DWD) não consegue impersonar o Drive dela.
            const checkOauth = await repositorioOauthDrive.getByEmail({ email: emailGoogle })
            if (!checkOauth.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkOauth.exit) return { status: false, msg: "Autorize o acesso ao Drive antes de vincular a chave. Toque em \"Autorizar Drive\" no card do Addon." }
            // Segunda pergunta: a chave é de admin? (alta de usuários pelo Addon, feature separada do escopo de pedido/assinatura)
            const checkAdmin = await apiLegacy.get('/api/admin/user?page=0&per_page=1', data.chave_api)
            const chaveAdmin = checkAdmin.statusHttp === 200;
            const sha = new SHA();

            // Instalação ativa desta conta já existe: atualiza a lsak_ na mesma
            // linha em vez de rotacionar a lsic_ a cada vínculo — o card só
            // precisa colar a chave uma vez. credencial_hash/prefixo continuam
            // os mesmos (a lsic_ nas UserProperties do Addon segue valendo).
            const checkAtiva = await repositorioInstalacao.getInstalacaoAtivaByEmail({ email_usuario: emailGoogle })
            if (!checkAtiva.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (checkAtiva.exit) {
                const instalacaoAtiva = checkAtiva.data;
                const updateInstalacao = {
                    id: instalacaoAtiva.id,
                    chave_api: sha.encrypt(data.chave_api),
                    chave_api_prefixo: data.chave_api.slice(0, 12),
                    chave_admin: chaveAdmin,
                    escopo: dadosChave.escopo || null,
                    data_atualizacao: dateNow(),
                };
                // Exceção: Addon sem lsic_ local (UserProperties perdida) — único
                // caso de rotação, regenerada na própria linha pra não deixar a
                // conta órfã de credencial.
                let credencialNova = null;
                if (!data.tem_credencial) {
                    credencialNova = `lsic_${crypto.randomBytes(24).toString('hex')}`;
                    updateInstalacao.credencial_hash = sha.hash(credencialNova);
                    updateInstalacao.credencial_prefixo = credencialNova.slice(0, 12);
                }
                const responseUpdate = await repositorioInstalacao.updateInstalacao(updateInstalacao)
                if (!responseUpdate.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                await repositorioEvento.createEvento(new domainEvento({
                    instalacao_id: instalacaoAtiva.id,
                    tipo_evento: eventoRastreio.instalacao_vinculada,
                    meta_dados: { nome: instalacaoAtiva.nome, chave_api_prefixo: updateInstalacao.chave_api_prefixo, chave_admin: chaveAdmin, escopo: updateInstalacao.escopo, atualizado: true, credencial_regerada: !!credencialNova },
                }).getEventoRastreio());
                return {
                    status: true,
                    msg: credencialNova ? "Chave de integração atualizada. Guarde a nova credencial, ela não será exibida novamente." : "Chave de integração atualizada com sucesso.",
                    data: { id: instalacaoAtiva.id, credencial: credencialNova, atualizado: true, chave_admin: chaveAdmin, escopo: updateInstalacao.escopo }
                }
            }

            // Primeiro vínculo desta conta: instalação e lsic_ novas.
            const credencial = `lsic_${crypto.randomBytes(24).toString('hex')}`;
            const instalacao = new domainInstalacao({
                nome: data.nome.trim(),
                chave_api: sha.encrypt(data.chave_api),
                chave_api_prefixo: data.chave_api.slice(0, 12),
                email_usuario: emailGoogle,
                chave_admin: chaveAdmin,
                escopo: dadosChave.escopo || null,
                credencial_hash: sha.hash(credencial),
                credencial_prefixo: credencial.slice(0, 12),
                pasta_raiz_drive: data.pasta_raiz_drive ? data.pasta_raiz_drive : null,
                status: statusInstalacao.ativa,
            });
            const responseInsert = await repositorioInstalacao.createInstalacao(instalacao.getInstalacao())
            if (!responseInsert.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            await repositorioEvento.createEvento(new domainEvento({
                instalacao_id: instalacao.id,
                tipo_evento: eventoRastreio.instalacao_vinculada,
                meta_dados: { nome: instalacao.nome, chave_api_prefixo: instalacao.chave_api_prefixo, chave_admin: chaveAdmin, escopo: instalacao.escopo, atualizado: false },
            }).getEventoRastreio());
            return {
                status: true,
                msg: "Instalação vinculada. Guarde a credencial, ela não será exibida novamente.",
                data: { id: instalacao.id, credencial, atualizado: false, chave_admin: chaveAdmin, escopo: instalacao.escopo }
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no createInstalacaoUseCase - indexInstalacao')
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    // Cadastro do dono da lsak_ (perfil do site) pra o Addon incluir-se como signatário
    // sem pedir nome/CPF/telefone de novo. Segunda checagem: e-mail do me === instalação.
    async getEu(data) {
        try {
            if (!data.instalacao || !data.instalacao.chave_api) return { status: false, msg: "Instalação não autenticada." }
            const checkMe = await apiLegacy.get('/api/admin/integracao/me', data.instalacao.chave_api)
            if (checkMe.statusHttp === 403) return { status: false, msg: "A API recusou a chave de integração. Vincule a chave novamente." }
            if (!checkMe.status) return { status: false, msg: "Ocorreu um erro interno ao consultar o cadastro na API, tente novamente em instantes." }
            const dadosChave = checkMe.data?.data || {};
            if (!dadosChave.email) return { status: false, msg: "Não foi possível confirmar o e-mail da chave na API." }
            const emailMe = String(dadosChave.email).trim().toLowerCase();
            const emailInstalacao = String(data.instalacao.email_usuario || '').trim().toLowerCase();
            if (emailMe !== emailInstalacao) return { status: false, msg: "A chave vinculada não pertence a esta conta Google." }
            return {
                status: true,
                msg: "Cadastro carregado.",
                data: {
                    email: emailMe,
                    nome: dadosChave.nome ? String(dadosChave.nome).trim() : '',
                    cpf: String(dadosChave.cpf || '').replace(/\D/g, ''),
                    telefone: String(dadosChave.telefone || '').replace(/\D/g, ''),
                }
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no createInstalacaoUseCase - getEu')
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async listarInstalacoes() {
        try {
            const response = await repositorioInstalacao.getInstalacoes()
            if (!response.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            return { status: true, data: response.data, msg: "Instalações listadas com sucesso." }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async revogarInstalacao(data) {
        try {
            if (!data.id) return { status: false, msg: "Instalação não informada." }
            const checkInstalacao = await repositorioInstalacao.getInstalacaoById({ id: data.id })
            if (!checkInstalacao.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkInstalacao.exit) return { status: false, msg: "Instalação não encontrada." }
            if (checkInstalacao.data.status === statusInstalacao.revogada) return { status: false, msg: "Instalação já está revogada." }
            const responseUpdate = await repositorioInstalacao.updateInstalacao({ id: data.id, status: statusInstalacao.revogada, data_atualizacao: dateNow() })
            if (!responseUpdate.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            await repositorioEvento.createEvento(new domainEvento({
                instalacao_id: data.id,
                tipo_evento: eventoRastreio.instalacao_revogada,
                meta_dados: { nome: checkInstalacao.data.nome },
            }).getEventoRastreio());
            return { status: true, msg: "Instalação revogada com sucesso." }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new createInstalacaoUseCase();
