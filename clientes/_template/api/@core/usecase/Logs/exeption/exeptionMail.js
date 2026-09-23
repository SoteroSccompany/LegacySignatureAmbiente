
const fs = require('fs')
const path = require('path')
const moment = require('moment')

const genetateLog = (data) => {

    const log = moment().format('YYYY-MM-DD-HH-mm-ss');
    const json = { data, err };
    const directory = path.join(__dirname, '../../../../Logs/exeptions/mail');

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

module.exports = genetateLog;

