

//Primeiro temos que buscar as informacoes de setagem -> como se fosse um ORM
const { exec } = require('child_process')
const { informationData, entity, table } = require('./constructor')
const domain = require('./pages/domain')
const repository = require('./pages/repository')
const useCaseDir = require('./pages/useCase')
const logGen = require('./pages/logs')
const genGetUseCase = require('./pages/useCase/methods/getUseCase')
const genUpdateByIdUseCase = require('./pages/useCase/methods/updateUseCase')
const genDeleteByIdUseCase = require('./pages/useCase/methods/deleteUseCase')
const genCreateUseCase = require('./pages/useCase/methods/createUseCase')
const genController = require('./pages/controller')

if (informationData.length === 0) return console.log('InformationData is not defined')
if (entity === undefined || entity === null || entity === '' || entity === ' ') return console.log('Entity is not defined')
if (table === undefined || table === null || table === '' || table === ' ') return console.log('Table is not defined')

console.log('Start process')

try {
    domain(entity, informationData)
    repository(entity, table)
    useCaseDir(entity)
    logGen(entity)
    genGetUseCase(entity)
    genUpdateByIdUseCase(entity)
    genDeleteByIdUseCase(entity)
    genCreateUseCase(entity)
    genController(entity, informationData)
    // const command = `npm run migrate:make ${table.toLowerCase()}`
    // exec(command, (error, stdout, stderr) => {
    //     if (error) {
    //         console.log(`error: ${error.message}`)
    //         return
    //     }
    //     if (stderr) {
    //         console.log(`stderr: ${stderr}`)
    //         return
    //     }
    //     console.log(`stdout: ${stdout}`)
    // });
    console.log('Basta conferir os arquivos gerados')
} catch (err) {
    console.log(err)
}

//Criou a pasta aqui do useCase -> agora deve fazer os arquivos responsaveis 
//O repositorio sera domainRepository.js

//Para o useCase precisa enviar para a funcao o nome do dominio 

console.log('End of process')

