// src/api/kullanicilar.js
import { supabase } from "../lib/supabase";
import { getAktifKullanici as getAktifKullaniciFromStore } from "../lib/aktifKullanici";

export async function getAktifKullanici() {
    return await getAktifKullaniciFromStore();
}

export async function getKullaniciById(id) {
    if (!id) return null;

    const { data, error } = await supabase
        .from("kullanicilar")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Kullanýcý alýnamadý:", error);
        return null;
    }

    return data;
}

export async function getKullanicilar() {
    const { data, error } = await supabase
        .from("kullanicilar")
        .select("*")
        .order("ad", { ascending: true });

    if (error) {
        console.error("Kullanýcý listesi alýnamadý:", error);
        throw error;
    }

    return data || [];
}