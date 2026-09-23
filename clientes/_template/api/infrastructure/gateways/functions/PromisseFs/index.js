const fs = require('fs');

module.exports = (file, filePath) => {
    
    const promisse = new Promise((resolve, reject) => {
        if (file === undefined || filePath === undefined) reject({ status: false, msg: 'File or filePath is undefined' })
        fs.writeFile(filePath, file, (err) => {
            if (err) reject({ status: false, msg: 'Error to write file', err })
            resolve({ status: true, msg: 'File created' })
        })
    })

    return promisse
}