require('dotenv/config');
const nodemailer = require("nodemailer");
const { bussines, statusAplication, statusApp } = require('../../../certs/index');

const isDev = statusAplication.status === statusApp.dev
    || process.env.STATUSAPLICATION === 'development';

function createTransporter() {
    if (isDev) {
        return nodemailer.createTransport({
            host: process.env.MAILPIT_HOST || 'mailpitsignature',
            port: Number(process.env.MAILPIT_SMTP_PORT || 1025),
            secure: false,
            auth: {
                user: process.env.MAILPIT_SMTP_USER || 'mailpit',
                pass: process.env.MAILPIT_SMTP_PASS || 'mailpitDev@2026',
            },
            tls: {
                rejectUnauthorized: false,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
        });
    }

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.MAIL,
            pass: process.env.MAILPASS,
        },
        tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
    });
}

const transporter = createTransporter();

function fromAddress() {
    const mail = isDev
        ? (process.env.MAIL || 'noreply@legacysignature.local')
        : process.env.MAIL;
    return `"${bussines.nameCompany}" <${mail}>`;
}

class Mailer {

    async sendEmail(subject, email, content) {
        try {
            const msg = await transporter.sendMail({
                from: fromAddress(),
                to: email,
                subject: subject,
                html: content,
            });
            console.log({
                msg: isDev ? 'E-mail enviado ao Mailpit.' : 'E-mail enviado com sucesso.',
                response: msg.response,
                to: email,
            });
            return true;
        } catch (err) {
            console.error({ msg: 'Erro ao enviar e-mail (Simples)', error: err.message, code: err.code });
            return false;
        }
    }

    async sendEmailLinkInvestidores(subject, email, content) {
        try {
            const msg = await transporter.sendMail({
                from: fromAddress(),
                to: email,
                subject: subject,
                html: content,
            });
            console.log({
                msg: isDev ? 'E-mail enviado ao Mailpit.' : 'E-mail enviado com sucesso.',
                response: msg.response,
                to: email,
            });
            return true;
        } catch (err) {
            console.error({ msg: 'Erro ao enviar e-mail (Simples)', error: err.message, code: err.code });
            return false;
        }
    }

    async sendEmailFile(subject, email, content, file) {
        try {
            const attachment = {
                filename: file.nomeArquivo,
            };
            if (file.content !== undefined && file.content !== null) {
                attachment.content = file.content;
            } else {
                attachment.path = file.path;
            }
            const msg = await transporter.sendMail({
                from: fromAddress(),
                to: email,
                subject: subject,
                html: content,
                attachments: [attachment],
            });
            console.log({
                msg: isDev ? 'E-mail com arquivo enviado ao Mailpit.' : 'E-mail com arquivo enviado.',
                response: msg.response,
                to: email,
            });
            return true;
        } catch (err) {
            console.error({ msg: 'Erro ao enviar e-mail (File)', error: err.message });
            return false;
        }
    }

    async sendEmailMultipleFile(subject, email, content, files) {
        try {
            const msg = await transporter.sendMail({
                from: fromAddress(),
                to: email,
                subject: subject,
                html: content,
                attachments: files.map(file => ({
                    filename: file.nomeArquivo,
                    path: file.path,
                })),
            });
            console.log({
                msg: isDev ? 'E-mail múltiplo enviado ao Mailpit.' : 'E-mail múltiplo enviado.',
                response: msg.response,
                to: email,
            });
            return true;
        } catch (err) {
            console.error({ msg: 'Erro ao enviar e-mail (Multiple)', error: err.message });
            return false;
        }
    }
}

module.exports = new Mailer();
