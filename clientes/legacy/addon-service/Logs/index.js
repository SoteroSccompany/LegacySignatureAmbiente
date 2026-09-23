const pino = require('pino');
const { statusAplication, statusApp, defaultLogLevel } = require('../config')

class Logger {

    constructor() {
        if (Logger.instance) {
            return Logger.instance;
        }
        this.isDev = statusAplication.status !== statusApp.prod;
        this.pinoLogger = this._initializePino();
        Logger.instance = this;
        return this;
    }

    _initializePino() {
        let transport;
        if (this.isDev) {
            transport = pino.transport({
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            });
        } else {
            transport = pino.transport({
                targets: [
                    {
                        target: 'pino/file',
                        level: defaultLogLevel,
                        options: {
                            destination: 1 // stdout
                        }
                    }
                ]
            });
        }
        return pino(
            {
                level: defaultLogLevel || (this.isDev ? 'debug' : 'info'),
                base: {
                    service: process.env.APLICATION_NAME || 'addon-service'
                },
                timestamp: pino.stdTimeFunctions.isoTime
            },
            transport
        );
    }

    info(...args) {
        return this.pinoLogger.info(...args);
    }

    warn(...args) {
        return this.pinoLogger.warn(...args);
    }

    error(...args) {
        return this.pinoLogger.error(...args);
    }

    fatal(...args) {
        return this.pinoLogger.fatal(...args);
    }

    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
}

module.exports = Logger;
