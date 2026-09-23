require('dotenv/config');
const fs = require('fs');
const path = require('path');

const genMail = data => {
    // --- Valores Padrão para o Template ---
    // Isso torna seu template mais robusto e reutilizável
    const {
        logoUrl = process.env.URL_FRONT, // Usei .png para maior compatibilidade
        title = 'Título Padrão',
        descricao = 'Esta é uma mensagem importante para você.',
        buttonText = 'Clique Aqui',
        buttonLink = 'https://netexperts.com.br'
    } = data;

    const mail = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <style>
        /* Reset básico */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; height: 100% !important; width: 100% !important; background-color: #f0f2f5; }

        /* Estilos principais */
        .container {
            max-width: 600px;
            width: 100%;
        }

        .header {
            background-color: #2a6abf; /* Cor sólida como fallback para gradientes */
            padding: 40px 20px;
            text-align: center;
        }

        .logo {
            max-width: 250px; /* Defina um tamanho máximo para a logo */
            width: 100%;
            height: auto;
        }

        .title {
            color: #ffffff;
            font-family: Arial, sans-serif;
            font-size: 26px;
            font-weight: bold;
            line-height: 1.2;
            margin: 0;
            padding-top: 20px; /* Espaçamento entre logo e título */
        }
        
        .content {
            background-color: #ffffff;
            padding: 40px 30px;
            text-align: center;
        }

        .greeting {
            color: #333333;
            font-family: Arial, sans-serif;
            font-size: 18px;
            margin: 0;
            padding-bottom: 15px;
        }

        .message {
            color: #555555;
            font-family: Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            margin: 0;
            padding-bottom: 30px;
        }

        .button {
            background-color: #4a90e2;
            border-radius: 25px;
            color: #ffffff;
            display: inline-block;
            font-family: Arial, sans-serif;
            font-size: 16px;
            font-weight: bold;
            padding: 15px 30px;
            text-decoration: none;
            transition: background-color 0.3s;
        }

        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            font-family: Arial, sans-serif;
        }

        .company-name {
            color: #2a6abf;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .company-tagline {
            color: #888888;
            font-size: 14px;
        }
        
        /* Estilos para telas menores */
        @media screen and (max-width: 600px) {
            .container {
                width: 100% !important;
            }
            .content, .footer {
                padding-right: 20px !important;
                padding-left: 20px !important;
            }
            .title {
                font-size: 22px !important;
            }
        }
    </style>
</head>
<body>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f2f5;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" class="container">
                    <tr>
                        <td class="header">
                            <img src="${logoUrl}" alt="Net Sign Logo" class="logo">
                            <h1 class="title">${title}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            <p class="greeting">Olá!</p>
                            <p class="message">${descricao}</p>
                            <table border="0" cellspacing="0" cellpadding="0" align="center">
                                <tr>
                                    <td align="center">
                                        <a href="${data.link}" target="_blank" class="button">${data.nomeLink}</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p class="company-name">Net Sign</p>
                            <p class="company-tagline">Soluções em Tecnologia</p>
                        </td>
                    </tr>
                </table>
                </td>
        </tr>
    </table>
</body>
</html>
`;
    return mail;
}

module.exports = genMail;