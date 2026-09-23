
const crypto = require('crypto');
const knex = require('../../../infrastructure/db/config/databaseConection')();
const documentoVerificacaoRepository = require('../../../infrastructure/db/services/DocumentoVerificacaoRepository');
const documentoValidacaoRepository = require('../../../infrastructure/db/services/DocumentoValidacaoRepository');
const { validarCodigoVerificacao } = require('../../../infrastructure/gateways/functions/documentoVerificacao');
const domainDocumentoValidacao = require('../../domain/DocumentoValidacao');
const domainHistorico = require('../../domain/Historico');
const logExeption = require('../Logs/exeption/exeptionAuditoriaLedger');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { eventoAuditoria, historico, statusValidacaoDocumento } = require('../../../certs/index');
const LedgerDocumentoValidacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDocumentoValidacao');

// hash_conferido_com: 'original' (hash_original e ainda sem hash_final), 'final' (hash_final), 'elo' (hash_documento_final de um elo da cadeia mestre)

class validarDocumentoEnviadoUseCase {

    async validarDocumentoEnviado(data) {
        try {
            const codigo_verificacao = data.codigo_verificacao;
            const buffer = data.buffer;
            if (codigo_verificacao === undefined || codigo_verificacao === null || codigo_verificacao === '' || codigo_verificacao === ' ') return { status: false, msg: 'codigo é obrigatório' };
            if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return { status: false, msg: 'Arquivo PDF é obrigatório.' };
            if (buffer.length > 20 * 1024 * 1024) return { status: false, msg: 'Arquivo excede o limite de 20MB.' };
            const magic = buffer.slice(0, 4).toString('utf8');
            if (magic !== '%PDF') return { status: false, msg: 'O arquivo enviado não é um PDF válido.' };

            const hashEnviado = crypto.createHash('sha256').update(buffer).digest('hex');

            const busca = await documentoVerificacaoRepository.getByCodigo({ codigo_verificacao });
            if (!busca.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' };
            if (!busca.exit) return { status: true, msg: 'Documento não encontrado para este código de verificação.', data: { veredito: statusValidacaoDocumento.nao_encontrado, hash_documento_enviado: hashEnviado, hash_conferido_com: null, elo: null } };
            const registroVerificacao = busca.data;
            const documento = await knex('tab_documentos').select('*').where('id', registroVerificacao.documento_id).first();
            if (!documento) {
                return {
                    status: true,
                    msg: 'Documento não encontrado para este código de verificação.',
                    data: {
                        veredito: statusValidacaoDocumento.nao_encontrado,
                        hash_documento_enviado: hashEnviado,
                        hash_conferido_com: null,
                        elo: null,
                    },
                };
            }
            const valido = validarCodigoVerificacao({
                documento_id: documento.id,
                hash_original: documento.hash_original,
                codigo_verificacao,
            });
            if (!valido) {
                return {
                    status: true,
                    msg: 'Documento não encontrado para este código de verificação.',
                    data: {
                        veredito: statusValidacaoDocumento.nao_encontrado,
                        hash_documento_enviado: hashEnviado,
                        hash_conferido_com: null,
                        elo: null,
                    },
                };
            }

            const elos = await knex('tab_auditoria_ledger')
                .select('id', 'sequencia', 'tipo_evento', 'hash_documento_final')
                .where('documento_id', documento.id)
                .where('deletado', false)
                .orderBy('sequencia', 'asc');

            const hashEnviadoBuf = Buffer.from(String(hashEnviado));
            let hash_conferido_com = null;
            let auditoria_ledger_id = null;
            let elo = null;
            let veredito = statusValidacaoDocumento.divergente;

            let matchOriginal = false;
            if (documento.hash_original) {
                const originalBuf = Buffer.from(String(documento.hash_original));
                if (hashEnviadoBuf.length === originalBuf.length) matchOriginal = crypto.timingSafeEqual(hashEnviadoBuf, originalBuf);
            }
            let matchFinal = false;
            if (documento.hash_final) {
                const finalBuf = Buffer.from(String(documento.hash_final));
                if (hashEnviadoBuf.length === finalBuf.length) matchFinal = crypto.timingSafeEqual(hashEnviadoBuf, finalBuf);
            }

            if (matchOriginal && !documento.hash_final) {
                veredito = statusValidacaoDocumento.integro;
                hash_conferido_com = 'original';
            } else if (matchFinal) {
                veredito = statusValidacaoDocumento.integro;
                hash_conferido_com = 'final';
            } else {
                let eloCasado = null;
                for (const registro of elos) {
                    if (!registro.hash_documento_final) continue;
                    const eloBuf = Buffer.from(String(registro.hash_documento_final));
                    if (hashEnviadoBuf.length !== eloBuf.length) continue;
                    if (!crypto.timingSafeEqual(hashEnviadoBuf, eloBuf)) continue;
                    eloCasado = registro;
                }
                if (eloCasado) {
                    veredito = statusValidacaoDocumento.integro;
                    hash_conferido_com = 'elo';
                    auditoria_ledger_id = eloCasado.id;
                    elo = {
                        auditoria_ledger_id: eloCasado.id,
                        sequencia: eloCasado.sequencia,
                        tipo_evento: eloCasado.tipo_evento,
                    };
                }
            }

            const validacao = new domainDocumentoValidacao({
                documento_id: documento.id,
                codigo_consultado: codigo_verificacao,
                hash_documento_enviado: hashEnviado,
                veredito,
                hash_conferido_com,
                auditoria_ledger_id,
                ip: data.ip,
                porta_logica: data.porta_logica,
                user_agent: data.user_agent,
            });
            const solicitacao = await knex('tab_solicitacao_documento').select('user_id').where('documento_id', documento.id).first();
            const user_id = solicitacao ? solicitacao.user_id : null;

            const trx = await knex.transaction();
            try {
                const persist = await documentoValidacaoRepository.create(validacao.getDocumentoValidacao(), trx);
                if (!persist.status) throw new Error(persist.msg);
                const auditoria = new LedgerDocumentoValidacao(trx);
                await auditoria.GravarAuditoriaCriacao({
                    validacao: validacao.getDocumentoValidacao(),
                    tipo_evento: eventoAuditoria.documento_validacao_solicitada.label,
                    sequencia: eventoAuditoria.documento_validacao_solicitada.sequencia,
                    meta_data: {
                        veredito,
                        hash_documento_enviado: hashEnviado,
                        hash_conferido_com,
                        auditoria_ledger_id,
                        ip: data.ip,
                    },
                    user_id,
                });
                await trx('tab_historico').insert(new domainHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: validacao.getDocumentoValidacao(),
                    data_criacao: validacao.data_criacao,
                    user_id,
                }).getHistorico());
                await trx.commit();
                let msg = 'O arquivo enviado diverge do documento registrado.';
                if (veredito === statusValidacaoDocumento.integro) msg = 'Documento íntegro. O arquivo enviado corresponde ao registrado.';
                return {
                    status: true,
                    msg,
                    data: {
                        veredito,
                        hash_documento_enviado: hashEnviado,
                        hash_conferido_com,
                        elo,
                    },
                };
            } catch (error) {
                await trx.rollback();
                console.log(error);
                if (error?.name === 'ErrorLedgerDocumentoValidacao') {
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
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
            logExeption({
                descricaoDoErro: 'Exeption estourada. use case AuditoriaLedger - validarDocumentoEnviadoUseCase - validarDocumentoEnviado',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                data_atualizacao: dateNow(),
                deletado: false
            })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new validarDocumentoEnviadoUseCase();
