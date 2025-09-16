// api/insights/generate.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Daily slot at 08:00 America/Sao_Paulo (currently UTC-3 → 11:00Z)
// Note: Brazil currently has no DST. If DST returns, consider computing the offset dynamically.
function daily8amSlot(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const ymd = fmt.format(date) // e.g., 2025-09-16 (local SP date)
  // Store as 11:00Z (08:00 BRT). This serves as our idempotent slot for the local day.
  return new Date(`${ymd}T11:00:00Z`)
}

function dateOnly(d: string | Date) {
  const n = typeof d === 'string' ? new Date(d) : d
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const day = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Missing Supabase env', { status: 500 })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const slot = daily8amSlot()

  try {
    // Get active users: who have cadastros row
    const { data: users, error: usersErr } = await supabase
      .from('cadastros')
      .select('user_id')
    if (usersErr) throw usersErr

    const uniqUsers = Array.from(new Set((users || []).map(u => u.user_id))).filter(Boolean)

    for (const uid of uniqUsers) {
  // Check idempotency (once per day per user)
      const { data: existing, error: existErr } = await supabase
        .from('insights_feed')
        .select('id')
        .eq('user_id', uid)
        .eq('slot_start', slot.toISOString())
        .limit(1)
      if (existErr) throw existErr
      if (existing && existing.length > 0) continue

      // Load minimal data
      const since = dateOnly(new Date(Date.now() - 60 * 24 * 3600 * 1000))
      const today = dateOnly(new Date())

      const [{ data: cad, error: cadErr }, { data: regs, error: regsErr }] = await Promise.all([
        supabase.from('cadastros').select('lojas, vendedores').eq('user_id', uid).limit(1).single(),
        supabase.from('registros').select('id, vendedorId, lojaId, data, vendas, atendimentos').eq('user_id', uid).gte('data', since).lte('data', today),
      ])
      if (cadErr) throw cadErr
      if (regsErr) throw regsErr

      const lojas = (cad?.lojas || []) as any[]
      const vendedores = (cad?.vendedores || []) as any[]
      const vendas = (regs || []).map(r => ({ ...r, data: dateOnly(r.data) })) as any[]

      const items = generate8Insights(uid, vendas, lojas, vendedores)
      if (items.length === 0) continue

      const rows = items.map(it => ({ user_id: uid, slot_start: slot.toISOString(), ...it }))
      const { error: insErr } = await supabase.from('insights_feed').insert(rows)
      if (insErr) throw insErr
    }

    return new Response('OK', { status: 200 })
  } catch (e: any) {
    return new Response(`Error: ${e?.message || String(e)}`, { status: 500 })
  }
}

// Basic reusable helpers
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const safe = (n: number) => (Number.isFinite(n) ? n : 0)

function generate8Insights(userId: string, vendas: any[], lojas: any[], vendedores: any[]) {
  const out: any[] = []
  const lojasMap = Object.fromEntries(lojas.map((l: any) => [l.id, l]))
  const vendMap = Object.fromEntries(vendedores.map((v: any) => [v.id, v]))

  const today = new Date()
  const d7 = new Date(today); d7.setDate(today.getDate() - 6)
  const d14 = new Date(today); d14.setDate(today.getDate() - 13)

  const inRange = (s: string, a: Date, b: Date) => {
    const ds = new Date(s)
    return ds >= a && ds <= b
  }

  const at = (regs: any[]) => sum(regs.map(r => r.atendimentos || 0))
  const vd = (regs: any[]) => sum(regs.map(r => r.vendas || 0))
  const conv = (regs: any[]) => { const A = at(regs); const V = vd(regs); return A > 0 ? (V / A) * 100 : 0 }

  const last7 = vendas.filter(v => inRange(v.data, d7, today))
  const prev7 = vendas.filter(v => inRange(v.data, d14, new Date(today.getTime() - 7 * 24 * 3600 * 1000)))

  const convLast = conv(last7)
  const convPrev = conv(prev7)
  const trendDelta = convPrev > 0 ? ((convLast - convPrev) / convPrev) * 100 : (convLast > 0 ? 100 : 0)

  // 1) Tendência
  out.push({
    kind: 'trend',
    title: trendDelta >= 0 ? 'Conversão subiu' : 'Conversão caiu',
    description: trendDelta >= 0
      ? `Últimos 7d: ${convLast.toFixed(1)}%, ${Math.abs(trendDelta).toFixed(1)}% acima da semana anterior (${convPrev.toFixed(1)}%).`
      : `Últimos 7d: ${convLast.toFixed(1)}%, ${Math.abs(trendDelta).toFixed(1)}% abaixo da semana anterior (${convPrev.toFixed(1)}%).`,
    tag: trendDelta >= 0 ? 'info' : 'alert',
    icon: trendDelta >= 0 ? 'trendingUp' : 'trendingDown',
    metric: `7d: ${convLast.toFixed(1)}% • prev: ${convPrev.toFixed(1)}%`,
  })

  // Aggregations
  type Agg = { atend: number; vendas: number; perdidos: number; valorPerdido: number }
  const byLoja: Record<string, Agg> = {}
  const byVend: Record<string, Agg> = {}
  const byDow: Record<number, { atend: number; vendas: number }> = {}

  for (const r of last7) {
    const t = safe(lojasMap[r.lojaId]?.ticketMedio ?? 0)
    const perd = Math.max((r.atendimentos || 0) - (r.vendas || 0), 0)
    if (!byLoja[r.lojaId]) byLoja[r.lojaId] = { atend: 0, vendas: 0, perdidos: 0, valorPerdido: 0 }
    if (!byVend[r.vendedorId]) byVend[r.vendedorId] = { atend: 0, vendas: 0, perdidos: 0, valorPerdido: 0 }
    byLoja[r.lojaId].atend += r.atendimentos || 0
    byLoja[r.lojaId].vendas += r.vendas || 0
    byLoja[r.lojaId].perdidos += perd
    byLoja[r.lojaId].valorPerdido += perd * t
    byVend[r.vendedorId].atend += r.atendimentos || 0
    byVend[r.vendedorId].vendas += r.vendas || 0
    byVend[r.vendedorId].perdidos += perd
    byVend[r.vendedorId].valorPerdido += perd * t
    const dow = new Date(r.data).getDay()
    if (!byDow[dow]) byDow[dow] = { atend: 0, vendas: 0 }
    byDow[dow].atend += r.atendimentos || 0
    byDow[dow].vendas += r.vendas || 0
  }

  const worstStore = Object.entries(byLoja).sort((a, b) => b[1].valorPerdido - a[1].valorPerdido)[0]
  const worstVend = Object.entries(byVend).sort((a, b) => b[1].valorPerdido - a[1].valorPerdido)[0]

  if (worstStore) {
    const [lojaId, agg] = worstStore
    out.push({ kind: 'store_loss', title: `Maior valor perdido: ${lojasMap[lojaId]?.nome ?? 'Loja'}`, description: `Estimativa de ${agg.valorPerdido.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} em 7d.`, tag: 'alert', icon: 'store', metric: `Perdidos: ${agg.perdidos}` })
  }
  if (worstVend) {
    const [vendId, agg] = worstVend
    out.push({ kind: 'seller_loss', title: `Vendedor com maior perda`, description: `Perda estimada: ${agg.valorPerdido.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} em 7d.`, tag: 'alert', icon: 'users', metric: `Perdidos: ${agg.perdidos}` })
  }

  // Worst DOW (no threshold)
  const dowConv = Object.entries(byDow).map(([k, v]) => ({ dow: Number(k), conv: v.atend > 0 ? (v.vendas / v.atend) * 100 : 0, atend: v.atend }))
    .sort((a, b) => a.conv - b.conv)
  if (dowConv[0]) {
    const nomes = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    out.push({ kind: 'dow', title: `Dia fraco: ${nomes[dowConv[0].dow]}`, description: `Conversão ${dowConv[0].conv.toFixed(1)}% nos últimos 7 dias.`, tag: 'opportunity', icon: 'calendar', metric: `Atendimentos: ${dowConv[0].atend}` })
  }

  // Missing tickets
  const lojasSemTicket = lojas.filter(l => !(typeof l.ticketMedio === 'number' && l.ticketMedio > 0)).map(l => l.nome)
  if (lojasSemTicket.length > 0) {
    out.push({ kind: 'tickets', title: 'Ticket médio pendente', description: `Defina ticket médio para: ${lojasSemTicket.slice(0,3).join(', ')}${lojasSemTicket.length>3?'…':''}.`, tag: 'alert', icon: 'dollar' })
  } else {
    // Projection +1pp (global)
    const proj = sum(Object.values(byLoja).map((agg: any) => (agg.atend * 0.01) * safe(0))) // safe(0) placeholder; better per-loja
    out.push({ kind: 'plus1pp', title: 'Meta rápida: +1pp de conversão', description: `Ganho estimado com +1pp: rever por loja.`, tag: 'opportunity', icon: 'target' })
  }

  // Add two more general insights if needed to reach 8
  if (Object.keys(byVend).length > 0) {
    const bestVend = Object.entries(byVend).sort((a, b) => (b[1].vendas/(b[1].atend||1)) - (a[1].vendas/(a[1].atend||1)))[0]
    if (bestVend) out.push({ kind: 'best_seller', title: 'Melhor conversão (7d)', description: 'Reconheça e replique práticas do topo do ranking.', tag: 'info', icon: 'users' })
  }
  if (Object.keys(byLoja).length > 0) {
    const lowConvLoja = Object.entries(byLoja).sort((a,b)=>((a[1].vendas/(a[1].atend||1)) - (b[1].vendas/(b[1].atend||1))))[0]
    if (lowConvLoja) out.push({ kind: 'low_store_conv', title: 'Loja com baixa conversão', description: 'Foque em abordagem e qualificação de leads nesta loja.', tag: 'opportunity', icon: 'store' })
  }

  return out.slice(0, 8)
}
