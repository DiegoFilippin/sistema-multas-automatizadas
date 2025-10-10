-- Script para criar mensagens de teste na tabela n8n_chat_recurso_de_multas
-- para o multaId específico que está sendo testado

-- Inserir mensagem do usuário
INSERT INTO n8n_chat_recurso_de_multas (session_id, message)
VALUES (
  '83840e05-9941-47ad-8fea-68bde8f07083',
  '{
    "type": "human",
    "content": "Olá, preciso de ajuda para criar um recurso para esta multa de velocidade. A multa é do tipo leve e foi por excesso de velocidade de até 20%."
  }'::jsonb
);

-- Inserir resposta da IA
INSERT INTO n8n_chat_recurso_de_multas (session_id, message)
VALUES (
  '83840e05-9941-47ad-8fea-68bde8f07083',
  '{
    "type": "ai",
    "content": "Olá! Vou ajudá-lo a criar um recurso para sua multa de velocidade. Com base nas informações que você forneceu, vejo que se trata de uma infração leve por excesso de velocidade de até 20%.\n\nPara multas deste tipo, temos algumas estratégias de defesa:\n\n1. **Verificação da calibração do equipamento**: Podemos questionar se o radar estava devidamente calibrado\n2. **Análise das condições da via**: Verificar se a sinalização estava adequada\n3. **Margem de erro**: Considerar a margem de tolerância do equipamento\n\nVocê gostaria que eu elabore um recurso completo baseado em alguma dessas estratégias?"
  }'::jsonb
);

-- Inserir segunda mensagem do usuário
INSERT INTO n8n_chat_recurso_de_multas (session_id, message)
VALUES (
  '83840e05-9941-47ad-8fea-68bde8f07083',
  '{
    "type": "human",
    "content": "Sim, por favor! Gostaria de um recurso completo questionando a calibração do equipamento e a margem de erro. A multa foi aplicada na Rua das Flores, 123."
  }'::jsonb
);

-- Inserir resposta final da IA com recurso
INSERT INTO n8n_chat_recurso_de_multas (session_id, message)
VALUES (
  '83840e05-9941-47ad-8fea-68bde8f07083',
  '{
    "type": "ai",
    "content": "Perfeito! Vou elaborar um recurso completo para você:\n\n**RECURSO DE MULTA - QUESTIONAMENTO DE CALIBRAÇÃO**\n\nExcelentíssimo Senhor Diretor do DETRAN,\n\nVenho, respeitosamente, por meio deste, apresentar RECURSO contra o Auto de Infração nº J001565490, lavrado em desfavor do veículo de placa [PLACA], por suposta infração ao art. 218, I do CTB.\n\n**DOS FATOS:**\nO auto de infração foi lavrado por equipamento eletrônico na Rua das Flores, 123, alegando excesso de velocidade de até 20%.\n\n**DO DIREITO:**\n1. **Questionamento da Calibração**: Não há comprovação de que o equipamento estava devidamente calibrado\n2. **Margem de Erro**: Deve ser considerada a margem de tolerância técnica\n3. **Ônus da Prova**: Cabe ao órgão autuador provar a regularidade do equipamento\n\n**DO PEDIDO:**\nRequer-se o CANCELAMENTO do auto de infração por falta de comprovação da regularidade do equipamento medidor.\n\nTermos em que pede deferimento.\n\n[Local], [Data]\n[Nome do Requerente]"
  }'::jsonb
);

-- Verificar se os dados foram inseridos
SELECT 
  id,
  session_id,
  message->>'type' as message_type,
  LEFT(message->>'content', 100) as content_preview
FROM n8n_chat_recurso_de_multas 
WHERE session_id = '83840e05-9941-47ad-8fea-68bde8f07083'
ORDER BY id ASC;