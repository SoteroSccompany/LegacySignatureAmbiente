

    const logExeption = require('../../@core/usecase/Logs/exeption/exeptionIdentificacaoBiometrica');
    const ErrorStackParser = require('error-stack-parser');
    const dateNow = require('../gateways/functions/data/getToday');
    const getUseCase = require('../../@core/usecase/IdentificacaoBiometrica/getIdentificacaoBiometricaUseCase');
    const createUseCase = require('../../@core/usecase/IdentificacaoBiometrica/createIdentificacaoBiometricaUseCase');
    const updateUseCase = require('../../@core/usecase/IdentificacaoBiometrica/updateIdentificacaoBiometricaUseCase');
    const deleteUseCase = require('../../@core/usecase/IdentificacaoBiometrica/deleteIdentificacaoBiometricaUseCase');
    const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
    const { historico } = require('../../certs')
    const SearchParams = require('../gateways/helpers/SearchParams');
    const logs = require('../../Logs')

    class IdentificacaoBiometricaController {

        async getIdentificacaoBiometrica(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
                    const response = await getUseCase.getIdentificacaoBiometricaById({id})                  
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
                logs.getInstance().error(dataLogs, 'Erro no IdentificacaoBiometricaController - getIdentificacaoBiometrica')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getIdentificacaoBiometricaByQuery(req, res) {
            try {
                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getIdentificacaoBiometricaByQuery(searchParams)
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
                logs.getInstance().error(dataLogs, 'Erro no IdentificacaoBiometricaController - getIdentificacaoBiometricaByQuery')                
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getIdentificacaoBiometricaByQueryIdHistorico(req, res) {
            try {            
                const id = req.params.id
                if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getIdentificacaoBiometricaByQueryIdHistorico(searchParams, id)
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
                logs.getInstance().error(dataLogs, 'Erro no IdentificacaoBiometricaController - getIdentificacaoBiometricaByQueryIdHistorico')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

            }

        }

        async postIdentificacaoBiometrica(req, res) {
            try {
                const allData = req.body
                if(allData.documento_id === undefined || allData.documento_id === null || allData.documento_id === '' || allData.documento_id === ' ') return res.status(400).json({status: false, msg: 'Campo documento_id não pode ser vazio'}) 
if(allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({status: false, msg: 'Campo user_id não pode ser vazio'}) 
if(allData.signatario_id === undefined || allData.signatario_id === null || allData.signatario_id === '' || allData.signatario_id === ' ') return res.status(400).json({status: false, msg: 'Campo signatario_id não pode ser vazio'}) 
if(allData.perfil_biometria_id === undefined || allData.perfil_biometria_id === null || allData.perfil_biometria_id === '' || allData.perfil_biometria_id === ' ') return res.status(400).json({status: false, msg: 'Campo perfil_biometria_id não pode ser vazio'}) 
if(allData.desafio_id === undefined || allData.desafio_id === null || allData.desafio_id === '' || allData.desafio_id === ' ') return res.status(400).json({status: false, msg: 'Campo desafio_id não pode ser vazio'}) 
if(allData.bucket_wip_path === undefined || allData.bucket_wip_path === null || allData.bucket_wip_path === '' || allData.bucket_wip_path === ' ') return res.status(400).json({status: false, msg: 'Campo bucket_wip_path não pode ser vazio'}) 
if(allData.payload_sha256 === undefined || allData.payload_sha256 === null || allData.payload_sha256 === '' || allData.payload_sha256 === ' ') return res.status(400).json({status: false, msg: 'Campo payload_sha256 não pode ser vazio'}) 
if(allData.status === undefined || allData.status === null || allData.status === '' || allData.status === ' ') return res.status(400).json({status: false, msg: 'Campo status não pode ser vazio'}) 

                const response = await createUseCase.indexIdentificacaoBiometrica(allData)
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
                logs.getInstance().error(dataLogs, 'Erro no IdentificacaoBiometricaController - postIdentificacaoBiometrica')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })    
            }
        }

        async patchIdentificacaoBiometrica(req, res) {
            try {
                const id = req.params.id
                const allData = req.body
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                if(allData.documento_id === undefined || allData.documento_id === null || allData.documento_id === '' || allData.documento_id === ' ') return res.status(400).json({status: false, msg: 'Campo documento_id não pode ser vazio'}) 
if(allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({status: false, msg: 'Campo user_id não pode ser vazio'}) 
if(allData.signatario_id === undefined || allData.signatario_id === null || allData.signatario_id === '' || allData.signatario_id === ' ') return res.status(400).json({status: false, msg: 'Campo signatario_id não pode ser vazio'}) 
if(allData.perfil_biometria_id === undefined || allData.perfil_biometria_id === null || allData.perfil_biometria_id === '' || allData.perfil_biometria_id === ' ') return res.status(400).json({status: false, msg: 'Campo perfil_biometria_id não pode ser vazio'}) 
if(allData.desafio_id === undefined || allData.desafio_id === null || allData.desafio_id === '' || allData.desafio_id === ' ') return res.status(400).json({status: false, msg: 'Campo desafio_id não pode ser vazio'}) 
if(allData.bucket_wip_path === undefined || allData.bucket_wip_path === null || allData.bucket_wip_path === '' || allData.bucket_wip_path === ' ') return res.status(400).json({status: false, msg: 'Campo bucket_wip_path não pode ser vazio'}) 
if(allData.payload_sha256 === undefined || allData.payload_sha256 === null || allData.payload_sha256 === '' || allData.payload_sha256 === ' ') return res.status(400).json({status: false, msg: 'Campo payload_sha256 não pode ser vazio'}) 
if(allData.status === undefined || allData.status === null || allData.status === '' || allData.status === ' ') return res.status(400).json({status: false, msg: 'Campo status não pode ser vazio'}) 

                const response = await updateUseCase.indexIdentificacaoBiometrica({...allData, id})
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
                logs.getInstance().error(dataLogs, 'Erro no IdentificacaoBiometricaController - patchIdentificacaoBiometrica')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


        async deleteIdentificacaoBiometrica(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ')return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                const response = await deleteUseCase.indexIdentificacaoBiometrica({id})
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
                logs.getInstance().error(dataLogs, 'Erro no IdentificacaoBiometricaController - deleteIdentificacaoBiometrica')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


    }

    module.exports = new IdentificacaoBiometricaController();



    