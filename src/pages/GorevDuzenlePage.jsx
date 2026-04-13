import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getGorevById, updateGorev } from "../lib/queries/gorevler";
import { getAktifKullanici } from "../lib/queries/kullanicilar";
import { getGorevDurumlari } from "../lib/queries/gorevDurumlari";
import { canCreateTask } from "../lib/utils/permissions";

import "../styles/gorevler.css";
import "../styles/task-form.css";

export default function GorevDuzenlePage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [durumlar, setDurumlar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        baslik: "",
        aciklama: "",
        oncelik: "orta",
        durum: "beklemede",
        yeniDurum: "",
        gorunurluk: "bireysel",
        baslangic_tarih: "",
        bitis_tarih: "",
        gizli: false,
        etiketlerText: "",
    });

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError("");

                const [aktifUser, gorev, durumData] = await Promise.all([
                    getAktifKullanici(),
                    getGorevById(id),
                    getGorevDurumlari(),
                ]);

                setUser(aktifUser || null);
                setDurumlar(durumData || []);

                if (gorev) {
                    setForm({
                        baslik: gorev.baslik || "",
                        aciklama: gorev.aciklama || "",
                        oncelik: gorev.oncelik || "orta",
                        durum: gorev.durum || "beklemede",
                        yeniDurum: "",
                        gorunurluk: gorev.gorunurluk || "bireysel",
                        baslangic_tarih: gorev.baslangic_tarih || "",
                        bitis_tarih: gorev.bitis_tarih || "",
                        gizli: gorev.gizli ?? false,
                        etiketlerText: Array.isArray(gorev.etiketler)
                            ? gorev.etiketler.join(", ")
                            : "",
                    });
                }
            } catch (err) {
                console.error("Görev düzenleme formu yüklenemedi:", err);
                setError("Görev bilgileri yüklenirken hata oluştu.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [id]);

    const durumSecenekleri = useMemo(() => {
        const fromApi = (durumlar || [])
            .map((durum) => durum?.kod || durum?.value || durum?.slug || durum?.ad || durum?.baslik || "")
            .map((item) => String(item).trim())
            .filter(Boolean);

        const fallback = ["acik", "beklemede", "tamamlandi", "iptal", "gecikti"];
        const currentValue = String(form.durum || "").trim();

        return Array.from(new Set([...fromApi, ...fallback, currentValue])).filter(Boolean);
    }, [durumlar, form.durum]);

    function handleChange(field, value) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const finalDurum = (form.yeniDurum || form.durum || "").trim();

        if (!form.baslik.trim()) {
            alert("Başlık zorunludur.");
            return;
        }

        if (!finalDurum) {
            alert("Durum zorunludur.");
            return;
        }

        if (form.baslangic_tarih && form.bitis_tarih) {
            if (form.bitis_tarih < form.baslangic_tarih) {
                alert("Bitiş tarihi başlangıç tarihinden önce olamaz.");
                return;
            }
        }

        try {
            setSaving(true);

            const etiketler = form.etiketlerText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            const payload = {
                baslik: form.baslik.trim(),
                aciklama: form.aciklama.trim() || null,
                oncelik: form.oncelik,
                durum: finalDurum,
                gorunurluk: form.gorunurluk,
                baslangic_tarih: form.baslangic_tarih || null,
                bitis_tarih: form.bitis_tarih || null,
                gizli: form.gizli,
                etiketler,
            };

            console.log("Güncellenecek payload:", payload);

            await updateGorev(id, payload);

            navigate(`/gorevler/${id}`);
        } catch (err) {
            console.error("Görev güncellenemedi:", err);

            const message =
                err?.message ||
                err?.error_description ||
                err?.details ||
                "Görev güncellenemedi.";

            if (String(message).toLowerCase().includes("invalid input value for enum")) {
                alert(
                    "Yeni durum kaydedilemedi. Veritabanındaki durum alanı sabit değer kabul ediyor. Yeni durum eklemek için backend tarafında da bu değer tanımlanmalı."
                );
                return;
            }

            alert(message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="gorev-form-page">
                <div className="gorev-loading">Form yükleniyor...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="gorev-form-page">
                <div className="gorev-error">{error}</div>
            </div>
        );
    }

    if (!user || !canCreateTask(user)) {
        return (
            <div className="gorev-form-page">
                <div className="gorev-error">Bu işlem için yetkiniz yok.</div>
            </div>
        );
    }

    return (
        <div className="gorev-form-page">
            <section className="gorev-form-hero">
                <div>
                    <p className="gorev-hero__eyebrow">Görev Yönetimi</p>
                    <h1 className="gorev-form-hero__title">Görevi Düzenle</h1>
                    <p className="gorev-form-hero__desc">
                        Görev bilgilerini güncelleyin ve planlamayı revize edin.
                    </p>
                </div>

                <div className="gorev-hero__actions">
                    <button
                        type="button"
                        className="gorev-btn gorev-btn--ghost"
                        onClick={() => navigate(`/gorevler/${id}`)}
                    >
                        Geri Dön
                    </button>
                </div>
            </section>

            <form className="gorev-form" onSubmit={handleSubmit}>
                <section className="gorev-form-card">
                    <div className="gorev-form-card__head">
                        <div>
                            <h2 className="gorev-form-card__title">Temel Bilgiler</h2>
                            <p className="gorev-form-card__desc">
                                Başlık, açıklama, öncelik, durum ve görünürlük ayarları.
                            </p>
                        </div>
                    </div>

                    <div className="gorev-form-grid">
                        <div className="gorev-field gorev-field--12">
                            <label className="gorev-label">
                                Başlık <span className="gorev-required">*</span>
                            </label>
                            <input
                                className="gorev-input"
                                placeholder="Görev başlığını girin"
                                value={form.baslik}
                                onChange={(e) => handleChange("baslik", e.target.value)}
                            />
                        </div>

                        <div className="gorev-field gorev-field--12">
                            <label className="gorev-label">Açıklama</label>
                            <textarea
                                className="gorev-textarea"
                                rows={6}
                                placeholder="Görev içeriğini yazın"
                                value={form.aciklama}
                                onChange={(e) => handleChange("aciklama", e.target.value)}
                            />
                        </div>

                        <div className="gorev-field gorev-field--4">
                            <label className="gorev-label">Öncelik</label>
                            <select
                                className="gorev-select"
                                value={form.oncelik}
                                onChange={(e) => handleChange("oncelik", e.target.value)}
                            >
                                <option value="rutin">Rutin</option>
                                <option value="dusuk">Düşük</option>
                                <option value="orta">Orta</option>
                                <option value="yuksek">Yüksek</option>
                                <option value="kritik">Kritik</option>
                            </select>
                        </div>

                        <div className="gorev-field gorev-field--4">
                            <label className="gorev-label">
                                Durum <span className="gorev-required">*</span>
                            </label>
                            <select
                                className="gorev-select"
                                value={form.durum}
                                onChange={(e) => handleChange("durum", e.target.value)}
                            >
                                {durumSecenekleri.map((durum) => (
                                    <option key={durum} value={durum}>
                                        {durum}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="gorev-field gorev-field--4">
                            <label className="gorev-label">Yeni Durum Ekle</label>
                            <input
                                className="gorev-input"
                                placeholder="Yeni durum yazın (opsiyonel)"
                                value={form.yeniDurum}
                                onChange={(e) => handleChange("yeniDurum", e.target.value)}
                            />
                            <p className="gorev-hint">
                                Buraya yazarsanız kayıt sırasında seçili durum yerine bu değer kullanılır.
                            </p>
                        </div>

                        <div className="gorev-field gorev-field--12">
                            <label className="gorev-label">Görünürlük</label>
                            <select
                                className="gorev-select"
                                value={form.gorunurluk}
                                onChange={(e) => handleChange("gorunurluk", e.target.value)}
                            >
                                <option value="bireysel">Bireysel</option>
                                <option value="ekip">Ekip</option>
                                <option value="tum">Tüm Sistem</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section className="gorev-form-card">
                    <div className="gorev-form-card__head">
                        <div>
                            <h2 className="gorev-form-card__title">Planlama ve Diğer Alanlar</h2>
                            <p className="gorev-form-card__desc">
                                Tarih, etiket ve ek görünürlük ayarlarını düzenleyin.
                            </p>
                        </div>
                    </div>

                    <div className="gorev-form-grid">
                        <div className="gorev-field gorev-field--12">
                            <label className="gorev-label">Etiketler</label>
                            <input
                                className="gorev-input"
                                placeholder="örn. acil, saha, raporlama"
                                value={form.etiketlerText}
                                onChange={(e) => handleChange("etiketlerText", e.target.value)}
                            />
                            <p className="gorev-hint">Etiketleri virgülle ayırın.</p>
                        </div>

                        <div className="gorev-field gorev-field--6">
                            <label className="gorev-label">Başlangıç Tarihi</label>
                            <input
                                className="gorev-input"
                                type="date"
                                value={form.baslangic_tarih}
                                onChange={(e) => handleChange("baslangic_tarih", e.target.value)}
                            />
                        </div>

                        <div className="gorev-field gorev-field--6">
                            <label className="gorev-label">Bitiş Tarihi</label>
                            <input
                                className="gorev-input"
                                type="date"
                                value={form.bitis_tarih}
                                onChange={(e) => handleChange("bitis_tarih", e.target.value)}
                            />
                        </div>

                        <div className="gorev-field gorev-field--12">
                            <label className="gorev-label">Ek Ayarlar</label>
                            <label className="gorev-checkbox">
                                <input
                                    type="checkbox"
                                    checked={form.gizli}
                                    onChange={(e) => handleChange("gizli", e.target.checked)}
                                />
                                <span>Sadece yetkili kullanıcılar görsün</span>
                            </label>
                        </div>
                    </div>
                </section>

                <div className="gorev-form-actions">
                    <div className="gorev-form-actions__left">
                        <span className="gorev-hint">
                            <span className="gorev-required">*</span> zorunlu alan
                        </span>
                    </div>

                    <div className="gorev-form-actions__right">
                        <button
                            type="button"
                            className="gorev-btn gorev-btn--ghost"
                            onClick={() => navigate(`/gorevler/${id}`)}
                        >
                            Vazgeç
                        </button>

                        <button
                            type="submit"
                            className="gorev-btn gorev-btn--primary"
                            disabled={saving}
                        >
                            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}