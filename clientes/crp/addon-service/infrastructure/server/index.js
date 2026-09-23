
require('dotenv/config');
const { port } = require('../../config');
const router = require("../routes/index");
const cors = require("cors");
const helmet = require('helmet');
const express = require("express");
const path = require('path');
const logs = require('../../Logs');

class Server {

    async createServer() {
        try {
            const app = express();
            // Browser só na cerimônia (HtmlService roda em *.googleusercontent.com).
            // UrlFetch do Apps Script e chamadas servidor-a-servidor vêm sem Origin.
            app.use(cors({
                origin: (origin, callback) => {
                    if (!origin) return callback(null, true);
                    if (origin === 'https://script.google.com') return callback(null, true);
                    if (/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(origin)) return callback(null, true);
                    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
                    return callback(null, false);
                },
                credentials: false,
                allowedHeaders: ['Content-Type', 'x-instalacao-key', 'x-integracao-key', 'x-admin-token'],
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            }));
            app.use(express.json({ limit: '8mb', extended: true }));
            app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
            app.set('trust proxy', false);
            // Painel do admin do serviço (estático, protegido pelo token nas chamadas)
            app.use('/admin/painel', express.static(path.join(__dirname, '../../admin')));
            // Selfie ao vivo da cerimônia: precisa rodar fora do iframe do Apps
            // Script para o getUserMedia funcionar (ver Assinarweb.html).
            // Dados da captura (documento, upload_url, chave) vêm só pelo
            // fragmento da URL, nunca chegam ao servidor.
            // redirect: false — atrás do proxy (/addon) o 302 padrão do
            // express.static aponta pra /assinatura/captura/ e o browser
            // perde o prefixo. sendFile cobre com e sem barra.
            const capturaDir = path.join(__dirname, '../../public/captura');
            const servirCaptura = (_, res) => res.sendFile(path.join(capturaDir, 'index.html'));
            app.get('/assinatura/captura', servirCaptura);
            app.get('/assinatura/captura/', servirCaptura);
            app.use('/assinatura/captura', express.static(capturaDir, { redirect: false }));
            app.use('/', router);
            app.use((_, res) => {
                res.status(404).json({
                    status: 404,
                    error: 'Rota não encontrada',
                });
            });
            app.listen(port, () => {
                logs.getInstance().info(`🚀 addon-service rodando na porta ${port}`);
            })
        } catch (err) {
            logs.getInstance().error(err, 'Erro ao iniciar o addon-service:');
        }
    }

}

module.exports = new Server();
