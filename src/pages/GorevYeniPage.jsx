import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createGorev, addGorevSorumlular } from "../lib/queries/gorevler";
import { uploadDosya } from "../lib/queries/gorevDosyalar";
import { getAktifKullanici } from "../lib/queries/kullanicilar";
import { canCreateTask } from "../lib/utils/permissions";

import "../styles/gorevler.css";
import "../styles/gorev-form.css";

const ZELAL_ID = "6dffcaeb-d2a3-4284-88c5-ccde8b3f0b9b";
const NIHAT_ID = "84f45c48-5bce-4299-9fe1-af2e4c32d9aa";

const AY_ADLARI = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
];

const HAFTA_GUNLERI = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function cleanUuid(value) {
    return String(value || "").trim();
}

function toDateOnlyString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function parseDateOnly(dateStr) {
    const [y, m, d] = String(dateStr).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, amount) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonthLabel(date) {
    return `${AY_ADLARI[date.getMonth()]} ${date.getFullYear()}`;
}

function getCalendarDays(monthDate) {
    const firstDay = startOfMonth(monthDate);
    const lastDay = endOfMonth(monthDate);

    const jsDay = firstDay.getDay(); // 0 pazar
    const mondayBased = jsDay === 0 ? 6 : jsDay - 1;

    const days = [];

    for (let i = 0; i < mondayBased; i += 1) {
        days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
        days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }

    while (days.length % 7 !== 0) {
        days.push(null);
    }

    return days;
}

function isSameDayStr(a, b) {
    return String(a || "") === String(b || "");
}

function sortDateStrings(values) {
    return [...values].sort((a, b) => parseDateOnly(a) - parseDateOnly(b));
}

function buildInitialCalendarMonth(form) {
    if (form?.baslangic_tarih) {
        return parseDateOnly(form.baslangic_tarih);
    }

    if (form?.rutinTarihleri?.length) {
        return parseDateOnly(sortDateStrings(form.rutinTarihleri)[0]);
    }

    return startOfMonth(new Date());
}

export default function GorevYeniPage() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [dosyalar, setDosyalar] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));

    const [form, setForm] = useState({
        baslik: "",
        aciklama: "",
        oncelik: "orta",
        gorunurluk: "bireysel",
        baslangic_tarih: "",
        bitis_tarih: "",
        gizli: false,
        etiketlerText: "",
        rutinTarihleri: [],
    });

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError("");
                const aktifUser = await getAktifKullanici();
                setUser(aktifUser || null);
            } catch (err) {
                console.error("Form yüklenemedi:", err);
                setError("Form bilgileri yüklenirken hata oluştu.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    useEffect(() => {
        setCalendarMonth(buildInitialCalendarMonth(form));
    }, [form]);

    function handleChange(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function toggleRutinTarihi(date) {
        const value = toDateOnlyString(date);

        setForm((prev) => {
            const current = Array.isArray(prev.rutinTarihleri) ? prev.rutinTarihleri : [];
            const exists = current.some((item) => isSameDayStr(item, value));

            return {
                ...prev,
                rutinTarihleri: exists
                    ? current.filter((item) => !isSameDayStr(item, value))
                    : sortDateStrings([...current, value]),
            };
        });
    }

    function removeRutinTarihi(value) {
        setForm((prev) => ({
            ...prev,
            rutinTarihleri: (prev.rutinTarihleri || []).filter(
                (item) => !isSameDayStr(item, value)
            ),
        }));
    }

    function handleDosyaEkle(files) {
        const yeniDosyalar = Array.from(files).map((file) => ({
            id: crypto.randomUUID(),
            file,
            name: file.name,
            size: file.size,
            type: file.type,
        }));

        setDosyalar((prev) => [...prev, ...yeniDosyalar]);
    }

    function handleDosyaKaldir(id) {
        setDosyalar((prev) => prev.filter((d) => d.id !== id));
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);

        if (e.dataTransfer.files?.length) {
            handleDosyaEkle(e.dataTransfer.files);
        }
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function getFileIcon(type = "") {
        if (type.startsWith("image/")) return "🖼";
        if (type === "application/pdf") return "📄";
        if (type.includes("word") || type.includes("document")) return "📝";
        if (type.includes("sheet") || type.includes("excel")) return "📊";
        if (type.includes("zip") || type.includes("rar")) return "🗜";
        return "📎";
    }

    async function createTekGorev({
        atananId,
        ortakPayload,
        isRoutine,
    }) {
        const temizAtananId = cleanUuid(atananId);

        if (!temizAtananId) {
            throw new Error("Atanan kullanıcı bulunamadı.");
        }

        if (isRoutine) {
            const sortedRoutineDates = sortDateStrings(form.rutinTarihleri || []);
            const firstRoutineDate = sortedRoutineDates[0] || null;
            const lastRoutineDate = sortedRoutineDates[sortedRoutineDates.length - 1] || null;

            const rutinPayload = {
                ...ortakPayload,
                atanan_kullanici_id: temizAtananId,
                rutin_mi: true,
                tekrar_tipi: "ozel_takvim",
                tekrar_aktif: true,
                rutin_tarihleri: sortedRoutineDates,
                parent_gorev_id: null,
                rutin_parent_id: null,
                rutin_baslangic: firstRoutineDate,
                rutin_bitis: lastRoutineDate,
                rutin_iptal_tarihi: null,
                son_olusturma_tarihi: firstRoutineDate,
                son_tarih: lastRoutineDate,
                baslangic_tarih: firstRoutineDate,
                bitis_tarih: lastRoutineDate,
            };

            const created = await createGorev(rutinPayload);

            if (!created?.id) {
                throw new Error("Rutin görev oluşturuldu ama id dönmedi.");
            }

            return created;
        }

        const normalPayload = {
            ...ortakPayload,
            atanan_kullanici_id: temizAtananId,
            rutin_mi: false,
            tekrar_tipi: null,
            tekrar_aktif: false,
            rutin_tarihleri: [],
            parent_gorev_id: null,
            rutin_parent_id: null,
            rutin_baslangic: null,
            rutin_bitis: null,
            rutin_iptal_tarihi: null,
            son_olusturma_tarihi: null,
            son_tarih: form.bitis_tarih || null,
        };

        const created = await createGorev(normalPayload);

        if (!created?.id) {
            throw new Error("Kayıt oluştu ama id dönmedi.");
        }

        return created;
    }

    async function uploadSecilenDosyalar(gorevId) {
        if (!gorevId || !Array.isArray(dosyalar) || dosyalar.length === 0) {
            return;
        }

        for (const item of dosyalar) {
            if (item?.file) {
                await uploadDosya(item.file, gorevId);
            }
        }
    }

    async function handleCreate(e) {
        e.preventDefault();

        if (saving) return;

        if (!form.baslik.trim()) {
            alert("Başlık zorunludur.");
            return;
        }

        const isRoutine = form.oncelik === "rutin";

        if (!isRoutine && (!form.baslangic_tarih || !form.bitis_tarih)) {
            alert("Başlangıç tarihi ve istenilen tarih zorunludur.");
            return;
        }

        if (!isRoutine && form.bitis_tarih < form.baslangic_tarih) {
            alert("Bitiş tarihi başlangıç tarihinden önce olamaz.");
            return;
        }

        if (isRoutine && (!form.rutinTarihleri || form.rutinTarihleri.length === 0)) {
            alert("Rutin görev için takvimden en az bir tarih seçmelisiniz.");
            return;
        }

        try {
            setSaving(true);

            const etiketler = form.etiketlerText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            const dbOncelik = isRoutine ? "orta" : form.oncelik;

            const currentUserId = cleanUuid(user?.id);

            if (!currentUserId) {
                throw new Error("Aktif kullanıcı bulunamadı.");
            }

            const ekipKullanicilari = [
                cleanUuid(ZELAL_ID),
                cleanUuid(NIHAT_ID),
            ].filter(Boolean);

            const sortedRoutineDates = sortDateStrings(form.rutinTarihleri || []);
            const firstRoutineDate = sortedRoutineDates[0] || null;
            const lastRoutineDate = sortedRoutineDates[sortedRoutineDates.length - 1] || null;

            const ortakPayload = {
                baslik: form.baslik.trim(),
                aciklama: form.aciklama.trim() || null,
                oncelik: dbOncelik,
                gorunurluk: form.gorunurluk,
                durum: "beklemede",
                birim: "Satış",
                baslangic_tarih: isRoutine ? firstRoutineDate : (form.baslangic_tarih || null),
                bitis_tarih: isRoutine ? lastRoutineDate : (form.bitis_tarih || null),
                gizli: form.gizli,
                etiketler,
            };

            if (form.gorunurluk === "bireysel") {
                const created = await createTekGorev({
                    atananId: currentUserId,
                    ortakPayload,
                    isRoutine,
                });

                await uploadSecilenDosyalar(created.id);

                navigate(`/gorevler/${created.id}`);
                return;
            }

            if (form.gorunurluk === "ekip") {
                const digerKullanicilar = ekipKullanicilari.filter(
                    (id) => id !== currentUserId
                );

                const created = await createTekGorev({
                    atananId: currentUserId,
                    ortakPayload,
                    isRoutine,
                });

                if (digerKullanicilar.length > 0) {
                    await addGorevSorumlular(created.id, digerKullanicilar);
                }

                await uploadSecilenDosyalar(created.id);

                navigate(`/gorevler/${created.id}`);
                return;
            }

            throw new Error("Geçersiz görünürlük tipi.");
        } catch (err) {
            console.error("Görev oluşturulamadı:", err);
            console.error("message:", err?.message);
            console.error("code:", err?.code);
            console.error("details:", err?.details);
            console.error("hint:", err?.hint);

            alert(err?.message || err?.details || "Görev oluşturulamadı.");
        } finally {
            setSaving(false);
        }
    }

    const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

    const groupedRoutineDates = useMemo(() => {
        const groups = new Map();

        for (const value of form.rutinTarihleri || []) {
            const date = parseDateOnly(value);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const label = `${AY_ADLARI[date.getMonth()]} ${date.getFullYear()}`;

            if (!groups.has(key)) {
                groups.set(key, { key, label, items: [] });
            }

            groups.get(key).items.push(value);
        }

        return Array.from(groups.values()).map((group) => ({
            ...group,
            items: sortDateStrings(group.items),
        }));
    }, [form.rutinTarihleri]);

    if (loading) {
        return (
            <div className="gf-page">
                <div className="gf-state">Form yükleniyor...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="gf-page">
                <div className="gf-state gf-state--error">{error}</div>
            </div>
        );
    }

    if (!user || !canCreateTask(user)) {
        return (
            <div className="gf-page">
                <div className="gf-state gf-state--error">
                    Bu işlem için yetkiniz yok.
                </div>
            </div>
        );
    }

    return (
        <div className="gf-page">
            <section className="gf-hero">
                <div className="gf-hero__left">
                    <p className="gf-hero__eyebrow">Görev Yönetimi</p>
                    <h1 className="gf-hero__title">Yeni Görev</h1>
                    <p className="gf-hero__desc">
                        Yeni bir iş oluşturun, tarih ve öncelik bilgilerini girin.
                    </p>
                </div>

                <button
                    type="button"
                    className="gf-btn gf-btn--ghost"
                    onClick={() => navigate("/gorevler")}
                >
                    Vazgeç
                </button>
            </section>

            <form className="gf-form" onSubmit={handleCreate}>
                <div className="gf-card">
                    <div className="gf-card__head">
                        <h2 className="gf-card__title">Temel Bilgiler</h2>
                        <p className="gf-card__desc">
                            Görevin başlığı, açıklaması ve sınıflandırması.
                        </p>
                    </div>

                    <div className="gf-grid">
                        <div className="gf-field gf-field--12">
                            <label className="gf-label">
                                Başlık <span className="gf-required">*</span>
                            </label>
                            <input
                                className="gf-input"
                                placeholder="Görev başlığını girin"
                                value={form.baslik}
                                onChange={(e) => handleChange("baslik", e.target.value)}
                            />
                        </div>

                        <div className="gf-field gf-field--12">
                            <label className="gf-label">Açıklama</label>
                            <textarea
                                className="gf-textarea"
                                placeholder="Görev içeriğini, kapsamı ve beklentileri yazın..."
                                rows={4}
                                value={form.aciklama}
                                onChange={(e) => handleChange("aciklama", e.target.value)}
                            />
                        </div>

                        <div className="gf-field gf-field--6">
                            <label className="gf-label">Öncelik</label>
                            <div className="gf-priority-group">
                                {[
                                    { value: "rutin", label: "Rutin" },
                                    { value: "dusuk", label: "Düşük" },
                                    { value: "orta", label: "Orta" },
                                    { value: "yuksek", label: "Yüksek" },
                                    { value: "kritik", label: "Kritik" },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`gf-priority-btn gf-priority-btn--${opt.value}${form.oncelik === opt.value ? " active" : ""}`}
                                        onClick={() => handleChange("oncelik", opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="gf-field gf-field--6">
                            <label className="gf-label">Görünürlük</label>
                            <div className="gf-toggle-group">
                                <button
                                    type="button"
                                    className={`gf-toggle-btn${form.gorunurluk === "bireysel" ? " active" : ""}`}
                                    onClick={() => handleChange("gorunurluk", "bireysel")}
                                >
                                    <span className="gf-toggle-icon">👤</span>
                                    Bireysel
                                </button>

                                <button
                                    type="button"
                                    className={`gf-toggle-btn${form.gorunurluk === "ekip" ? " active" : ""}`}
                                    onClick={() => handleChange("gorunurluk", "ekip")}
                                >
                                    <span className="gf-toggle-icon">👥</span>
                                    Ekip
                                </button>
                            </div>
                        </div>

                        {form.gorunurluk === "ekip" && (
                            <div className="gf-field gf-field--12">
                                <div className="gf-rutin-box">
                                    <div className="gf-rutin-box__title">
                                        Ekip görevi
                                    </div>
                                    <p className="gf-rutin-box__desc">
                                        Bu görev otomatik olarak ekipteki diğer kullanıcıya da atanır.
                                        Bireysel seçim yapmanıza gerek yoktur.
                                    </p>
                                </div>
                            </div>
                        )}

                        {form.oncelik === "rutin" && (
                            <div className="gf-field gf-field--12">
                                <div className="gf-rutin-box">
                                    <div className="gf-rutin-box__title">
                                        Rutin takvim seçimi
                                    </div>
                                    <p className="gf-rutin-box__desc">
                                        Aylar arasında gezip istediğiniz günleri tek tek işaretleyin.
                                        Her ay farklı gün seçebilirsiniz.
                                    </p>

                                    <div
                                        style={{
                                            marginTop: "16px",
                                            border: "1px solid #dbe3ef",
                                            borderRadius: "16px",
                                            background: "#fff",
                                            padding: "16px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: "14px",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                className="gf-btn gf-btn--ghost"
                                                onClick={() => setCalendarMonth((prev) => addMonths(prev, -1))}
                                            >
                                                ← Önceki Ay
                                            </button>

                                            <strong style={{ color: "#0f172a" }}>
                                                {formatMonthLabel(calendarMonth)}
                                            </strong>

                                            <button
                                                type="button"
                                                className="gf-btn gf-btn--ghost"
                                                onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                                            >
                                                Sonraki Ay →
                                            </button>
                                        </div>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(7, 1fr)",
                                                gap: "8px",
                                            }}
                                        >
                                            {HAFTA_GUNLERI.map((name) => (
                                                <div
                                                    key={name}
                                                    style={{
                                                        textAlign: "center",
                                                        fontSize: "12px",
                                                        fontWeight: 700,
                                                        color: "#64748b",
                                                        paddingBottom: "4px",
                                                    }}
                                                >
                                                    {name}
                                                </div>
                                            ))}

                                            {calendarDays.map((date, index) => {
                                                if (!date) {
                                                    return <div key={`empty-${index}`} />;
                                                }

                                                const dateStr = toDateOnlyString(date);
                                                const active = (form.rutinTarihleri || []).some((v) =>
                                                    isSameDayStr(v, dateStr)
                                                );

                                                return (
                                                    <button
                                                        key={dateStr}
                                                        type="button"
                                                        onClick={() => toggleRutinTarihi(date)}
                                                        style={{
                                                            height: "46px",
                                                            borderRadius: "12px",
                                                            border: active
                                                                ? "2px solid #2563eb"
                                                                : "1px solid #dbe3ef",
                                                            background: active ? "#dbeafe" : "#ffffff",
                                                            color: active ? "#1d4ed8" : "#0f172a",
                                                            fontWeight: active ? 800 : 600,
                                                            cursor: "pointer",
                                                        }}
                                                        title={dateStr}
                                                    >
                                                        {date.getDate()}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: "16px" }}>
                                        <p
                                            style={{
                                                margin: "0 0 8px",
                                                fontSize: "13px",
                                                fontWeight: 700,
                                                color: "#475569",
                                            }}
                                        >
                                            Seçilen rutin tarihleri
                                        </p>

                                        {groupedRoutineDates.length === 0 ? (
                                            <div
                                                style={{
                                                    fontSize: "13px",
                                                    color: "#64748b",
                                                }}
                                            >
                                                Henüz tarih seçilmedi.
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "12px",
                                                }}
                                            >
                                                {groupedRoutineDates.map((group) => (
                                                    <div key={group.key}>
                                                        <div
                                                            style={{
                                                                fontSize: "13px",
                                                                fontWeight: 700,
                                                                color: "#334155",
                                                                marginBottom: "8px",
                                                            }}
                                                        >
                                                            {group.label}
                                                        </div>

                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                flexWrap: "wrap",
                                                                gap: "8px",
                                                            }}
                                                        >
                                                            {group.items.map((value) => (
                                                                <div
                                                                    key={value}
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: "8px",
                                                                        padding: "8px 10px",
                                                                        borderRadius: "999px",
                                                                        border: "1px solid #dbeafe",
                                                                        background: "#eff6ff",
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            color: "#1e3a8a",
                                                                            fontSize: "13px",
                                                                            fontWeight: 600,
                                                                        }}
                                                                    >
                                                                        {value}
                                                                    </span>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeRutinTarihi(value)}
                                                                        style={{
                                                                            border: "none",
                                                                            background: "transparent",
                                                                            color: "#b91c1c",
                                                                            fontSize: "13px",
                                                                            fontWeight: 700,
                                                                            cursor: "pointer",
                                                                            padding: 0,
                                                                            lineHeight: 1,
                                                                        }}
                                                                        title="Tarihi kaldır"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="gf-card">
                    <div className="gf-card__head">
                        <h2 className="gf-card__title">Planlama</h2>
                        <p className="gf-card__desc">Tarih aralığı ve ek bilgiler.</p>
                    </div>

                    <div className="gf-grid">
                        {form.oncelik !== "rutin" && (
                            <>
                                <div className="gf-field gf-field--6">
                                    <label className="gf-label">
                                        Başlangıç Tarihi <span className="gf-required">*</span>
                                    </label>
                                    <input
                                        className="gf-input"
                                        type="date"
                                        value={form.baslangic_tarih}
                                        onChange={(e) => handleChange("baslangic_tarih", e.target.value)}
                                    />
                                </div>

                                <div className="gf-field gf-field--6">
                                    <label className="gf-label">
                                        İstenilen Tarih <span className="gf-required">*</span>
                                    </label>
                                    <input
                                        className="gf-input"
                                        type="date"
                                        value={form.bitis_tarih}
                                        onChange={(e) => handleChange("bitis_tarih", e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        <div className="gf-field gf-field--12">
                            <label className="gf-label">Etiketler</label>
                            <input
                                className="gf-input"
                                placeholder="örn. acil, saha, raporlama — virgülle ayırın"
                                value={form.etiketlerText}
                                onChange={(e) => handleChange("etiketlerText", e.target.value)}
                            />
                        </div>

                        <div className="gf-field gf-field--12">
                            <label className="gf-checkbox">
                                <input
                                    type="checkbox"
                                    checked={form.gizli}
                                    onChange={(e) => handleChange("gizli", e.target.checked)}
                                />
                                <span>Sadece yetkili kullanıcılar görsün</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="gf-card">
                    <div className="gf-card__head">
                        <h2 className="gf-card__title">Dosya Ekleri</h2>
                        <p className="gf-card__desc">
                            Göreve ait belge, görsel veya dosyaları ekleyin.
                        </p>
                    </div>

                    <div
                        className={`gf-dropzone${dragOver ? " drag-over" : ""}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("gf-file-input")?.click()}
                    >
                        <div className="gf-dropzone__icon">📁</div>
                        <p className="gf-dropzone__text">
                            Dosyaları buraya sürükleyin veya{" "}
                            <span className="gf-dropzone__link">seçmek için tıklayın</span>
                        </p>
                        <p className="gf-dropzone__hint">
                            PDF, Word, Excel, görsel ve arşiv dosyaları desteklenir
                        </p>

                        <input
                            id="gf-file-input"
                            type="file"
                            multiple
                            style={{ display: "none" }}
                            onChange={(e) => handleDosyaEkle(e.target.files)}
                        />
                    </div>

                    {dosyalar.length > 0 && (
                        <div className="gf-file-list">
                            {dosyalar.map((d) => (
                                <div key={d.id} className="gf-file-item">
                                    <span className="gf-file-icon">{getFileIcon(d.type)}</span>

                                    <div className="gf-file-info">
                                        <span className="gf-file-name">{d.name}</span>
                                        <span className="gf-file-size">
                                            {formatBytes(d.size)}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="gf-file-remove"
                                        onClick={() => handleDosyaKaldir(d.id)}
                                        aria-label="Kaldır"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="gf-actions">
                    <span className="gf-hint">
                        <span className="gf-required">*</span> zorunlu alan
                    </span>

                    <div className="gf-actions__right">
                        <button
                            type="button"
                            className="gf-btn gf-btn--ghost"
                            onClick={() => navigate("/gorevler")}
                        >
                            İptal
                        </button>

                        <button
                            type="submit"
                            className="gf-btn gf-btn--primary"
                            disabled={saving}
                        >
                            {saving ? "Oluşturuluyor..." : "Görevi Oluştur"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}