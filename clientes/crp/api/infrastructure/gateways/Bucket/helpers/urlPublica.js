require('dotenv/config');

// Reescreve o host interno da URL presignada (ex.: http://bucketsignatureexperts:8333)
// para o endereço público exposto pelo proxy (BUCKET_PUBLIC_URL, ex.: http://localhost:7749/bucket).
// A assinatura SigV4 continua válida porque o proxy repassa com o Host interno (changeOrigin).
const urlPublicaBucket = (url) => {
    if (!url) return url;
    const publica = process.env.BUCKET_PUBLIC_URL;
    if (!publica) return url;
    return url.replace(/^https?:\/\/[^/]+/, publica.replace(/\/+$/, ''));
};

module.exports = urlPublicaBucket;
