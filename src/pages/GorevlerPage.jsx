import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getGorevler, updateGorev } from "../lib/queries/gorevler";
import { getAktifKullanici } from "../lib/queries/kullanicilar";
import { canCreateTask } from "../lib/utils/permissions";
import {
    getGorevDurumlari,
    createGorevDurumu,
    deleteGorevDurumu,
} from "../lib/queries/gorevDurumlari";
import "../styles/gorevler.css";
import "../styles/gorev-form.css";

function formatDate(value) {
    if (!value) return "-";

    try {
        return new Date(value).toLocaleDateString("tr-TR");
    } catch {
        return value;
    }
}

function getDurumLabel(durum, tumDurumlar = []) {
    const ozelDurum = (tumDurumlar || []).find(
        (item) => item.kod === durum || item.value === durum || item.slug === durum
    );

    if (ozelDurum?.ad) {
        return ozelDurum.ad;
    }

    switch (durum) {
        case "acik":
            return "Açık";
        case "beklemede":
            return "Beklemede";
        case "tamamlandi":
            return "Tamamlandı";
        case "iptal":
            return "İptal";
        case "gecikti":
            return "Gecikti";
        default:
            return durum || "-";
    }
}

function getOncelikLabel(oncelik) {
    switch (oncelik) {
        case "rutin":
            return "Rutin";
        case "dusuk":
            return "Düşük";
        case "orta":
            return "Orta";
        case "yuksek":
            return "Yüksek";
        case "kritik":
            return "Kritik";
        default:
            return oncelik || "-";
    }
}

function getDurumBadgeClass(durum) {
    switch (durum) {
        case "acik":
            return {
                background: "var(--badge-acik-bg)",
                color: "var(--badge-acik-text)",
                borderColor: "transparent",
            };
        case "beklemede":
            return {
                background: "var(--badge-beklemede-bg)",
                color: "var(--badge-beklemede-text)",
                borderColor: "transparent",
            };
        case "tamamlandi":
            return {
                background: "var(--badge-tamam-bg)",
                color: "var(--badge-tamam-text)",
                borderColor: "transparent",
            };
        case "iptal":
            return {
                background: "var(--badge-iptal-bg)",
                color: "var(--badge-iptal-text)",
                borderColor: "transparent",
            };
        case "gecikti":
            return {
                background: "var(--badge-gecik-bg)",
                color: "var(--badge-gecik-text)",
                borderColor: "transparent",
            };
        default:
            return {
                background: "var(--g-surface-2)",
                color: "var(--g-text)",
                borderColor: "transparent",
            };
    }
}

function getOncelikBadgeStyle(oncelik) {
    switch (oncelik) {
        case "kritik":
            return {
                background: "var(--badge-gecik-bg)",
                color: "var(--badge-gecik-text)",
            };
        case "yuksek":
            return {
                background: "var(--badge-beklemede-bg)",
                color: "var(--badge-beklemede-text)",
            };
        case "orta":
            return {
                background: "var(--g-surface-2)",
                color: "var(--g-text)",
            };
        default:
            return {
                background: "var(--g-surface-2)",
                color: "var(--g-text)",
            };
    }
}

function getDurumBorder(durum) {
    switch (durum) {
        case "acik":
            return "#3b82f6";
        case "beklemede":
            return "#f59e0b";
        case "tamamlandi":
            return "#22c55e";
        case "iptal":
            return "#9ca3af";
        case "gecikti":
            return "#ef4444";
        default:
            return "#cbd5e1";
    }
}

function isTaskLate(gorev) {
    if (!gorev?.bitis_tarih) return false;
    if (gorev?.durum === "tamamlandi" || gorev?.durum === "iptal") return false;

    const now = new Date();
    const end = new Date(gorev.bitis_tarih);

    return end < now;
}

function Badge({ children, style }) {
    return (
        <span
            className="gorev-badge"
            style={{
                background: style?.background,
                color: style?.color,
                borderColor: style?.borderColor,
            }}
        >
            {children}
        </span>
    );
}

function StatCard({ title, value, helper }) {
    return (
        <div className="gorev-stat gorev-stat--minimal">
            <div className="gorev-stat__topline">{title}</div>
            <div className="gorev-stat__value">{value}</div>
            {helper ? <div className="gorev-stat__helper">{helper}</div> : null}
        </div>
    );
}

function getGorunenDurum(gorev) {
    return gorev?.durum || "";
}

export default function GorevlerPage() {
    const navigate = useNavigate();

    const [gorevler, setGorevler] = useState([]);
    const [aktifKullanici, setAktifKullanici] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState("");
    const [durumlar, setDurumlar] = useState([]);
    const [ozelDurumlar, setOzelDurumlar] = useState([]);
    const [yeniDurumText, setYeniDurumText] = useState("");

    const [arama, setArama] = useState("");
    const [durumFilter, setDurumFilter] = useState("tum");
    const [oncelikFilter, setOncelikFilter] = useState("tum");
    const [atananFilter, setAtananFilter] = useState("tum");
    const [sortBy, setSortBy] = useState("created_desc");

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError("");

                const [user, gorevData, durumData] = await Promise.all([
                    getAktifKullanici(),
                    getGorevler(),
                    getGorevDurumlari(),
                ]);

                setAktifKullanici(user || null);
                setGorevler(gorevData || []);
                setDurumlar(durumData || []);
                setOzelDurumlar(durumData || []);
            } catch (err) {
                console.error("Görevler yüklenemedi:", err);
                setError("Görevler yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel("gorevler-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "gorevler",
                },
                async () => {
                    try {
                        const updated = await getGorevler();
                        setGorevler(updated || []);
                    } catch (err) {
                        console.error("Görevler realtime yenilenemedi:", err);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel("gorev-durumlari-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "gorev_durumlari",
                },
                async () => {
                    try {
                        const updatedDurumlar = await getGorevDurumlari();
                        setDurumlar(updatedDurumlar || []);
                        setOzelDurumlar(updatedDurumlar || []);
                    } catch (err) {
                        console.error("Durumlar realtime yenilenemedi:", err);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const tumDurumlar = useMemo(() => {
        return Array.isArray(durumlar) ? durumlar : [];
    }, [durumlar]);

    const atananKisiler = useMemo(() => {
        const map = new Map();

        (gorevler || []).forEach((g) => {
            const kisi = g.atanan_kullanici;
            if (!kisi?.id) return;

            const label =
                kisi.ad_soyad ||
                `${kisi.ad || ""} ${kisi.soyad || ""}`.trim() ||
                "Bilinmeyen Kullanıcı";

            map.set(kisi.id, {
                id: kisi.id,
                label,
            });
        });

        return Array.from(map.values()).sort((a, b) =>
            a.label.localeCompare(b.label, "tr")
        );
    }, [gorevler]);

    const filteredGorevler = useMemo(() => {
        let result = [...(gorevler || [])];

        result = result.filter((g) => {
            const aktifId = String(aktifKullanici?.id || "").trim();
            const gorunurluk = String(g.gorunurluk || "").trim().toLowerCase();
            const atananId = String(g.atanan_kullanici_id || "").trim();

            const ekSorumlular = Array.isArray(g.sorumlu_kullanicilar)
                ? g.sorumlu_kullanicilar.map((x) => String(x).trim()).filter(Boolean)
                : [];

            const kullaniciGorebilir =
                gorunurluk === "tum" ||
                (gorunurluk === "ekip" &&
                    (atananId === aktifId || ekSorumlular.includes(aktifId))) ||
                (gorunurluk === "bireysel" &&
                    (atananId === aktifId || ekSorumlular.includes(aktifId)));

            if (!kullaniciGorebilir) return false;

            const searchText = arama.trim().toLowerCase();
            const gorunenDurum = getGorunenDurum(g);

            const matchesSearch =
                !searchText ||
                g.baslik?.toLowerCase().includes(searchText) ||
                g.aciklama?.toLowerCase().includes(searchText) ||
                g.birim?.toLowerCase().includes(searchText);

            const matchesDurum =
                durumFilter === "tum" || gorunenDurum === durumFilter;

            const matchesOncelik =
                oncelikFilter === "tum" || g.oncelik === oncelikFilter;

            const matchesAtanan =
                atananFilter === "tum" ||
                String(g.atanan_kullanici_id || "").trim() === atananFilter;

            return matchesSearch && matchesDurum && matchesOncelik && matchesAtanan;
        });

        result.sort((a, b) => {
            switch (sortBy) {
                case "created_asc":
                    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                case "bitis_asc":
                    return new Date(a.bitis_tarih || 0) - new Date(b.bitis_tarih || 0);
                case "bitis_desc":
                    return new Date(b.bitis_tarih || 0) - new Date(a.bitis_tarih || 0);
                case "baslik_asc":
                    return (a.baslik || "").localeCompare(b.baslik || "", "tr");
                case "baslik_desc":
                    return (b.baslik || "").localeCompare(a.baslik || "", "tr");
                case "created_desc":
                default:
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            }
        });

        return result;
    }, [
        gorevler,
        aktifKullanici,
        arama,
        durumFilter,
        oncelikFilter,
        atananFilter,
        sortBy,
    ]);

    const stats = useMemo(() => {
        const source = gorevler || [];

        return {
            toplam: source.length,
            acik: source.filter((g) => getGorunenDurum(g) === "acik").length,
            beklemede: source.filter((g) => getGorunenDurum(g) === "beklemede").length,
            tamamlandi: source.filter((g) => getGorunenDurum(g) === "tamamlandi").length,
            kritik: source.filter((g) => g.oncelik === "kritik").length,
            geciken: source.filter((g) => isTaskLate(g)).length,
        };
    }, [gorevler]);

    function resetFilters() {
        setArama("");
        setDurumFilter("tum");
        setOncelikFilter("tum");
        setAtananFilter("tum");
        setSortBy("created_desc");
    }

    async function handleDurumChange(gorev, yeniDurum) {
        if (!gorev?.id || !yeniDurum) return;

        const mevcutDurum = getGorunenDurum(gorev);
        if (mevcutDurum === yeniDurum) return;

        try {
            setUpdatingId(gorev.id);

            const updated = await updateGorev(gorev.id, {
                durum: yeniDurum,
            });

            setGorevler((prev) =>
                prev.map((item) =>
                    item.id === gorev.id
                        ? {
                            ...item,
                            ...updated,
                            durum: updated?.durum || yeniDurum,
                        }
                        : item
                )
            );
        } catch (err) {
            console.error("Durum güncellenemedi:", err);
            alert(err?.message || "Durum güncellenemedi.");
        } finally {
            setUpdatingId("");
        }
    }

    async function handleOzelDurumEkle() {
        const ad = yeniDurumText.trim();
        if (!ad) return;

        try {
            await createGorevDurumu(ad);
            const updatedDurumlar = await getGorevDurumlari();
            setDurumlar(updatedDurumlar || []);
            setOzelDurumlar(updatedDurumlar || []);
            setYeniDurumText("");
        } catch (err) {
            console.error("Durum eklenemedi:", err);
            alert(err?.message || "Durum eklenemedi.");
        }
    }

    async function handleOzelDurumSil(kod) {
        const item = ozelDurumlar.find((x) => x.kod === kod);
        const ad = item?.ad || kod;

        const confirmed = window.confirm(
            `"${ad}" durumunu silmek istediğinize emin misiniz?`
        );

        if (!confirmed) return;

        try {
            await deleteGorevDurumu(kod);
            const updatedDurumlar = await getGorevDurumlari();
            setDurumlar(updatedDurumlar || []);
            setOzelDurumlar(updatedDurumlar || []);
        } catch (err) {
            console.error("Durum silinemedi:", err);
            alert(err?.message || "Durum silinemedi.");
        }
    }

    if (loading) {
        return (
            <div className="gorev-page">
                <div className="gorev-loading">Görevler yükleniyor...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="gorev-page">
                <div className="gorev-error">{error}</div>
            </div>
        );
    }

    return (
        <div className="gorev-page">
            <section className="gorev-toolbar">
                <div className="gorev-toolbar__left">
                    <div className="gorev-toolbar__title-wrap">
                        <p className="gorev-toolbar__eyebrow">Görev Yönetimi</p>
                        <h1 className="gorev-toolbar__title">Görevler</h1>
                    </div>
                </div>

                <div className="gorev-toolbar__right">
                    <button
                        type="button"
                        className="gorev-btn gorev-btn--secondary"
                        onClick={resetFilters}
                    >
                        Filtreleri Temizle
                    </button>

                    {canCreateTask(aktifKullanici) && (
                        <button
                            type="button"
                            className="gorev-btn gorev-btn--primary"
                            onClick={() => navigate("/gorevler/yeni")}
                        >
                            + Yeni Görev
                        </button>
                    )}
                </div>
            </section>

            <section className="gorev-stats gorev-stats--compact">
                <StatCard title="Toplam" value={stats.toplam} />
                <StatCard title="Açık" value={stats.acik} />
                <StatCard title="Beklemede" value={stats.beklemede} />
                <StatCard title="Tamamlanan" value={stats.tamamlandi} />
                <StatCard title="Kritik" value={stats.kritik} />
                <StatCard
                    title="Geciken"
                    value={stats.geciken}
                    helper="Tarihi geçen işler"
                />
            </section>

            <section className="gorev-filters gorev-filters--modern">
                <div className="gorev-filters__head">
                    <div>
                        <h2 className="gorev-filters__title">Filtreler</h2>
                        <p className="gorev-filters__sub">
                            Görevleri arayın, süzün ve hızlıca düzenleyin.
                        </p>
                    </div>
                </div>

                <div className="gorev-filter-grid gorev-filter-grid--modern">
                    <div className="gorev-field-wrap gorev-field-wrap--search">
                        <label className="gorev-field-label">Arama</label>
                        <input
                            className="gorev-input"
                            type="text"
                            placeholder="Başlık, açıklama veya birim ara..."
                            value={arama}
                            onChange={(e) => setArama(e.target.value)}
                        />
                    </div>

                    <div className="gorev-field-wrap">
                        <label className="gorev-field-label">Durum</label>
                        <select
                            className="gorev-select"
                            value={durumFilter}
                            onChange={(e) => setDurumFilter(e.target.value)}
                        >
                            <option value="tum">Tüm Durumlar</option>
                            {tumDurumlar.map((durum) => (
                                <option key={durum.kod} value={durum.kod}>
                                    {durum.ad}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="gorev-field-wrap">
                        <label className="gorev-field-label">Öncelik</label>
                        <select
                            className="gorev-select"
                            value={oncelikFilter}
                            onChange={(e) => setOncelikFilter(e.target.value)}
                        >
                            <option value="tum">Tüm Öncelikler</option>
                            <option value="rutin">Rutin</option>
                            <option value="dusuk">Düşük</option>
                            <option value="orta">Orta</option>
                            <option value="yuksek">Yüksek</option>
                            <option value="kritik">Kritik</option>
                        </select>
                    </div>

                    <div className="gorev-field-wrap">
                        <label className="gorev-field-label">Atanan</label>
                        <select
                            className="gorev-select"
                            value={atananFilter}
                            onChange={(e) => setAtananFilter(e.target.value)}
                        >
                            <option value="tum">Tüm Atamalar</option>
                            {atananKisiler.map((kisi) => (
                                <option key={kisi.id} value={kisi.id}>
                                    {kisi.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="gorev-field-wrap">
                        <label className="gorev-field-label">Sıralama</label>
                        <select
                            className="gorev-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="created_desc">En Yeni Oluşturulan</option>
                            <option value="created_asc">En Eski Oluşturulan</option>
                            <option value="bitis_asc">Bitiş Tarihi Yaklaşan</option>
                            <option value="bitis_desc">Bitiş Tarihi Uzak Olan</option>
                            <option value="baslik_asc">Başlık A-Z</option>
                            <option value="baslik_desc">Başlık Z-A</option>
                        </select>
                    </div>
                </div>

                <div className="gorev-custom-status">
                    <div className="gorev-custom-status__form">
                        <input
                            type="text"
                            className="gorev-input gorev-custom-status__input"
                            placeholder="Global özel durum ekle"
                            value={yeniDurumText}
                            onChange={(e) => setYeniDurumText(e.target.value)}
                        />
                        <button
                            type="button"
                            className="gorev-btn gorev-btn--secondary"
                            onClick={handleOzelDurumEkle}
                            disabled={!yeniDurumText.trim()}
                        >
                            Durum Ekle
                        </button>
                    </div>

                    {ozelDurumlar.length > 0 && (
                        <div className="gorev-custom-status__list">
                            {ozelDurumlar.map((durum) => (
                                <div key={durum.kod} className="gorev-status-chip">
                                    <span className="gorev-status-chip__text">
                                        {durum.ad}
                                    </span>

                                    <button
                                        type="button"
                                        className="gorev-status-chip__remove"
                                        onClick={() => handleOzelDurumSil(durum.kod)}
                                        aria-label={`${durum.ad} durumunu sil`}
                                        title="Durumu sil"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="gorev-list gorev-list--cards gorev-list--modern">
                {filteredGorevler.length === 0 ? (
                    <div className="gorev-empty">
                        Filtrelere uygun görev bulunamadı.
                    </div>
                ) : (
                    filteredGorevler.map((gorev) => {
                        const atananAd =
                            gorev.atanan_kullanici?.ad_soyad ||
                            `${gorev.atanan_kullanici?.ad || ""} ${gorev.atanan_kullanici?.soyad || ""
                                }`.trim() ||
                            "Atama yok";

                        const gecikti = isTaskLate(gorev);
                        const gorunenDurum = getGorunenDurum(gorev);

                        return (
                            <article
                                key={gorev.id}
                                className="gorev-card gorev-card--modern"
                                style={{
                                    "--card-accent": gecikti
                                        ? "#ef4444"
                                        : getDurumBorder(gorunenDurum),
                                }}
                            >
                                <div className="gorev-card__header">
                                    <div className="gorev-card__title-wrap">
                                        <h3 className="gorev-card__title">
                                            {gorev.baslik || "Başlıksız Görev"}
                                        </h3>

                                        <p className="gorev-card__desc">
                                            {gorev.aciklama?.trim()
                                                ? gorev.aciklama
                                                : "Bu görev için açıklama girilmemiş."}
                                        </p>
                                    </div>

                                    <div className="gorev-card__actions-top">
                                        <button
                                            type="button"
                                            className="gorev-btn gorev-btn--ghost"
                                            onClick={() => navigate(`/gorevler/${gorev.id}`)}
                                        >
                                            Detay
                                        </button>
                                    </div>
                                </div>

                                <div className="gorev-card__meta">
                                    <Badge style={getDurumBadgeClass(gorunenDurum)}>
                                        {getDurumLabel(gorunenDurum, tumDurumlar)}
                                    </Badge>

                                    <Badge style={getOncelikBadgeStyle(gorev.oncelik)}>
                                        {getOncelikLabel(gorev.oncelik)}
                                    </Badge>

                                    {gecikti && (
                                        <span className="gorev-badge gorev-badge--danger">
                                            Gecikti
                                        </span>
                                    )}

                                    {gorev.birim ? (
                                        <span className="gorev-badge gorev-badge--soft">
                                            {gorev.birim}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="gorev-card__quick">
                                    <div className="gorev-quick-item gorev-quick-item--wide">
                                        <span className="gorev-quick-item__label">
                                            Durum Güncelle
                                        </span>
                                        <select
                                            className="gorev-select gorev-select--compact"
                                            value={gorunenDurum || ""}
                                            disabled={updatingId === gorev.id}
                                            onChange={(e) =>
                                                handleDurumChange(gorev, e.target.value)
                                            }
                                        >
                                            {tumDurumlar.map((durum) => (
                                                <option key={durum.kod} value={durum.kod}>
                                                    {durum.ad}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="gorev-card__info gorev-card__info--modern">
                                    <div className="gorev-info">
                                        <p className="gorev-info__label">Sorumlu</p>
                                        <p className="gorev-info__value">{atananAd}</p>
                                    </div>

                                    <div className="gorev-info">
                                        <p className="gorev-info__label">Başlangıç</p>
                                        <p className="gorev-info__value">
                                            {formatDate(gorev.baslangic_tarih)}
                                        </p>
                                    </div>

                                    <div className="gorev-info">
                                        <p className="gorev-info__label">Bitiş</p>
                                        <p className="gorev-info__value">
                                            {formatDate(gorev.bitis_tarih)}
                                        </p>
                                    </div>

                                    <div className="gorev-info">
                                        <p className="gorev-info__label">Oluşturulma</p>
                                        <p className="gorev-info__value">
                                            {formatDate(gorev.created_at)}
                                        </p>
                                    </div>
                                </div>

                                <div className="gorev-card__footer">
                                    <button
                                        type="button"
                                        className="gorev-btn gorev-btn--secondary"
                                        onClick={() => navigate(`/gorevler/${gorev.id}`)}
                                    >
                                        Görevi Aç
                                    </button>
                                </div>
                            </article>
                        );
                    })
                )}
            </section>
        </div>
    );
}