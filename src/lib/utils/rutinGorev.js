import { supabase } from "../supabase";

export async function runRutinGorevler() {
    const { data: gorevler, error } = await supabase
        .from("gorevler")
        .select("*")
        .eq("rutin_mi", true);

    if (error) throw error;

    const now = new Date();

    for (const g of gorevler) {
        let olustur = false;

        if (g.tekrar_tipi === "haftalik") {
            const last = new Date(g.son_olusturma_tarihi || g.created_at);
            const diff = (now - last) / (1000 * 60 * 60 * 24);

            if (diff >= 7) olustur = true;
        }

        if (g.tekrar_tipi === "aylik") {
            const last = new Date(g.son_olusturma_tarihi || g.created_at);
            const diff = (now - last) / (1000 * 60 * 60 * 24);

            if (diff >= 30) olustur = true;
        }

        if (olustur) {
            await supabase.from("gorevler").insert([
                {
                    baslik: g.baslik,
                    aciklama: g.aciklama,
                    durum: "beklemede",
                    oncelik: g.oncelik,
                    atanan_kullanici_id: g.atanan_kullanici_id,
                    gorunurluk: g.gorunurluk,
                    parent_gorev_id: g.id,
                },
            ]);

            await supabase
                .from("gorevler")
                .update({ son_olusturma_tarihi: now })
                .eq("id", g.id);
        }
    }
}