

const fs = require('fs');
const createLog = require('../../LogsDoSistema/criarLog');
const domain = require('../../../domain/LogsDoSistema');
const moment = require('moment');
const path = require('path')


const genetateLog = async (data) => {

    try {
        const log = new domain(data)
        await createLog.createLog(log)
        const logData = moment().format('YYYY-MM-DD-HH-mm-ss');
        const json = { data };
        const directory = path.join(__dirname, '../../../../Logs/exeptions/AlertaAcesso');

        // Verifica se o diretório existe, se não existir, cria-o
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        fs.appendFile(path.join(directory, logData + '.json'), JSON.stringify(json), (err) => {
            if (err) {
                console.error('Erro ao gravar o log de exceção:', err);
            }
        });
    } catch (err) {
        const log = moment().format('YYYY-MM-DD-HH-mm-ss');
        const json = { data, err };
        const directory = path.join(__dirname, '../../../../Logs/exeptions/AlertaAcesso');

        // Verifica se o diretório existe, se não existir, cria-o
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        fs.appendFile(path.join(directory, log + '.json'), JSON.stringify(json), (err) => {
            if (err) {
                console.error('Erro ao gravar o log de exceção:', err);
            }
        });
    }
}
module.exports = genetateLog;
