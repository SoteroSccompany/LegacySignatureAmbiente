

    const logExeption = require('../../@core/usecase/Logs/exeption/exeptionDesafioAutenticacao');
    const ErrorStackParser = require('error-stack-parser');
    const dateNow = require('../gateways/functions/data/getToday');
    const getUseCase = require('../../@core/usecase/DesafioAutenticacao/getDesafioAutenticacaoUseCase');
    const createUseCase = require('../../@core/usecase/DesafioAutenticacao/createDesafioAutenticacaoUseCase');
    const updateUseCase = require('../../@core/usecase/DesafioAutenticacao/updateDesafioAutenticacaoUseCase');
    const deleteUseCase = require('../../@core/usecase/DesafioAutenticacao/deleteDesafioAutenticacaoUseCase');
    const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
    const { historico } = require('../../certs')
    const SearchParams = require('../gateways/helpers/SearchParams');
    const logs = require('../../Logs')

    class DesafioAutenticacaoController {

        async getDesafioAutenticacao(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
                    const response = await getUseCase.getDesafioAutenticacaoById({id})                  
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
                logs.getInstance().error(dataLogs, 'Erro no DesafioAutenticacaoController - getDesafioAutenticacao')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getDesafioAutenticacaoByQuery(req, res) {
            try {
                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getDesafioAutenticacaoByQuery(searchParams)
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
                logs.getInstance().error(dataLogs, 'Erro no DesafioAutenticacaoController - getDesafioAutenticacaoByQuery')                
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getDesafioAutenticacaoByQueryIdHistorico(req, res) {
            try {            
                const id = req.params.id
                if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getDesafioAutenticacaoByQueryIdHistorico(searchParams, id)
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
                logs.getInstance().error(dataLogs, 'Erro no DesafioAutenticacaoController - getDesafioAutenticacaoByQueryIdHistorico')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

            }

        }

        async postDesafioAutenticacao(req, res) {
            try {
                const allData = req.body
                if(allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({status: false, msg: 'Campo user_id não pode ser vazio'}) 
if(allData.document_id === undefined || allData.document_id === null || allData.document_id === '' || allData.document_id === ' ') return res.status(400).json({status: false, msg: 'Campo document_id não pode ser vazio'}) 
if(allData.sessao_id === undefined || allData.sessao_id === null || allData.sessao_id === '' || allData.sessao_id === ' ') return res.status(400).json({status: false, msg: 'Campo sessao_id não pode ser vazio'}) 
if(allData.tipo_desafio === undefined || allData.tipo_desafio === null || allData.tipo_desafio === '' || allData.tipo_desafio === ' ') return res.status(400).json({status: false, msg: 'Campo tipo_desafio não pode ser vazio'}) 
if(allData.codigo_hash === undefined || allData.codigo_hash === null || allData.codigo_hash === '' || allData.codigo_hash === ' ') return res.status(400).json({status: false, msg: 'Campo codigo_hash não pode ser vazio'}) 
if(allData.usado === undefined || allData.usado === null || allData.usado === '' || allData.usado === ' ') return res.status(400).json({status: false, msg: 'Campo usado não pode ser vazio'}) 
if(allData.expira_em === undefined || allData.expira_em === null || allData.expira_em === '' || allData.expira_em === ' ') return res.status(400).json({status: false, msg: 'Campo expira_em não pode ser vazio'}) 
if(allData.criado_em === undefined || allData.criado_em === null || allData.criado_em === '' || allData.criado_em === ' ') return res.status(400).json({status: false, msg: 'Campo criado_em não pode ser vazio'}) 
if(allData.consumido_em === undefined || allData.consumido_em === null || allData.consumido_em === '' || allData.consumido_em === ' ') return res.status(400).json({status: false, msg: 'Campo consumido_em não pode ser vazio'}) 
if(allData.solicitacao_ip === undefined || allData.solicitacao_ip === null || allData.solicitacao_ip === '' || allData.solicitacao_ip === ' ') return res.status(400).json({status: false, msg: 'Campo solicitacao_ip não pode ser vazio'}) 
if(allData.solicitacao_porta_logica === undefined || allData.solicitacao_porta_logica === null || allData.solicitacao_porta_logica === '' || allData.solicitacao_porta_logica === ' ') return res.status(400).json({status: false, msg: 'Campo solicitacao_porta_logica não pode ser vazio'}) 
if(allData.solicitacao_user_agent_hash === undefined || allData.solicitacao_user_agent_hash === null || allData.solicitacao_user_agent_hash === '' || allData.solicitacao_user_agent_hash === ' ') return res.status(400).json({status: false, msg: 'Campo solicitacao_user_agent_hash não pode ser vazio'}) 
if(allData.confirmacao_ip === undefined || allData.confirmacao_ip === null || allData.confirmacao_ip === '' || allData.confirmacao_ip === ' ') return res.status(400).json({status: false, msg: 'Campo confirmacao_ip não pode ser vazio'}) 
if(allData.confirmacao_porta_logica === undefined || allData.confirmacao_porta_logica === null || allData.confirmacao_porta_logica === '' || allData.confirmacao_porta_logica === ' ') return res.status(400).json({status: false, msg: 'Campo confirmacao_porta_logica não pode ser vazio'}) 
if(allData.confirmacao_user_agent_hash === undefined || allData.confirmacao_user_agent_hash === null || allData.confirmacao_user_agent_hash === '' || allData.confirmacao_user_agent_hash === ' ') return res.status(400).json({status: false, msg: 'Campo confirmacao_user_agent_hash não pode ser vazio'}) 

                const response = await createUseCase.indexDesafioAutenticacao(allData)
                if(response.status){
                    if (!response.object) throw new Error('oldObject e object estao undefined')
                    historicoUseCase.indexHistorico({
                        transformacao: historico.trnasformcao.create.value,
                        dado_atual: response.object,
                        user_id: req.session.user.id
                    })
                    res.status(200).json({ status: response.status, msg: response.msg })
                }else{
                    res.status(400).json({status: response.status, msg: response.msg})
                }
            }catch (err) {
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
                logs.getInstance().error(dataLogs, 'Erro no DesafioAutenticacaoController - postDesafioAutenticacao')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })    
            }
        }

        async patchDesafioAutenticacao(req, res) {
            try {
                const id = req.params.id
                const allData = req.body
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                if(allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({status: false, msg: 'Campo user_id não pode ser vazio'}) 
if(allData.document_id === undefined || allData.document_id === null || allData.document_id === '' || allData.document_id === ' ') return res.status(400).json({status: false, msg: 'Campo document_id não pode ser vazio'}) 
if(allData.sessao_id === undefined || allData.sessao_id === null || allData.sessao_id === '' || allData.sessao_id === ' ') return res.status(400).json({status: false, msg: 'Campo sessao_id não pode ser vazio'}) 
if(allData.tipo_desafio === undefined || allData.tipo_desafio === null || allData.tipo_desafio === '' || allData.tipo_desafio === ' ') return res.status(400).json({status: false, msg: 'Campo tipo_desafio não pode ser vazio'}) 
if(allData.codigo_hash === undefined || allData.codigo_hash === null || allData.codigo_hash === '' || allData.codigo_hash === ' ') return res.status(400).json({status: false, msg: 'Campo codigo_hash não pode ser vazio'}) 
if(allData.usado === undefined || allData.usado === null || allData.usado === '' || allData.usado === ' ') return res.status(400).json({status: false, msg: 'Campo usado não pode ser vazio'}) 
if(allData.expira_em === undefined || allData.expira_em === null || allData.expira_em === '' || allData.expira_em === ' ') return res.status(400).json({status: false, msg: 'Campo expira_em não pode ser vazio'}) 
if(allData.criado_em === undefined || allData.criado_em === null || allData.criado_em === '' || allData.criado_em === ' ') return res.status(400).json({status: false, msg: 'Campo criado_em não pode ser vazio'}) 
if(allData.consumido_em === undefined || allData.consumido_em === null || allData.consumido_em === '' || allData.consumido_em === ' ') return res.status(400).json({status: false, msg: 'Campo consumido_em não pode ser vazio'}) 
if(allData.solicitacao_ip === undefined || allData.solicitacao_ip === null || allData.solicitacao_ip === '' || allData.solicitacao_ip === ' ') return res.status(400).json({status: false, msg: 'Campo solicitacao_ip não pode ser vazio'}) 
if(allData.solicitacao_porta_logica === undefined || allData.solicitacao_porta_logica === null || allData.solicitacao_porta_logica === '' || allData.solicitacao_porta_logica === ' ') return res.status(400).json({status: false, msg: 'Campo solicitacao_porta_logica não pode ser vazio'}) 
if(allData.solicitacao_user_agent_hash === undefined || allData.solicitacao_user_agent_hash === null || allData.solicitacao_user_agent_hash === '' || allData.solicitacao_user_agent_hash === ' ') return res.status(400).json({status: false, msg: 'Campo solicitacao_user_agent_hash não pode ser vazio'}) 
if(allData.confirmacao_ip === undefined || allData.confirmacao_ip === null || allData.confirmacao_ip === '' || allData.confirmacao_ip === ' ') return res.status(400).json({status: false, msg: 'Campo confirmacao_ip não pode ser vazio'}) 
if(allData.confirmacao_porta_logica === undefined || allData.confirmacao_porta_logica === null || allData.confirmacao_porta_logica === '' || allData.confirmacao_porta_logica === ' ') return res.status(400).json({status: false, msg: 'Campo confirmacao_porta_logica não pode ser vazio'}) 
if(allData.confirmacao_user_agent_hash === undefined || allData.confirmacao_user_agent_hash === null || allData.confirmacao_user_agent_hash === '' || allData.confirmacao_user_agent_hash === ' ') return res.status(400).json({status: false, msg: 'Campo confirmacao_user_agent_hash não pode ser vazio'}) 

                const response = await updateUseCase.indexDesafioAutenticacao({...allData, id})
                if(response.status){
                    if (!response.oldObject || !response.object) throw new Error('oldObject e object estao undefined')
                    historicoUseCase.indexHistorico({
                        transformacao: historico.trnasformcao.update.value,
                        dado_atual: response.object,
                        dado_antigo: response.oldObject,
                        user_id: req.session.user.id
                    })
                    res.status(200).json({ status: response.status, msg: response.msg })
                }else{
                    res.status(400).json({status: response.status, msg: response.msg})
                }
            }catch (err) {
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
                logs.getInstance().error(dataLogs, 'Erro no DesafioAutenticacaoController - patchDesafioAutenticacao')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


        async deleteDesafioAutenticacao(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ')return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                const response = await deleteUseCase.indexDesafioAutenticacao({id})
                if(response.status){
                    if (!response.object) throw new Error('oldObject e object estao undefined')
                    historicoUseCase.indexHistorico({
                        transformacao: historico.trnasformcao.delete.value,
                        dado_atual: response.object,
                        user_id: req.session.user.id
                    })
                    res.status(200).json({ status: response.status, msg: response.msg })
                }else{
                    res.status(400).json({ status: response.status, msg: response.msg })
                }
            }catch (err) {
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
                logs.getInstance().error(dataLogs, 'Erro no DesafioAutenticacaoController - deleteDesafioAutenticacao')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


    }

    module.exports = new DesafioAutenticacaoController();



    