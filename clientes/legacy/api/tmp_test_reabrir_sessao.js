require('dotenv/config');
const createAssinatura = require('./@core/usecase/Assinatura/createAssinatura.js');

const documento_id = 'dad2ba4a-122a-4a02-a54a-38f7e7c18ba5';
const user_id = '36c9f49f-0d0c-4209-91c6-2772e1f35e54';
const session_id = 'fPSjlJ5ANr7h0Py-xiOPleMohftcakzT';

function mockSession() {
  return {
    id: session_id,
    user: { id: user_id },
    save(cb) { cb(null); },
  };
}

async function main() {
  const { SHA } = require('./infrastructure/gateways/crypt/sha/index.js');
  const sha = new SHA();
  console.log('--- Reabrindo sessaoAssinatura (desafio já confirmado) ---');
  const session = mockSession();
  const r = await createAssinatura.sessaoAssinatura(
    { documento_id, user_id, solicitacao_ip: '127.0.0.1', solicitacao_porta_logica: 1234, user_agent_hash: 'teste-agente' },
    session,
    sha
  );
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

main().catch((err) => { console.error('ERRO NO TESTE:', err); process.exit(1); });
