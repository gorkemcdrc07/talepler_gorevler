// src/api/gorevDosyalar.js
import { supabase } from "../lib/supabase";
import { getAktifKullanici } from "./kullanicilar";

const BUCKET_NAME = "gorev-dosyalar";

function dosyaAdiTemizle(fileName) {
    return fileName
        .replaceAll(" ", "_")
        .replace(/[^\w.-]/g, "");
}

export async function uploadDosya(gorevId, file) {
    if (!gorevId) throw new Error("Görev ID gerekli");
    if (!file) throw new Error("Dosya gerekli");

    const aktifKullanici = await getAktifKullanici();
    if (!aktifKullanici?.id) {
        throw new Error("Aktif kullanýcý bulunamadý");
    }

    const safeName = dosyaAdiTemizle(file.name);
    const filePath = `${gorevId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (uploadError) {
        console.error("Storage upload hatasý:", uploadError);
        throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    const insertPayload = {
        gorev_id: gorevId,
        dosya_adi: file.name,
        dosya_yolu: filePath,
        dosya_url: publicUrlData?.publicUrl || null,
        boyut: file.size || 0,
        mime_type: file.type || null,
        yukleyen_kullanici_id: aktifKullanici.id,
    };

    const { data, error } = await supabase
        .from("gorev_dosyalari")
        .insert(insertPayload)
        .select(`
      *,
      yukleyen_kullanici:kullanicilar!gorev_dosyalari_yukleyen_kullanici_id_fkey (
        id, ad, soyad, email
      )
    `)
        .single();

    if (error) {
        console.error("Dosya kaydý eklenemedi:", error);

        // DB insert baþarýsýzsa storage'daki dosyayý geri al
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        throw error;
    }

    return data;
}

export async function getGorevDosyalari(gorevId) {
    if (!gorevId) return [];

    const { data, error } = await supabase
        .from("gorev_dosyalari")
        .select(`
      *,
      yukleyen_kullanici:kullanicilar!gorev_dosyalari_yukleyen_kullanici_id_fkey (
        id, ad, soyad, email
      )
    `)
        .eq("gorev_id", gorevId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Görev dosyalarý alýnamadý:", error);
        throw error;
    }

    return data || [];
}

export async function deleteDosya(dosya) {
    if (!dosya?.id) throw new Error("Dosya kaydý bulunamadý");

    if (dosya.dosya_yolu) {
        const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([dosya.dosya_yolu]);

        if (storageError) {
            console.error("Storage dosya silme hatasý:", storageError);
        }
    }

    const { error } = await supabase
        .from("gorev_dosyalari")
        .delete()
        .eq("id", dosya.id);

    if (error) {
        console.error("Dosya kaydý silinemedi:", error);
        throw error;
    }

    return true;
}