// 1. Importar o módulo nativo 'crypto' do Node.js
const crypto = require('crypto');

// 2. Definir o tamanho da chave em bytes.
// Para o algoritmo HS256 (que usa SHA-256), o ideal é 32 bytes (256 bits).
// Usar 64 bytes (512 bits) é ainda mais seguro e recomendado.
const keySizeInBytes = 64;

// 3. Gerar os bytes aleatórios de forma síncrona.
const secretKey = crypto.randomBytes(keySizeInBytes);

// 4. Converter os bytes para uma string legível (em hexadecimal ou base64).
const base64Secret = secretKey.toString('base64');
const hexSecret = secretKey.toString('hex');

const randomBytsv4 = crypto.randomBytes(64).toString('hex');
const secretKeyv4 = crypto.createHash('sha256').update(randomBytsv4).digest('hex');

// 5. Exibir as chaves geradas no console.
console.log('--- Chaves Seguras Geradas para JWT ---');
console.log('');
console.log('Base64:', base64Secret);
console.log('');
console.log('Hexadecimal:', hexSecret);
console.log('');
console.log('RandomBytes (hex):', randomBytsv4);
console.log('');
console.log('Instrução: Copie UMA das chaves acima e use como seu segredo JWT.');