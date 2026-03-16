"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const BUCKET = "road-signs";
const CATEGORIES = [
  "Ogohlantiruvchi belgilar",
  "Imtiyozli belgilar",
  "Ta'qiqlovchi belgilar",
  "Buyuruvchi belgilar",
  "Axborot-ishora belgilari",
  "Servis belgilari",
  "Qo'shimcha axborot belgilari",
] as const;

type Category = (typeof CATEGORIES)[number];

interface Sign {
  id: number;
  name: string;
  description: string | null;
  category: Category;
  image: string | null;
  created_at: string;
}

const CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Ogohlantiruvchi belgilar": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  "Ta'qiqlovchi belgilar": {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
  },
  "Imtiyozli belgilar": {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "text-yellow-400",
  },
  "Buyuruvchi belgilar": {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-400",
  },
  "Axborot-ishora belgilari": {
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-400",
  },
  "Servis belgilari": {
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-400",
  },
  "Qo'shimcha axborot belgilari": {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
};

const EMPTY = {
  name: "",
  description: "",
  category: "" as Category | "",
  image: "",
};

export default function AdminSignsPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [signs, setSigns] = useState<Sign[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }
      await fetch();
    }
    init();
  }, []);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase
      .from("road_signs")
      .select("*")
      .order("category")
      .order("name");
    setSigns(data ?? []);
    setLoading(false);
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function reset() {
    setForm(EMPTY);
    setEditId(null);
    setImageFile(null);
    setImagePreview("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function loadEdit(s: Sign) {
    setForm({
      name: s.name,
      description: s.description ?? "",
      category: s.category,
      image: s.image ?? "",
    });
    setEditId(s.id);
    setImageFile(null);
    setImagePreview(s.image ? imgUrl(s.image) : "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function imgUrl(img: string) {
    if (!img) return "";
    if (img.startsWith("http")) return img;
    return supabase.storage.from(BUCKET).getPublicUrl(img).data.publicUrl;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Faqat rasm fayllari");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Maksimal hajm 2MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  async function uploadImg(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const name = `sign_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(name, file);
    setUploading(false);
    if (error) {
      showToast("Rasm yuklanmadi: " + error.message, false);
      return null;
    }
    return name;
  }

  async function handleSave() {
    setError("");
    if (!form.name.trim()) {
      setError("Nom kiriting");
      return;
    }
    if (!form.category) {
      setError("Kategoriya tanlang");
      return;
    }

    setSaving(true);

    let imageName = form.image || null;
    if (imageFile) {
      const up = await uploadImg(imageFile);
      if (!up) {
        setSaving(false);
        return;
      }
      imageName = up;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category as Category,
      image: imageName,
    };

    if (editId !== null) {
      const { error: err } = await supabase
        .from("road_signs")
        .update(payload)
        .eq("id", editId);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setSigns((prev) =>
        prev.map((s) => (s.id === editId ? { ...s, ...payload } : s)),
      );
      showToast("Belgi yangilandi ✓");
    } else {
      const { data, error: err } = await supabase
        .from("road_signs")
        .insert(payload)
        .select()
        .single();
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setSigns((prev) => [...prev, data]);
      showToast("Belgi qo'shildi ✓");
    }

    reset();
    setSaving(false);
  }

  async function handleDelete(id: number) {
    const sign = signs.find((s) => s.id === id);
    if (sign?.image && !sign.image.startsWith("http")) {
      await supabase.storage.from(BUCKET).remove([sign.image]);
    }
    const { error: err } = await supabase
      .from("road_signs")
      .delete()
      .eq("id", id);
    if (err) {
      showToast("Xato: " + err.message, false);
      return;
    }
    setSigns((prev) => prev.filter((s) => s.id !== id));
    showToast("Belgi o'chirildi");
    setDeleteId(null);
  }

  const filtered = signs.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || s.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl ${toast.ok ? "bg-slate-900" : "bg-red-600"}`}
        >
          {toast.ok ? (
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
            <AlertDialogTitle>Belgini o'chirasizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu amal qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Bekor</AlertDialogCancel>
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
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2 no-underline">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="font-bold text-slate-800 text-sm">Autotest</span>
            </a>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500 font-medium">
              Yo'l belgilari
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {signs.length} ta belgi
            </Badge>
            <a
              href="/admin"
              className="text-xs text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition"
            >
              ← Admin
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-7 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ── LEFT: Form ── */}
        <div className="lg:col-span-2 lg:sticky lg:top-20 mt-4">
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-slate-800">
                    {editId ? "Tahrirlash" : "Yangi belgi"}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {editId
                      ? `#${editId} raqamli belgi`
                      : "Rasm, nom va kategoriya"}
                  </CardDescription>
                </div>
                {editId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="text-xs text-slate-400 h-7 rounded-lg"
                  >
                    ✕ Bekor
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
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

              {/* Rasm */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Rasm
                </Label>

                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full max-h-44 object-contain p-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                        setForm((f) => ({ ...f, image: "" }));
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all shadow-md"
                    >
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full text-xs text-slate-400 hover:text-indigo-600 py-1.5 border-t border-slate-100 flex items-center justify-center gap-1.5 transition-colors"
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
                      Boshqa rasm
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl py-6 flex flex-col items-center gap-2 transition-all group"
                    >
                      <div className="w-9 h-9 bg-slate-100 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center transition-colors">
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                          viewBox="0 0 24 24"
                          className="group-hover:stroke-indigo-500 transition-colors"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
                        Rasm yuklash
                      </p>
                      <p className="text-xs text-slate-400">
                        JPG, PNG, WEBP · max 3MB
                      </p>
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-slate-400">yoki URL</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

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
                        placeholder="https://example.com/sign.png"
                        value={form.image}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, image: e.target.value }));
                          if (e.target.value.startsWith("http"))
                            setImagePreview(e.target.value);
                          else setImagePreview("");
                        }}
                        className="pl-8 bg-slate-50 border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                />
                {uploading && (
                  <p className="text-xs text-indigo-600 flex items-center gap-1.5">
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
                    Yuklanmoqda...
                  </p>
                )}
              </div>

              {/* Nom */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Nom <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="masalan: To'xtash taqiqlangan"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="bg-slate-50 border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-indigo-100"
                />
              </div>

              {/* Kategoriya */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Kategoriya <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, category: val as Category }))
                  }
                >
                  <SelectTrigger className="bg-slate-50 px-2 border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-indigo-100">
                    <SelectValue placeholder="Kategoriya tanlang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-white z-10">
                    {CATEGORIES.map((c) => (
                      <SelectItem
                        key={c}
                        value={c}
                        className="text-sm font-bold px-4"
                      >
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tavsif */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Tavsif <span className="text-slate-300">(ixtiyoriy)</span>
                </Label>
                <Textarea
                  placeholder="Belgi haqida qisqacha ma'lumot..."
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="resize-none bg-slate-50 border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-indigo-100"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || uploading}
                className={`w-full rounded-xl font-semibold shadow-sm ${editId ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"}`}
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
                ) : editId ? (
                  "✓ Yangilash"
                ) : (
                  "+ Belgi qo'shish"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: List ── */}
        <div className="lg:col-span-3 space-y-3 mt-4">
          {/* Search + filter */}
          <div className="flex gap-2">
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
                placeholder="Belgi qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 py-2 bg-white border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-indigo-100"
              />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-48 bg-white border-slate-200 rounded-xl text-sm px-4">
                <SelectValue placeholder="Kategoriya" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-white z-10">
                <SelectItem value="all" className="text-sm px-2">
                  Barcha kategoriyalar
                </SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-sm font-bold px-2">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <svg
                className="animate-spin w-6 h-6 text-indigo-500"
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
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-14 text-center mt-4">
              <p className="text-xl font-bold text-slate-600 py-2">
                {search || filterCat !== "all"
                  ? "Topilmadi"
                  : "Hali belgi qo'shilmagan"}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((s) => {
                const cat =
                  CAT_COLORS[s.category] ??
                  CAT_COLORS["Qo'shimcha axborot belgilari"];
                return (
                  <Card
                    key={s.id}
                    className={`rounded-2xl mt-4 border shadow-sm transition-all hover:shadow-md ${editId === s.id ? "border-indigo-300 bg-indigo-50/30" : "border-slate-100 bg-white"}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Image */}
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {s.image ? (
                            <img
                              src={imgUrl(s.image)}
                              alt={s.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <svg
                              width="20"
                              height="20"
                              fill="none"
                              stroke="#cbd5e1"
                              strokeWidth="1.5"
                              viewBox="0 0 24 24"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="text-sm font-semibold text-slate-800 leading-snug">
                              {s.name}
                            </p>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadEdit(s)}
                                className="h-7 px-2.5 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
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
                                onClick={() => setDeleteId(s.id)}
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
                                </svg>
                                O'chir
                              </Button>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${cat.dot}`}
                            />
                            {s.category}
                          </span>

                          {s.description && (
                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                              {s.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
