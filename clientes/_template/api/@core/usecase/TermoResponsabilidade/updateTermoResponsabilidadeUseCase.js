
const knex = require('../../../infrastructure/db/config/databaseConection')();
const repository = require('../../../infrastructure/db/services/TermoResponsabilidadeRepository');
const domain = require('../../domain/TermoResponsabilidade');
const logExeption = require('../Logs/exeption/exeptionTermoResponsabilidade');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const repositoryUser = require('../../../infrastructure/db/services/UsuarioRepositorio');
const repositoryDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
const authenticator = require('otplib');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const { roles, confiDoisFatores, eventoAuditoria, statusAplication, statusApp, applicationName } = require('../../../certs');
const LedgerDesafioAutenticacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDesafioAutenticacao');
const LedgerTermoResponsabilidade = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerTermoResponsabilidade');
const moment = require('moment');

class updateTermoResponsabilidadeUseCase {

    async indexTermoResponsabilidade(data) {
        try {
            const checkTermo = await repository.getTermoResponsabilidadeById({ id: data.id });
            if (!checkTermo.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkTermo.exit) return { status: false, msg: "Termo de responsabilidade não encontrado." }
            const oldTermo = { ...checkTermo.data };
            const checkUser = await repositoryUser.getById({ id: data.request_user.user_id });
            if (!checkUser.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkUser.exit) return { status: false, msg: "Usuário não encontrado." }
            const user = checkUser.data[0];
            if (user.role !== roles.admin) return { status: false, msg: "Acesso negado. Apenas administradores podem editar termo de responsabilidade." }
            const checkDesafio = await repositoryDesafio.getDesafioAutenticacaoByTipoAndUserIdNaoUsado({ user_id: data.request_user.user_id, tipo_desafio: confiDoisFatores.desafio.cadastro_termo_responsabilidade });
            if (!checkDesafio.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkDesafio.exit) return { status: false, msg: "Solicitação de autenticação não localizada." }
            const desafio = checkDesafio.data;
            const oldDesafio = { ...desafio };
            const sha = new SHA(process.env.SHA);
            const hashToken = sha.hash(data.token);
            if ((statusApp.prod === statusAplication.status) && (hashToken !== desafio.desafio_hash)) return { status: false, msg: "Código inválido" }
            const plainSecret = sha.decrypt(user.codigo_hash);
            const isValid = await authenticator.verify({
                token: data.token, secret: plainSecret, label: `${applicationName}:${user.email}`, issuer: applicationName, epochTolerance: 60
            });
            if (!isValid.valid) return { status: false, msg: "Código de autenticação inválido." }
            const encryptAgent = sha.encrypt(data.request_user.userAgent);
            desafio.confirmacao_ip = data.request_user.solicitacao_ip;
            desafio.criado_em = moment(desafio.criado_em).format('YYYY-MM-DD HH:mm:ss');
            desafio.expira_em = moment(desafio.expira_em).format('YYYY-MM-DD HH:mm:ss');
            desafio.confirmacao_porta_logica = data.request_user.solicitacao_porta_logica;
            desafio.confirmacao_user_agent_hash = encryptAgent;
            desafio.usado = true;
            desafio.consumido_em = dateNow();
            const versaoAnterior = parseInt((oldTermo.versao || '1').split('/')[0]);
            const novaVersao = `${Number.isNaN(versaoAnterior) ? 2 : versaoAnterior + 1}/${moment().format('YYYY_MMDDHHmm')}`;
            const objTermoResponsabilidade = new domain({
                ...oldTermo,
                titulo_termo: data.titulo_termo,
                descricao_termo: sha.encrypt(data.descricao_termo),
                versao: novaVersao,
                desafio_id: desafio.id,
                data_atualizacao: dateNow(),
            });
            const termo = objTermoResponsabilidade.getTermoResponsabilidade();
            termo.ativo = data.ativo === true || data.ativo === 'true' || data.ativo === 1;
            const trx = await knex.transaction();
            try {
                await trx('tab_termo_responsabilidade').update(termo).where('id', termo.id);
                await trx('tab_desafio_autenticacao').update(desafio).where('id', desafio.id);
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                auditoriaDesafio.Initialize(oldDesafio);
                await auditoriaDesafio.GravarAuditoriaModificacao({
                    desafio,
                    tipo_evento: eventoAuditoria.desafio_confirmado.label,
                    sequencia: eventoAuditoria.desafio_confirmado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.cadastro_termo_responsabilidade, termo_id: termo.id },
                    user_id: data.request_user.user_id,
                });
                const auditoriaTermoResponsabilidade = new LedgerTermoResponsabilidade(trx);
                auditoriaTermoResponsabilidade.Initialize(oldTermo);
                await auditoriaTermoResponsabilidade.GravarAuditoriaModificacao({
                    termo,
                    tipo_evento: eventoAuditoria.termo_responsabilidade_atualizado.label,
                    sequencia: eventoAuditoria.termo_responsabilidade_atualizado.sequencia,
                    meta_data: { desafio_id: desafio.id, tipo_termo: termo.tipo_termo },
                    user_id: data.request_user.user_id,
                });
                await trx.commit();
                return {
                    status: true,
                    oldObject: oldTermo,
                    object: termo,
                    msg: "Termo de responsabilidade atualizado com sucesso!"
                }
            } catch (error) {
                console.log(error)
                await trx.rollback();
                if (error?.name === 'ErrorLedgerDesafioAutenticacao' || error?.name === 'ErrorLedgerTermoResponsabilidade') {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: "Estamos passando por instabilidades, tente novamente em instantes." }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case TermoResponsabilidade - updateTermoResponsabilidadeUseCase - indexTermoResponsabilidade', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new updateTermoResponsabilidadeUseCase();
