import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role key ishlatiladi — faqat server side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const MAX_ATTEMPTS  = 5
const BLOCK_MINUTES = 15

export async function POST(request: Request) {
  const { action, email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email kerak' }, { status: 400 })
  }

  const windowStart = new Date(Date.now() - BLOCK_MINUTES * 60 * 1000).toISOString()

  if (action === 'check') {
    // So'nggi BLOCK_MINUTES daqiqadagi urinishlarni sanash
    const { count } = await supabaseAdmin
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('attempted_at', windowStart)

    const attempts   = count ?? 0
    const isBlocked  = attempts >= MAX_ATTEMPTS
    const remaining  = MAX_ATTEMPTS - attempts

    return NextResponse.json({ isBlocked, attempts, remaining })
  }

  if (action === 'record') {
    // Muvaffaqiyatsiz urinishni yozib qo'yish
    await supabaseAdmin
      .from('login_attempts')
      .insert({ email })

    const { count } = await supabaseAdmin
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('attempted_at', windowStart)

    const attempts  = count ?? 0
    const isBlocked = attempts >= MAX_ATTEMPTS

    return NextResponse.json({ isBlocked, attempts })
  }

  if (action === 'clear') {
    // Muvaffaqiyatli login — urinishlarni tozalash
    await supabaseAdmin
      .from('login_attempts')
      .delete()
      .eq('email', email)

    return NextResponse.json({ cleared: true })
  }

  return NextResponse.json({ error: 'Noto\'g\'ri action' }, { status: 400 })
}