import { supabase } from "../supabase";
import { getActiveAuthUser } from "../auth";

function readStoredOturum() {
    try {
        const local = localStorage.getItem("oturum");
        const session = sessionStorage.getItem("oturum");
        return JSON.parse(local || session || "null");
    } catch {
        return null;
    }
}

// 🔹 TÜM KULLANICILAR
export async function getKullanicilar() {
    const { data, error } = await supabase
        .from("kullanicilar")
        .select(`
            id,
            ad,
            soyad,
            ad_soyad,
            kullanici_adi,
            eposta,
            aktif,
            rol,
            birim_unvan_id
        `)
        .eq("aktif", true)
        .order("ad", { ascending: true });

    if (error) throw error;
    return data || [];
}

// 🔹 AKTİF KULLANICI
export async function getAktifKullanici() {
    try {
        let authUser = null;

        try {
            authUser = await getActiveAuthUser();
        } catch (err) {
            console.warn("Auth user alınamadı, kayıtlı oturum denenecek:", err?.message);
        }

        const oturum = readStoredOturum();

        const email = String(
            authUser?.email ||
            oturum?.eposta ||
            oturum?.email ||
            ""
        )
            .toLowerCase()
            .trim();

        if (!email) {
            console.warn("Aktif kullanıcı için email bulunamadı.");
            return null;
        }

        const { data, error } = await supabase
            .from("kullanicilar")
            .select(`
                id,
                ad,
                soyad,
                ad_soyad,
                kullanici_adi,
                eposta,
                aktif,
                rol,
                birim_unvan_id
            `)
            .eq("eposta", email)
            .eq("aktif", true)
            .single();

        if (error) {
            console.warn("Kullanıcı bulunamadı:", error.message);
            return null;
        }

        return data || null;
    } catch (err) {
        console.warn("Aktif kullanıcı alınamadı:", err?.message);
        return null;
    }
}

// 🔹 BİRİM / ÜNVAN
export async function getBirimUnvanlari() {
    const { data, error } = await supabase
        .from("birim_unvanlar")
        .select("id, birim, unvan, aktif")
        .eq("aktif", true)
        .order("birim", { ascending: true });

    if (error) throw error;
    return data || [];
}