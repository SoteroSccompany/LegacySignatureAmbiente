require('dotenv/config');
const createAssinaturaUseCase = require('./@core/usecase/Assinatura/createAssinaturaUseCase.js');

const documento_id = 'dad2ba4a-122a-4a02-a54a-38f7e7c18ba5';
const user_id = '36c9f49f-0d0c-4209-91c6-2772e1f35e54';
const signatario_id = 'b5f36a5f-8df3-4302-b7fa-22d062a4cc3f';

async function main() {
  console.log('--- getUploadEstampaUrl (biometria off, desafio já confirmado) ---');
  const r = await createAssinaturaUseCase.getUploadEstampaUrl({ documento_id, user_id, signatario_id });
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

main().catch((err) => { console.error('ERRO NO TESTE:', err); process.exit(1); });
