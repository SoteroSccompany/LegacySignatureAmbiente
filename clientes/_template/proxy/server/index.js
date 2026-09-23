

// Configuração do proxy
require('dotenv/config');
const { APIKEY, api } = require('../certs')
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');
const cors = require("cors");
const rfs = require('rotating-file-stream');
const cookie = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const hpp = require('hpp');
const { proxy } = require('../middleware');
const rateLimit = require('express-rate-limit');
const path = require('path');


class Server {
    async createServer() {
        const fs = require('fs');
        try {
            const express = require("express");
            const app = express();

            app.use(cors({
                origin: (origin, callback) => {
                    const permitidas = [
                        process.env.URL_FRONT,
                        'http://localhost:5500',
                        'http://127.0.0.1:5500',
                        'http://localhost:4173',
                        'http://127.0.0.1:4173',
                        'https://script.google.com',
                    ].filter(Boolean);
                    if (!origin) return callback(null, true);
                    if (permitidas.includes(origin)) return callback(null, true);
                    if (/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(origin)) return callback(null, true);
                    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
                    return callback(null, false);
                },
                credentials: true,
                exposedHeaders: ['set-cookie'],
                allowedHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-CSRF-Token',
                    'X-Requested-With',
                    'proxyauthorization',
                    'apikey',
                    'x-instalacao-key',
                    'x-integracao-key',
                    'x-admin-token',
                ],
            }));

            let agentMtls = null;
            if (process.env.APP_STATUS === 'production') {
                agentMtls = new https.Agent({
                    key: fs.readFileSync(path.join(__dirname, `../tls/client.key`)),
                    cert: fs.readFileSync(path.join(__dirname, `../tls/client.crt`)),
                    ca: fs.readFileSync(path.join(__dirname, `../tls/ca.pem`)),
                    rejectUnauthorized: true,
                    checkServerIdentity: () => undefined
                });
            }
            // console.log('[DEBUG AGENT]', agentMtls.options);

            const accessLogStream = rfs.createStream('access.log', {
                interval: '1d', // rota os logs diariamente
                path: path.join(__dirname, 'log')
            });
            const limiterApi = rateLimit({
                windowMs: 2 * 60 * 1000, // 15 minutos
                max: 500, // limite cada IP a 100 requisições por janela
                message: {
                    message: "Muitas requisições feitas deste IP"
                },
                handler: (req, res, /* next, options */) => {
                    // Você pode personalizar a resposta aqui, se necessário
                    const msgServer = `Muitas requisições feitas deste IP
                    Dados: ${JSON.stringify(req.body)}
                    Daddos da requisicao e registros: ${JSON.stringify(req.headers)}`
                    fs.appendFileSync('logHateLimiteFinance.log', String(msgServer));
                    res.status(429).json({
                        status: false,
                        msg: "Muitas requisições feitas deste IP",
                        error: "Você atingiu o limite máximo de requisições permitidas."
                    });
                }
            });
            const limiterProxy = rateLimit({
                windowMs: 2 * 60 * 1000, // 15 minutos
                max: 10000, // limite cada IP a 100 requisições por janela
                message: {
                    message: "Muitas requisições feitas deste IP"
                },
                handler: (req, res, /* next, options */) => {
                    // Você pode personalizar a resposta aqui, se necessário
                    const msgServer = `Muitas requisições feitas deste IP
                    Dados: ${JSON.stringify(req.body)}
                    Daddos da requisicao e registros: ${JSON.stringify(req.headers)}`
                    fs.appendFileSync('loglimimtProxy.log', String(msgServer));
                    res.status(429).json({
                        status: false,
                        msg: "Muitas requisições feitas deste IP",
                        error: "Você atingiu o limite máximo de requisições permitidas."
                    });
                }
            });
            // app.use(proxy);
            app.use(limiterProxy);
            app.use(cookie());
            app.use(morgan('combined', { stream: accessLogStream })); // 'dev' é um formato predefinido de log
            app.use(helmet());
            app.use(hpp());
            app.set('trust proxy', false);
            app.use(helmet.contentSecurityPolicy({
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdnjs.cloudflare.com'],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
                    connectSrc: ["'self'", `${process.env.URL_FRONT}`, 'http:', 'https:', 'blob:'],
                    fontSrc: ["'self'", 'https:', 'data:'],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'none'"],
                    frameSrc: ["'none'"],
                    imgSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
                    sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
                    reportUri: '/report-violation',
                    reportTo: 'default',
                    workerSrc: ["'self'", 'blob:', 'https:'],
                    navigateTo: ["'self'"],//
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    frameAncestors: ["'self'"],
                    reflectedXss: 'block',
                    referrer: 'same-origin',
                }
            }));

            // Ferramentas estáticas (demarcador + página de assinatura)
            // Volume docker: ./pdf -> /app/public-tools
            app.use('/tools', express.static(path.join(__dirname, '../public-tools')));

            // Bucket (S3): repassa URLs presignadas ao storage interno.
            // A autenticação é a própria assinatura SigV4 da URL — sem proxyauthorization.
            // changeOrigin mantém o Host do alvo interno, que é o host assinado na presign.
            const bucketTarget = `http://${process.env.BUCKET_HOST || 'bucketsignatureexperts'}:${process.env.BUCKET_PORT || 8333}`;
            const bucketProxy = createProxyMiddleware('/bucket', {
                target: bucketTarget,
                changeOrigin: true,
                pathRewrite: { '^/bucket': '' },
                secure: false,
                logLevel: 'warn',
                onProxyRes: (proxyRes, req, res) => {
                    // Headers de segurança do proxy não se aplicam ao conteúdo do bucket
                    res.removeHeader('X-Frame-Options');
                    res.removeHeader('Content-Security-Policy');
                    proxyRes.headers['Access-Control-Allow-Origin'] = process.env.URL_FRONT || '*';
                },
                onError(err, req, res) {
                    console.error('[BUCKET PROXY ERROR]', err.message);
                }
            });

            // addon-service: painel admin do serviço + rotas do Addon do Workspace
            const addonTarget = `http://${process.env.ADDON_HOST || 'addonservice'}:${process.env.ADDON_PORT || 7810}`;
            const addonProxy = createProxyMiddleware('/addon', {
                target: addonTarget,
                changeOrigin: true,
                pathRewrite: { '^/addon': '' },
                secure: false,
                logLevel: 'warn',
                onProxyRes: (proxyRes, req) => {
                    const caminho = req.originalUrl || req.url || '';
                    if (!caminho.startsWith('/addon/assinatura/captura')) return;
                    delete proxyRes.headers['content-security-policy'];
                    delete proxyRes.headers['content-security-policy-report-only'];
                    delete proxyRes.headers['cross-origin-embedder-policy'];
                },
                onError(err, req, res) {
                    console.error('[ADDON PROXY ERROR]', err.message);
                }
            });

            const apiProxy = createProxyMiddleware('/signature', {
                target: api, // Substitua com a URL da API alvo
                agent: agentMtls,
                changeOrigin: true,
                pathRewrite: { '^/signature': '/api' }, // Reescrever o caminho da API
                secure: false,
                logLevel: 'debug',
                onProxyReq: (proxyReq, req, res) => {
                    proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                    proxyReq.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, proxyauthorization, apikey');
                    proxyReq.setHeader('apikey', APIKEY);
                },
                onProxyRes: (proxyRes, req, res) => {
                    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
                    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, proxyauthorization, apikey';
                },
                onError(err, req, res) {
                    console.error('[PROXY ERROR]', err.message);
                    // res.status(500).json({ error: 'Proxy error', detail: err.message });
                }
            });
            app.use(express.json({ limit: '10mb', type: 'application/csp-report' }));
            app.post('/report-violation', (req, res) => {
                if (req.body) {
                    ;
                    const data = JSON.stringify(req.body, null, 2);
                    fs.appendFile('server/report-violation/csp-violations.log', data + ',\n', (err) => {
                        if (err) {
                            console.error('Error saving CSP report', err);
                            res.status(500).send('Error saving report');
                            return;
                        }
                        res.status(204).send(); // No Content
                    });
                } else {
                    res.status(400).send('No CSP report');
                }
            });


            app.use((req, res, next) => {
                res.setHeader('X-Frame-Options', 'SAMEORIGIN');
                next();
            });
            app.use('/signature', proxy, limiterApi, apiProxy);
            // Selfie da cerimônia: Helmet global (media-src none + sandbox)
            // bloqueia getUserMedia e <video>. Esta rota precisa de câmera
            // ao vivo numa aba top-level — CSP só aqui, sem sandbox.
            app.use('/addon/assinatura/captura', (req, res, next) => {
                res.setHeader('Content-Security-Policy', [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline'",
                    "style-src 'self' 'unsafe-inline'",
                    "connect-src 'self'",
                    "img-src 'self' data: blob:",
                    "media-src 'self' blob:",
                    "object-src 'none'",
                    "base-uri 'self'",
                    "frame-ancestors 'none'",
                ].join('; '));
                res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
                res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
                res.removeHeader('X-Frame-Options');
                next();
            });
            // Cerimônia no Workspace (HtmlService) e UrlFetch do Apps Script passam por aqui.
            // limiterApi (500/2min) estoura no poll do FaceMatch e no IP compartilhado do Google.
            app.use('/addon', (req, res, next) => {
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                next();
            }, limiterProxy, addonProxy);
            app.use('/bucket', bucketProxy);
            app.use(express.urlencoded({ extended: true, limit: '1000mb', parameterLimit: 1000000 }));
            app.use(express.json({ limit: '1000mb', extended: true }));

            const PORTAPI = process.env.PORT || 3000;
            app.listen(PORTAPI, () => {
                console.log(`Servidor rodando na porta ${PORTAPI}`)
            });

        } catch (err) {
            console.log(err)
            const msgFile = `Erro ao criar servidor: ${err.message}\n${err.stack}\n`;
            fs.appendFileSync('logServer.log', String(msgFile));
        }
    }
}

module.exports = new Server();