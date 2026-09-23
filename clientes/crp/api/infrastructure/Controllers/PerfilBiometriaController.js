

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionPerfilBiometria');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const getUseCase = require('../../@core/usecase/PerfilBiometria/getPerfilBiometriaUseCase');
const createUseCase = require('../../@core/usecase/PerfilBiometria/createPerfilBiometriaUseCase');
const updateUseCase = require('../../@core/usecase/PerfilBiometria/updatePerfilBiometriaUseCase');
const deleteUseCase = require('../../@core/usecase/PerfilBiometria/deletePerfilBiometriaUseCase');
const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const { historico } = require('../../certs')
const SearchParams = require('../gateways/helpers/SearchParams');
const logs = require('../../Logs')

class PerfilBiometriaController {

    async getPerfilBiometria(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            const response = await getUseCase.getPerfilBiometriaById({ id })
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - getPerfilBiometria')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }

    }

    async getMinhaBiometria(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            const data = { user_id: req.session.user.id };
            const response = await getUseCase.getMinhaBiometria(data)
            res.status(response.status ? 200 : 400).json(response)
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - getMinhaBiometria')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getPendentesAprovacao(req, res) {
        try {
            const response = await getUseCase.getPendentesAprovacao()
            res.status(response.status ? 200 : 400).json(response)
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - getPendentesAprovacao')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getPerfilBiometriaByQuery(req, res) {
        try {

            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getPerfilBiometriaByQuery(searchParams)
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - getPerfilBiometriaByQuery')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }

    }

    async getPerfilBiometriaByQueryIdHistorico(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })
            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getPerfilBiometriaByQueryIdHistorico(searchParams, id)
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - getPerfilBiometriaByQueryIdHistorico')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })

        }

    }

    async solicitacaoPerfilBiometria(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            var data = { user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await createUseCase.solicitacaoPerfilBiometria(data, req.session)
            if (response.status) {
                if (!response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: response.object,
                    user_id: req.session.user.id
                })
                res.status(200).json({ status: response.status, msg: response.msg, url: response.data.url })
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
                body: JSON.stringify(req.body)
            }
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - postPerfilBiometria')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }


    async confirmacaoPerfilBiometria(req, res) {
        try {
            if (!req.session.biometria
                || !req.session.biometria.desafio_id
                || !req.session.biometria.foto) return res.status(400).json({ status: false, msg: 'Sessão expirada, faça login novamente.' })
            const { token } = req.body;
            if (!token || token === undefined || token === null || token === '' || token === ' ') return res.status(400).json({ status: false, msg: 'Campo token não pode ser vazio' });
            const data = { token, biometria: req.session.biometria, user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await createUseCase.indexPerfilBiometria(data)
            if (response.status) {
                if (!response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.create.value,
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
                body: JSON.stringify(req.body)
            }
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - postPerfilBiometria')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async buscaImagemSolicitacaoPerfilBiometria(req, res) {
        try {
            const usuario_id = req.params.usuario_id
            if (!usuario_id || usuario_id === undefined || usuario_id === null || usuario_id === '' || usuario_id === ' ') return res.status(400).json({ status: false, msg: 'Campo de indentificação do usuário não pode ser vazio' });
            const data = { usuario_id, user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await getUseCase.getPerfilBiometriaFotoAprovacao(data)
            if (response.status) {
                if (!response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.view.value,
                    dado_atual: response.object,
                    user_id: req.session.user.id
                })
                res.status(200).json({ status: response.status, url: response.url })
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
                body: JSON.stringify(req.body)
            }
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - postPerfilBiometria')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async solicitacaoAprovacaoPerfilBiometria(req, res) {
        try {
            const usuario_id = req.params.usuario_id
            if (!usuario_id || usuario_id === undefined || usuario_id === null || usuario_id === '' || usuario_id === ' ') return res.status(400).json({ status: false, msg: 'Campo de indentificação do usuário não pode ser vazio' });
            const data = { usuario_id, user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await updateUseCase.solicitacaoAprovacaoBiometria(data)
            if (response.status) {
                if (!response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.view.value,
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
                body: JSON.stringify(req.body)
            }
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - postPerfilBiometria')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async confirmacaoAlteracaoStatusPerfilBiometria(req, res) {
        try {
            const { token, statusAprovacao, usuario_id } = req.body;
            if (!token || token === undefined || token === null || token === '' || token === ' ') return res.status(400).json({ status: false, msg: 'Campo token não pode ser vazio' });
            if (!statusAprovacao || statusAprovacao === undefined || statusAprovacao === null || statusAprovacao === '' || statusAprovacao === ' ') return res.status(400).json({ status: false, msg: 'Campo statusAprovacao não pode ser vazio' });
            if (!usuario_id || usuario_id === undefined || usuario_id === null || usuario_id === '' || usuario_id === ' ') return res.status(400).json({ status: false, msg: 'Campo usuario_id não pode ser vazio' });
            if (
                statusAprovacao !== 0 && statusAprovacao !== 1 &&
                statusAprovacao !== '0' && statusAprovacao !== '1' &&
                statusAprovacao !== true && statusAprovacao !== false &&
                statusAprovacao !== 'true' && statusAprovacao !== 'false'
            ) return res.status(400).json({ status: false, msg: 'Campo de status deve ser um boleano válido' });
            const status = (statusAprovacao === 1 || statusAprovacao === '1' || statusAprovacao === true || statusAprovacao === 'true') ? true : false;
            const data = { token, usuario_id, statusAprovacao: status, user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await updateUseCase.indexPerfilBiometria(data)
            if (response.status) {
                if (!response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.view.value,
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
                body: JSON.stringify(req.body)
            }
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - postPerfilBiometria')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }


    async patchPerfilBiometria(req, res) {
        try {
            const id = req.params.id
            const allData = req.body
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            if (allData.rosto_embeddign === undefined || allData.rosto_embeddign === null || allData.rosto_embeddign === '' || allData.rosto_embeddign === ' ') return res.status(400).json({ status: false, msg: 'Campo rosto_embeddign não pode ser vazio' })
            if (allData.bucket_wip_path === undefined || allData.bucket_wip_path === null || allData.bucket_wip_path === '' || allData.bucket_wip_path === ' ') return res.status(400).json({ status: false, msg: 'Campo bucket_wip_path não pode ser vazio' })
            if (allData.termo_id === undefined || allData.termo_id === null || allData.termo_id === '' || allData.termo_id === ' ') return res.status(400).json({ status: false, msg: 'Campo termo_id não pode ser vazio' })
            if (allData.perfil_id === undefined || allData.perfil_id === null || allData.perfil_id === '' || allData.perfil_id === ' ') return res.status(400).json({ status: false, msg: 'Campo perfil_id não pode ser vazio' })
            if (allData.desafio_id === undefined || allData.desafio_id === null || allData.desafio_id === '' || allData.desafio_id === ' ') return res.status(400).json({ status: false, msg: 'Campo desafio_id não pode ser vazio' })

            const response = await updateUseCase.indexPerfilBiometria({ ...allData, id })
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - patchPerfilBiometria')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })

        }
    }


    async deletePerfilBiometria(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            const response = await deleteUseCase.indexPerfilBiometria({ id })
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilBiometriaController - deletePerfilBiometria')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })

        }
    }


}

module.exports = new PerfilBiometriaController();



