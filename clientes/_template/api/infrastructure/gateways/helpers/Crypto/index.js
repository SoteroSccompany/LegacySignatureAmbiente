require('dotenv/config');
const crypto = require('crypto');


class Crypto {

    #KEYAES256GCM;
    #BYTESV4;


    constructor() {
        this.#BYTESV4 = process.env.BYTESV4;
        this.#KEYAES256GCM = Buffer.from(process.env.CRYPTKEY, 'base64');
    }


    encryptAESGCM(plainText) {
        try {
            const iv = Buffer.from(this.#BYTESV4, 'base64'); // IV fixo
            const cipher = crypto.createCipheriv('aes-256-gcm', this.#KEYAES256GCM, iv);

            const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
            const tag = cipher.getAuthTag(); // 16 bytes

            // Concatena tag (16 bytes) + ciphertext e retorna como base64
            const ciphertext = Buffer.concat([tag, encrypted]);
            return ciphertext.toString('base64');
        } catch (error) {
            throw new CryptoError('Erro ao criptografar dados: ' + error.message);
        }
    }


    encryptAESGCMPass(plainText) {
        try {
            const iv = crypto.randomBytes(12); // 12 bytes recomendado para GCM
            const cipher = crypto.createCipheriv('aes-256-gcm', this.#KEYAES256GCM, iv);

            const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
            const tag = cipher.getAuthTag();

            // Você pode escolher o formato; aqui faço um JSON e codifico em base64
            const payload = {
                iv: iv.toString('base64'),
                tag: tag.toString('base64'),
                ciphertext: encrypted.toString('base64')
            };
            return Buffer.from(JSON.stringify(payload)).toString('base64');
        } catch (error) {
            throw new CryptoError('Erro ao criptografar dados: ' + error.message);
        }
    }


    decryptAESGCMPass(payloadB64) {
        try {
            const json = Buffer.from(payloadB64, 'base64').toString('utf8');
            const { iv, tag, ciphertext } = JSON.parse(json);

            const decipher = crypto.createDecipheriv('aes-256-gcm', this.#KEYAES256GCM, Buffer.from(iv, 'base64'));
            decipher.setAuthTag(Buffer.from(tag, 'base64'));

            const decrypted = Buffer.concat([
                decipher.update(Buffer.from(ciphertext, 'base64')),
                decipher.final()
            ]);
            return JSON.parse(decrypted.toString('utf8'));
        } catch (error) {
            throw new CryptoError('Erro ao descriptografar dados: ' + error.message);
        }
    }


    decryptAESGCM(payloadB64) {
        try {
            const json = Buffer.from(payloadB64, 'base64').toString('utf8');
            const iv = this.#BYTESV4; // Mesma IV usada na criptografia
            const { tag, ciphertext } = JSON.parse(json);

            const decipher = crypto.createDecipheriv('aes-256-gcm', this.#KEYAES256GCM, Buffer.from(iv, 'base64'));
            decipher.setAuthTag(Buffer.from(tag, 'base64'));

            const decrypted = Buffer.concat([
                decipher.update(Buffer.from(ciphertext, 'base64')),
                decipher.final()
            ]);
            return JSON.parse(decrypted.toString('utf8'));
        } catch (error) {
            throw new CryptoError('Erro ao descriptografar dados: ' + error.message);
        }
    }

    decryptCiphertext(ciphertextB64) {
        try {
            const ciphertextBuffer = Buffer.from(ciphertextB64, 'base64');

            // Extrai o tag (primeiros 16 bytes) e o ciphertext (resto)
            const tag = ciphertextBuffer.subarray(0, 16);
            const encrypted = ciphertextBuffer.subarray(16);

            const iv = Buffer.from(this.#BYTESV4, 'base64'); // Mesma IV usada na criptografia
            const decipher = crypto.createDecipheriv('aes-256-gcm', this.#KEYAES256GCM, iv);
            decipher.setAuthTag(tag);

            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);
            return {
                status: true,
                ...JSON.parse(decrypted.toString('utf8'))
            }
        } catch (error) {
            return {
                status: false, msg: 'Erro ao descriptografar dados: ' + error.message
            }
        }
    }





}



module.exports = Crypto;



class CryptoError extends Error {
    constructor(message) {
        super(message);
        this.name = "CryptoError";
    }
}