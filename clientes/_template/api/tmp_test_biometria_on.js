require('dotenv/config');
const createAssinatura = require('./@core/usecase/Assinatura/createAssinatura.js');
const { SHA } = require('./infrastructure/gateways/crypt/sha/index.js');

const documento_id = '0c867ae0-1864-4796-ac75-92c5a4b893c5';
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
  const sha = new SHA();

  console.log('--- 1) sessaoAssinatura (biometria ON) ---');
  const session = mockSession();
  const r1 = await createAssinatura.sessaoAssinatura(
    { documento_id, user_id, solicitacao_ip: '127.0.0.1', solicitacao_porta_logica: 1234, user_agent_hash: 'teste-agente' },
    session,
    sha
  );
  console.log(JSON.stringify(r1, null, 2));
  if (!r1.status) process.exit(1);

  console.log('\n--- 2) confirmarSessaoAssinatura (biometria ON, deve pedir foto) ---');
  const r2 = await createAssinatura.confirmarSessaoAssinatura(
    { token: '123456', solicitacao_ip: '127.0.0.1', solicitacao_porta_logica: 1234, user_agent_hash: 'teste-agente' },
    session,
    sha
  );
  console.log(JSON.stringify(r2, null, 2));

  console.log('\n--- 3) carregarProgressoSessao (deve reportar aguardando_imagem) ---');
  const session2 = mockSession();
  const r3 = await createAssinatura.carregarProgressoSessao({ documento_id, user_id }, session2);
  console.log(JSON.stringify(r3, null, 2));

  process.exit(0);
}

main().catch((err) => { console.error('ERRO NO TESTE:', err); process.exit(1); });
