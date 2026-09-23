require('dotenv/config');
const { port, statusAplication, statusApp } = require('../../certs/index');
const outSpace = require("../gateways/middleware/outSpace")
const checkJson = require("../gateways/middleware/checkJson")
const router = require("../routes/index");
const routerAdmin = require("../routes/admin");
const authApi = require("../gateways/middleware/authApi")
const cors = require("cors");
const cookie = require('cookie-parser');
const helmet = require('helmet');
const express = require("express");
const checkBody = require("../gateways/middleware/checkBody")
const redisClient = require('../gateways/Redis/index')
const session = require('express-session');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { RedisStore } = require('connect-redis');
const csurf = require('csurf');
const requestsMiddleware = require('../gateways/middleware/requests')
const logs = require('../../Logs')


class Server {

    async createServer() {
        try {
            const app = express();
            const store = new RedisStore({
                client: redisClient,
                prefix: process.env.PREFIX_REDIS,
                // ttl: 86400 // 1 dia
            })
            app.use(cookie());
            app.use(session({
                name: process.env.COOKIE_NAME || 'sid',
                secret: process.env.CRYPT_SESSION,
                resave: false,
                saveUninitialized: false,
                store: store,
                cookie: {
                    httpOnly: true,
                    secure: statusAplication.status === statusApp.prod,
                    sameSite: 'lax',
                    maxAge: 1000 * 60 * 60 * 2 // 2h
                }
            }));

            const csrfProtection = csurf();
            app.use(csrfProtection);
            let httpsOption = null;
            if (statusAplication.status === statusApp.prod) {
                httpsOption = {
                    key: fs.readFileSync(path.join(__dirname, `../../tls/server.key`)),
                    cert: fs.readFileSync(path.join(__dirname, `../../tls/server.crt`)),
                    ca: fs.readFileSync(path.join(__dirname, `../../tls/ca.pem`)),
                    requestCert: true,
                    rejectUnauthorized: true
                }
            }
            app.use(cors({
                origin: [
                    `http://${process.env.PROXY_HOST || 'localhost'}:${process.env.PROXY_PORT || 7749}`,
                    `${process.env.URL_FRONT || 'http://localhost:3395'}`,
                ],
                credentials: true,
                exposedHeaders: ['set-cookie']
            }));
            app.use(express.urlencoded({ extended: true, limit: '10mb', parameterLimit: 1000000 }));
            app.use(express.json({ limit: '10mb', extended: true }));
            app.use(helmet());
            app.set('trust proxy', false);
            app.use(outSpace)
            app.use(checkJson)
            app.use(checkBody)
            app.use(requestsMiddleware)
            app.use('/api', authApi, router);
            app.use('/api/admin', authApi, routerAdmin);
            app.use((_, res) => {
                res.status(404).json({
                    status: 404,
                    error: 'Rota não encontrada',
                });
            });
            //             CERTIFICATE_TWOFACTOR_PATH=./security/validations/cert.pem
            // PUBLIC_KEY_TWOFACTOR_PATH=./security/validations/public.pem
            // PRIVATE_KEY_TWOFACTOR_PATH=./security/validations/private.pem

            // app.use('/api/cliente', authApi, routerClient);
            if (statusAplication.status == statusApp.prod) {
                const server = https.createServer(httpsOption, app);
                server.listen(port, () => {
                    logs.getInstance().info(`🔐 API Final com mTLS na porta ${port}`);
                })
            } else {
                app.listen(port, () => {
                    logs.getInstance().info({ teste: "Name" }, `🚀 API rodando na porta ${port}`);
                })
            }
        } catch (err) {
            logs.getInstance().error(err, 'Erro ao iniciar o servidor:');
        }
    }


}

module.exports = new Server();
