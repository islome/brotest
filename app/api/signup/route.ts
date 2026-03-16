import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

// Service key — faqat server da, browserda ko'rinmaydi
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: Request) {
  const { firstname, lastname, username, password } = await request.json()

  // Validatsiya
  if (!firstname?.trim()) return NextResponse.json({ error: 'Ism kiriting' }, { status: 400 })
  if (!lastname?.trim())  return NextResponse.json({ error: 'Familiya kiriting' }, { status: 400 })
  if (!username?.trim())  return NextResponse.json({ error: 'Username kiriting' }, { status: 400 })
  if (username.length < 3) return NextResponse.json({ error: 'Username kamida 3 ta belgi' }, { status: 400 })
  if (!password || password.length < 6) return NextResponse.json({ error: 'Parol kamida 6 ta belgi' }, { status: 400 })

  const cleanUsername = username.trim().toLowerCase()

  // Username band emasmi?
  const { data: exists } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle()

  if (exists) {
    return NextResponse.json({ error: 'Bu username band. Boshqa tanlang.' }, { status: 409 })
  }

  // Bcrypt hash — 12 rounds (xavfsiz, lekin sekin emas)
  const password_hash = await bcrypt.hash(password, 12)

  // Supabase Auth ga ro'yxatdan o'tkazish
  // fake email: username@autotest.uz (user ko'rmaydi)
  const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
    email: `${cleanUsername}@autotest.uz`,
    password,
    email_confirm: true, // avtomatik confirm — email yuborilmaydi
    user_metadata: {
      firstname: firstname.trim(),
      lastname:  lastname.trim(),
      username:  cleanUsername,
      password_hash,           // trigger bu ni users tablega saqlaydi
    },
  })

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: data.user?.id })
}