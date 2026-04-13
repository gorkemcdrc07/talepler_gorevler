import { supabase } from "../supabase";
import { getAktifKullanici } from "./kullanicilar";
import {
    uploadTalepDosyasi,
    getTalepDosyaPublicUrl,
} from "../storage/talepDosyalari";

function normalizeYorum(item) {
    if (!item) return item;

    const rawPath =
        item?.dosya_path ||
        item?.dosya_url ||
        item?.ek_url ||
        item?.ek_link ||
        null;

    const resolvedUrl =
        item?.dosya_url ||
        (rawPath ? getTalepDosyaPublicUrl(rawPath) : null);

    return {
        ...item,
        olusturma_tarihi: item?.olusturma_tarihi || item?.created_at || null,
        dosya_url: resolvedUrl || null,
    };
}

function normalizeYorumListesi(rows) {
    return (rows || []).map(normalizeYorum);
}

export async function getTalepYorumlari(talepId) {
    if (!talepId) {
        throw new Error("Talep id gerekli.");
    }

    const { data, error } = await supabase
        .from("talep_yorumlari")
        .select(`
      *,
      kullanicilar:kullanici_id (
        id,
        ad,
        soyad,
        ad_soyad,
        kullanici_adi,
        eposta
      )
    `)
        .eq("talep_id", String(talepId).trim())
        .order("olusturma_tarihi", { ascending: false });

    if (error) {
        console.error("getTalepYorumlari error:", error);
        throw new Error(error.message || "Yorumlar alýnamadý.");
    }

    return normalizeYorumListesi(data);
}

export async function createTalepYorumu(payload) {
    if (!payload?.talep_id) {
        throw new Error("Talep id gerekli.");
    }

    const aktifKullanici = await getAktifKullanici();

    if (!aktifKullanici?.id) {
        throw new Error("Aktif kullanýcý bulunamadý.");
    }

    let uploadedFile = null;

    if (payload?.dosya) {
        uploadedFile = await uploadTalepDosyasi(
            payload.dosya,
            `yorumlar/${String(payload.talep_id).trim()}`
        );
    }

    const insertPayload = {
        talep_id: String(payload.talep_id).trim(),
        yorum: payload?.yorum?.trim() || "",
        kullanici_id: aktifKullanici.id,
        dosya_adi: uploadedFile?.fileName || null,
        dosya_path: uploadedFile?.filePath || null,
        dosya_url: uploadedFile?.publicUrl || null,
    };

    if (!insertPayload.yorum && !insertPayload.dosya_adi) {
        throw new Error("Yorum veya dosya eklemelisin.");
    }

    const { data, error } = await supabase
        .from("talep_yorumlari")
        .insert([insertPayload])
        .select(`
      *,
      kullanicilar:kullanici_id (
        id,
        ad,
        soyad,
        ad_soyad,
        kullanici_adi,
        eposta
      )
    `)
        .single();

    if (error) {
        console.error("createTalepYorumu insert error:", error);
        throw new Error(error.message || "Yorum eklenemedi.");
    }

    return normalizeYorum(data);
}