import { supabase } from "../supabase";

export async function getBildirimler(kullaniciId) {
    if (!kullaniciId) return [];

    const { data, error } = await supabase
        .from("bildirimler")
        .select("*")
        .eq("kullanici_id", kullaniciId)
        .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
}

export async function createBildirim(payload) {
    const { data, error } = await supabase
        .from("bildirimler")
        .insert([
            {
                ...payload,
                okundu: payload.okundu ?? false,
                created_at: payload.created_at || new Date().toISOString(),
            },
        ])
        .select()
        .single();

    if (error) throw error;

    return data;
}

export async function markAsRead(id) {
    if (!id) return null;

    const { data, error } = await supabase
        .from("bildirimler")
        .update({
            okundu: true,
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;

    return data;
}

export async function markAllAsRead(kullaniciId) {
    if (!kullaniciId) return [];

    const { data, error } = await supabase
        .from("bildirimler")
        .update({
            okundu: true,
        })
        .eq("kullanici_id", kullaniciId)
        .eq("okundu", false)
        .select();

    if (error) throw error;

    return data || [];
}

export function getBildirimLink(bildirim) {
    if (!bildirim) return "/";

    if (bildirim.link) return bildirim.link;

    if (bildirim.gorev_id) {
        return `/gorevler/${bildirim.gorev_id}`;
    }

    return "/";
}

export function getBildirimIkon(tip) {
    switch (tip) {
        case "gorev_atandi":
            return "📝";
        case "durum_degisti":
            return "🔄";
        case "yorum_eklendi":
            return "💬";
        case "dosya_eklendi":
            return "📎";
        case "hatirlatma":
            return "⏰";
        case "uyari":
            return "⚠️";
        case "basari":
            return "✅";
        default:
            return "🔔";
    }
}