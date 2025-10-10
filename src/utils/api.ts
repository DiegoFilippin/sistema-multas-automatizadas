// Configuração da API base URL
export const getApiBaseUrl = (): string => {
  // Em produção (Vercel), usar URLs relativas
  if (import.meta.env.PROD) {
    return '';
  }
  
  // Em desenvolvimento, usar o proxy configurado no Vite
  return '';
};

// Função para fazer requisições à API
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Adicionar token de autorização se disponível
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: defaultHeaders,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  
  return response.json();
};

// Função específica para carregar cobranças
export const loadPayments = async (companyId: string) => {
  return apiRequest(`/api/payments/list-service-orders?company_id=${companyId}`);
};