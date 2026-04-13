import { supabase } from "../supabase";

// yorumlarý getir
export async function getYorumlar(gorevId) {
    const { data, error } = await supabase
        .from("gorev_yorumlar")
        .select(`
            id,
            yorum,
            created_at,
            kullanici_id,
            kullanicilar (
                ad,
                soyad,
                ad_soyad
            )
        `)
        .eq("gorev_id", gorevId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
}

// yorum ekle
export async function createYorum(payload) {
    const { data, error } = await supabase
        .from("gorev_yorumlar")
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
}

// yorum sil
export async function deleteYorum(id) {
    const { error } = await supabase
        .from("gorev_yorumlar")
        .delete()
        .eq("id", id);

    if (error) throw error;
}