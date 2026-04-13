import { supabase } from "../supabase";

function slugifyDurum(text) {
    return String(text || "")
        .trim()
        .toLowerCase()
        .replaceAll("ý", "i")
        .replaceAll("ð", "g")
        .replaceAll("ü", "u")
        .replaceAll("þ", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "_")
        .replace(/-+/g, "_");
}

export async function getGorevDurumlari() {
    const { data, error } = await supabase
        .from("gorev_durumlari")
        .select("*")
        .eq("aktif", true)
        .order("ad", { ascending: true });

    if (error) throw error;
    return data || [];
}
export async function createGorevDurumu(ad) {
    const temizAd = String(ad || "").trim();
    if (!temizAd) {
        throw new Error("Durum adý boþ olamaz.");
    }

    const kod = slugifyDurum(temizAd);

    const { data, error } = await supabase
        .from("gorev_durumlari")
        .insert([
            {
                kod,
                ad: temizAd,
                aktif: true,
            },
        ])
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error("Bu durum zaten mevcut.");
        }
        throw error;
    }

    return data;
}

export async function deleteGorevDurumu(kod) {
    const { error } = await supabase
        .from("gorev_durumlari")
        .delete()
        .eq("kod", kod);

    if (error) throw error;
}