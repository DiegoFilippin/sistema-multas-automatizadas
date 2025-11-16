/**
 * Configuração da URL base da API
 * Em desenvolvimento: usa proxy do Vite (/api)
 * Em produção: usa a URL completa do backend
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Retorna a URL completa para um endpoint da API
 * @param path - Caminho do endpoint (ex: '/webhook/n8n/process-payment')
 * @returns URL completa do endpoint
 */
export function getApiUrl(path: string): string {
  // Remove barra inicial se existir
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Em desenvolvimento (localhost), usa proxy relativo
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `/api${cleanPath}`;
  }
  
  // Em produção, usa URL completa do backend
  if (API_BASE_URL) {
    return `${API_BASE_URL}/api${cleanPath}`;
  }
  
  // Fallback: usa URL relativa (pode não funcionar em produção)
  return `/api${cleanPath}`;
}
