-- ─────────────────────────────────────────────────────────────
-- Bosh sahifadagi "Foydalanuvchilar fikri" karuseli uchun
-- ommaviy (public) o'qish siyosati.
-- Faqat ijobiy (rate >= 4) va izohi bor fikrlar hammaga ko'rinadi.
-- Supabase Dashboard → SQL Editor da bir marta ishga tushiring.
-- ─────────────────────────────────────────────────────────────

create policy "feedback_select_public_showcase"
  on public.feedback
  for select
  to anon, authenticated
  using (rate >= 4 and feedback is not null);
