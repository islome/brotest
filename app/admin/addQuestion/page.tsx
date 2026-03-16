"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BUCKET = "questions-images";

interface Question {
  id: number;
  question: string;
  image: string | null;
  options: string[];
  answer: number;
  explanation: string | null;
  created_at: string;
}

const EMPTY = {
  question: "",
  image: "",
  options: ["", "", "", ""],
  answer: 0,
  explanation: "",
};

const OPT_LABELS = ["A", "B", "C", "D"];

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      // Admin tekshirish — service role kerak emas, faqat o'z profilini o'qiydi
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        router.push("/");
        return;
      }
      await fetchQuestions();
    }
    init();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    const { data } = await supabase
      .from("questions")
      .select("*")
      .order("id", { ascending: true });
    setQuestions(data ?? []);
    setLoading(false);
  }

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setForm(EMPTY);
    setEditId(null);
    setImageFile(null);
    setImagePreview("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function setOption(idx: number, val: string) {
    const opts = [...form.options];
    opts[idx] = val;
    setForm({ ...form, options: opts });
  }

  function loadEditForm(q: Question) {
    setForm({
      question: q.question,
      image: q.image ?? "",
      options: [...q.options],
      answer: q.answer,
      explanation: q.explanation ?? "",
    });
    setImageFile(null);
    setImagePreview(q.image ? getImageUrl(q.image) : "");
    setEditId(q.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getImageUrl(filename: string) {
    if (!filename) return "";
    if (filename.startsWith("http")) return filename;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Faqat rasm fayllar
    if (!file.type.startsWith("image/")) {
      setError("Faqat rasm fayllari qabul qilinadi (jpg, png, webp)");
      return;
    }
    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      setError("Rasm hajmi 2MB dan oshmasligi kerak");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filename = `q_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, file, { upsert: false });

    setUploading(false);
    if (error) {
      console.error('Storage error:', error)
      showToast("Rasm yuklanmadi: " + error.message, "err");
      return null;
    }
    return filename;
  }

  async function handleSave() {
    setError("");

    if (!form.question.trim()) {
      setError("Savol matnini kiriting");
      return;
    }
    if (form.options.some((o) => !o.trim())) {
      setError("Barcha variantlarni to'ldiring");
      return;
    }

    setSaving(true);

    // Rasm yuklash
    let imageName = form.image || null;
    if (imageFile) {
      const uploaded = await uploadImage(imageFile);
      if (!uploaded) {
        setSaving(false);
        return;
      }
      imageName = uploaded;
    }

    const payload = {
      question: form.question.trim(),
      image: imageName,
      options: form.options.map((o) => o.trim()),
      answer: form.answer,
      explanation: form.explanation.trim() || null,
    };

    if (editId !== null) {
      const { error: err } = await supabase
        .from("questions")
        .update(payload)
        .eq("id", editId);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setQuestions((qs) =>
        qs.map((q) => (q.id === editId ? { ...q, ...payload } : q)),
      );
      showToast("Savol yangilandi ✓");
    } else {
      const { data, error: err } = await supabase
        .from("questions")
        .insert(payload)
        .select()
        .single();
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setQuestions((qs) => [...qs, data]);
      showToast("Savol qo'shildi ✓");
    }

    resetForm();
    setSaving(false);
  }

  async function handleDelete(id: number) {
    // Rasm ham o'chirish
    const q = questions.find((q) => q.id === id);
    if (q?.image && !q.image.startsWith("http")) {
      await supabase.storage.from(BUCKET).remove([q.image]);
    }
    const { error: err } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);
    if (err) {
      showToast("Xato: " + err.message, "err");
      return;
    }
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    showToast("Savol o'chirildi");
    setDeleteId(null);
  }

  const filtered = questions.filter((q) =>
    q.question.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 transition-all ${
            toast.type === "ok" ? "bg-slate-900" : "bg-red-600"
          }`}
        >
          {toast.type === "ok" ? (
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Savolni o'chirasizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu amalni qaytarib bo'lmaydi. Savol va uning rasmi butunlay
              o'chiriladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              Bekor qilish
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="rounded-xl bg-red-500 hover:bg-red-600"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navbar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-sm">Brotest</span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-sm text-slate-500 font-medium">
              Admin panel
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {questions.length} savol
            </Badge>
            <a
              href="/"
              className="text-xs text-slate-500 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition"
            >
              Saytga qaytish
            </a>
            <a
              href="/admin/signs"
              className="text-xs text-slate-500 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition"
            >
              Yangi Belgi
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* ── LEFT: Form ── */}
          <div className="lg:col-span-2 lg:sticky lg:top-20">
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-slate-800">
                      {editId !== null ? "Savolni tahrirlash" : "Yangi savol"}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {editId !== null
                        ? `#${editId} raqamli savol`
                        : "4 variant, 1 ta to'g'ri javob"}
                    </CardDescription>
                  </div>
                  {editId !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetForm}
                      className="text-xs text-slate-400 hover:text-slate-700 h-7 rounded-lg"
                    >
                      ✕ Bekor
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3 py-2.5 text-sm">
                    <svg
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      className="shrink-0"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                )}

                {/* Savol */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Savol matni <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    placeholder="Savol matnini kiriting..."
                    value={form.question}
                    onChange={(e) =>
                      setForm({ ...form, question: e.target.value })
                    }
                    rows={3}
                    className="resize-none bg-slate-50 border-slate-200 focus:border-blue-400 rounded-xl text-sm"
                  />
                </div>

                {/* Variantlar */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Variantlar <span className="text-red-400">*</span>
                  </Label>
                  <p className="text-xs text-slate-400">
                    Radio tugmasi = to'g'ri javob
                  </p>
                  <div className="space-y-2">
                    {form.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                          form.answer === idx
                            ? "border-green-300 bg-green-50"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, answer: idx })}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            form.answer === idx
                              ? "border-green-500 bg-green-500"
                              : "border-slate-300 hover:border-green-400"
                          }`}
                        >
                          {form.answer === idx && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </button>
                        <span
                          className={`text-xs font-bold w-4 shrink-0 ${form.answer === idx ? "text-green-600" : "text-slate-400"}`}
                        >
                          {OPT_LABELS[idx]}
                        </span>
                        <Input
                          placeholder={`${idx + 1}-variant`}
                          value={opt}
                          onChange={(e) => setOption(idx, e.target.value)}
                          className={`flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 ${
                            form.answer === idx
                              ? "text-green-800"
                              : "text-slate-700"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rasm yuklash */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Rasm <span className="text-slate-300">(ixtiyoriy)</span>
                  </Label>

                  {/* Preview — fayl tanlangan yoki edit da rasm bor */}
                  {imagePreview && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="w-full max-h-40 object-contain"
                      />
                      {/* O'chirish tugmasi — preview ustida */}
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview("");
                          setForm({ ...form, image: "" });
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
                      >
                        <svg
                          width="12"
                          height="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                      {/* Fayl nomi */}
                      {imageFile && (
                        <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500 truncate">
                            {imageFile.name}
                          </span>
                          <span className="text-xs text-slate-400 shrink-0 ml-2">
                            {(imageFile.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Yuklash + URL — preview yo'q bo'lganda ko'rinadi */}
                  {!imagePreview && (
                    <div className="space-y-2">
                      {/* Device dan yuklash */}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl py-4 flex flex-col items-center gap-1.5 transition-all group"
                      >
                        <div className="w-8 h-8 bg-slate-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                          <svg
                            width="15"
                            height="15"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.8"
                            viewBox="0 0 24 24"
                            className="group-hover:stroke-blue-500 transition-colors"
                          >
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-slate-500 group-hover:text-blue-600 transition-colors">
                          Qurilmadan yuklash
                        </p>
                        <p className="text-xs text-slate-400">
                          JPG, PNG, WEBP · max 2MB
                        </p>
                      </button>

                      {/* Ajratuvchi */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-400">yoki</span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      {/* URL orqali */}
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg
                            width="13"
                            height="13"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                          </svg>
                        </span>
                        <Input
                          placeholder="https://example.com/rasm.jpg"
                          value={form.image}
                          onChange={(e) => {
                            const url = e.target.value;
                            setForm({ ...form, image: url });
                            if (url.startsWith("http")) setImagePreview(url);
                            else setImagePreview("");
                          }}
                          className="pl-8 bg-slate-50 border-slate-200 focus:border-blue-400 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Preview bor + almashtirish imkoni */}
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full text-xs text-slate-400 hover:text-blue-600 flex items-center justify-center gap-1.5 py-1 transition-colors"
                    >
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Boshqa rasm tanlash
                    </button>
                  )}

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {uploading && (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <svg
                        className="animate-spin w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Rasm yuklanmoqda...
                    </div>
                  )}
                </div>

                {/* Tushuntirish */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Tushuntirish{" "}
                    <span className="text-slate-300">(ixtiyoriy)</span>
                  </Label>
                  <Textarea
                    placeholder="Javob tushuntirishini kiriting..."
                    value={form.explanation}
                    onChange={(e) =>
                      setForm({ ...form, explanation: e.target.value })
                    }
                    rows={2}
                    className="resize-none bg-slate-50 border-slate-200 focus:border-blue-400 rounded-xl text-sm"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className={`w-full rounded-xl font-semibold shadow-sm ${
                    editId !== null
                      ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Saqlanmoqda...
                    </span>
                  ) : editId !== null ? (
                    "✓ Yangilash"
                  ) : (
                    "+ Savol qo'shish"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: List ── */}
          <div className="lg:col-span-3 space-y-3">
            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <Input
                  placeholder="Savol qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white border-slate-200 focus:border-blue-400 rounded-xl text-sm"
                />
              </div>
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="text-xs rounded-lg h-9 px-3"
                >
                  Tozalash
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <svg
                  className="animate-spin w-6 h-6 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-14 text-center">
                <p className="text-sm font-medium text-slate-500">
                  {search ? "Savol topilmadi" : "Hali savol qo'shilmagan"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {search
                    ? "Boshqa kalit so'z bilan qidiring"
                    : "Chap tomondagi forma orqali qo'shing"}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((q, i) => (
                  <Card
                    key={q.id}
                    className={`rounded-2xl mt-4 border shadow-sm transition-all hover:shadow-md ${
                      editId === q.id
                        ? "border-indigo-300 bg-indigo-50/30"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            editId === q.id
                              ? "bg-indigo-100 text-indigo-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Rasm preview (kichik) */}
                          {q.image && (
                            <img
                              src={getImageUrl(q.image)}
                              alt="savol rasmi"
                              className="w-full max-h-28 object-cover rounded-lg mb-2.5 border border-slate-100"
                            />
                          )}

                          <p className="text-sm font-medium text-slate-800 leading-snug mb-2.5">
                            {q.question}
                          </p>

                          {/* Options grid */}
                          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                            {q.options.map((opt, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${
                                  idx === q.answer
                                    ? "bg-green-50 border border-green-200 text-green-700 font-medium"
                                    : "bg-slate-50 border border-slate-100 text-slate-500"
                                }`}
                              >
                                <span
                                  className={`font-bold shrink-0 ${idx === q.answer ? "text-green-500" : "text-slate-300"}`}
                                >
                                  {OPT_LABELS[idx]}
                                </span>
                                <span className="truncate">{opt}</span>
                                {idx === q.answer && (
                                  <svg
                                    className="ml-auto shrink-0"
                                    width="11"
                                    height="11"
                                    fill="none"
                                    stroke="#22c55e"
                                    strokeWidth="2.5"
                                    viewBox="0 0 24 24"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {q.explanation && (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-normal text-blue-500 border-blue-200 bg-blue-50 rounded-lg"
                                >
                                  💡 Izoh
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadEditForm(q)}
                                className="h-7 px-2.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <svg
                                  width="11"
                                  height="11"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  className="mr-1"
                                >
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Tahrir
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(q.id)}
                                className="h-7 px-2.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <svg
                                  width="11"
                                  height="11"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  className="mr-1"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                  <path d="M10 11v6m4-6v6" />
                                </svg>
                                O'chir
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
