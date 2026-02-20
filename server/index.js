import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

/* ======================================================
   ENV
   - Local'de .env kullanırsın (server/.env veya kök .env)
   - Render'da Environment Variables panelinden verirsin
====================================================== */

// ✅ Render için doğru kullanım: (path zorlamadan)
dotenv.config();

// Not: Eğer local'de server/.env kullanıyorsan, iki seçenek:
// 1) server klasöründe çalıştırınca otomatik yüklenir (dotenv.config())
// 2) İstersen aşağıdaki satırı açıp server/.env'yi localde zorlayabilirsin:
//
// dotenv.config({ path: new URL("./.env", import.meta.url).pathname });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL eksik (ENV)");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY eksik (ENV)");

/* ====================================================== */

const app = express();

/* ================= CORS =================
   ✅ Render'da: FRONTEND URL (Vercel) env’den gelsin
   - Frontend: https://talepler-gorevler.vercel.app
   - Backend: Render env -> FRONTEND_URL = https://talepler-gorevler.vercel.app
====================================================== */

const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim(); // ör: https://xxx.vercel.app

const allowedOrigins = new Set(
    [
        "http://localhost:3000",
        "http://localhost:5173",
        FRONTEND_URL, // boş değilse eklenir
    ].filter(Boolean)
);

app.use(
    cors({
        origin: (origin, cb) => {
            // Postman/curl gibi tools origin göndermez -> izin ver
            if (!origin) return cb(null, true);

            // allow list
            if (allowedOrigins.has(origin)) return cb(null, true);

            // Vercel preview subdomainlerini de kabul et (isteğe bağlı ama pratik)
            if (origin.endsWith(".vercel.app")) return cb(null, true);

            // Burada error fırlatmak yerine false dönmek daha stabil
            return cb(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    })
);

// ✅ Preflight (OPTIONS) kesin cevap (çok önemli)
app.options("*", cors());

app.use(express.json());

/* ====================================================== */

const upload = multer({ storage: multer.memoryStorage() });

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKET = process.env.BUCKET || "talepler-ekler";
const PORT = process.env.PORT || 4000;

/* ================= Utils ================= */

function safeFileName(name = "dosya") {
    return name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9.\-_]/g, "")
        .slice(0, 120);
}

function safeId(v) {
    return String(v || "").trim();
}

const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* ================= Debug ================= */

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/routes", (_req, res) => {
    const routes = [];
    // Express internal yapı — render debug için OK
    app._router.stack.forEach((m) => {
        if (m.route?.path) {
            const methods = Object.keys(m.route.methods).join(",").toUpperCase();
            routes.push({ methods, path: m.route.path });
        }
    });
    res.json({ routes });
});

/* ================= Birimler ================= */

app.get("/api/birimler", async (_req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from("kullanicilar").select("birim");
        if (error) return res.status(400).json({ message: error.message });

        const birimler = [...new Set((data || []).map((x) => x.birim).filter(Boolean))];
        res.json({ birimler });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/* ================= Kullanıcılar ================= */

app.get("/api/kullanicilar", async (req, res) => {
    try {
        const birim = safeId(req.query.birim);
        if (!birim) return res.status(400).json({ message: "birim zorunlu" });

        const { data, error } = await supabaseAdmin
            .from("kullanicilar")
            .select("id, ad_soyad, birim")
            .eq("birim", birim)
            .order("ad_soyad");

        if (error) return res.status(400).json({ message: error.message });
        res.json({ users: data || [] });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/* ======================================================
   ✅ Görevleri sorumlularla birleştirme helper
====================================================== */
async function enrichTasksWithSorumlular(tasks) {
    const ids = (tasks || []).map((t) => t?.id).filter(Boolean);
    if (!ids.length) return [];

    const { data: links, error: linkErr } = await supabaseAdmin
        .from("gorev_sorumlular")
        .select("gorev_id, kullanici_id, kullanicilar:kullanici_id ( id, ad_soyad )")
        .in("gorev_id", ids);

    if (linkErr) throw new Error(linkErr.message);

    const map = new Map();
    for (const row of links || []) {
        const gid = row.gorev_id;
        const u = row.kullanicilar;
        if (!map.has(gid)) map.set(gid, []);
        if (u?.id) map.get(gid).push({ id: u.id, ad_soyad: u.ad_soyad });
    }

    return (tasks || []).map((t) => ({
        ...t,
        sorumlular: map.get(t.id) || [],
    }));
}

/* ======================================================
   ✅ Görev create
====================================================== */
app.post("/api/gorevler/create", async (req, res) => {
    try {
        const body = req.body || {};

        const baslik = String(body.baslik || "").trim();
        const aciklama = String(body.aciklama || "").trim() || null;
        const oncelik = String(body.oncelik || "rutin").trim().toLowerCase();
        const birim = String(body.birim || "").trim();

        const baslangic_tarih = String(body.baslangic_tarih || "").trim();
        const bitis_tarih = String(body.bitis_tarih || "").trim();

        const etiketler = Array.isArray(body.etiketler)
            ? body.etiketler.map((x) => String(x || "").trim()).filter(Boolean)
            : [];

        const gizli = !!body.gizli;

        const olusturan_id = safeId(body.olusturan_id);
        const sorumlular = Array.isArray(body.sorumlular)
            ? body.sorumlular.map((x) => safeId(x)).filter(Boolean)
            : [];

        if (!baslik || baslik.length < 4) return res.status(400).json({ message: "Başlık geçersiz (min 4)." });
        if (!birim) return res.status(400).json({ message: "Birim zorunlu." });

        if (!baslangic_tarih) return res.status(400).json({ message: "baslangic_tarih zorunlu." });
        if (!bitis_tarih) return res.status(400).json({ message: "bitis_tarih zorunlu." });
        if (bitis_tarih < baslangic_tarih) return res.status(400).json({ message: "Bitiş tarihi başlangıçtan önce olamaz." });

        const allowedP = new Set(["rutin", "dusuk", "orta", "yuksek", "kritik"]);
        if (!allowedP.has(oncelik)) return res.status(400).json({ message: "Öncelik geçersiz." });

        if (!olusturan_id) return res.status(400).json({ message: "olusturan_id zorunlu." });
        if (!uuidRegex.test(olusturan_id)) return res.status(400).json({ message: "olusturan_id uuid olmalı." });

        if (!sorumlular.length) return res.status(400).json({ message: "En az 1 sorumlu zorunlu." });

        for (const uid of sorumlular) {
            if (!uuidRegex.test(uid)) return res.status(400).json({ message: `Sorumlu id uuid olmalı: ${uid}` });
        }

        const gorevPayload = {
            baslik,
            aciklama,
            oncelik,
            birim,
            baslangic_tarih,
            bitis_tarih,
            etiketler,
            gizli,
            olusturan_id,
        };

        const { data: inserted, error: insErr } = await supabaseAdmin
            .from("gorevler")
            .insert(gorevPayload)
            .select("id")
            .single();

        if (insErr) return res.status(400).json({ message: insErr.message });

        const gorevId = inserted.id;

        const rows = sorumlular.map((kullanici_id) => ({
            gorev_id: gorevId,
            kullanici_id,
        }));

        const { error: linkErr } = await supabaseAdmin.from("gorev_sorumlular").insert(rows);

        if (linkErr) {
            await supabaseAdmin.from("gorevler").delete().eq("id", gorevId);
            return res.status(400).json({ message: linkErr.message });
        }

        return res.status(200).json({ ok: true, id: gorevId });
    } catch (e) {
        return res.status(500).json({ message: e?.message || "Server error" });
    }
});

/* ======================================================
   ✅ Görev listeleme
====================================================== */
app.get("/api/gorevler", async (req, res) => {
    try {
        const userId = safeId(req.query.userId);

        if (userId && !uuidRegex.test(userId)) {
            return res.status(400).json({ message: "userId uuid olmalı." });
        }

        let tasks = [];

        if (userId) {
            const { data: links, error: lErr } = await supabaseAdmin
                .from("gorev_sorumlular")
                .select("gorev_id")
                .eq("kullanici_id", userId);

            if (lErr) return res.status(400).json({ message: lErr.message });

            const ids = Array.from(new Set((links || []).map((x) => x.gorev_id).filter(Boolean)));
            if (!ids.length) return res.status(200).json({ tasks: [] });

            const { data, error } = await supabaseAdmin
                .from("gorevler")
                .select("*")
                .in("id", ids)
                .order("bitis_tarih", { ascending: true });

            if (error) return res.status(400).json({ message: error.message });
            tasks = data || [];
        } else {
            const { data, error } = await supabaseAdmin.from("gorevler").select("*").order("bitis_tarih", { ascending: true });
            if (error) return res.status(400).json({ message: error.message });
            tasks = data || [];
        }

        const merged = await enrichTasksWithSorumlular(tasks);
        return res.status(200).json({ tasks: merged });
    } catch (e) {
        return res.status(500).json({ message: e?.message || "Server error" });
    }
});

/* ======================================================
   ✅ Birim görevleri
====================================================== */
app.get("/api/gorevler/birim", async (req, res) => {
    try {
        const birim = safeId(req.query.birim);
        if (!birim) return res.status(400).json({ message: "birim parametresi zorunlu" });

        const { data, error } = await supabaseAdmin
            .from("gorevler")
            .select("*")
            .eq("birim", birim)
            .order("bitis_tarih", { ascending: true });

        if (error) return res.status(400).json({ message: error.message });

        const merged = await enrichTasksWithSorumlular(data || []);
        return res.status(200).json({ tasks: merged });
    } catch (e) {
        return res.status(500).json({ message: e?.message || "Server error" });
    }
});

/* ================= Talep create (dosya upload) ================= */

app.post("/api/talepler/create", upload.array("files", 6), async (req, res) => {
    try {
        const body = req.body || {};

        const olusturan_id = safeId(body.olusturan_id);
        if (!olusturan_id) return res.status(400).json({ message: "olusturan_id zorunlu" });
        if (!uuidRegex.test(olusturan_id)) return res.status(400).json({ message: "olusturan_id uuid olmalı" });

        const payload = {
            baslik: body.baslik,
            aciklama: body.aciklama,
            oncelik: body.oncelik,
            durum: body.durum,
            istenilen_tarih: body.istenilen_tarih,
            talep_edilen: body.talep_edilen,
            talep_edilecek_sistem: body.talep_edilecek_sistem || null,
            olusturan_id,
        };

        const { data: inserted, error } = await supabaseAdmin.from("talepler").insert(payload).select("id").single();
        if (error) return res.status(400).json({ message: error.message });

        const talepId = inserted.id;
        const attachments = [];

        for (const f of req.files || []) {
            const filePath = `talepler/${talepId}/${Date.now()}-${safeFileName(f.originalname)}`;

            const { error: upErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(filePath, f.buffer, { contentType: f.mimetype, upsert: false });

            if (upErr) return res.status(400).json({ message: upErr.message });

            const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);

            attachments.push({
                name: f.originalname,
                path: filePath,
                type: f.mimetype,
                size: f.size,
                url: pub?.publicUrl || null,
            });
        }

        if (attachments.length) {
            const { error: updErr } = await supabaseAdmin.from("talepler").update({ ekler: attachments }).eq("id", talepId);
            if (updErr) return res.status(400).json({ message: updErr.message });
        }

        res.json({ ok: true, id: talepId, attachmentsCount: attachments.length });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/* ====================================================== */

app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});