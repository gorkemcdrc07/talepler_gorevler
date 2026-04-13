import { supabase } from "../supabase";

const TALEP_DOSYA_BUCKET = "talep-dosyalari";

function sanitizeFileName(fileName = "") {
    return fileName
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getTalepDosyaPublicUrl(filePath) {
    if (!filePath) return "";

    if (
        typeof filePath === "string" &&
        (filePath.startsWith("http://") || filePath.startsWith("https://"))
    ) {
        return filePath;
    }

    const { data } = supabase.storage
        .from(TALEP_DOSYA_BUCKET)
        .getPublicUrl(filePath);

    return data?.publicUrl || "";
}

export async function uploadTalepDosyasi(file, klasorYolu = "genel") {
    if (!file) {
        throw new Error("Yüklenecek dosya bulunamadý.");
    }

    const safeOriginalName = sanitizeFileName(file.name || "dosya");
    const ext = safeOriginalName.includes(".")
        ? safeOriginalName.split(".").pop()
        : "";
    const baseName = safeOriginalName.replace(/\.[^/.]+$/, "");

    const finalName = ext
        ? `${Date.now()}_${baseName}.${ext}`
        : `${Date.now()}_${baseName}`;

    const cleanFolder = String(klasorYolu || "genel").replace(/^\/+|\/+$/g, "");
    const filePath = `${cleanFolder}/${finalName}`;

    const { data, error } = await supabase.storage
        .from(TALEP_DOSYA_BUCKET)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "application/octet-stream",
        });

    if (error) {
        console.error("uploadTalepDosyasi error:", error);
        throw new Error(error.message || "Dosya yüklenemedi.");
    }

    const publicUrl = getTalepDosyaPublicUrl(data.path);

    return {
        fileName: file.name,
        filePath: data.path,
        publicUrl,
    };
}