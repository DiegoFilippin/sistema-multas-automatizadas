// Script para debugar detecção de ambiente
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('🔍 === DEBUG DETECÇÃO DE AMBIENTE ===\n');

// Simular diferentes ambientes
console.log('📊 Variáveis de ambiente atuais:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);
console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
console.log('VITE_API_BASE_URL:', process.env.VITE_API_BASE_URL);

// Testar detecção de produção
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
console.log('\n🎯 Detecção de produção:', isProduction);

// Simular URLs que seriam geradas
const getDatawashUrl = () => {
  if (isProduction) {
    return '/api/datawash';
  }
  return 'http://localhost:3001/api/datawash';
};

console.log('\n🌐 URLs que seriam geradas:');
console.log('DataWash URL:', getDatawashUrl());

// Verificar se há cache de build
console.log('\n📦 Verificando cache de build...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    console.log('✅ Pasta dist existe');
    const files = fs.readdirSync(distPath);
    console.log('Arquivos na pasta dist:', files.slice(0, 5));
  } else {
    console.log('❌ Pasta dist não existe');
  }
} catch (error) {
  console.log('❌ Erro ao verificar pasta dist:', error.message);
}

console.log('\n🔧 Recomendações:');
console.log('1. Limpar cache de build: rm -rf dist');
console.log('2. Forçar rebuild: npm run build');
console.log('3. Verificar se import.meta.env.PROD está sendo detectado corretamente');
console.log('4. Verificar se há cache no Vercel');