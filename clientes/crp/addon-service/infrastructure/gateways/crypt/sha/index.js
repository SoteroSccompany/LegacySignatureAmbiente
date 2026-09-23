const crypto = require('crypto');

class SHA {
    constructor() {
        const secret = process.env.SHA;

        if (!secret) {
            throw new SHAError('A variável de ambiente process.env.SHA não está definida.');
        }
        this.key = crypto.createHash('sha256').update(secret).digest();
        this.algorithm = 'aes-256-gcm';
    }

    encrypt(plainText) {
        try {
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

            let encrypted = cipher.update(plainText, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag().toString('hex');
            return `${iv.toString('hex')}.${authTag}.${encrypted}`;
        } catch (error) {
            throw new SHAError(`Erro ao criptografar: ${error.message}`);
        }
    }

    decrypt(encryptedText) {
        try {
            const [ivHex, authTagHex, encryptedData] = encryptedText.split('.');

            if (!ivHex || !authTagHex || !encryptedData) {
                throw new Error('Formato de texto criptografado inválido.');
            }

            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new SHAError(`Erro ao descriptografar: ${error.message}`);
        }
    }

    hash(data) {
        try {
            const body = Buffer.from(data, 'utf8');
            return crypto.createHash('sha256').update(body).digest('hex');
        } catch (error) {
            throw new SHAError(`Erro ao gerar hash: ${error.message}`);
        }
    }

}

class SHAError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SHAError';
    }
}

module.exports = { SHA, SHAError };
