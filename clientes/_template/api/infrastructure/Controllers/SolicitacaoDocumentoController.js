

    const logExeption = require('../../@core/usecase/Logs/exeption/exeptionSolicitacaoDocumento');
    const ErrorStackParser = require('error-stack-parser');
    const dateNow = require('../gateways/functions/data/getToday');
    const getUseCase = require('../../@core/usecase/SolicitacaoDocumento/getSolicitacaoDocumentoUseCase');
    const createUseCase = require('../../@core/usecase/SolicitacaoDocumento/createSolicitacaoDocumentoUseCase');
    const updateUseCase = require('../../@core/usecase/SolicitacaoDocumento/updateSolicitacaoDocumentoUseCase');
    const deleteUseCase = require('../../@core/usecase/SolicitacaoDocumento/deleteSolicitacaoDocumentoUseCase');
    const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
    const { historico } = require('../../certs')
    const SearchParams = require('../gateways/helpers/SearchParams');
    const logs = require('../../Logs')

    class SolicitacaoDocumentoController {

        async getSolicitacaoDocumento(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
                    const response = await getUseCase.getSolicitacaoDocumentoById({id})                  
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
                logs.getInstance().error(dataLogs, 'Erro no SolicitacaoDocumentoController - getSolicitacaoDocumento')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getSolicitacaoDocumentoByQuery(req, res) {
            try {
                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getSolicitacaoDocumentoByQuery(searchParams)
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
                logs.getInstance().error(dataLogs, 'Erro no SolicitacaoDocumentoController - getSolicitacaoDocumentoByQuery')                
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getSolicitacaoDocumentoByQueryIdHistorico(req, res) {
            try {            
                const id = req.params.id
                if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getSolicitacaoDocumentoByQueryIdHistorico(searchParams, id)
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
                logs.getInstance().error(dataLogs, 'Erro no SolicitacaoDocumentoController - getSolicitacaoDocumentoByQueryIdHistorico')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

            }

        }

        async postSolicitacaoDocumento(req, res) {
            try {
                const allData = req.body
                if(allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({status: false, msg: 'Campo user_id não pode ser vazio'}) 
if(allData.status === undefined || allData.status === null || allData.status === '' || allData.status === ' ') return res.status(400).json({status: false, msg: 'Campo status não pode ser vazio'}) 
if(allData.object_name === undefined || allData.object_name === null || allData.object_name === '' || allData.object_name === ' ') return res.status(400).json({status: false, msg: 'Campo object_name não pode ser vazio'}) 
if(allData.bucket_wip_path === undefined || allData.bucket_wip_path === null || allData.bucket_wip_path === '' || allData.bucket_wip_path === ' ') return res.status(400).json({status: false, msg: 'Campo bucket_wip_path não pode ser vazio'}) 
if(allData.desafio_id === undefined || allData.desafio_id === null || allData.desafio_id === '' || allData.desafio_id === ' ') return res.status(400).json({status: false, msg: 'Campo desafio_id não pode ser vazio'}) 
if(allData.erro_msg === undefined || allData.erro_msg === null || allData.erro_msg === '' || allData.erro_msg === ' ') return res.status(400).json({status: false, msg: 'Campo erro_msg não pode ser vazio'}) 

                const response = await createUseCase.indexSolicitacaoDocumento(allData)
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
                logs.getInstance().error(dataLogs, 'Erro no SolicitacaoDocumentoController - postSolicitacaoDocumento')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })    
            }
        }

        async patchSolicitacaoDocumento(req, res) {
            try {
                const id = req.params.id
                const allData = req.body
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                if(allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({status: false, msg: 'Campo user_id não pode ser vazio'}) 
if(allData.status === undefined || allData.status === null || allData.status === '' || allData.status === ' ') return res.status(400).json({status: false, msg: 'Campo status não pode ser vazio'}) 
if(allData.object_name === undefined || allData.object_name === null || allData.object_name === '' || allData.object_name === ' ') return res.status(400).json({status: false, msg: 'Campo object_name não pode ser vazio'}) 
if(allData.bucket_wip_path === undefined || allData.bucket_wip_path === null || allData.bucket_wip_path === '' || allData.bucket_wip_path === ' ') return res.status(400).json({status: false, msg: 'Campo bucket_wip_path não pode ser vazio'}) 
if(allData.desafio_id === undefined || allData.desafio_id === null || allData.desafio_id === '' || allData.desafio_id === ' ') return res.status(400).json({status: false, msg: 'Campo desafio_id não pode ser vazio'}) 
if(allData.erro_msg === undefined || allData.erro_msg === null || allData.erro_msg === '' || allData.erro_msg === ' ') return res.status(400).json({status: false, msg: 'Campo erro_msg não pode ser vazio'}) 

                const response = await updateUseCase.indexSolicitacaoDocumento({...allData, id})
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
                logs.getInstance().error(dataLogs, 'Erro no SolicitacaoDocumentoController - patchSolicitacaoDocumento')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


        async deleteSolicitacaoDocumento(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ')return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                const response = await deleteUseCase.indexSolicitacaoDocumento({id})
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
                logs.getInstance().error(dataLogs, 'Erro no SolicitacaoDocumentoController - deleteSolicitacaoDocumento')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


    }

    module.exports = new SolicitacaoDocumentoController();



    