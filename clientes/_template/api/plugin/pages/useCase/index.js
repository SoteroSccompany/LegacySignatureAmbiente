const fs = require('fs');



const generatePath = (domain) => {
    if (domain === '' || domain === undefined || domain === null || domain === ' ') return { status: false, msg: 'Domain não pode ser vazio!' }
    const dir = `../@core/usecase/${domain}`
    const path = `${dir}`

    fs.mkdir(path, { recursive: true }, (err) => {
        if (err) throw err;
        if (!err) console.log('Pasta de useCase criada com successo!');
    });

    return { status: true, msg: 'Path criado com sucesso!', pathDir: dir }


}


module.exports = generatePath;