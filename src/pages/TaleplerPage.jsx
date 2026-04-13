import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTalepler } from "../lib/queries/talepler";
import { supabase } from "../lib/supabase";
import "../styles/talepler-page.css";

const DURUM_OPTIONS = [
    "Tümü",
    "Beklemede",
    "İnceleniyor",
    "İşlemde",
    "Tamamlandı",
    "Reddedildi",
];

function getTalepSahibi(item) {
    return (
        item?.kullanicilar?.ad_soyad ||
        [item?.kullanicilar?.ad, item?.kullanicilar?.soyad].filter(Boolean).join(" ") ||
        item?.kullanicilar?.kullanici_adi ||
        item?.kullanicilar?.eposta ||
        "-"
    );
}

function getShortId(id) {
    if (!id) return "----";
    return String(id).slice(-4);
}

function getCreatedLabel(dateValue) {
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";

    const now = new Date();

    const isSameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (isSameDay) return "Bugün";

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return "Dün";

    return date.toLocaleDateString("tr-TR");
}

function getDurumCount(talepler, durum) {
    return talepler.filter((item) => (item?.durum || "Beklemede") === durum).length;
}

export default function TaleplerPage() {
    const navigate = useNavigate();

    const [talepler, setTalepler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [durumFilter, setDurumFilter] = useState("Tümü");

    async function loadTalepler() {
        try {
            setError("");
            setLoading(true);
            const data = await getTalepler();
            setTalepler(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Talepler yüklenemedi:", err);
            setError("Talepler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTalepler();
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel("talepler-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "talepler" },
                async () => {
                    try {
                        const data = await getTalepler();
                        setTalepler(Array.isArray(data) ? data : []);
                    } catch (err) {
                        console.error("Realtime veri alınamadı:", err);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredTalepler = useMemo(() => {
        return talepler.filter((item) => {
            const durum = item?.durum || "Beklemede";
            const baslik = item?.baslik || "";
            const olusturan = getTalepSahibi(item);
            const oncelik = item?.oncelik || "";

            const matchesDurum =
                durumFilter === "Tümü" ? true : durum === durumFilter;

            const q = search.trim().toLowerCase();

            const matchesSearch =
                q.length === 0
                    ? true
                    : baslik.toLowerCase().includes(q) ||
                    olusturan.toLowerCase().includes(q) ||
                    oncelik.toLowerCase().includes(q) ||
                    String(item?.id || "").toLowerCase().includes(q);

            return matchesDurum && matchesSearch;
        });
    }, [talepler, search, durumFilter]);

    const stats = useMemo(() => {
        return {
            toplam: talepler.length,
            beklemede: getDurumCount(talepler, "Beklemede"),
            islemde: getDurumCount(talepler, "İşlemde"),
            tamamlandi: getDurumCount(talepler, "Tamamlandı"),
        };
    }, [talepler]);

    if (loading) {
        return (
            <div className="tp-loader-page">
                <div className="tp-loader-card">
                    <div className="tp-loader" />
                    <p>Talep verileri yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tp-page">
            <section className="tp-hero">
                <div className="tp-hero__content">
                    <span className="tp-hero__eyebrow">Yönetim Paneli</span>
                    <h1 className="tp-hero__title">Talep Listesi</h1>
                    <p className="tp-hero__subtitle">
                        Tüm talepleri modern, düzenli ve hızlı yönetilebilir bir görünümde izleyin.
                    </p>
                </div>

                <div className="tp-hero__actions">
                    <button
                        type="button"
                        className="tp-primary-btn"
                        onClick={() => navigate("/talepler/yeni")}
                    >
                        <span className="tp-primary-btn__icon">＋</span>
                        <span>Yeni Talep</span>
                    </button>
                </div>
            </section>

            <section className="tp-stats-grid">
                <article className="tp-stat-card">
                    <div className="tp-stat-card__label">Toplam Talep</div>
                    <div className="tp-stat-card__value">{stats.toplam}</div>
                    <div className="tp-stat-card__hint">Sistemdeki tüm kayıtlar</div>
                </article>

                <article className="tp-stat-card">
                    <div className="tp-stat-card__label">Beklemede</div>
                    <div className="tp-stat-card__value">{stats.beklemede}</div>
                    <div className="tp-stat-card__hint">İşleme alınmayı bekleyenler</div>
                </article>

                <article className="tp-stat-card">
                    <div className="tp-stat-card__label">İşlemde</div>
                    <div className="tp-stat-card__value">{stats.islemde}</div>
                    <div className="tp-stat-card__hint">Aktif olarak yürütülenler</div>
                </article>

                <article className="tp-stat-card">
                    <div className="tp-stat-card__label">Tamamlandı</div>
                    <div className="tp-stat-card__value">{stats.tamamlandi}</div>
                    <div className="tp-stat-card__hint">Sonuçlandırılmış talepler</div>
                </article>
            </section>

            <section className="tp-panel">
                <div className="tp-panel__top">
                    <div>
                        <h2 className="tp-panel__title">Talep Tablosu</h2>
                        <p className="tp-panel__desc">
                            Kayıtları arayın, filtreleyin ve detay sayfasına tek tıkla geçin.
                        </p>
                    </div>

                    <div className="tp-panel__filters">
                        <div className="tp-search">
                            <span className="tp-search__icon">⌕</span>
                            <input
                                type="text"
                                placeholder="Başlık, oluşturan, öncelik veya ID ile ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <select
                            className="tp-select"
                            value={durumFilter}
                            onChange={(e) => setDurumFilter(e.target.value)}
                        >
                            {DURUM_OPTIONS.map((durum) => (
                                <option key={durum} value={durum}>
                                    {durum}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {error ? <div className="tp-error-box">{error}</div> : null}

                <div className="tp-table-wrap">
                    <table className="tp-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Başlık</th>
                                <th>Oluşturan</th>
                                <th>Durum</th>
                                <th>Öncelik</th>
                                <th>Tarih</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredTalepler.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="tp-empty">
                                            <div className="tp-empty__icon">📋</div>
                                            <strong>Kayıt bulunamadı</strong>
                                            <p>Arama veya filtre sonucunda gösterilecek talep yok.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTalepler.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="tp-table__row"
                                        onClick={() => navigate(`/talepler/${item.id}`)}
                                    >
                                        <td>
                                            <span className="tp-id-chip">#{getShortId(item.id)}</span>
                                        </td>

                                        <td>
                                            <div className="tp-title-cell">
                                                <strong>{item.baslik || "Başlıksız talep"}</strong>
                                                <span>Talep kaydı</span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="tp-user-cell">
                                                <div className="tp-user-cell__avatar">
                                                    {getTalepSahibi(item).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="tp-user-cell__meta">
                                                    <strong>{getTalepSahibi(item)}</strong>
                                                    <span>Talep sahibi</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="tp-badge" data-status={item?.durum || "Beklemede"}>
                                                {item?.durum || "Beklemede"}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="tp-priority" data-priority={(item?.oncelik || "").toLowerCase()}>
                                                {item?.oncelik || "-"}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="tp-date">{getCreatedLabel(item?.olusturulma_tarihi)}</span>
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="tp-detail-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/talepler/${item.id}`);
                                                }}
                                            >
                                                Detay
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}