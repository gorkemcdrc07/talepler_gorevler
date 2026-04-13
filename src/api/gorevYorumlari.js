// src/api/gorevYorumlari.js
import { supabase } from "../lib/supabase";
import { getAktifKullanici } from "./kullanicilar";
import { getKullaniciTamAdi } from "../lib/aktifKullanici";

export async function getGorevYorumlari(gorevId) {
    if (!gorevId) return [];

    const { data, error } = await supabase
        .from("gorev_yorumlari")
        .select(`
      *,
      kullanici:kullanicilar!gorev_yorumlari_kullanici_id_fkey (
        id, ad, soyad, email
      )
    `)
        .eq("gorev_id", gorevId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Görev yorumlarý alýnamadý:", error);
        throw error;
    }

    return (data || []).map((yorum) => ({
        ...yorum,
        kullanici_adi: getKullaniciTamAdi(yorum.kullanici),
    }));
}

export async function addGorevYorumu(gorevId, icerik) {
    if (!gorevId) throw new Error("Görev ID gerekli");
    if (!icerik?.trim()) throw new Error("Yorum boþ olamaz");

    const aktifKullanici = await getAktifKullanici();
    if (!aktifKullanici?.id) {
        throw new Error("Aktif kullanýcý bulunamadý");
    }

    const payload = {
        gorev_id: gorevId,
        kullanici_id: aktifKullanici.id,
        icerik: icerik.trim(),
    };

    const { data, error } = await supabase
        .from("gorev_yorumlari")
        .insert(payload)
        .select(`
      *,
      kullanici:kullanicilar!gorev_yorumlari_kullanici_id_fkey (
        id, ad, soyad, email
      )
    `)
        .single();

    if (error) {
        console.error("Yorum eklenemedi:", error);
        throw error;
    }

    return {
        ...data,
        kullanici_adi: getKullaniciTamAdi(data.kullanici),
    };
}