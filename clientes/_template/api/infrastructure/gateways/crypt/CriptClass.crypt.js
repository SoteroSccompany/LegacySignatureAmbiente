
require('dotenv/config');
const Log = require('../../../@core/usecase/Logs/jwtError')
const JWT = require("jsonwebtoken");
const JWTLOG = process.env.JWTLOG;
const JWTLOGREFRESH = process.env.JWTLOGREFRESH;
const JWTMAILUPDATE = process.env.JWTMAILUPDATE;
const JWTMAILERTOKER = process.env.JWTMAILERTOKER;
const JWTRECOVERY = process.env.JWTRECOVERY;
const JWTAPIKEY = process.env.JWTAPIKEY;
const JWTQRCODE = process.env.JWTQRCODESIGN;
const JWTLOGINVESTIDOR = process.env.JWTLOGINVESTIDOR;
const crypto = require('crypto');
const dateNowFunction = require('../functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const { bussines } = require('../../../certs')


class CriptClass {

    create(data) {
        if (data.type === "login") {
            try {
                const token = JWT.sign({ id: data.dto.id, email: data.dto.email, role: data.dto.role, state: data.dto.state }, JWTLOG, { expiresIn: `${bussines.timeLogin}m` });
                return token;
            } catch (error) {
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, error };
            }
        } else if (data.type === "loginAccess") {
            try {
                const token = JWT.sign({ id: data.dto.id, email: data.dto.email, role: data.dto.role, state: data.dto.state }, JWTLOG, { expiresIn: `${bussines.timeLogin}m` });
                // const token = JWT.sign({ id: data.dto.id, email: data.dto.email, role: data.dto.role, state: data.dto.state }, JWTLOG, { expiresIn: `${bussines.timeLogin}s` });
                const refreshToken = JWT.sign({ id: data.dto.id, jti: crypto.randomUUID() }, JWTLOGREFRESH, { expiresIn: `${bussines.timetoken}d` });
                return { status: true, token, refreshToken };
            } catch (error) {
                console.log(error)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, error };
            }
        } else if (data.type === "mailChange") {
            try {
                const token = JWT.sign({ user_id: data.dto.user_id }, JWTMAILUPDATE);
                return token;
            } catch (error) {
                console.log(error)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, error };
            }
        } else if (data.type === "auth") {
            try {
                const token = JWT.sign({ id: data.dto.id }, JWTMAILERTOKER);
                return token;
            } catch (error) {
                console.log(error)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, error };
            }
        } else if (data.type === "recovery") {
            try {
                const token = JWT.sign({ id: data.dto.id }, JWTRECOVERY);
                return token;
            } catch (error) {
                console.log(error)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, error };
            }
        } else if (data.type === 'APIauth') {
            //JWTAPIKEY
            try {
                const token = JWT.sign(data.dto, JWTAPIKEY);
                // const token = JWT.sign(data.dto, "");
                return token;
            } catch (error) {
                console.log(error)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, error };
            }

        } else if (data.type === 'loginInvestidor') {
            try {
                const token = JWT.sign({ ...data.dto, jti: crypto.randomUUID() }, JWTLOGINVESTIDOR);
                return token;
            } catch (error) {
                console.log(error)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, error };
            }
        }
    }

    verify(data) {
        if (data.type === "login") {
            try {
                const token = JWT.verify(data.dto, JWTLOG);
                return { token: token, status: true };
            } catch (err) {
                if (err.name === 'TokenExpiredError') {
                    const decode = JWT.decode(data.dto, { complete: true });
                    const token = {
                        id: decode.payload.id,
                        email: decode.payload.email,
                        role: decode.payload.role,
                        state: decode.payload.state
                    }
                    return { status: false, expired: true, token, error: 'Token expirado!' };
                }
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, err };
            }
        } else if (data.type === "refreshToken") {
            try {
                const decode = JWT.verify(data.dto, JWTLOGREFRESH)
                return { decode, status: true };
            } catch (err) {
                if (err.name === 'TokenExpiredError') {
                    return { status: false, expired: true, error: 'Token expirado!' };
                }
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, err };
            }
        } else if (data.type === "mailChange") {
            try {
                const token = JWT.verify(data.dto, JWTMAILUPDATE);
                return { token: token, status: true };
            } catch (err) {
                console.log(err)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, err };
            }
        } else if (data.type === "auth") {
            try {
                const token = JWT.verify(data.dto, JWTMAILERTOKER);
                return { token: token, status: true };
            } catch (err) {
                console.log(err)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, err };
            }
        } else if (data.type === "recovery") {
            try {
                const token = JWT.verify(data.dto, JWTRECOVERY);
                return { token: token, status: true };
            } catch (err) {
                console.log(err)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, err };
            }
        } else if (data.type === 'APIauth') {
            try {
                const token = JWT.verify(data.dto, JWTAPIKEY);
                // const token = JWT.sign(data.dto, "");
                return { token: token, status: true };
            } catch (err) {
                console.log(err)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ descricaoDoErro: 'Exeption estourada. Crypt Class', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNowFunction(), data_atualizacao: dateNowFunction(), deletado: false })
                return { status: false, err };
            }
        } else if (data.type === 'qrcode') {
            try {
                const token = JWT.verify(data.dto, JWTQRCODE);
                return { token: token, status: true };
            } catch (err) {
                console.log(err)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                return { status: false, err };
            }
        } else if (data.type === 'loginInvestidor') {
            try {
                const token = JWT.verify(data.dto, JWTLOGINVESTIDOR);
                return { token: token, status: true };
            } catch (err) {
                console.log(err)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                return { status: false, err };
            }

        }
    }
}

module.exports = new CriptClass();
