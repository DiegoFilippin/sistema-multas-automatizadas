import { spawnSync } from 'child_process'
import fs from 'fs'

interface BenchResult {
  queries: number
  duration: number
  ok: boolean
  raw: string
}

function runScript(scriptPath: string): BenchResult {
  const proc = spawnSync('npx', ['tsx', scriptPath], { encoding: 'utf-8' })
  const output = (proc.stdout || '') + (proc.stderr || '')
  const benchMatch = output.match(/BENCH:\s*queries=(\d+)\s+duration=(\d+(?:\.\d+)?)/)
  const queries = benchMatch ? Number(benchMatch[1]) : NaN
  const duration = benchMatch ? Number(benchMatch[2]) : NaN
  const ok = proc.status === 0 && !Number.isNaN(duration)
  return { queries, duration, ok, raw: output }
}

function average(nums: number[]): number {
  if (!nums.length) return NaN
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function main() {
  const originalPath = 'scripts/debug-client-counts.ts'
  const optimizedPath = 'scripts/debug-client-counts-optimized.ts'
  const runs = 5

  const originalResults: BenchResult[] = []
  const optimizedResults: BenchResult[] = []

  console.log(`Benchmark: executando ${runs}x cada script...`) 

  for (let i = 1; i <= runs; i++) {
    console.log(`\n[Rodada ${i}] Original`) 
    const resOrig = runScript(originalPath)
    originalResults.push(resOrig)
    console.log(resOrig.ok ? `OK BENCH original: queries=${resOrig.queries} duration=${resOrig.duration}` : 'Falha ao extrair BENCH do original')

    console.log(`[Rodada ${i}] Otimizado`) 
    const resOpt = runScript(optimizedPath)
    optimizedResults.push(resOpt)
    console.log(resOpt.ok ? `OK BENCH otimizado: queries=${resOpt.queries} duration=${resOpt.duration}` : 'Falha ao extrair BENCH do otimizado')
  }

  const originalDurations = originalResults.filter(r => r.ok).map(r => r.duration)
  const optimizedDurations = optimizedResults.filter(r => r.ok).map(r => r.duration)
  const originalQueries = originalResults.filter(r => r.ok).map(r => r.queries)
  const optimizedQueries = optimizedResults.filter(r => r.ok).map(r => r.queries)

  const report = {
    runs,
    original: {
      avgDurationMs: average(originalDurations),
      avgQueries: average(originalQueries),
      durations: originalDurations,
      queries: originalQueries,
      successRuns: originalDurations.length
    },
    optimized: {
      avgDurationMs: average(optimizedDurations),
      avgQueries: average(optimizedQueries),
      durations: optimizedDurations,
      queries: optimizedQueries,
      successRuns: optimizedDurations.length
    },
    improvement: {
      durationMs: average(originalDurations) - average(optimizedDurations),
      percent: ((average(originalDurations) - average(optimizedDurations)) / average(originalDurations)) * 100
    }
  }

  console.log('\n==== Relatório Comparativo ====')
  console.log(`Original: média ${report.original.avgDurationMs?.toFixed(2)} ms, queries ~${report.original.avgQueries?.toFixed(1)} (runs OK=${report.original.successRuns}/${runs})`)
  console.log(`Otimizado: média ${report.optimized.avgDurationMs?.toFixed(2)} ms, queries ~${report.optimized.avgQueries?.toFixed(1)} (runs OK=${report.optimized.successRuns}/${runs})`)
  console.log(`Ganho: ${report.improvement.durationMs?.toFixed(2)} ms (${report.improvement.percent?.toFixed(1)}%)`) 

  try {
    fs.mkdirSync('scripts/output', { recursive: true })
    fs.writeFileSync('scripts/output/benchmark-client-counts.json', JSON.stringify(report, null, 2), 'utf-8')
    console.log('Relatório salvo em scripts/output/benchmark-client-counts.json')
  } catch (e) {
    console.warn('Falha ao salvar relatório:', e)
  }
}

main()