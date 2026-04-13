import { supabase } from "../supabase";
import { getKullanicilar } from "./kullanicilar";

export async function getGorevDurumGecmisi(gorevId) {
    const { data, error } = await supabase
        .from("gorev_durum_gecmisi")
        .select("*")
        .eq("gorev_id", gorevId)
        .order("created_at", { ascending: false });

    if (error) throw error;

    const kayitlar = data || [];
    if (!kayitlar.length) return [];

    const kullanicilar = await getKullanicilar();
    const kullaniciMap = new Map(kullanicilar.map((k) => [k.id, k]));

    return kayitlar.map((item) => ({
        ...item,
        degistiren_kullanici: item.degistiren_id
            ? kullaniciMap.get(item.degistiren_id) || null
            : null,
    }));
}