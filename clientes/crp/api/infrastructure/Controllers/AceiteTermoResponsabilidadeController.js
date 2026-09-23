

    const logExeption = require('../../@core/usecase/Logs/exeption/exeptionAceiteTermoResponsabilidade');
    const ErrorStackParser = require('error-stack-parser');
    const dateNow = require('../gateways/functions/data/getToday');
    const getUseCase = require('../../@core/usecase/AceiteTermoResponsabilidade/getAceiteTermoResponsabilidadeUseCase');
    const createUseCase = require('../../@core/usecase/AceiteTermoResponsabilidade/createAceiteTermoResponsabilidadeUseCase');
    const updateUseCase = require('../../@core/usecase/AceiteTermoResponsabilidade/updateAceiteTermoResponsabilidadeUseCase');
    const deleteUseCase = require('../../@core/usecase/AceiteTermoResponsabilidade/deleteAceiteTermoResponsabilidadeUseCase');
    const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
    const { historico } = require('../../certs')
    const SearchParams = require('../gateways/helpers/SearchParams');
    const logs = require('../../Logs')

    class AceiteTermoResponsabilidadeController {

        async getAceiteTermoResponsabilidade(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
                    const response = await getUseCase.getAceiteTermoResponsabilidadeById({id})                  
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
                logs.getInstance().error(dataLogs, 'Erro no AceiteTermoResponsabilidadeController - getAceiteTermoResponsabilidade')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getAceiteTermoResponsabilidadeByQuery(req, res) {
            try {
                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getAceiteTermoResponsabilidadeByQuery(searchParams)
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
                logs.getInstance().error(dataLogs, 'Erro no AceiteTermoResponsabilidadeController - getAceiteTermoResponsabilidadeByQuery')                
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async getAceiteTermoResponsabilidadeByQueryIdHistorico(req, res) {
            try {            
                const id = req.params.id
                if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.getAceiteTermoResponsabilidadeByQueryIdHistorico(searchParams, id)
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
                logs.getInstance().error(dataLogs, 'Erro no AceiteTermoResponsabilidadeController - getAceiteTermoResponsabilidadeByQueryIdHistorico')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

            }

        }

        async postAceiteTermoResponsabilidade(req, res) {
            try {
                const allData = req.body
                if(allData.termo_id === undefined || allData.termo_id === null || allData.termo_id === '' || allData.termo_id === ' ') return res.status(400).json({status: false, msg: 'Campo termo_id não pode ser vazio'}) 
if(allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({status: false, msg: 'Campo user_id não pode ser vazio'}) 
if(allData.termo_hash === undefined || allData.termo_hash === null || allData.termo_hash === '' || allData.termo_hash === ' ') return res.status(400).json({status: false, msg: 'Campo termo_hash não pode ser vazio'}) 
if(allData.aceito_em === undefined || allData.aceito_em === null || allData.aceito_em === '' || allData.aceito_em === ' ') return res.status(400).json({status: false, msg: 'Campo aceito_em não pode ser vazio'}) 

                const response = await createUseCase.indexAceiteTermoResponsabilidade(allData)
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
                logs.getInstance().error(dataLogs, 'Erro no AceiteTermoResponsabilidadeController - postAceiteTermoResponsabilidade')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })    
            }
        }

        async patchAceiteTermoResponsabilidade(req, res) {
            try {
                const id = req.params.id
                const allData = req.body
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                if(allData.termo_id === undefined || allData.termo_id === null || allData.termo_id === '' || allData.termo_id === ' ') return res.status(400).json({status: false, msg: 'Campo termo_id não pode ser vazio'}) 
if(allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({status: false, msg: 'Campo user_id não pode ser vazio'}) 
if(allData.termo_hash === undefined || allData.termo_hash === null || allData.termo_hash === '' || allData.termo_hash === ' ') return res.status(400).json({status: false, msg: 'Campo termo_hash não pode ser vazio'}) 
if(allData.aceito_em === undefined || allData.aceito_em === null || allData.aceito_em === '' || allData.aceito_em === ' ') return res.status(400).json({status: false, msg: 'Campo aceito_em não pode ser vazio'}) 

                const response = await updateUseCase.indexAceiteTermoResponsabilidade({...allData, id})
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
                logs.getInstance().error(dataLogs, 'Erro no AceiteTermoResponsabilidadeController - patchAceiteTermoResponsabilidade')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


        async deleteAceiteTermoResponsabilidade(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ')return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                const response = await deleteUseCase.indexAceiteTermoResponsabilidade({id})
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
                logs.getInstance().error(dataLogs, 'Erro no AceiteTermoResponsabilidadeController - deleteAceiteTermoResponsabilidade')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


    }

    module.exports = new AceiteTermoResponsabilidadeController();



    