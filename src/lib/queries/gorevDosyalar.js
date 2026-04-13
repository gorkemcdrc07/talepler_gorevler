import { supabase } from "../supabase";

export async function getDosyalar(gorevId) {
    const { data, error } = await supabase
        .from("gorev_dosyalar")
        .select("*")
        .eq("gorev_id", gorevId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function uploadDosya(file, gorevId) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("gorev-dosyalar")
        .upload(filePath, file, {
            upsert: false,
        });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
        .from("gorev-dosyalar")
        .getPublicUrl(filePath);

    const dosyaUrl = publicData?.publicUrl || null;

    const { data, error } = await supabase
        .from("gorev_dosyalar")
        .insert({
            gorev_id: gorevId,
            dosya_adi: file.name,
            dosya_url: dosyaUrl,
        })
        .select()
        .single();

    if (error) throw error;

    return data;
}

export async function deleteDosya(dosya) {
    const { error } = await supabase
        .from("gorev_dosyalar")
        .delete()
        .eq("id", dosya.id);

    if (error) throw error;
}