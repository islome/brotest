import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: Request) {
  let body: { firstname?: string; lastname?: string; username?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov formati" }, { status: 400 })
  }

  const { firstname, lastname, username, password } = body

  // Maydonlar satr ekanligini tekshirish (mijoz tomonidagi tekshiruvga ishonmaymiz)
  if (typeof firstname !== 'string' || !firstname.trim())
    return NextResponse.json({ error: 'Ism kiriting' }, { status: 400 })
  if (typeof lastname !== 'string' || !lastname.trim())
    return NextResponse.json({ error: 'Familiya kiriting' }, { status: 400 })
  if (typeof username !== 'string' || !username.trim())
    return NextResponse.json({ error: 'Username kiriting' }, { status: 400 })
  if (username.trim().length < 3)
    return NextResponse.json({ error: 'Username kamida 3 ta belgi' }, { status: 400 })
  if (typeof password !== 'string' || password.length < 6)
    return NextResponse.json({ error: 'Parol kamida 6 ta belgi' }, { status: 400 })

  const cleanUsername = username.trim().toLowerCase()

  // Username faqat harf, raqam va pastki chiziqdan iborat bo'lishi shart —
  // serverda majburlanadi (mijozdagi .replace() xavfsizlik chorasi emas)
  if (!/^[a-z0-9_]+$/.test(cleanUsername))
    return NextResponse.json({ error: 'Username faqat harf, raqam va _ belgisidan iborat' }, { status: 400 })

  try {
    const { data: exists } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (exists) {
      return NextResponse.json({ error: 'Bu username band. Boshqa tanlang.' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: `${cleanUsername}@autotest.uz`,
      password,
      email_confirm: true,
      user_metadata: {
        firstname: firstname.trim(),
        lastname:  lastname.trim(),
        username:  cleanUsername,
        password_hash,
      },
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: data.user?.id })
  } catch (err) {
    console.error('[signup]', err)
    return NextResponse.json({ error: 'Server xatosi yuz berdi' }, { status: 500 })
  }
}
