require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require("bcrypt");



class BCRYPT {

    salt = process.env.SALT_BCRYPT;

    constructor() {
        this.salt = process.env.SALT_BCRYPT;
    }

    encrypt(plainText) {
        try {
            const salt = bcrypt.genSaltSync(parseInt(this.salt));
            return bcrypt.hashSync(plainText, salt);
        } catch (error) {
            throw new BCRYPTError(`Erro ao criptografar: ${error.message}`);
        }
    }

    compare(plainText, encryptedText) {
        try {
            return bcrypt.compareSync(plainText, encryptedText);
        } catch (error) {
            throw new BCRYPTError(`Erro ao descriptografar: ${error.message}`);
        }
    }
}

class BCRYPTError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BCRYPTError';
    }
}

module.exports = { BCRYPT, BCRYPTError };