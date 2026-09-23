
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


class SHARSAENCRYPT {

    #privateKey = null;
    publicKey = null;

    constructor() {
        this.#privateKey = fs.readFileSync(process.env.PRIVATE_KEY_TWOFACTOR_PATH, 'utf8');
        this.publicKey = fs.readFileSync(process.env.PUBLIC_KEY_TWOFACTOR_PATH, 'utf8');
    }


    async Encrypt(plainText) {
        try {
            const buffer = await Buffer.from(plainText, 'utf8');
            const encrypted = await crypto.publicEncrypt({
                key: this.publicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            }, buffer);
            return encrypted.toString('base64');
        } catch (error) {
            throw new ERRORSHARSA(`Erro ao criptografar: ${error.message}`);
        }

    }

    async Decrypt(encryptedText) {
        try {
            const buffer = await Buffer.from(encryptedText, 'base64');
            const decrypted = await crypto.privateDecrypt({
                key: this.#privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            }, buffer);
            return decrypted.toString('utf8');
        } catch (error) {
            const isKeyOrCipherError =
                error.code?.startsWith('ERR_OSSL_') ||
                error.message.includes('decryption failed') ||
                error.message.includes('padding') ||
                error.message.includes('key');
            if (isKeyOrCipherError) {
                const reason = error.reason || error.message;
                if (reason.includes('padding check failed') || reason.includes('decryption failed')) throw new ERRORSHARSA('Erro de Chave: A chave privada fornecida não corresponde à chave pública usada na criptografia ou o dado foi alterado.');
                if (reason.includes('key type mismatch') || reason.includes('invalid key')) throw new ERRORSHARSA('Erro de Chave: O formato da chave privada é inválido ou ela está corrompida.');
                if (reason.includes('data too large for key size')) throw new ERRORSHARSA('Erro de Chave: O tamanho do dado criptografado é incompatível com o tamanho da chave RSA.');

            }
            throw new ERRORSHARSA(`Erro genérico ao descriptografar: ${error.message}`);
        }
    }


}



class ERRORSHARSA extends Error {
    constructor(message) {
        super(message);
        this.name = "ERRORSHARSA";
    }
}

module.exports = SHARSAENCRYPT;