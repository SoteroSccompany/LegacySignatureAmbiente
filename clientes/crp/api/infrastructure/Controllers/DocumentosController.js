

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionDocumentos');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const getUseCase = require('../../@core/usecase/Documentos/getDocumentosUseCase');
const createUseCase = require('../../@core/usecase/Documentos/createDocumentosUseCase');
const updateUseCase = require('../../@core/usecase/Documentos/updateDocumentosUseCase');
const deleteUseCase = require('../../@core/usecase/Documentos/deleteDocumentosUseCase');
const cancelarUseCase = require('../../@core/usecase/Documentos/cancelarDocumentoUseCase');
const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const { historico } = require('../../certs')
const SearchParams = require('../gateways/helpers/SearchParams');
const logs = require('../../Logs')

class DocumentosController {

    async getDocumentos(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            const response = await getUseCase.getDocumentosById({ id })
            if (response.status) return res.status(200).json({ status: response.status, data: response.data, msg: response.msg })
            const status = response.response.status === false ? 400 : 404
            res.status(status).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
            }
            logs.getInstance().error(dataLogs, 'Erro no DocumentosController - getDocumentos')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }

    }

    async getDocumentosByQuery(req, res) {
        try {

            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getDocumentosByQuery(searchParams)
            if (response.status) {
                res.status(200).json(response)
            } else {
                res.status(400).json(response)
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
                query: JSON.stringify(req.query)
            }
            logs.getInstance().error(dataLogs, 'Erro no DocumentosController - getDocumentosByQuery')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }

    }

    async getDocumentosByQueryIdHistorico(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })
            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getDocumentosByQueryIdHistorico(searchParams, id)
            if (response.status) {
                res.status(200).json(response)
            } else {
                res.status(400).json(response)
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
                query: JSON.stringify(req.query)
            }
            logs.getInstance().error(dataLogs, 'Erro no DocumentosController - getDocumentosByQueryIdHistorico')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }

    }

    async postDocumentoSolicitacao(req, res) {
        try {
            const { nome_documento, documento_nome, termo_id } = req.body;
            if (!nome_documento || nome_documento.trim() === '') return res.status(400).json({ status: false, msg: 'Campo nome_documento não pode ser vazio' });
            if (!documento_nome || documento_nome.trim() === '') return res.status(400).json({ status: false, msg: 'Campo documento_nome não pode ser vazio' });
            if (!termo_id || termo_id.trim() === '') return res.status(400).json({ status: false, msg: 'Referencia do termo de assinatura não pode ser vazio' });
            const isPdf = documento_nome.toLowerCase().endsWith('.pdf');
            if (!isPdf) return res.status(400).json({ status: false, msg: 'O nome do documento deve terminar com .pdf' });
            const data = { session_id: null, solicitacao_ip: null, solicitacao_porta_logica: null, userAgent: null, desafio_id: null, user_id: null, nome_documento: null, documento_nome: null, meta_data: {} };
            data.meta_data.session_id = req.integracao ? req.integracao.session_id : req.session.id;
            data.meta_data.solicitacao_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            data.meta_data.solicitacao_porta_logica = req.socket.remotePort;
            data.meta_data.userAgent = req.headers['user-agent'];
            data.desafio_id = req.integracao ? req.integracao.desafio_id : req.session.user.desafio_id;
            data.user_id = req.integracao ? req.integracao.user_id : req.session.user.id;
            data.nome_documento = nome_documento;
            data.documento_nome = documento_nome;
            data.termo_id = termo_id;
            if (req.integracao) data.integracao = { chave_id: req.integracao.chave_id };
            const response = await createUseCase.indexDocumentos(data, req.session)
            if (response.status) {
                if (!response.object) throw new Error('object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: response.object,
                    user_id: data.user_id
                })
                if (req.integracao) {
                    return res.status(200).json({
                        status: response.status,
                        msg: response.msg,
                        data: { url: response.data.url, id: response.object.id },
                    });
                }
                req.session.user.solicitacao = response.object;
                return req.session.save((err) => {
                    if (err) {
                        return res.status(500).json({ status: false, msg: 'Erro ao salvar sessão' });
                    }
                    return res.status(200).json({
                        status: response.status,
                        msg: response.msg,
                        data: { url: response.data.url, id: response.object.id },
                    });
                });
            } else {
                if (response.revokeLogin && !req.integracao) {
                    req.session.user = null;
                    req.session.destroy();
                    if (response.object) {
                        historicoUseCase.indexHistorico({
                            transformacao: historico.trnasformcao.create.value,
                            dado_atual: response.object,
                            user_id: data.user_id
                        })
                    }
                }
                res.status(400).json({ status: response.status, msg: response.msg })
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
                body: JSON.stringify(req.body)
            }
            logs.getInstance().error(dataLogs, 'Erro no DocumentosController - postDocumentos')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async putDocumentoConfirmacao(req, res) {
        try {
            if (!req.session.user && !req.integracao) return res.status(401).json({ status: false, msg: 'Usuário não autenticado' });
            const { id } = req.params;
            if (!id) return res.status(400).json({ status: false, msg: 'id é obrigatório' });
            const session_id = req.integracao ? req.integracao.session_id : req.session.id;
            const data = {
                id,
                meta_data: {
                    session_id,
                    solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                    solicitacao_porta_logica: req.socket.remotePort,
                    userAgent: req.headers['user-agent']
                }
            };
            const response = await createUseCase.validateDocument(data, session_id)
            if (response.status) {
                if (!response.object) throw new Error('object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.update.value,
                    dado_antigo: response.oldObject,
                    dado_atual: response.object,
                    user_id: req.integracao ? req.integracao.user_id : req.session.user.id
                })
                res.status(200).json({ status: response.status, msg: response.msg });
            } else {
                if (response.revokeLogin && !req.integracao) {
                    req.session.user = null;
                    req.session.destroy();
                }
                res.status(400).json({ status: response.status, msg: response.msg })
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
                body: JSON.stringify(req.body)
            }
            logs.getInstance().error(dataLogs, 'Erro no DocumentosController - postDocumentos')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async patchDocumentos(req, res) {
        try {
            const id = req.params.id
            const allData = req.body
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            if (allData.bucket_wip_path === undefined || allData.bucket_wip_path === null || allData.bucket_wip_path === '' || allData.bucket_wip_path === ' ') return res.status(400).json({ status: false, msg: 'Campo bucket_wip_path não pode ser vazio' })
            if (allData.bucket_valt_path === undefined || allData.bucket_valt_path === null || allData.bucket_valt_path === '' || allData.bucket_valt_path === ' ') return res.status(400).json({ status: false, msg: 'Campo bucket_valt_path não pode ser vazio' })
            if (allData.status === undefined || allData.status === null || allData.status === '' || allData.status === ' ') return res.status(400).json({ status: false, msg: 'Campo status não pode ser vazio' })
            if (allData.hash_original === undefined || allData.hash_original === null || allData.hash_original === '' || allData.hash_original === ' ') return res.status(400).json({ status: false, msg: 'Campo hash_original não pode ser vazio' })
            if (allData.hash_final === undefined || allData.hash_final === null || allData.hash_final === '' || allData.hash_final === ' ') return res.status(400).json({ status: false, msg: 'Campo hash_final não pode ser vazio' })
            if (allData.hash_final_em === undefined || allData.hash_final_em === null || allData.hash_final_em === '' || allData.hash_final_em === ' ') return res.status(400).json({ status: false, msg: 'Campo hash_final_em não pode ser vazio' })
            if (allData.criado_em === undefined || allData.criado_em === null || allData.criado_em === '' || allData.criado_em === ' ') return res.status(400).json({ status: false, msg: 'Campo criado_em não pode ser vazio' })

            const response = await updateUseCase.indexDocumentos({ ...allData, id })
            if (response.status) {
                if (!response.oldObject || !response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.update.value,
                    dado_atual: response.object,
                    dado_antigo: response.oldObject,
                    user_id: req.session.user.id
                })
                res.status(200).json({ status: response.status, msg: response.msg })
            } else {
                res.status(400).json({ status: response.status, msg: response.msg })
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
                body: JSON.stringify(req.body),
                id: req.params.id
            }
            logs.getInstance().error(dataLogs, 'Erro no DocumentosController - patchDocumentos')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }


    async patchCancelarDocumento(req, res) {
        try {
            if (!req.integracao && !req.session.user) return res.status(400).json({ status: false, msg: 'Sessão expirada, faça login novamente.' })
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            const data = {
                documento_id: id,
                user_id: req.integracao ? req.integracao.user_id : req.session.user.id,
            }
            const response = await cancelarUseCase.indexCancelarDocumento(data)
            if (response.status) {
                if (!response.object) throw new Error('object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.update.value,
                    dado_antigo: response.oldObject,
                    dado_atual: response.object,
                    user_id: data.user_id
                })
                return res.status(200).json({ status: response.status, msg: response.msg })
            }
            if (response.revokeLogin && !req.integracao) {
                req.session.user = null;
                req.session.destroy();
            }
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
                id: req.params.id
            }
            logs.getInstance().error(dataLogs, 'Erro no DocumentosController - patchCancelarDocumento')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async deleteDocumentos(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            const response = await deleteUseCase.indexDocumentos({ id })
            if (response.status) {
                if (!response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.delete.value,
                    dado_atual: response.object,
                    user_id: req.session.user.id
                })
                res.status(200).json({ status: response.status, msg: response.msg })
            } else {
                res.status(400).json({ status: response.status, msg: response.msg })
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
                id: req.params.id
            }
            logs.getInstance().error(dataLogs, 'Erro no DocumentosController - deleteDocumentos')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }


}

module.exports = new DocumentosController();



