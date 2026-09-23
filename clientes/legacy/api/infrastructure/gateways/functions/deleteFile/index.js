const fs = require('fs');
const deleteFiles = async (files) => {
    try {
        for await (const file of files) {
            if (file) {
                fs.unlink(file.path, (err) => {
                    if (err) {
                        console.error('Erro ao excluir o arquivo original:', err);
                    }
                });
            }
        }
    } catch (error) {
        console.log(error)
    }
}
module.exports = deleteFiles;