import { supabase } from "../supabase";

export async function getTalepYorumlari(talepId) {
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
        .eq("talep_id", talepId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function createTalepYorumu(payload) {
    const { data, error } = await supabase
        .from("talep_yorumlari")
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getGorevYorumlari(gorevId) {
    const { data, error } = await supabase
        .from("gorev_yorumlari")
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
        .eq("gorev_id", gorevId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function createGorevYorumu(payload) {
    const { data, error } = await supabase
        .from("gorev_yorumlari")
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
}