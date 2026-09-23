

    const logExeption = require('../../@core/usecase/Logs/exeption/exeptionAuditoriaLedgerSolicitacao');
    const ErrorStackParser = require('error-stack-parser');
    const dateNow = require('../gateways/functions/data/getToday');
    const getUseCase = require('../../@core/usecase/AuditoriaLedgerSolicitacao/getAuditoriaLedgerSolicitacaoUseCase');
    const createUseCase = require('../../@core/usecase/AuditoriaLedgerSolicitacao/createAuditoriaLedgerSolicitacaoUseCase');
    const updateUseCase = require('../../@core/usecase/AuditoriaLedgerSolicitacao/updateAuditoriaLedgerSolicitacaoUseCase');
    const deleteUseCase = require('../../@core/usecase/AuditoriaLedgerSolicitacao/deleteAuditoriaLedgerSolicitacaoUseCase');
    const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
    const { historico } = require('../../certs')
    const SearchParams = require('../gateways/helpers/SearchParams');
    const logs = require('../../Logs')

    class AuditoriaLedgerSolicitacaoController {

        async getAuditoriaLedgerSolicitacao(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
                    const response = await getUseCase.getAuditoriaLedgerSolicitacaoById({id})                  
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerSolicitacaoController - getAuditoriaLedgerSolicitacao')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getAuditoriaLedgerSolicitacaoByQuery(req, res) {
            try {
                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getAuditoriaLedgerSolicitacaoByQuery(searchParams)
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerSolicitacaoController - getAuditoriaLedgerSolicitacaoByQuery')                
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getAuditoriaLedgerSolicitacaoByQueryIdHistorico(req, res) {
            try {            
                const id = req.params.id
                if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getAuditoriaLedgerSolicitacaoByQueryIdHistorico(searchParams, id)
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerSolicitacaoController - getAuditoriaLedgerSolicitacaoByQueryIdHistorico')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

            }

        }

        async postAuditoriaLedgerSolicitacao(req, res) {
            try {
                const allData = req.body
                if(allData.solicitacao_id === undefined || allData.solicitacao_id === null || allData.solicitacao_id === '' || allData.solicitacao_id === ' ') return res.status(400).json({status: false, msg: 'Campo solicitacao_id não pode ser vazio'}) 
if(allData.documento_id === undefined || allData.documento_id === null || allData.documento_id === '' || allData.documento_id === ' ') return res.status(400).json({status: false, msg: 'Campo documento_id não pode ser vazio'}) 
if(allData.tipo_evento === undefined || allData.tipo_evento === null || allData.tipo_evento === '' || allData.tipo_evento === ' ') return res.status(400).json({status: false, msg: 'Campo tipo_evento não pode ser vazio'}) 
if(allData.sequencia === undefined || allData.sequencia === null || allData.sequencia === '' || allData.sequencia === ' ') return res.status(400).json({status: false, msg: 'Campo sequencia não pode ser vazio'}) 
if(allData.metadata_json === undefined || allData.metadata_json === null || allData.metadata_json === '' || allData.metadata_json === ' ') return res.status(400).json({status: false, msg: 'Campo metadata_json não pode ser vazio'}) 
if(allData.hash_atual === undefined || allData.hash_atual === null || allData.hash_atual === '' || allData.hash_atual === ' ') return res.status(400).json({status: false, msg: 'Campo hash_atual não pode ser vazio'}) 
if(allData.hash_registro_anterior === undefined || allData.hash_registro_anterior === null || allData.hash_registro_anterior === '' || allData.hash_registro_anterior === ' ') return res.status(400).json({status: false, msg: 'Campo hash_registro_anterior não pode ser vazio'}) 
if(allData.bucket_path === undefined || allData.bucket_path === null || allData.bucket_path === '' || allData.bucket_path === ' ') return res.status(400).json({status: false, msg: 'Campo bucket_path não pode ser vazio'}) 
if(allData.object_name === undefined || allData.object_name === null || allData.object_name === '' || allData.object_name === ' ') return res.status(400).json({status: false, msg: 'Campo object_name não pode ser vazio'}) 
if(allData.payload_sha256 === undefined || allData.payload_sha256 === null || allData.payload_sha256 === '' || allData.payload_sha256 === ' ') return res.status(400).json({status: false, msg: 'Campo payload_sha256 não pode ser vazio'}) 
if(allData.envelope_sha256 === undefined || allData.envelope_sha256 === null || allData.envelope_sha256 === '' || allData.envelope_sha256 === ' ') return res.status(400).json({status: false, msg: 'Campo envelope_sha256 não pode ser vazio'}) 
if(allData.criado_em === undefined || allData.criado_em === null || allData.criado_em === '' || allData.criado_em === ' ') return res.status(400).json({status: false, msg: 'Campo criado_em não pode ser vazio'}) 

                const response = await createUseCase.indexAuditoriaLedgerSolicitacao(allData)
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerSolicitacaoController - postAuditoriaLedgerSolicitacao')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })    
            }
        }

        async patchAuditoriaLedgerSolicitacao(req, res) {
            try {
                const id = req.params.id
                const allData = req.body
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                if(allData.solicitacao_id === undefined || allData.solicitacao_id === null || allData.solicitacao_id === '' || allData.solicitacao_id === ' ') return res.status(400).json({status: false, msg: 'Campo solicitacao_id não pode ser vazio'}) 
if(allData.documento_id === undefined || allData.documento_id === null || allData.documento_id === '' || allData.documento_id === ' ') return res.status(400).json({status: false, msg: 'Campo documento_id não pode ser vazio'}) 
if(allData.tipo_evento === undefined || allData.tipo_evento === null || allData.tipo_evento === '' || allData.tipo_evento === ' ') return res.status(400).json({status: false, msg: 'Campo tipo_evento não pode ser vazio'}) 
if(allData.sequencia === undefined || allData.sequencia === null || allData.sequencia === '' || allData.sequencia === ' ') return res.status(400).json({status: false, msg: 'Campo sequencia não pode ser vazio'}) 
if(allData.metadata_json === undefined || allData.metadata_json === null || allData.metadata_json === '' || allData.metadata_json === ' ') return res.status(400).json({status: false, msg: 'Campo metadata_json não pode ser vazio'}) 
if(allData.hash_atual === undefined || allData.hash_atual === null || allData.hash_atual === '' || allData.hash_atual === ' ') return res.status(400).json({status: false, msg: 'Campo hash_atual não pode ser vazio'}) 
if(allData.hash_registro_anterior === undefined || allData.hash_registro_anterior === null || allData.hash_registro_anterior === '' || allData.hash_registro_anterior === ' ') return res.status(400).json({status: false, msg: 'Campo hash_registro_anterior não pode ser vazio'}) 
if(allData.bucket_path === undefined || allData.bucket_path === null || allData.bucket_path === '' || allData.bucket_path === ' ') return res.status(400).json({status: false, msg: 'Campo bucket_path não pode ser vazio'}) 
if(allData.object_name === undefined || allData.object_name === null || allData.object_name === '' || allData.object_name === ' ') return res.status(400).json({status: false, msg: 'Campo object_name não pode ser vazio'}) 
if(allData.payload_sha256 === undefined || allData.payload_sha256 === null || allData.payload_sha256 === '' || allData.payload_sha256 === ' ') return res.status(400).json({status: false, msg: 'Campo payload_sha256 não pode ser vazio'}) 
if(allData.envelope_sha256 === undefined || allData.envelope_sha256 === null || allData.envelope_sha256 === '' || allData.envelope_sha256 === ' ') return res.status(400).json({status: false, msg: 'Campo envelope_sha256 não pode ser vazio'}) 
if(allData.criado_em === undefined || allData.criado_em === null || allData.criado_em === '' || allData.criado_em === ' ') return res.status(400).json({status: false, msg: 'Campo criado_em não pode ser vazio'}) 

                const response = await updateUseCase.indexAuditoriaLedgerSolicitacao({...allData, id})
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerSolicitacaoController - patchAuditoriaLedgerSolicitacao')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


        async deleteAuditoriaLedgerSolicitacao(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ')return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                const response = await deleteUseCase.indexAuditoriaLedgerSolicitacao({id})
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
                logs.getInstance().error(dataLogs, 'Erro no AuditoriaLedgerSolicitacaoController - deleteAuditoriaLedgerSolicitacao')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


    }

    module.exports = new AuditoriaLedgerSolicitacaoController();



    