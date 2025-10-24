import { PrismaClient } from '@prisma/client'

const dbEnabled = !!process.env.DATABASE_URL

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = dbEnabled
  ? (globalForPrisma.prisma ?? new PrismaClient())
  : (undefined as unknown as PrismaClient)

if (dbEnabled && process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function connectDatabase() {
  if (!dbEnabled) {
    console.warn('DATABASE_URL não definido. Pulando conexão com Prisma.')
    return
  }
  try {
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados')
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error)
    throw error
  }
}

export async function disconnectDatabase() {
  if (!dbEnabled) return
  try {
    await prisma.$disconnect()
    console.log('✅ Desconectado do banco de dados')
  } catch (error) {
    console.error('❌ Erro ao desconectar do banco de dados')
  }
}

export async function checkDatabaseHealth() {
  if (!dbEnabled) return { status: 'disabled', message: 'Banco de dados desativado' }
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', message: 'Banco de dados conectado' }
  } catch (error) {
    return { status: 'unhealthy', message: 'Erro na conexão com o banco de dados' }
  }
}

export default prisma