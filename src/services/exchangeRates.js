import { supabase } from '../lib/supabaseClient'

export async function listExchangeRates(userId) {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function createExchangeRate(userId, { fromCurrency, toCurrency = 'DOP', rate, date }) {
  const { data, error } = await supabase
    .from('exchange_rates')
    .insert({
      user_id: userId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate,
      date: date || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExchangeRate(rateId) {
  const { error } = await supabase.from('exchange_rates').delete().eq('id', rateId)
  if (error) throw error
}

/** Mapa {MONEDA: tasa_a_DOP} usando el registro más reciente disponible por moneda */
export async function getLatestRatesToDOP(userId) {
  const rows = await listExchangeRates(userId)
  const latest = {}
  for (const r of rows) {
    if (r.to_currency !== 'DOP') continue
    if (!(r.from_currency in latest)) latest[r.from_currency] = Number(r.rate)
  }
  return latest
}
