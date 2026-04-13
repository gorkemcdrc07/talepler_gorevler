// src/lib/aktifKullanici.js
import { supabase } from "./supabase";

/**
 * Uygulamada login auth yerine kullanicilar tablosu kullanýlýyor.
 * Aktif kullanýcý localStorage'da tutuluyor.
 *
 * Beklenen localStorage örnekleri:
 * - aktifKullanici -> JSON object
 * - aktifKullaniciId -> string uuid
 *
 * Öncelik:
 * 1) aktifKullanici object
 * 2) aktifKullaniciId ile DB'den kullanýcý çek
 */
export async function getAktifKullanici() {
    try {
        const cachedUserRaw = localStorage.getItem("aktifKullanici");

        if (cachedUserRaw) {
            try {
                const parsed = JSON.parse(cachedUserRaw);
                if (parsed?.id) {
                    return normalizeKullanici(parsed);
                }
            } catch (parseErr) {
                console.error("aktifKullanici parse edilemedi:", parseErr);
                localStorage.removeItem("aktifKullanici");
            }
        }

        const aktifKullaniciId = localStorage.getItem("aktifKullaniciId");
        if (!aktifKullaniciId) {
            return null;
        }

        const { data, error } = await supabase
            .from("kullanicilar")
            .select("*")
            .eq("id", aktifKullaniciId)
            .single();

        if (error) {
            console.error("Aktif kullanýcý DB'den alýnamadý:", error);
            return null;
        }

        if (!data?.id) {
            return null;
        }

        const normalized = normalizeKullanici(data);
        localStorage.setItem("aktifKullanici", JSON.stringify(normalized));
        return normalized;
    } catch (err) {
        console.error("getAktifKullanici hata:", err);
        return null;
    }
}

export function setAktifKullanici(kullanici) {
    if (!kullanici?.id) {
        throw new Error("setAktifKullanici için geçerli kullanýcý gerekli");
    }

    const normalized = normalizeKullanici(kullanici);
    localStorage.setItem("aktifKullanici", JSON.stringify(normalized));
    localStorage.setItem("aktifKullaniciId", normalized.id);
}

export function clearAktifKullanici() {
    localStorage.removeItem("aktifKullanici");
    localStorage.removeItem("aktifKullaniciId");
}

export function getAktifKullaniciSync() {
    try {
        const cachedUserRaw = localStorage.getItem("aktifKullanici");
        if (!cachedUserRaw) return null;

        const parsed = JSON.parse(cachedUserRaw);
        return parsed?.id ? normalizeKullanici(parsed) : null;
    } catch (err) {
        console.error("getAktifKullaniciSync hata:", err);
        return null;
    }
}

export function getKullaniciTamAdi(kullanici) {
    if (!kullanici) return "Kullanýcý";

    const ad = (kullanici.ad || "").trim();
    const soyad = (kullanici.soyad || "").trim();
    const adSoyad = `${ad} ${soyad}`.trim();

    if (adSoyad) return adSoyad;
    if (kullanici.ad_soyad?.trim()) return kullanici.ad_soyad.trim();
    if (kullanici.adiSoyadi?.trim()) return kullanici.adiSoyadi.trim();
    if (kullanici.email?.trim()) return kullanici.email.trim();

    return "Kullanýcý";
}

function normalizeKullanici(kullanici) {
    return {
        id: kullanici.id,
        ad: kullanici.ad || "",
        soyad: kullanici.soyad || "",
        email: kullanici.email || "",
        rol: kullanici.rol || null,
        ...kullanici,
    };
}