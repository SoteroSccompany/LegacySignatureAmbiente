require('dotenv/config');
const { bussines } = require('../../../../../certs/index');

/**
 * Template de mensagem com link/CTA.
 * data: { title, descricao, link, nomeLink?, nome? }
 */
const genMail = (data = {}) => {
  const company = bussines.nameSoftware || 'Net Sign';
  const brand = bussines.nameCompany || 'Net Sign';
  const {
    title = 'Ação necessária',
    descricao = 'Há uma etapa aguardando sua confirmação na plataforma.',
    link = process.env.URL_FRONT || '#',
    nomeLink = 'Acessar plataforma',
    nome = '',
  } = data;

  const saudacao = nome ? `Olá, ${nome}` : 'Olá';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#E8EEF2;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E8EEF2;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:4px;overflow:hidden;box-shadow:0 8px 32px rgba(11,31,51,0.12);">
          <tr>
            <td style="background-color:#0B1F33;padding:36px 40px 28px 40px;">
              <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#7EB8C9;">
                ${company}
              </p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:700;color:#FFFFFF;">
                ${title}
              </h1>
              <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#A8C5D0;">
                Um clique para seguir com segurança no fluxo de assinatura.
              </p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#0F766E 0%,#14B8A6 50%,#0B1F33 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px 40px;">
              <p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#0B1F33;">
                ${saudacao}
              </p>
              <p style="margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#334155;">
                ${descricao}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 8px auto;">
                <tr>
                  <td align="center" bgcolor="#0F766E" style="border-radius:4px;">
                    <a href="${link}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.02em;">
                      ${nomeLink}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#64748B;text-align:center;word-break:break-all;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <a href="${link}" style="color:#0F766E;text-decoration:underline;">${link}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 36px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;border-radius:4px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0F766E;font-weight:700;">
                      Segurança ${company}
                    </p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#475569;">
                      Links de acesso são pessoais e temporários. Não compartilhe este e-mail. Em caso de dúvida, acesse a plataforma pelos canais oficiais.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0B1F33;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#FFFFFF;">
                ${brand}
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7EB8C9;">
                ${company} · Confiança digital que escala com o seu negócio
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94A3B8;text-align:center;">
          Esta é uma mensagem automática. Não responda a este e-mail.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

module.exports = genMail;
