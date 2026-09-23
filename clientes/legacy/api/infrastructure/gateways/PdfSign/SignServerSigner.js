const crypto = require('crypto');
const { Signer } = require('@signpdf/utils');
const serverSignGateway = require('../ServerSign');

class SignServerSigner extends Signer {

    constructor() {
        super();
    }

    async sign(pdfBuffer) {
        const hashHex = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
        const carimbo = await serverSignGateway.Carimbo().carimbarHash({ hashHex });
        if (!carimbo.status || !carimbo.data?.cms_base64) {
            throw new Error(carimbo.msg || 'SignServer não retornou CMS para a assinatura do PDF');
        }
        this.lastCarimbo = carimbo.data;
        return Buffer.from(carimbo.data.cms_base64, 'base64');
    }

}

module.exports = SignServerSigner;
