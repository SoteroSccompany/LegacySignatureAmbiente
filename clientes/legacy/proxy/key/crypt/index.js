require('dotenv/config');
const JWT = require("jsonwebtoken");
const JWTKEYPROXY = process.env.JWTKEYPROXY;
const fs = require('fs');



class CriptClass {

    create(data) {
        if (data.type === "keyproxy") {
            try {
                const token = JWT.sign(data.dto, JWTKEYPROXY);
                return token
            } catch (error) {
                const msgFile = `Erro ao criar servidor: ${error.message}\n${error.stack}\n`;
                fs.appendFileSync('logServer.log', String(msgFile));
            }
        }
    }

    verify(data) {
        if (data.type === "keyproxy") {
            try {
                const token = JWT.verify(data.dto, JWTKEYPROXY);
                return { token: token, status: true };
            } catch (err) {
                const msgFile = `Erro ao criar servidor: ${err.message}\n${err.stack}\n`;
                fs.appendFileSync('logServer.log', String(msgFile));
            }
        }


    }




}

module.exports = new CriptClass();