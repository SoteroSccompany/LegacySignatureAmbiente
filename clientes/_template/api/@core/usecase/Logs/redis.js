
const fs = require('fs')
const path = require('path')
const moment = require('moment')

const genetateLog = async (data) => {

    const log = moment().format('YYYY-MM-DD');
    const json = { data };
    const directory = path.join(__dirname, '../../../Logs/redis/');

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

module.exports = genetateLog;
