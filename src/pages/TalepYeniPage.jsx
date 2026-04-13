import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTalep } from "../lib/queries/talepler";
import { getAktifKullanici } from "../lib/queries/kullanicilar";
import "../styles/talep-yeni-page.css";

const TALEP_TURLERI = [
    {
        key: "filo_takip",
        title: "Filo Takip Sistemi",
        desc: "Araç, filo ve takip sistemi ile ilgili talepler.",
    },
    {
        key: "bim_afyon",
        title: "Bim Afyon Projesi",
        desc: "Bim Afyon projesine ait geliştirme ve destek talepleri.",
    },
    {
        key: "dedike",
        title: "Dedike Sistemi",
        desc: "Dedike sistemine ait operasyonel ve teknik talepler.",
    },
    {
        key: "evrak_takip",
        title: "Evrak Takip Sistemi",
        desc: "Evrak akışı, doküman ve takip süreçleri ile ilgili talepler.",
    },
    {
        key: "gorev_talep",
        title: "Görev Talep Sistemi",
        desc: "Görev ve talep yönetim sistemi ile ilgili talepler.",
    },
    {
        key: "tedarik_analiz",
        title: "Tedarik Analiz",
        desc: "Tedarik ve analiz süreçleri ile ilgili talepler.",
    },
    {
        key: "siparis",
        title: "Sipariş Sistemi",
        desc: "Sipariş yönetimi ve süreçleri ile ilgili talepler.",
    },
    {
        key: "yeni_sistem",
        title: "Yeni Sistem Önerisi",
        desc: "Yeni sistem önerileri ve geliştirme fikirleri.",
    },
];

const ONCELIK_OPTIONS = ["Düşük", "Orta", "Yüksek", "Kritik"];

const initialForm = {
    talepTuru: "",
    baslik: "",
    aciklama: "",
    oncelik: "Orta",
    istenilenTarih: "",
    dosya: null,
    talepAdimlariniTakipEt: false,
    bildirimGonder: false,
    bildirimKanallari: { uygulama: true, email: false },
    bildirimNotu: "",
};

function getStepMeta(step) {
    switch (step) {
        case 1:
            return {
                title: "Sistem Seçimi",
                desc: "Talebin hangi ürün, proje veya sistem ile ilgili olduğunu seç.",
            };
        case 2:
            return {
                title: "Talep Detayları",
                desc: "Başlık, açıklama, öncelik ve istenen tarih bilgilerini doldur.",
            };
        case 3:
            return {
                title: "Takip ve Bildirim",
                desc: "Talep akışını izlemek ve bildirim almak için tercihlerini belirle.",
            };
        case 4:
            return {
                title: "Kontrol ve Onay",
                desc: "Bilgileri gözden geçirip talebi sisteme gönder.",
            };
        default:
            return {
                title: "Yeni Talep",
                desc: "",
            };
    }
}

export default function TalepYeniPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const selectedType = useMemo(
        () => TALEP_TURLERI.find((t) => t.key === form.talepTuru) || null,
        [form.talepTuru]
    );

    const stepMeta = useMemo(() => getStepMeta(step), [step]);

    const updateField = (field, value) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const updateNotificationField = (field, value) =>
        setForm((prev) => ({
            ...prev,
            bildirimKanallari: { ...prev.bildirimKanallari, [field]: value },
        }));

    const goNext = () => {
        if (step === 1 && !form.talepTuru) {
            setError("Devam etmek için önce bir sistem seçmelisin.");
            return;
        }

        if (step === 2 && (!form.baslik.trim() || !form.aciklama.trim())) {
            setError("Başlık ve açıklama alanlarını doldurmalısın.");
            return;
        }

        setError("");
        setStep((prev) => Math.min(4, prev + 1));
    };

    const goBack = () => {
        setError("");
        setStep((prev) => Math.max(1, prev - 1));
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            const aktifKullanici = await getAktifKullanici();

            await createTalep({
                baslik: form.baslik.trim(),
                aciklama: form.aciklama.trim(),
                oncelik: form.oncelik,
                durum: "Beklemede",
                talep_turu: selectedType?.title || form.talepTuru,
                istenilen_tarih: form.istenilenTarih || null,
                takip_aktif: form.talepAdimlariniTakipEt,
                bildirim_aktif: form.bildirimGonder,
                bildirim_uygulama: form.bildirimGonder
                    ? form.bildirimKanallari.uygulama
                    : false,
                bildirim_email: form.bildirimGonder
                    ? form.bildirimKanallari.email
                    : false,
                bildirim_notu: form.bildirimGonder ? form.bildirimNotu : "",
                dosya_adi: form.dosya?.name || null,
                olusturan_id: aktifKullanici?.id || null,
            });

            setSuccess("Talep başarıyla oluşturuldu.");
            setForm(initialForm);
            setStep(1);

            setTimeout(() => {
                navigate("/talepler");
            }, 900);
        } catch (err) {
            console.error(err);
            setError("Talep oluşturulamadı. Lütfen tekrar dene.");
        } finally {
            setSubmitting(false);
        }
    };

    const STEPS = ["Sistem", "Detay", "Bildirim", "Onay"];

    return (
        <div className="tnp-shell">
            <div className="tnp-page">
                <section className="tnp-hero">
                    <div className="tnp-hero__left">
                        <span className="tnp-eyebrow">Talep Yönetimi</span>
                        <h1 className="tnp-title">Yeni Talep Oluştur</h1>
                        <p className="tnp-subtitle">
                            Taleplerini daha düzenli, kontrollü ve hızlı şekilde sisteme ekle.
                        </p>

                        <div className="tnp-hero__meta">
                            <div className="tnp-hero-card">
                                <span>Adım</span>
                                <strong>
                                    {step} / 4
                                </strong>
                            </div>
                            <div className="tnp-hero-card">
                                <span>Mevcut Bölüm</span>
                                <strong>{stepMeta.title}</strong>
                            </div>
                            <div className="tnp-hero-card">
                                <span>Durum</span>
                                <strong>{submitting ? "Gönderiliyor" : "Düzenleniyor"}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="tnp-hero__right">
                        <div className="tnp-side-summary">
                            <div className="tnp-side-summary__head">
                                <span className="tnp-side-summary__tag">Canlı Özet</span>
                                <strong>Talep Önizleme</strong>
                            </div>

                            <div className="tnp-side-summary__list">
                                <div className="tnp-side-summary__item">
                                    <span>Sistem</span>
                                    <strong>{selectedType?.title || "Henüz seçilmedi"}</strong>
                                </div>
                                <div className="tnp-side-summary__item">
                                    <span>Başlık</span>
                                    <strong>{form.baslik || "Başlık girilmedi"}</strong>
                                </div>
                                <div className="tnp-side-summary__item">
                                    <span>Öncelik</span>
                                    <strong>{form.oncelik}</strong>
                                </div>
                                <div className="tnp-side-summary__item">
                                    <span>İstenen Tarih</span>
                                    <strong>{form.istenilenTarih || "Belirtilmedi"}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {(error || success) && (
                    <div className="tnp-alerts">
                        {error && <div className="tnp-alert tnp-alert--error">{error}</div>}
                        {success && (
                            <div className="tnp-alert tnp-alert--success">{success}</div>
                        )}
                    </div>
                )}

                <div className="tnp-layout">
                    <aside className="tnp-sidebar">
                        <div className="tnp-sidebar__section">
                            <p className="tnp-sidebar__label">İlerleme</p>

                            <div className="tnp-steps tnp-steps--vertical">
                                {STEPS.map((label, i) => {
                                    const n = i + 1;
                                    const state =
                                        n === step ? "active" : n < step ? "done" : "";

                                    return (
                                        <div key={n} className={`tnp-step ${state}`}>
                                            <div className="tnp-step__num">
                                                {n < step ? (
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 14 14"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="M2 7l3.5 3.5L12 3.5"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                ) : (
                                                    n
                                                )}
                                            </div>
                                            <div className="tnp-step__content">
                                                <span className="tnp-step__label">{label}</span>
                                                <small className="tnp-step__desc">
                                                    {getStepMeta(n).desc}
                                                </small>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="tnp-progress">
                                <div
                                    className="tnp-progress__fill"
                                    style={{ width: `${((step - 1) / 3) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="tnp-sidebar__section">
                            <p className="tnp-sidebar__label">İpuçları</p>
                            <div className="tnp-tip-box">
                                <strong>{stepMeta.title}</strong>
                                <p>{stepMeta.desc}</p>
                            </div>
                        </div>
                    </aside>

                    <main className="tnp-main">
                        <div className="tnp-wizard">
                            {step === 1 && (
                                <div className="tnp-panel">
                                    <div className="tnp-panel__head">
                                        <div>
                                            <h2 className="tnp-panel__title">Sistem Seç</h2>
                                            <p className="tnp-panel__hint">
                                                Talebini ileteceğin sistemi seç.
                                            </p>
                                        </div>
                                        <span className="tnp-panel__badge">1 / 4</span>
                                    </div>

                                    <div className="tnp-type-grid">
                                        {TALEP_TURLERI.map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                className={`tnp-type-card${form.talepTuru === item.key ? " is-active" : ""
                                                    }`}
                                                onClick={() => updateField("talepTuru", item.key)}
                                            >
                                                <span className="tnp-type-card__title">
                                                    {item.title}
                                                </span>
                                                <span className="tnp-type-card__desc">{item.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="tnp-panel">
                                    <div className="tnp-panel__head">
                                        <div>
                                            <h2 className="tnp-panel__title">Talep Detayları</h2>
                                            <p className="tnp-panel__hint">
                                                Talebin içeriğini açık ve net şekilde doldur.
                                            </p>
                                        </div>
                                        <span className="tnp-panel__badge">2 / 4</span>
                                    </div>

                                    <div className="tnp-system-pill">
                                        <span className="tnp-system-pill__tag">Seçilen Sistem</span>
                                        <strong>{selectedType?.title || "Sistem seçilmedi"}</strong>
                                        <p>{selectedType?.desc || "Devam etmek için sistem seç."}</p>
                                    </div>

                                    <div className="tnp-form-grid">
                                        <div className="tnp-field tnp-field--full">
                                            <label className="tnp-label">Başlık</label>
                                            <input
                                                className="tnp-input"
                                                type="text"
                                                value={form.baslik}
                                                onChange={(e) => updateField("baslik", e.target.value)}
                                                placeholder="Talep başlığını yazın"
                                            />
                                        </div>

                                        <div className="tnp-field">
                                            <label className="tnp-label">Öncelik</label>
                                            <div className="tnp-priority-group">
                                                {ONCELIK_OPTIONS.map((o) => (
                                                    <button
                                                        key={o}
                                                        type="button"
                                                        className={`tnp-priority-btn${form.oncelik === o ? " is-active" : ""
                                                            } tnp-priority-btn--${o.toLowerCase()}`}
                                                        onClick={() => updateField("oncelik", o)}
                                                    >
                                                        {o}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="tnp-field">
                                            <label className="tnp-label">İstenilen Tarih</label>
                                            <input
                                                className="tnp-input"
                                                type="date"
                                                value={form.istenilenTarih}
                                                onChange={(e) =>
                                                    updateField("istenilenTarih", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="tnp-field tnp-field--full">
                                            <label className="tnp-label">Açıklama</label>
                                            <textarea
                                                className="tnp-textarea"
                                                rows="8"
                                                value={form.aciklama}
                                                onChange={(e) =>
                                                    updateField("aciklama", e.target.value)
                                                }
                                                placeholder="Talebin detaylarını açık ve net şekilde yazın"
                                            />
                                            <span className="tnp-char-count">
                                                {form.aciklama.length} karakter
                                            </span>
                                        </div>

                                        <div className="tnp-field tnp-field--full">
                                            <label className="tnp-label">
                                                Dosya Ekle{" "}
                                                <span className="tnp-label-opt">(isteğe bağlı)</span>
                                            </label>
                                            <label className="tnp-file-drop">
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="1.5"
                                                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0l-3 3m3-3l3 3"
                                                    />
                                                </svg>
                                                {form.dosya ? (
                                                    <span className="tnp-file-name">{form.dosya.name}</span>
                                                ) : (
                                                    <span>Dosya seç veya sürükle bırak</span>
                                                )}
                                                <input
                                                    type="file"
                                                    style={{ display: "none" }}
                                                    onChange={(e) =>
                                                        updateField("dosya", e.target.files?.[0] || null)
                                                    }
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="tnp-panel">
                                    <div className="tnp-panel__head">
                                        <div>
                                            <h2 className="tnp-panel__title">Takip ve Bildirim</h2>
                                            <p className="tnp-panel__hint">
                                                Talebin için takip ve bildirim tercihlerini belirle.
                                            </p>
                                        </div>
                                        <span className="tnp-panel__badge">3 / 4</span>
                                    </div>

                                    <div className="tnp-toggle-list">
                                        <label className="tnp-toggle-row">
                                            <div className="tnp-toggle-row__info">
                                                <strong>Adımları takip et</strong>
                                                <p>
                                                    Talebin süreç adımlarını görünür şekilde takip et.
                                                </p>
                                            </div>
                                            <div className="tnp-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={form.talepAdimlariniTakipEt}
                                                    onChange={(e) =>
                                                        updateField(
                                                            "talepAdimlariniTakipEt",
                                                            e.target.checked
                                                        )
                                                    }
                                                />
                                                <span className="tnp-switch__thumb" />
                                            </div>
                                        </label>

                                        <label className="tnp-toggle-row">
                                            <div className="tnp-toggle-row__info">
                                                <strong>Bildirim gönder</strong>
                                                <p>
                                                    Talebinde değişiklik olduğunda bilgilendirme al.
                                                </p>
                                            </div>
                                            <div className="tnp-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={form.bildirimGonder}
                                                    onChange={(e) =>
                                                        updateField("bildirimGonder", e.target.checked)
                                                    }
                                                />
                                                <span className="tnp-switch__thumb" />
                                            </div>
                                        </label>
                                    </div>

                                    {form.bildirimGonder && (
                                        <div className="tnp-notif-settings">
                                            <p className="tnp-notif-settings__label">
                                                Bildirim Kanalları
                                            </p>

                                            <div className="tnp-channel-group">
                                                <label className="tnp-channel">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.bildirimKanallari.uygulama}
                                                        onChange={(e) =>
                                                            updateNotificationField(
                                                                "uygulama",
                                                                e.target.checked
                                                            )
                                                        }
                                                    />
                                                    <span className="tnp-channel__box">
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="1.5"
                                                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-9.33-4.983M9 17H4l1.405-1.405A2.032 2.032 0 006 14.158V11a6 6 0 0112 0v3.159c0 .538.214 1.055.595 1.436L19 17h-4"
                                                            />
                                                        </svg>
                                                        Uygulama içi
                                                    </span>
                                                </label>

                                                <label className="tnp-channel">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.bildirimKanallari.email}
                                                        onChange={(e) =>
                                                            updateNotificationField("email", e.target.checked)
                                                        }
                                                    />
                                                    <span className="tnp-channel__box">
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="1.5"
                                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                        E-posta
                                                    </span>
                                                </label>
                                            </div>

                                            <div className="tnp-field tnp-field--full tnp-field--top">
                                                <label className="tnp-label">
                                                    Bildirim Notu{" "}
                                                    <span className="tnp-label-opt">(isteğe bağlı)</span>
                                                </label>
                                                <textarea
                                                    className="tnp-textarea"
                                                    rows="4"
                                                    value={form.bildirimNotu}
                                                    onChange={(e) =>
                                                        updateField("bildirimNotu", e.target.value)
                                                    }
                                                    placeholder="Bildirim tercihine dair kısa bir not bırakabilirsin"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 4 && (
                                <div className="tnp-panel">
                                    <div className="tnp-panel__head">
                                        <div>
                                            <h2 className="tnp-panel__title">Onay ve Oluştur</h2>
                                            <p className="tnp-panel__hint">
                                                Bilgileri kontrol et ve talebi oluştur.
                                            </p>
                                        </div>
                                        <span className="tnp-panel__badge">4 / 4</span>
                                    </div>

                                    <div className="tnp-summary-grid">
                                        <div className="tnp-summary-card">
                                            <span className="tnp-summary-card__label">Sistem</span>
                                            <strong>{selectedType?.title || "—"}</strong>
                                        </div>

                                        <div className="tnp-summary-card">
                                            <span className="tnp-summary-card__label">Öncelik</span>
                                            <span
                                                className={`tnp-priority-pill tnp-priority-pill--${form.oncelik.toLowerCase()}`}
                                            >
                                                {form.oncelik}
                                            </span>
                                        </div>

                                        <div className="tnp-summary-card">
                                            <span className="tnp-summary-card__label">
                                                İstenilen Tarih
                                            </span>
                                            <strong>{form.istenilenTarih || "—"}</strong>
                                        </div>

                                        <div className="tnp-summary-card">
                                            <span className="tnp-summary-card__label">Dosya</span>
                                            <strong>{form.dosya?.name || "—"}</strong>
                                        </div>

                                        <div className="tnp-summary-card">
                                            <span className="tnp-summary-card__label">
                                                Adım Takibi
                                            </span>
                                            <strong>
                                                {form.talepAdimlariniTakipEt ? "Açık" : "Kapalı"}
                                            </strong>
                                        </div>

                                        <div className="tnp-summary-card">
                                            <span className="tnp-summary-card__label">Bildirim</span>
                                            <strong>{form.bildirimGonder ? "Açık" : "Kapalı"}</strong>
                                        </div>
                                    </div>

                                    <div className="tnp-summary-desc">
                                        <span className="tnp-summary-card__label">Başlık</span>
                                        <p className="tnp-summary-desc__title">
                                            {form.baslik || "—"}
                                        </p>

                                        <span
                                            className="tnp-summary-card__label"
                                            style={{ marginTop: 12, display: "block" }}
                                        >
                                            Açıklama
                                        </span>
                                        <p className="tnp-summary-desc__body">
                                            {form.aciklama || "—"}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="tnp-actions">
                                <div className="tnp-dots">
                                    {[1, 2, 3, 4].map((n) => (
                                        <span
                                            key={n}
                                            className={`tnp-dot${step === n ? " is-active" : step > n ? " is-done" : ""
                                                }`}
                                        />
                                    ))}
                                </div>

                                <div className="tnp-actions__btns">
                                    <button
                                        type="button"
                                        className="tnp-btn tnp-btn--ghost"
                                        onClick={goBack}
                                        disabled={step === 1 || submitting}
                                    >
                                        ← Geri
                                    </button>

                                    {step < 4 ? (
                                        <button
                                            type="button"
                                            className="tnp-btn tnp-btn--primary"
                                            onClick={goNext}
                                            disabled={submitting}
                                        >
                                            Devam →
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className={`tnp-btn tnp-btn--submit${submitting ? " is-loading" : ""
                                                }`}
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                        >
                                            {submitting ? "Oluşturuluyor..." : "Talebi Oluştur"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}