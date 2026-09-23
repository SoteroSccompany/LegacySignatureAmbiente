

const fs = require('fs')
const createLog = require('../LogsDoSistema/criarLog')
const domain = require('../../domain/LogsDoSistema')
const path = require('path')
const moment = require('moment')

const genetateLog = async (data) => {
    try {
        const log = new domain(data)
        await createLog.createLog(log)
        const logData = moment().format('YYYY-MM-DD');
        const json = { data, err };
        const directory = path.join(__dirname, '../../../Logs/jwt/');

        // Verifica se o diretório existe, se não existir, cria-o
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        fs.appendFile(path.join(directory, logData + '.log'), JSON.stringify(json), (err) => {
            if (err) {
                console.error('Erro ao gravar o log de exceção:', err);
            }
        });
    } catch (err) {
        const log = moment().format('YYYY-MM-DD');
        const json = { data, err };
        const directory = path.join(__dirname, '../../../Logs/jwt/');

        // Verifica se o diretório existe, se não existir, cria-o
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        fs.appendFile(path.join(directory, log + '.log'), JSON.stringify(json), (err) => {
            if (err) {
                console.error('Erro ao gravar o log de exceção:', err);
            }
        });



    }



}

module.exports = genetateLog;
