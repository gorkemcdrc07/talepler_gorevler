import { supabase } from "../supabase";
import {
    getAktifKullanici,
    getKullanicilar,
} from "./kullanicilar";
import { createBildirim } from "./bildirimler";

async function mapAtananKullanicilar(gorevler) {
    if (!gorevler?.length) {
        return [];
    }

    const kullanicilar = await getKullanicilar();
    const map = new Map((kullanicilar || []).map((k) => [k.id, k]));

    return gorevler.map((g) => ({
        ...g,
        atanan_kullanici: g.atanan_kullanici_id
            ? map.get(g.atanan_kullanici_id) || null
            : null,
    }));
}

export async function addGorevSorumlular(gorevId, kullaniciIds = []) {
    const rows = (kullaniciIds || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
        .map((kullaniciId) => ({
            gorev_id: gorevId,
            kullanici_id: kullaniciId,
        }));

    console.log("addGorevSorumlular gorevId:", gorevId);
    console.log("addGorevSorumlular kullaniciIds:", kullaniciIds);
    console.log("addGorevSorumlular rows:", rows);

    if (!gorevId || rows.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from("gorev_sorumlular")
        .insert(rows)
        .select("*");

    console.log("addGorevSorumlular result:", data, "error:", error);

    if (error) throw error;

    return data || [];
}

export async function getGorevler() {
    const user = await getAktifKullanici();

    console.log("getGorevler aktif user:", user);

    if (!user) return [];

    const { data: gorevler, error } = await supabase
        .from("gorevler")
        .select("*")
        .order("created_at", { ascending: false });

    console.log("getGorevler all gorevler:", gorevler, "error:", error);

    if (error) throw error;

    const { data: sorumluluklar, error: sorumlulukError } = await supabase
        .from("gorev_sorumlular")
        .select("gorev_id")
        .eq("kullanici_id", user.id);

    console.log("getGorevler sorumluluklar:", sorumluluklar, "error:", sorumlulukError);

    if (sorumlulukError) throw sorumlulukError;

    const sorumlulukMap = new Map();

    (sorumluluklar || []).forEach((item) => {
        const gorevId = item.gorev_id;

        if (!sorumlulukMap.has(gorevId)) {
            sorumlulukMap.set(gorevId, []);
        }

        sorumlulukMap.get(gorevId).push(user.id);
    });

    const enriched = (gorevler || []).map((g) => ({
        ...g,
        sorumlu_kullanicilar: sorumlulukMap.get(g.id) || [],
    }));

    const filtered = enriched.filter((g) => {
        return (
            g.gorunurluk === "tum" ||
            g.atanan_kullanici_id === user.id ||
            g.sorumlu_kullanicilar.includes(user.id)
        );
    });

    console.log("getGorevler filtered:", filtered);

    return await mapAtananKullanicilar(filtered);
}

export async function getGorevById(id) {
    const { data, error } = await supabase
        .from("gorevler")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;

    const mapped = await mapAtananKullanicilar(data ? [data] : []);
    return mapped[0] || null;
}

export async function createGorev(payload) {
    const user = await getAktifKullanici();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from("gorevler")
        .insert([
            {
                ...payload,
                olusturan_kullanici_id: user?.id || null,
                created_at: now,
                updated_at: now,
            },
        ])
        .select()
        .single();

    console.log("CREATE GOREV RESULT:", data);
    console.log("CREATE GOREV ERROR:", error);

    if (error) throw error;

    if (!data) {
        throw new Error("Görev oluşturulamadı (data boş döndü)");
    }

    if (data.atanan_kullanici_id) {
        try {
            await createBildirim({
                kullanici_id: data.atanan_kullanici_id,
                tip: "gorev_atandi",
                baslik: "Yeni görev atandı",
                aciklama: `"${data.baslik}" görevi size atandı.`,
                gorev_id: data.id,
                link: `/gorevler/${data.id}`,
                okundu: false,
                created_at: now,
            });
        } catch (err) {
            console.warn("Bildirim oluşturulamadı:", err.message);
        }
    }

    const mapped = await mapAtananKullanicilar([data]);
    return mapped[0];
}

export async function updateGorev(id, payload) {
    const user = await getAktifKullanici();

    console.log("updateGorev id:", id);
    console.log("updateGorev payload:", payload);
    console.log("updateGorev user:", user);

    const { data: eski, error: eskiError } = await supabase
        .from("gorevler")
        .select("*")
        .eq("id", id)
        .single();

    console.log("updateGorev eski:", eski, "eskiError:", eskiError);

    if (eskiError) throw eskiError;

    const now = new Date().toISOString();

    const { data: updatedData, error } = await supabase
        .from("gorevler")
        .update({
            ...payload,
            updated_at: now,
        })
        .eq("id", id)
        .select()
        .single();

    console.log("UPDATE GOREV RESULT:", updatedData);
    console.log("UPDATE GOREV ERROR:", error);

    if (error) {
        console.error("Gorev update hatasi:", error);
        throw error;
    }

    if (!updatedData) {
        throw new Error("Görev güncellenmedi (data boş döndü)");
    }

    if (payload.durum && payload.durum !== eski.durum) {
        const gecmisPayload = {
            gorev_id: id,
            eski_durum: eski.durum,
            yeni_durum: payload.durum,
            degistiren_id: user?.id || null,
            created_at: now,
        };

        console.log("DURUM GECMISI:", gecmisPayload);

        const { error: gecmisError } = await supabase
            .from("gorev_durum_gecmisi")
            .insert([gecmisPayload]);

        console.log("DURUM GECMISI ERROR:", gecmisError);

        if (gecmisError) {
            console.warn("Durum geçmişi eklenemedi ama update başarılı:", gecmisError);
        }

        if (eski.atanan_kullanici_id) {
            try {
                await createBildirim({
                    kullanici_id: eski.atanan_kullanici_id,
                    tip: "durum_degisti",
                    baslik: "Görev durumu güncellendi",
                    aciklama: `"${eski.baslik}" görevi ${payload.durum} oldu.`,
                    gorev_id: id,
                    link: `/gorevler/${id}`,
                    okundu: false,
                    created_at: now,
                });
            } catch (err) {
                console.warn("Durum bildirimi oluşturulamadı:", err.message);
            }
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(payload, "atanan_kullanici_id") &&
        payload.atanan_kullanici_id !== eski.atanan_kullanici_id &&
        payload.atanan_kullanici_id
    ) {
        try {
            await createBildirim({
                kullanici_id: payload.atanan_kullanici_id,
                tip: "gorev_atandi",
                baslik: "Üzerinize görev atandı",
                aciklama: `"${eski.baslik}" görevi size atandı.`,
                gorev_id: id,
                link: `/gorevler/${id}`,
                okundu: false,
                created_at: now,
            });
        } catch (err) {
            console.warn("Atama bildirimi oluşturulamadı:", err.message);
        }
    }

    const mapped = await mapAtananKullanicilar([updatedData]);
    return mapped[0];
}

export async function deleteGorev(id) {
    const { error } = await supabase
        .from("gorevler")
        .delete()
        .eq("id", id);

    if (error) throw error;
}