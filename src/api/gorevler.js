// src/api/gorevler.js
import { supabase } from "../lib/supabase";
import { getAktifKullanici } from "./kullanicilar";

export async function getGorevById(id) {
    const { data, error } = await supabase
        .from("gorevler")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Görev alýnamadý:", error);
        throw error;
    }

    return data;
}

export async function updateGorev(id, updates) {
    if (!id) throw new Error("Görev ID gerekli");

    const aktifKullanici = await getAktifKullanici();
    if (!aktifKullanici?.id) {
        throw new Error("Aktif kullanýcý bulunamadý");
    }

    const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
        guncelleyen_kullanici_id: aktifKullanici.id,
    };

    const { data, error } = await supabase
        .from("gorevler")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

    if (error) {
        if (error.code === "23514" && String(error.message || "").includes("gorevler_durum_check")) {
            throw new Error("Seçilen durum veritabanýnda izinli deðil. Önce durum listesi ile DB check constraint eþitlenmeli.");
        }

        console.error("Görev güncellenemedi:", error);
        throw error;
    }

    return data;
}