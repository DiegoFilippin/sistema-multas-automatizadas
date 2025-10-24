import 'dotenv/config';
import { supabase } from '../src/lib/supabase';
import { subaccountService, type AsaasSubaccount } from '../src/services/subaccountService';

const WALLET_ID = '1c224561-8c41-4b90-be27-6ecac395e2b5';

type SubRow = { id: string; wallet_id: string | null };

async function main() {
  console.log('🔎 Buscando uma subconta para teste...');
  const { data: rows, error } = await supabase
    .from('asaas_subaccounts')
    .select('id,wallet_id')
    .limit(1);

  if (error) {
    console.error('Erro ao listar subcontas:', (error as { message?: string }).message || String(error));
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.error('Nenhuma subconta encontrada na tabela asaas_subaccounts.');
    process.exit(1);
  }

  const sub = rows[0] as SubRow;
  console.log('🧪 Subconta encontrada:', sub);

  console.log('🔧 Atualizando wallet_id via serviço com fallback...');
  const result = await subaccountService.updateManualConfig(
    sub.id,
    { manual_wallet_id: WALLET_ID, is_manual_config: true },
    'test-user'
  );

  const updated = result as AsaasSubaccount;
  console.log('✅ Resultado da atualização:', {
    id: updated.id,
    wallet_id: updated.wallet_id,
    manual_wallet_id: (updated as unknown as { manual_wallet_id?: string }).manual_wallet_id,
    is_manual_config: (updated as unknown as { is_manual_config?: boolean }).is_manual_config,
  });

  console.log('🔁 Confirmando leitura do banco...');
  const { data: confirm, error: e2 } = await supabase
    .from('asaas_subaccounts')
    .select('id,wallet_id')
    .eq('id', sub.id)
    .single();

  if (e2) {
    console.error('Erro ao confirmar subconta:', (e2 as { message?: string }).message || String(e2));
    process.exit(1);
  }

  console.log('📌 Subconta após update (confirmação):', confirm as SubRow);
}

main().catch(err => {
  console.error('❌ Falha no script de updateWalletId:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});