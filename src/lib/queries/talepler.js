import { supabase } from "../supabase";
import { getAktifKullanici } from "./kullanicilar";

const TALEP_PANO_USERS = [
    "gorkem.cadirci@odaklojistik.com.tr",
];

const TALEP_SELECT = `
  *,
  kullanicilar:olusturan_id (
    id,
    ad,
    soyad,
    ad_soyad,
    kullanici_adi,
    eposta
  )
`;

function normalizeEmail(value) {
    return String(value || "").toLowerCase().trim();
}

function kullaniciTumTalepleriGorebilir(kullanici) {
    const email = normalizeEmail(kullanici?.eposta || kullanici?.email);
    return TALEP_PANO_USERS.includes(email);
}

function normalizeTalepKaydi(item) {
    if (!item) return item;

    return {
        ...item,
        olusturulma_tarihi:
            item?.olusturulma_tarihi ||
            item?.created_at ||
            null,
    };
}

function normalizeTalepListesi(rows) {
    return (rows || []).map(normalizeTalepKaydi);
}

async function getYetkiBilgisi() {
    const aktifKullanici = await getAktifKullanici();
    const tumunuGorebilir = kullaniciTumTalepleriGorebilir(aktifKullanici);

    return {
        aktifKullanici,
        tumunuGorebilir,
    };
}

export async function getTalepler() {
    const { aktifKullanici, tumunuGorebilir } = await getYetkiBilgisi();

    let query = supabase
        .from("talepler")
        .select(TALEP_SELECT)
        .order("created_at", { ascending: false });

    if (!tumunuGorebilir) {
        query = query.eq("olusturan_id", aktifKullanici?.id || "");
    }

    const { data, error } = await query;

    if (error) throw error;

    return normalizeTalepListesi(data);
}

export async function getTalepById(id) {
    if (!id) {
        throw new Error("Talep id gerekli.");
    }

    const { aktifKullanici, tumunuGorebilir } = await getYetkiBilgisi();
    const safeId = String(id).trim();

    let query = supabase
        .from("talepler")
        .select(TALEP_SELECT)
        .eq("id", safeId);

    if (!tumunuGorebilir) {
        query = query.eq("olusturan_id", aktifKullanici?.id || "");
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    if (!data) {
        throw new Error("Bu talep bulunamadý veya görüntüleme yetkin yok.");
    }

    return normalizeTalepKaydi(data);
}

export async function createTalep(payload) {
    const aktifKullanici = await getAktifKullanici();

    const insertPayload = {
        ...payload,
        olusturan_id: payload?.olusturan_id || aktifKullanici?.id || null,
    };

    const { data, error } = await supabase
        .from("talepler")
        .insert([insertPayload])
        .select(TALEP_SELECT)
        .single();

    if (error) throw error;

    return normalizeTalepKaydi(data);
}

export async function updateTalep(id, payload) {
    if (!id) {
        throw new Error("Talep id gerekli.");
    }

    if (!payload || Object.keys(payload).length === 0) {
        throw new Error("Güncellenecek veri bulunamadý.");
    }

    const { aktifKullanici, tumunuGorebilir } = await getYetkiBilgisi();

    let query = supabase
        .from("talepler")
        .update(payload)
        .eq("id", String(id).trim());

    if (!tumunuGorebilir) {
        query = query.eq("olusturan_id", aktifKullanici?.id || "");
    }

    const { data, error } = await query
        .select(TALEP_SELECT)
        .single();

    if (error) throw error;

    return normalizeTalepKaydi(data);
}