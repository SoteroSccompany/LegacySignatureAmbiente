

    const logExeption = require('../../@core/usecase/Logs/exeption/exeptionAuditoriaLedger');
    const ErrorStackParser = require('error-stack-parser');
    const dateNow = require('../gateways/functions/data/getToday');
    const getUseCase = require('../../@core/usecase/AuditoriaLedger/getAuditoriaLedgerUseCase');
    const createUseCase = require('../../@core/usecase/AuditoriaLedger/createAuditoriaLedgerUseCase');
    const updateUseCase = require('../../@core/usecase/AuditoriaLedger/updateAuditoriaLedgerUseCase');
    const deleteUseCase = require('../../@core/usecase/AuditoriaLedger/deleteAuditoriaLedgerUseCase');
    const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
    const { historico } = require('../../certs')
    const SearchParams = require('../gateways/helpers/SearchParams');
    const logs = require('../../Logs')

    class AuditoriaLedgerController {

        async getAuditoriaLedger(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
                    const response = await getUseCase.getAuditoriaLedgerById({id})                  
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerController - getAuditoriaLedger')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getAuditoriaLedgerByQuery(req, res) {
            try {
                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getAuditoriaLedgerByQuery(searchParams)
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerController - getAuditoriaLedgerByQuery')                
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getAuditoriaLedgerByQueryIdHistorico(req, res) {
            try {            
                const id = req.params.id
                if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getAuditoriaLedgerByQueryIdHistorico(searchParams, id)
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerController - getAuditoriaLedgerByQueryIdHistorico')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

            }

        }

        async postAuditoriaLedger(req, res) {
            try {
                const allData = req.body
                if(allData.documento_id === undefined || allData.documento_id === null || allData.documento_id === '' || allData.documento_id === ' ') return res.status(400).json({status: false, msg: 'Campo documento_id não pode ser vazio'}) 
if(allData.desafio_acesso_id === undefined || allData.desafio_acesso_id === null || allData.desafio_acesso_id === '' || allData.desafio_acesso_id === ' ') return res.status(400).json({status: false, msg: 'Campo desafio_acesso_id não pode ser vazio'}) 
if(allData.tipo_evento === undefined || allData.tipo_evento === null || allData.tipo_evento === '' || allData.tipo_evento === ' ') return res.status(400).json({status: false, msg: 'Campo tipo_evento não pode ser vazio'}) 
if(allData.sequencia === undefined || allData.sequencia === null || allData.sequencia === '' || allData.sequencia === ' ') return res.status(400).json({status: false, msg: 'Campo sequencia não pode ser vazio'}) 
if(allData.metadata_json === undefined || allData.metadata_json === null || allData.metadata_json === '' || allData.metadata_json === ' ') return res.status(400).json({status: false, msg: 'Campo metadata_json não pode ser vazio'}) 
if(allData.hash_bytes_pdf === undefined || allData.hash_bytes_pdf === null || allData.hash_bytes_pdf === '' || allData.hash_bytes_pdf === ' ') return res.status(400).json({status: false, msg: 'Campo hash_bytes_pdf não pode ser vazio'}) 
if(allData.hash_registro_anterior === undefined || allData.hash_registro_anterior === null || allData.hash_registro_anterior === '' || allData.hash_registro_anterior === ' ') return res.status(400).json({status: false, msg: 'Campo hash_registro_anterior não pode ser vazio'}) 
if(allData.hash_atual === undefined || allData.hash_atual === null || allData.hash_atual === '' || allData.hash_atual === ' ') return res.status(400).json({status: false, msg: 'Campo hash_atual não pode ser vazio'}) 
if(allData.criado_em === undefined || allData.criado_em === null || allData.criado_em === '' || allData.criado_em === ' ') return res.status(400).json({status: false, msg: 'Campo criado_em não pode ser vazio'}) 

                const response = await createUseCase.indexAuditoriaLedger(allData)
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerController - postAuditoriaLedger')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })    
            }
        }

        async patchAuditoriaLedger(req, res) {
            try {
                const id = req.params.id
                const allData = req.body
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                if(allData.documento_id === undefined || allData.documento_id === null || allData.documento_id === '' || allData.documento_id === ' ') return res.status(400).json({status: false, msg: 'Campo documento_id não pode ser vazio'}) 
if(allData.desafio_acesso_id === undefined || allData.desafio_acesso_id === null || allData.desafio_acesso_id === '' || allData.desafio_acesso_id === ' ') return res.status(400).json({status: false, msg: 'Campo desafio_acesso_id não pode ser vazio'}) 
if(allData.tipo_evento === undefined || allData.tipo_evento === null || allData.tipo_evento === '' || allData.tipo_evento === ' ') return res.status(400).json({status: false, msg: 'Campo tipo_evento não pode ser vazio'}) 
if(allData.sequencia === undefined || allData.sequencia === null || allData.sequencia === '' || allData.sequencia === ' ') return res.status(400).json({status: false, msg: 'Campo sequencia não pode ser vazio'}) 
if(allData.metadata_json === undefined || allData.metadata_json === null || allData.metadata_json === '' || allData.metadata_json === ' ') return res.status(400).json({status: false, msg: 'Campo metadata_json não pode ser vazio'}) 
if(allData.hash_bytes_pdf === undefined || allData.hash_bytes_pdf === null || allData.hash_bytes_pdf === '' || allData.hash_bytes_pdf === ' ') return res.status(400).json({status: false, msg: 'Campo hash_bytes_pdf não pode ser vazio'}) 
if(allData.hash_registro_anterior === undefined || allData.hash_registro_anterior === null || allData.hash_registro_anterior === '' || allData.hash_registro_anterior === ' ') return res.status(400).json({status: false, msg: 'Campo hash_registro_anterior não pode ser vazio'}) 
if(allData.hash_atual === undefined || allData.hash_atual === null || allData.hash_atual === '' || allData.hash_atual === ' ') return res.status(400).json({status: false, msg: 'Campo hash_atual não pode ser vazio'}) 
if(allData.criado_em === undefined || allData.criado_em === null || allData.criado_em === '' || allData.criado_em === ' ') return res.status(400).json({status: false, msg: 'Campo criado_em não pode ser vazio'}) 

                const response = await updateUseCase.indexAuditoriaLedger({...allData, id})
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerController - patchAuditoriaLedger')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


        async deleteAuditoriaLedger(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ')return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                const response = await deleteUseCase.indexAuditoriaLedger({id})
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerController - deleteAuditoriaLedger')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


    }

    module.exports = new AuditoriaLedgerController();



    