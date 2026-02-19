import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";

export const config = {
    api: { bodyParser: false }, // formidable için şart
};

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function safeFileName(name = "dosya") {
    return name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9.\-_]/g, "")
        .slice(0, 120);
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

    try {
        const form = formidable({ multiples: true, maxFiles: 6 });

        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })));
        });

        const baslik = String(fields.baslik || "").trim();
        const aciklama = String(fields.aciklama || "").trim();
        const oncelik = String(fields.oncelik || "Normal");
        const durum = String(fields.durum || "acik");
        const istenilen_tarih = String(fields.istenilen_tarih || "");
        const talep_edilen = String(fields.talep_edilen || "");
        const talep_edilecek_sistem = String(fields.talep_edilecek_sistem || "") || null;
        const olusturan_id = String(fields.olusturan_id || ""); // auth yok -> local id

        if (!olusturan_id) return res.status(400).json({ message: "olusturan_id zorunlu" });
        if (!baslik || baslik.length < 4) return res.status(400).json({ message: "Başlık geçersiz" });
        if (!aciklama || aciklama.length < 10) return res.status(400).json({ message: "Açıklama geçersiz" });
        if (!talep_edilen) return res.status(400).json({ message: "Talep edilen zorunlu" });
        if (!istenilen_tarih) return res.status(400).json({ message: "İstenilen tarih zorunlu" });

        // 1) DB insert
        const payload = {
            baslik,
            aciklama,
            oncelik,
            durum,
            istenilen_tarih, // date: YYYY-MM-DD
            talep_edilen,
            talep_edilecek_sistem,
            olusturan_id, // senin sistemindeki kullanıcı id
        };

        const { data: inserted, error: insErr } = await supabaseAdmin
            .from("talepler")
            .insert(payload)
            .select("id")
            .single();

        if (insErr) return res.status(400).json({ message: insErr.message });

        const talepId = inserted.id;

        // 2) Upload files to Storage (opsiyonel)
        const BUCKET = "talepler-ekler";

        const incoming = files?.files
            ? Array.isArray(files.files)
                ? files.files
                : [files.files]
            : [];

        const attachments = [];

        for (const f of incoming) {
            const filePath = f.filepath;
            const originalName = f.originalFilename || "dosya";
            const contentType = f.mimetype || "application/octet-stream";

            const buf = fs.readFileSync(filePath);
            const path = `talepler/${talepId}/${Date.now()}-${safeFileName(originalName)}`;

            const { error: upErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(path, buf, { contentType, upsert: false });

            if (upErr) {
                // dosya upload fail olsa bile talep yaratıldı; istersen burada rollback yaparsın
                return res.status(400).json({ message: `Dosya yüklenemedi: ${upErr.message}` });
            }

            // public bucket ise link:
            const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

            attachments.push({
                name: originalName,
                path,
                type: contentType,
                size: f.size,
                url: pub?.publicUrl || null,
            });
        }

        // 3) ekler yaz (jsonb kolon adı: ekler)
        if (attachments.length) {
            const { error: updErr } = await supabaseAdmin
                .from("talepler")
                .update({ ekler: attachments })
                .eq("id", talepId);

            if (updErr) return res.status(400).json({ message: updErr.message });
        }

        return res.status(200).json({ ok: true, id: talepId, attachmentsCount: attachments.length });
    } catch (e) {
        return res.status(500).json({ message: e?.message || "Server error" });
    }
}
