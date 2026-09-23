const fs = require('fs')

const createLogs = (domain) => {

    if (domain !== undefined && domain !== null && domain !== '' && domain !== ' ') {
        const contentFile = `

        const fs = require('fs');
        const createLog = require('../../LogsDoSistema/criarLog');
        const domain = require('../../../domain/LogsDoSistema');
        const moment = require('moment');
        const path = require('path')
    
    
        const genetateLog = async (data) => {
    
            try {   
                const log = new domain(data)
                await createLog.createLog(log)
            } catch(err) {
               const log = moment().format('YYYY-MM-DD-HH-mm-ss');
                const json = { data, err };
                const directory = path.join(__dirname, '../../../../Logs/exeptions/${domain}');

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
        `

        // `../Logs/exeption/exeption${domain}`

        /*   fs.mkdir(path, { recursive: true }, (err) => {
            if (err) throw err;
            if (!err) console.log('The path has been saved!');
        });*/

        fs.mkdir(`../Logs/exeptions/${domain}`, { recursive: true }, (err) => {
            if (err) throw err;
            if (!err) console.log('Diretorio de logs criado com successo!');
        });

        fs.writeFileSync(`../@core/usecase/Logs/exeption/exeption${domain}.js`, contentFile, (err) => {
            if (err) throw err;
            if (!err) console.log(`exeption${domain}.js criado com successo!`);
        });

        return { status: true }
    } else {
        return { status: false, msg: 'Domain is undefined' }

    }


}


module.exports = createLogs;