import { Router, Request, Response } from 'express';
import { subaccountService } from '../../src/services/subaccountService';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/subaccounts/:id/manual-config - Atualizar configuração manual (apenas wallet_id obrigatório)
router.post('/:id/manual-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { manual_wallet_id, wallet_id } = req.body as { manual_wallet_id?: string; wallet_id?: string };
    const userId = req.user?.id;

    console.log(`🔧 [lib] Atualizando configuração manual para subconta ${id}...`);
    console.log('📦 [lib] Payload recebido:', { manual_wallet_id, wallet_id });

    if (!userId) {
      console.warn('⚠️ [lib] Usuário não autenticado');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const wallet = (manual_wallet_id || wallet_id || '').trim();
    if (!wallet || wallet.length < 10) {
      console.warn('⚠️ [lib] Wallet ID inválido no payload');
      return res.status(400).json({ error: 'Wallet ID deve ter no mínimo 10 caracteres' });
    }

    const configData = {
      manual_wallet_id: wallet,
      is_manual_config: true
    };

    console.log('🔄 [lib] Chamando service.updateManualConfig com:', { id, configData });

    const result = await subaccountService.updateManualConfig(
      id,
      configData,
      userId as string
    );

    console.log('✅ [lib] Atualização retornada do service:', {
      id: result.id,
      wallet_id: result.wallet_id,
      manual_wallet_id: result.manual_wallet_id,
      is_manual_config: result.is_manual_config
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [lib] Erro ao atualizar configuração manual:', error);
    const message = error instanceof Error ? error.message : 'Erro ao atualizar configuração manual';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/subaccounts/:id/wallet - Salvar apenas o wallet_id manual rapidamente (dev-friendly)
router.post('/:id/wallet', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { wallet_id, manual_wallet_id } = req.body as { wallet_id?: string; manual_wallet_id?: string };

    const isDev = process.env.NODE_ENV !== 'production';
    const bypass = isDev; // bypass sempre em desenvolvimento
    const userId = bypass ? 'dev-bypass' : (req.user?.id || null);

    console.log(`🔧 [lib] Salvando wallet direto para subconta ${id}...`);
    console.log('📦 [lib] Payload recebido:', { wallet_id, manual_wallet_id, bypass });

    // Em produção, ainda exigir usuário; em dev, nunca bloquear
    if (!userId && !bypass) {
      console.warn('⚠️ [lib] Usuário não autenticado (produção)');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const wallet = (manual_wallet_id || wallet_id || '').trim();
    if (!wallet || wallet.length < 10) {
      console.warn('⚠️ [lib] Wallet ID inválido no payload');
      return res.status(400).json({ error: 'Wallet ID deve ter no mínimo 10 caracteres' });
    }

    const result = await subaccountService.updateManualConfig(
      id,
      { manual_wallet_id: wallet, is_manual_config: true },
      userId || 'dev-bypass'
    );

    console.log('✅ [lib] Wallet salva com sucesso:', {
      id: result.id,
      wallet_id: result.wallet_id,
      manual_wallet_id: result.manual_wallet_id,
      is_manual_config: result.is_manual_config
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [lib] Erro ao salvar wallet:', error);
    const message = error instanceof Error ? error.message : 'Erro ao salvar wallet';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;