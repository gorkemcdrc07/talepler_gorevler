import { supabase } from "../supabase";

export async function getDashboardData(userId) {
    const { data: gorevler, error } = await supabase
        .from("gorevler")
        .select("*");

    if (error) throw error;

    const toplam = gorevler.length;
    const tamamlanan = gorevler.filter(g => g.durum === "tamamlandi").length;
    const bekleyen = gorevler.filter(g => g.durum === "beklemede").length;
    const devam = gorevler.filter(g => g.durum === "devam_ediyor").length;
    const banaAtanan = gorevler.filter(g => g.atanan_kullanici_id === userId).length;

    return {
        toplam,
        tamamlanan,
        bekleyen,
        devam,
        banaAtanan,
    };
}