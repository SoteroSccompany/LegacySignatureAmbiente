
const fs = require('fs');


const generateController = (domain, data) => {

    if ((domain === undefined || domain === ' ' || domain === '' || domain === null) || (data.length === 0)) {
        return { status: false, msg: 'Dadaos e/ou domain não podem ser vazio' }

    } else {

        const contentFile = `

    const logExeption = require('../../@core/usecase/Logs/exeption/exeption${domain}');
    const ErrorStackParser = require('error-stack-parser');
    const dateNow = require('../gateways/functions/data/getToday');
    const getUseCase = require('../../@core/usecase/${domain}/get${domain}UseCase');
    const createUseCase = require('../../@core/usecase/${domain}/create${domain}UseCase');
    const updateUseCase = require('../../@core/usecase/${domain}/update${domain}UseCase');
    const deleteUseCase = require('../../@core/usecase/${domain}/delete${domain}UseCase');
    const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
    const { historico } = require('../../certs')
    const SearchParams = require('../gateways/helpers/SearchParams');
    const logs = require('../../Logs')

    class ${domain}Controller {

        async get${domain}(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
                    const response = await getUseCase.get${domain}ById({id})                  
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
                logs.getInstance().error(dataLogs, 'Erro no ${domain}Controller - get${domain}')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async get${domain}ByQuery(req, res) {
            try {
                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.get${domain}ByQuery(searchParams)
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
                logs.getInstance().error(dataLogs, 'Erro no ${domain}Controller - get${domain}ByQuery')                
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
            }

        }

        async get${domain}ByQueryIdHistorico(req, res) {
            try {            
                const id = req.params.id
                if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })                
                const searchParams = new SearchParams(req.query)
                const response = await getUseCase.get${domain}ByQueryIdHistorico(searchParams, id)
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
                logs.getInstance().error(dataLogs, 'Erro no ${domain}Controller - get${domain}ByQueryIdHistorico')
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

            }

        }

        async post${domain}(req, res) {
            try {
                const allData = req.body
                ${data.map((item) => {
            if (item !== 'id' && item !== 'data_criacao' && item !== 'data_atualizacao' && item !== 'data_criacao' && item !== 'deletado') return `if(allData.${item} === undefined || allData.${item} === null || allData.${item} === '' || allData.${item} === ' ') return res.status(400).json({status: false, msg: 'Campo ${item} não pode ser vazio'}) \n`

        }).join('')
            }
                const response = await createUseCase.index${domain}(allData)
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
                logs.getInstance().error(dataLogs, 'Erro no ${domain}Controller - post${domain}')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })    
            }
        }

        async patch${domain}(req, res) {
            try {
                const id = req.params.id
                const allData = req.body
                if(id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                ${data.map((item) => {
                if (item !== 'id' && item !== 'data_criacao' && item !== 'data_atualizacao' && item !== 'data_criacao' && item !== 'deletado') return `if(allData.${item} === undefined || allData.${item} === null || allData.${item} === '' || allData.${item} === ' ') return res.status(400).json({status: false, msg: 'Campo ${item} não pode ser vazio'}) \n`

            }).join('')
            }
                const response = await updateUseCase.index${domain}({...allData, id})
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
                logs.getInstance().error(dataLogs, 'Erro no ${domain}Controller - patch${domain}')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


        async delete${domain}(req, res) {
            try {
                const id = req.params.id
                if(id === undefined || id === null || id === '' || id === ' ')return res.status(400).json({status: false, msg: 'Campo id não pode ser vazio'})
                const response = await deleteUseCase.index${domain}({id})
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
                logs.getInstance().error(dataLogs, 'Erro no ${domain}Controller - delete${domain}')    
                res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
    
            }
        }


    }

    module.exports = new ${domain}Controller();



    `



        fs.writeFileSync(`../infrastructure/Controllers/${domain}Controller.js`, contentFile, (err) => {
            if (err) throw err;
            if (!err) console.log(`${domain}Controller.js criado e salvo!`);
        });


    }
}


module.exports = generateController;