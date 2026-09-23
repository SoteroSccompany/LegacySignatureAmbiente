const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const moment = require('moment-timezone');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { plainAddPlaceholder } = require('@signpdf/placeholder-plain');
const { SUBFILTER_ETSI_CADES_DETACHED } = require('@signpdf/utils');
const signpdf = require('@signpdf/signpdf').default;
const SignServerSigner = require('./SignServerSigner');
const dateNow = require('../functions/data/getToday');
const { selagemPlataforma } = require('../../../certs');

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

function parseJsonField(value) {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

// Nome de arquivo/pessoa às vezes chega em NFD (acento como marca combinante separada, ex.: sistema de
// arquivos macOS) em vez de NFC (acento pré-composto). WinAnsiEncoding (fonte padrão do pdf-lib) não sabe
// desenhar uma marca combinante isolada e derruba o worker com "WinAnsi cannot encode". Normaliza para NFC
// antes de qualquer drawText com texto livre (nome de documento, nome de signatário).
function normalizarTexto(valor) {
    if (valor == null) return valor;
    try {
        return String(valor).normalize('NFC');
    } catch (_) {
        return String(valor);
    }
}

function formatarDataFolha(data) {
    if (data == null || data === '') return '-';
    const m = moment(data).tz('America/Sao_Paulo');
    if (!m.isValid()) return '-';
    return m.format('DD/MM/YYYY HH:mm:ss');
}

async function aplicarEstampaVisual({ pdfBytes, demarcacoes, modo, textoEstampa, imagemPngBytes }) {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let embeddedImage = null;
    if (imagemPngBytes) {
        embeddedImage = await pdfDoc.embedPng(imagemPngBytes);
    }

    for (const mark of demarcacoes) {
        const pageIndex = Number(mark.pagina) - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;
        const page = pages[pageIndex];
        const pdfBox = parseJsonField(mark.pdf) || {};
        const x = Number(pdfBox.x) || 0;
        const y = Number(pdfBox.y) || 0;
        const width = Number(pdfBox.largura) || 160;
        const height = Number(pdfBox.altura) || 60;

        page.drawRectangle({
            x,
            y,
            width,
            height,
            borderColor: rgb(0.15, 0.15, 0.15),
            borderWidth: 0.6,
            color: rgb(1, 1, 1),
            opacity: 0.85,
        });

        if (modo === 'DESENHO' && embeddedImage) {
            const nomeLinha = textoEstampa && textoEstampa.nome
                ? normalizarTexto(String(textoEstampa.nome).substring(0, 80))
                : null;
            const faixaNome = nomeLinha ? Math.min(14, height * 0.22) : 0;
            const areaImgH = height - faixaNome - 4;
            const imgRatio = embeddedImage.width / embeddedImage.height;
            let drawW = width * 0.9;
            let drawH = drawW / imgRatio;
            if (drawH > areaImgH * 0.95) {
                drawH = areaImgH * 0.95;
                drawW = drawH * imgRatio;
            }
            page.drawImage(embeddedImage, {
                x: x + (width - drawW) / 2,
                y: y + faixaNome + (areaImgH - drawH) / 2,
                width: drawW,
                height: drawH,
            });
            if (nomeLinha) {
                const fontSizeNome = Math.max(7, Math.min(9, faixaNome - 2));
                page.drawText(nomeLinha, {
                    x: x + 4,
                    y: y + 4,
                    size: fontSizeNome,
                    font,
                    color: rgb(0.1, 0.1, 0.1),
                    maxWidth: width - 8,
                });
            }
        } else {
            const linhas = [
                normalizarTexto(textoEstampa.nome),
                `CPF: ${textoEstampa.cpf_mascarado}`,
                textoEstampa.data_hora,
                textoEstampa.legenda,
                textoEstampa.codigo_verificacao ? `Cód. verificação: ${textoEstampa.codigo_verificacao}` : null,
            ].filter(Boolean);
            const fontSize = Math.max(7, Math.min(10, height / (linhas.length + 1)));
            let cursorY = y + height - fontSize - 4;
            for (const linha of linhas) {
                page.drawText(String(linha).substring(0, 80), {
                    x: x + 4,
                    y: cursorY,
                    size: fontSize,
                    font,
                    color: rgb(0.1, 0.1, 0.1),
                    maxWidth: width - 8,
                });
                cursorY -= fontSize + 2;
            }
        }
    }

    return Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
}

// Folha de auditoria: páginas finais com resumo dos signatários e trilha de assinatura.
// Cabeçalho/rodapé (logo, QR, código, paginação) só nas páginas adicionadas aqui — o contrato
// original não é redesenhado. Deve ser chamada DEPOIS das estampas e ANTES de aplicarSeloPlataforma,
// para entrar no byte range coberto pelo selo. Nunca chamar depois do selo: invalida o PAdES.
async function adicionarFolhaAuditoria({ pdfBytes, documento, codigoVerificacao, signatarios, urlVerificacao, trilha }) {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595.28; // A4 retrato, em pontos
    const pageHeight = 841.89;
    const margin = 48;
    const headerHeight = 70;
    const qrSize = 104;
    const footerHeight = 132;
    const corpoMinY = footerHeight + 8;
    const corTitulo = rgb(0.06, 0.09, 0.16);
    const corTexto = rgb(0.2, 0.2, 0.2);
    const corSecundaria = rgb(0.25, 0.25, 0.25);
    const corLinha = rgb(0.75, 0.75, 0.78);

    let logoImage = null;
    const logoPath = path.join(__dirname, '../../../public/logo.jpeg');
    try {
        if (fs.existsSync(logoPath)) {
            logoImage = await pdfDoc.embedJpg(fs.readFileSync(logoPath));
        } else {
            console.log('Logo da folha de auditoria não encontrada:', logoPath);
        }
    } catch (err) {
        console.log(err);
    }

    let qrImage = null;
    let conteudoQr = null;
    const codigo = (codigoVerificacao !== undefined && codigoVerificacao !== null && String(codigoVerificacao).trim() !== '')
        ? String(codigoVerificacao).trim()
        : null;
    const urlInformada = urlVerificacao ? String(urlVerificacao).trim() : '';
    if (codigo && codigo !== 'null' && urlInformada.indexOf('/verificar/null') === -1) {
        if (urlInformada) conteudoQr = urlInformada;
        if (!conteudoQr) {
            const front = (process.env.URL_FRONT || '').replace(/\/+$/, '');
            if (front) conteudoQr = `${front}/verificar/${codigo}`;
        }
    }
    if (conteudoQr) {
        try {
            const qrBuffer = await QRCode.toBuffer(conteudoQr, { type: 'png', width: 384, margin: 4, errorCorrectionLevel: 'M' });
            qrImage = await pdfDoc.embedPng(qrBuffer);
        } catch (err) {
            console.log(err);
        }
    }

    const paginasFolha = [];
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    paginasFolha.push(page);
    let cursorY = pageHeight - headerHeight - 8;

    const novaLinha = (altura) => {
        cursorY -= altura;
        if (cursorY < corpoMinY) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            paginasFolha.push(page);
            cursorY = pageHeight - headerHeight - 8 - altura;
        }
    };

    if (codigoVerificacao) {
        page.drawText(`Código de verificação: ${String(codigoVerificacao).substring(0, 80)}`, { x: margin, y: cursorY, size: 10, font, color: corTexto });
        novaLinha(16);
    }
    page.drawText(`Gerado em: ${formatarDataFolha(dateNow())}`, { x: margin, y: cursorY, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    novaLinha(18);
    page.drawLine({ start: { x: margin, y: cursorY + 6 }, end: { x: pageWidth - margin, y: cursorY + 6 }, thickness: 0.5, color: corLinha });
    novaLinha(16);

    const totalSignatarios = Array.isArray(signatarios) ? signatarios.length : 0;
    const tituloSignatarios = totalSignatarios === 1 ? 'Signatário' : 'Signatários';
    page.drawText(tituloSignatarios, { x: margin, y: cursorY, size: 12, font: fontBold, color: corTitulo });
    novaLinha(20);

    for (const s of signatarios || []) {
        page.drawText(normalizarTexto(String(s.nome || 'Signatário').substring(0, 80)), { x: margin, y: cursorY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        novaLinha(14);
        page.drawText(`CPF: ${s.cpf_mascarado || '***.***.***-**'}`, { x: margin + 12, y: cursorY, size: 9, font, color: corSecundaria });
        novaLinha(13);
        page.drawText(`Assinado em: ${formatarDataFolha(s.assinado_em)}`, { x: margin + 12, y: cursorY, size: 9, font, color: corSecundaria });
        novaLinha(13);
        const desafioLabel = s.confirmacao_2fa?.confirmado
            ? `Confirmação em duas etapas (${s.confirmacao_2fa.tipo_desafio}) em ${formatarDataFolha(s.confirmacao_2fa.confirmado_em)}`
            : 'Confirmação em duas etapas: não registrada';
        page.drawText(desafioLabel.substring(0, 90), { x: margin + 12, y: cursorY, size: 9, font, color: corSecundaria });
        novaLinha(13);
        page.drawText(`Reconhecimento facial: ${s.biometria_folha || (s.biometria_validada ? 'validado' : 'não validado')}`, { x: margin + 12, y: cursorY, size: 9, font, color: corSecundaria });
        novaLinha(20);
    }

    if (Array.isArray(trilha)) {
        novaLinha(10);
        page.drawLine({ start: { x: margin, y: cursorY + 6 }, end: { x: pageWidth - margin, y: cursorY + 6 }, thickness: 0.5, color: corLinha });
        novaLinha(16);
        page.drawText('Trilha de assinatura', { x: margin, y: cursorY, size: 12, font: fontBold, color: corTitulo });
        novaLinha(20);
        for (const elo of trilha) {
            const sequencia = elo.sequencia != null ? String(elo.sequencia) : '-';
            const tipoEvento = String(elo.tipo_evento || '-').replace(/_/g, ' ');
            const tituloElo = elo.nome
                ? `${sequencia}  ${tipoEvento} — ${normalizarTexto(elo.nome)}`
                : `${sequencia}  ${tipoEvento}`;
            page.drawText(tituloElo.substring(0, 90), { x: margin, y: cursorY, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
            novaLinha(13);
            const dataElo = formatarDataFolha(elo.criado_em || elo.data || elo.data_criacao);
            const objetoTipo = String(elo.objeto_tipo || '-').replace(/_/g, ' ');
            page.drawText(`Objeto: ${objetoTipo.substring(0, 40)}  Data: ${dataElo}`, { x: margin + 12, y: cursorY, size: 8, font, color: corSecundaria });
            novaLinha(12);
            if (elo.ip) {
                const portaTexto = elo.porta_logica ? `  Porta lógica: ${elo.porta_logica}` : '';
                page.drawText(`IP: ${elo.ip}${portaTexto}`, { x: margin + 12, y: cursorY, size: 8, font, color: corSecundaria });
                novaLinha(12);
            }
            if (elo.hash_documento_final) {
                page.drawText(`Hash do documento: ${elo.hash_documento_final}`, { x: margin + 12, y: cursorY, size: 8, font, color: corSecundaria });
                novaLinha(16);
            } else {
                novaLinha(4);
            }
        }
    }

    const totalPaginas = paginasFolha.length;
    for (let i = 0; i < totalPaginas; i++) {
        const p = paginasFolha[i];
        p.drawLine({
            start: { x: margin, y: pageHeight - headerHeight + 8 },
            end: { x: pageWidth - margin, y: pageHeight - headerHeight + 8 },
            thickness: 0.5,
            color: corLinha,
        });
        let headerTextX = margin;
        if (logoImage) {
            const logoH = 36;
            const logoW = Math.min(80, (logoImage.width / logoImage.height) * logoH);
            p.drawImage(logoImage, {
                x: margin,
                y: pageHeight - 16 - logoH,
                width: logoW,
                height: logoH,
            });
            headerTextX = margin + logoW + 10;
        }
        p.drawText('Folha de auditoria', { x: headerTextX, y: pageHeight - 32, size: 12, font: fontBold, color: corTitulo });
        const nomeDoc = normalizarTexto(String(documento?.documento_nome || documento?.nome_documento || '').substring(0, 70));
        if (nomeDoc) {
            p.drawText(nomeDoc, { x: headerTextX, y: pageHeight - 46, size: 8, font, color: rgb(0.3, 0.3, 0.3), maxWidth: pageWidth - headerTextX - margin });
        }

        p.drawLine({
            start: { x: margin, y: footerHeight - 4 },
            end: { x: pageWidth - margin, y: footerHeight - 4 },
            thickness: 0.5,
            color: corLinha,
        });
        let footerTextX = margin;
        if (qrImage) {
            p.drawImage(qrImage, { x: margin, y: 12, width: qrSize, height: qrSize });
            footerTextX = margin + qrSize + 10;
        }
        if (codigo) {
            p.drawText(codigo.substring(0, 36), { x: footerTextX, y: 64, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
            p.drawText('Código de verificação', { x: footerTextX, y: 52, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
        }
        const paginacao = `Página ${i + 1} de ${totalPaginas}`;
        const pagW = font.widthOfTextAtSize(paginacao, 8);
        p.drawText(paginacao, { x: pageWidth - margin - pagW, y: 58, size: 8, font, color: rgb(0.35, 0.35, 0.35) });
    }

    return Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
}

// Selo digital único da plataforma: o CMS vem do certificado da empresa no SignServer.
// Os signatários são autenticados pela estampa visual + trilha de auditoria (Lei 14.063, art. 4º, II).
async function aplicarSeloPlataforma({ pdfBytes }) {
    const pdfWithPlaceholder = plainAddPlaceholder({
        pdfBuffer: pdfBytes,
        reason: selagemPlataforma.reason,
        contactInfo: selagemPlataforma.razao_social,
        name: selagemPlataforma.razao_social,
        location: selagemPlataforma.location,
        signingTime: new Date(),
        subFilter: SUBFILTER_ETSI_CADES_DETACHED,
        signatureLength: 32768,
    });

    const signer = new SignServerSigner();
    const signedPdf = await signpdf.sign(pdfWithPlaceholder, signer);
    return {
        pdfBuffer: Buffer.from(signedPdf),
        carimbo: signer.lastCarimbo || null,
        assinado_em: dateNow(),
    };
}

function mascararCpf(cpfPlain) {
    const d = String(cpfPlain || '').replace(/\D/g, '');
    if (d.length !== 11) return '***.***.***-**';
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

module.exports = {
    streamToBuffer,
    parseJsonField,
    aplicarEstampaVisual,
    adicionarFolhaAuditoria,
    aplicarSeloPlataforma,
    mascararCpf,
};
