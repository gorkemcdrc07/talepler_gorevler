import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTalepById, updateTalep } from "../lib/queries/talepler";
import {
    createTalepYorumu,
    getTalepYorumlari,
} from "../lib/queries/talepYorumlari";
import "../styles/talep-detay-page.css";

const DURUM_OPTIONS = [
    "Beklemede",
    "İnceleniyor",
    "İşlemde",
    "Tamamlandı",
    "Reddedildi",
];

const ONCELIK_OPTIONS = ["Düşük", "Orta", "Yüksek", "Kritik"];

function getTalepSahibi(item) {
    return (
        item?.kullanicilar?.ad_soyad ||
        [item?.kullanicilar?.ad, item?.kullanicilar?.soyad]
            .filter(Boolean)
            .join(" ") ||
        item?.kullanicilar?.kullanici_adi ||
        item?.kullanicilar?.eposta ||
        "-"
    );
}

function getYorumMetni(yorum) {
    return yorum?.yorum || yorum?.metin || yorum?.aciklama || yorum?.icerik || "-";
}

function getYorumYazari(yorum, index) {
    const user = yorum?.kullanicilar;

    return (
        user?.ad_soyad ||
        [user?.ad, user?.soyad].filter(Boolean).join(" ") ||
        user?.kullanici_adi ||
        user?.eposta ||
        `Yorum #${index + 1}`
    );
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("tr-TR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function normalizeFileUrl(path) {
    if (!path || typeof path !== "string") return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return path;
}

function getTalepDosyaBilgisi(talep) {
    const url =
        normalizeFileUrl(
            talep?.dosya_url ||
            talep?.dosya_link ||
            talep?.dosya_path ||
            talep?.ek_url ||
            talep?.ek_link
        ) || "";

    const name =
        talep?.dosya_adi ||
        talep?.ek_dosya_adi ||
        (url ? url.split("/").pop() : "");

    if (!name && !url) return null;

    return {
        name: name || "Dosya",
        url,
    };
}

function getYorumEkleri(yorum) {
    const files = [];

    const directName =
        yorum?.dosya_adi ||
        yorum?.ek_dosya_adi ||
        yorum?.attachment_name ||
        yorum?.file_name;

    const directUrl =
        normalizeFileUrl(
            yorum?.dosya_url ||
            yorum?.dosya_link ||
            yorum?.dosya_path ||
            yorum?.ek_url ||
            yorum?.ek_link ||
            yorum?.attachment_url ||
            yorum?.file_url
        ) || "";

    if (directName || directUrl) {
        files.push({
            name: directName || directUrl.split("/").pop() || "Ek dosya",
            url: directUrl,
        });
    }

    if (Array.isArray(yorum?.dosyalar)) {
        yorum.dosyalar.forEach((item, index) => {
            const itemUrl =
                normalizeFileUrl(
                    item?.url || item?.link || item?.path || item?.dosya_url
                ) || "";

            const itemName =
                item?.ad ||
                item?.dosya_adi ||
                item?.name ||
                (itemUrl ? itemUrl.split("/").pop() : `Ek dosya ${index + 1}`);

            if (itemName || itemUrl) {
                files.push({
                    name: itemName || `Ek dosya ${index + 1}`,
                    url: itemUrl,
                });
            }
        });
    }

    return files.filter(
        (file, index, arr) =>
            (file.name || file.url) &&
            arr.findIndex((x) => x.name === file.name && x.url === file.url) === index
    );
}

export default function TalepDetayPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [talep, setTalep] = useState(null);
    const [yorumlar, setYorumlar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [yorumLoading, setYorumLoading] = useState(true);
    const [error, setError] = useState("");
    const [yorumError, setYorumError] = useState("");

    const [durumSaving, setDurumSaving] = useState(false);
    const [oncelikSaving, setOncelikSaving] = useState(false);

    const [yorumSubmitting, setYorumSubmitting] = useState(false);
    const [newYorum, setNewYorum] = useState("");

    const [ekIstekSubmitting, setEkIstekSubmitting] = useState(false);
    const [ekIstekText, setEkIstekText] = useState("");
    const [ekIstekDosya, setEkIstekDosya] = useState(null);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                setLoading(true);
                setError("");
                setYorumError("");
                setYorumLoading(true);

                const talepData = await getTalepById(id);
                if (!active) return;
                setTalep(talepData);

                try {
                    const yorumData = await getTalepYorumlari(id);
                    if (!active) return;
                    setYorumlar(Array.isArray(yorumData) ? yorumData : []);
                } catch (err) {
                    console.error("Yorumlar yüklenemedi:", err);
                    if (!active) return;
                    setYorumlar([]);
                    setYorumError(err?.message || "Yorumlar yüklenemedi.");
                } finally {
                    if (active) setYorumLoading(false);
                }
            } catch (err) {
                console.error("Talep yüklenemedi:", err);
                if (!active) return;
                setError(err?.message || "Talep yüklenemedi.");
            } finally {
                if (active) setLoading(false);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, [id]);

    const badgeDurum = useMemo(() => talep?.durum || "Beklemede", [talep]);
    const badgeOncelik = useMemo(() => talep?.oncelik || "-", [talep]);
    const anaTalepDosyasi = useMemo(() => getTalepDosyaBilgisi(talep), [talep]);

    async function refreshYorumlar() {
        try {
            const yorumData = await getTalepYorumlari(id);
            setYorumlar(Array.isArray(yorumData) ? yorumData : []);
            setYorumError("");
        } catch (err) {
            console.error("Yorumlar yenilenemedi:", err);
            setYorumError(err?.message || "Yorumlar yüklenemedi.");
        }
    }

    async function handleDurumChange(nextDurum) {
        if (!talep?.id || nextDurum === talep?.durum) return;

        try {
            setDurumSaving(true);

            const updated = await updateTalep(talep.id, {
                durum: nextDurum,
            });

            setTalep(updated);
        } catch (err) {
            console.error("Durum güncellenemedi:", err);
            alert(err?.message || "Durum güncellenemedi.");
        } finally {
            setDurumSaving(false);
        }
    }

    async function handleOncelikChange(nextOncelik) {
        if (!talep?.id || nextOncelik === talep?.oncelik) return;

        try {
            setOncelikSaving(true);

            const updated = await updateTalep(talep.id, {
                oncelik: nextOncelik,
            });

            setTalep(updated);
        } catch (err) {
            console.error("Öncelik güncellenemedi:", err);
            alert(err?.message || "Öncelik güncellenemedi.");
        } finally {
            setOncelikSaving(false);
        }
    }

    async function handleYorumSubmit() {
        const text = newYorum.trim();

        if (!text) {
            alert("Yorum alanı boş bırakılamaz.");
            return;
        }

        try {
            setYorumSubmitting(true);
            setYorumError("");

            await createTalepYorumu({
                talep_id: id,
                yorum: text,
            });

            setNewYorum("");
            await refreshYorumlar();
        } catch (err) {
            console.error("Yorum eklenemedi:", err);
            setYorumError(err?.message || "Yorum eklenemedi.");
        } finally {
            setYorumSubmitting(false);
        }
    }

    async function handleEkIstekSubmit() {
        const cleanText = ekIstekText.trim();

        if (!cleanText && !ekIstekDosya) {
            alert("Ek istek açıklaması veya dosya seçmelisin.");
            return;
        }

        try {
            setEkIstekSubmitting(true);
            setYorumError("");

            await createTalepYorumu({
                talep_id: id,
                yorum: cleanText || "Ek dosya eklendi.",
                dosya: ekIstekDosya || null,
            });

            setEkIstekText("");
            setEkIstekDosya(null);

            const fileInput = document.querySelector(".tdp-hidden-file");
            if (fileInput) fileInput.value = "";

            await refreshYorumlar();
        } catch (err) {
            console.error("Ek istek gönderilemedi:", err);
            setYorumError(err?.message || "Ek istek gönderilemedi.");
        } finally {
            setEkIstekSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="tdp-page-state">
                <div className="tdp-loader" />
                <p>Talep detayı yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="tdp-page-state">
                <h2>Bir sorun oluştu</h2>
                <p>{error}</p>
                <button
                    type="button"
                    className="tdp-btn tdp-btn--primary"
                    onClick={() => navigate("/talepler")}
                >
                    Listeye dön
                </button>
            </div>
        );
    }

    if (!talep) {
        return (
            <div className="tdp-page-state">
                <h2>Talep bulunamadı</h2>
                <button
                    type="button"
                    className="tdp-btn tdp-btn--primary"
                    onClick={() => navigate("/talepler")}
                >
                    Listeye dön
                </button>
            </div>
        );
    }

    return (
        <div className="tdp-shell">
            <div className="tdp-page">
                <section className="tdp-hero">
                    <div className="tdp-hero__left">
                        <div className="tdp-hero__top">
                            <button
                                type="button"
                                className="tdp-back-btn"
                                onClick={() => navigate("/talepler")}
                            >
                                ← Taleplere Dön
                            </button>

                            <div className="tdp-id-chip">#{String(talep.id).slice(-6)}</div>
                        </div>

                        <span className="tdp-eyebrow">Talep Detayı</span>
                        <h1 className="tdp-title">{talep.baslik || "Başlıksız talep"}</h1>
                        <p className="tdp-subtitle">
                            Talebin detaylarını inceleyin, durumunu güncelleyin, dosyaları
                            görüntüleyin ve ek istek gönderin.
                        </p>

                        <div className="tdp-badges">
                            <span className="tdp-badge" data-status={badgeDurum}>
                                {badgeDurum}
                            </span>

                            <span
                                className="tdp-priority"
                                data-priority={String(badgeOncelik).toLowerCase()}
                            >
                                {badgeOncelik}
                            </span>
                        </div>
                    </div>

                    <div className="tdp-hero__right">
                        <div className="tdp-summary-card">
                            <span>Oluşturan</span>
                            <strong>{getTalepSahibi(talep)}</strong>
                        </div>

                        <div className="tdp-summary-card">
                            <span>Talep Türü</span>
                            <strong>{talep?.talep_turu || "-"}</strong>
                        </div>

                        <div className="tdp-summary-card">
                            <span>Oluşturulma Tarihi</span>
                            <strong>
                                {formatDate(talep?.olusturulma_tarihi || talep?.created_at)}
                            </strong>
                        </div>

                        <div className="tdp-summary-card">
                            <span>İstenilen Tarih</span>
                            <strong>
                                {talep?.istenilen_tarih
                                    ? formatDate(talep?.istenilen_tarih)
                                    : "-"}
                            </strong>
                        </div>
                    </div>
                </section>

                <div className="tdp-layout">
                    <main className="tdp-main">
                        <section className="tdp-panel">
                            <div className="tdp-panel__head">
                                <div>
                                    <h2 className="tdp-panel__title">Talep Açıklaması</h2>
                                    <p className="tdp-panel__hint">
                                        Talep detayları aşağıda yer alır.
                                    </p>
                                </div>
                            </div>

                            <div className="tdp-content-box">
                                {talep?.aciklama ? (
                                    <p className="tdp-description">{talep.aciklama}</p>
                                ) : (
                                    <p className="tdp-muted">Açıklama bulunmuyor.</p>
                                )}
                            </div>
                        </section>

                        <section className="tdp-panel">
                            <div className="tdp-panel__head">
                                <div>
                                    <h2 className="tdp-panel__title">Eklenmiş Dosyalar</h2>
                                    <p className="tdp-panel__hint">
                                        Talebe ait mevcut dosyaları burada görebilirsin.
                                    </p>
                                </div>
                            </div>

                            {anaTalepDosyasi ? (
                                <div className="tdp-file-list">
                                    <div className="tdp-file-card">
                                        <div className="tdp-file-card__icon">📎</div>
                                        <div className="tdp-file-card__content">
                                            {anaTalepDosyasi.url ? (
                                                <a
                                                    href={anaTalepDosyasi.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="tdp-file-link"
                                                >
                                                    {anaTalepDosyasi.name}
                                                </a>
                                            ) : (
                                                <strong>{anaTalepDosyasi.name}</strong>
                                            )}
                                            <span>Ana talep eki</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="tdp-empty">
                                    Bu talebe ait kayıtlı dosya bulunmuyor.
                                </div>
                            )}
                        </section>

                        <section className="tdp-panel">
                            <div className="tdp-panel__head">
                                <div>
                                    <h2 className="tdp-panel__title">Ek İstek Gönder</h2>
                                    <p className="tdp-panel__hint">
                                        Talebe yeni bir not, ek açıklama veya dosya talebi
                                        iletebilirsin.
                                    </p>
                                </div>
                            </div>

                            <div className="tdp-extra-request">
                                <textarea
                                    className="tdp-textarea"
                                    rows="5"
                                    placeholder="Ek isteğini detaylı şekilde yaz..."
                                    value={ekIstekText}
                                    onChange={(e) => setEkIstekText(e.target.value)}
                                />

                                <div className="tdp-upload-box">
                                    <label className="tdp-upload-label">
                                        <input
                                            type="file"
                                            className="tdp-hidden-file"
                                            onChange={(e) => setEkIstekDosya(e.target.files?.[0] || null)}
                                        />
                                        <span className="tdp-upload-btn">Dosya Seç</span>
                                        <span className="tdp-upload-name">
                                            {ekIstekDosya?.name || "Henüz dosya seçilmedi"}
                                        </span>
                                    </label>
                                </div>

                                <div className="tdp-comment-form__actions">
                                    <span className="tdp-char-count">{ekIstekText.length} karakter</span>

                                    <button
                                        type="button"
                                        className="tdp-btn tdp-btn--primary"
                                        onClick={handleEkIstekSubmit}
                                        disabled={ekIstekSubmitting}
                                    >
                                        {ekIstekSubmitting ? "Gönderiliyor..." : "Ek İstek Gönder"}
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="tdp-panel">
                            <div className="tdp-panel__head">
                                <div>
                                    <h2 className="tdp-panel__title">Yorumlar</h2>
                                    <p className="tdp-panel__hint">
                                        Talep ile ilgili notlar ve yorum geçmişi.
                                    </p>
                                </div>
                            </div>

                            <div className="tdp-comment-form">
                                <textarea
                                    className="tdp-textarea"
                                    rows="4"
                                    placeholder="Yorum yaz..."
                                    value={newYorum}
                                    onChange={(e) => setNewYorum(e.target.value)}
                                />

                                <div className="tdp-comment-form__actions">
                                    <span className="tdp-char-count">{newYorum.length} karakter</span>

                                    <button
                                        type="button"
                                        className="tdp-btn tdp-btn--primary"
                                        onClick={handleYorumSubmit}
                                        disabled={yorumSubmitting}
                                    >
                                        {yorumSubmitting ? "Ekleniyor..." : "Yorum Ekle"}
                                    </button>
                                </div>
                            </div>

                            {yorumError && (
                                <div className="tdp-alert tdp-alert--error">{yorumError}</div>
                            )}

                            {yorumLoading ? (
                                <div className="tdp-empty">Yorumlar yükleniyor...</div>
                            ) : yorumlar.length === 0 ? (
                                <div className="tdp-empty">Henüz yorum bulunmuyor.</div>
                            ) : (
                                <div className="tdp-comment-list">
                                    {yorumlar.map((yorum, index) => {
                                        const yorumEkleri = getYorumEkleri(yorum);

                                        return (
                                            <article key={yorum.id || index} className="tdp-comment-card">
                                                <div className="tdp-comment-card__top">
                                                    <div>
                                                        <strong>{getYorumYazari(yorum, index)}</strong>
                                                        <span>
                                                            {formatDate(
                                                                yorum?.olusturma_tarihi || yorum?.created_at
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p>{getYorumMetni(yorum)}</p>

                                                {yorumEkleri.length > 0 && (
                                                    <div className="tdp-file-list" style={{ marginTop: 12 }}>
                                                        {yorumEkleri.map((file, fileIndex) => (
                                                            <div
                                                                key={`${yorum.id || index}-file-${fileIndex}`}
                                                                className="tdp-file-card"
                                                            >
                                                                <div className="tdp-file-card__icon">📎</div>
                                                                <div className="tdp-file-card__content">
                                                                    {file.url ? (
                                                                        <a
                                                                            href={file.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="tdp-file-link"
                                                                        >
                                                                            {file.name}
                                                                        </a>
                                                                    ) : (
                                                                        <strong>{file.name}</strong>
                                                                    )}
                                                                    <span>Yorum eki</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </main>

                    <aside className="tdp-side">
                        <section className="tdp-panel">
                            <div className="tdp-panel__head">
                                <div>
                                    <h2 className="tdp-panel__title">Hızlı İşlemler</h2>
                                    <p className="tdp-panel__hint">
                                        Talep durumunu buradan güncelleyebilirsin.
                                    </p>
                                </div>
                            </div>

                            <div className="tdp-field">
                                <label className="tdp-label">Durum</label>
                                <select
                                    className="tdp-select"
                                    value={talep?.durum || "Beklemede"}
                                    onChange={(e) => handleDurumChange(e.target.value)}
                                    disabled={durumSaving}
                                >
                                    {DURUM_OPTIONS.map((durum) => (
                                        <option key={durum} value={durum}>
                                            {durum}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="tdp-field">
                                <label className="tdp-label">Öncelik</label>
                                <select
                                    className="tdp-select"
                                    value={talep?.oncelik || "Orta"}
                                    onChange={(e) => handleOncelikChange(e.target.value)}
                                    disabled={oncelikSaving}
                                >
                                    {ONCELIK_OPTIONS.map((oncelik) => (
                                        <option key={oncelik} value={oncelik}>
                                            {oncelik}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </section>

                        <section className="tdp-panel">
                            <div className="tdp-panel__head">
                                <div>
                                    <h2 className="tdp-panel__title">Bilgiler</h2>
                                    <p className="tdp-panel__hint">Kayıt meta bilgileri.</p>
                                </div>
                            </div>

                            <div className="tdp-info-list">
                                <div className="tdp-info-item">
                                    <span>Talep No</span>
                                    <strong>#{String(talep.id).slice(-8)}</strong>
                                </div>

                                <div className="tdp-info-item">
                                    <span>Oluşturan</span>
                                    <strong>{getTalepSahibi(talep)}</strong>
                                </div>

                                <div className="tdp-info-item">
                                    <span>Talep Türü</span>
                                    <strong>{talep?.talep_turu || "-"}</strong>
                                </div>

                                <div className="tdp-info-item">
                                    <span>Dosya</span>
                                    <strong>{anaTalepDosyasi?.name || "-"}</strong>
                                </div>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
}