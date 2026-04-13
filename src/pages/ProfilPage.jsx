import { useEffect, useMemo, useState } from "react";
import { getAktifKullanici } from "../lib/queries/kullanicilar";

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("tr-TR");
}

function getDisplayName(user) {
    return (
        user?.ad_soyad ||
        `${user?.ad || ""} ${user?.soyad || ""}`.trim() ||
        user?.kullanici_adi ||
        user?.eposta ||
        "Bilinmeyen kullanýcý"
    );
}

export default function ProfilPage() {
    const [loading, setLoading] = useState(true);
    const [kullanici, setKullanici] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProfile() {
            try {
                setLoading(true);
                setError("");

                const data = await getAktifKullanici();
                setKullanici(data || null);
            } catch (err) {
                console.error("Profil yüklenemedi:", err);
                setError("Profil bilgileri alýnamadý.");
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    const fullName = useMemo(() => getDisplayName(kullanici), [kullanici]);

    if (loading) {
        return (
            <div className="module-page">
                <div className="status-box">Profil yükleniyor...</div>
            </div>
        );
    }

    if (!kullanici) {
        return (
            <div className="module-page">
                <div className="status-box warning-box">
                    Aktif kullanýcý bulunamadý. Oturum veya kullanýcý tablosu eþleþmesini kontrol et.
                </div>
            </div>
        );
    }

    return (
        <div className="module-page">
            <div className="module-page-header">
                <div>
                    <p className="eyebrow">Kullanýcý Alaný</p>
                    <h1 className="module-page-title">Profil & Ayarlar</h1>
                    <p className="module-page-subtitle">
                        Hesap bilgilerini, birim iliþkini ve sistem görünürlüðünü buradan takip et.
                    </p>
                </div>
            </div>

            {error ? <div className="status-box error-box">{error}</div> : null}

            <div className="profile-page-grid">
                <div className="profile-hero-card">
                    <div className="profile-avatar">
                        {fullName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="profile-hero-content">
                        <p className="profile-label">Aktif Kullanýcý</p>
                        <h2>{fullName}</h2>
                        <p className="profile-muted">
                            {kullanici?.kullanici_adi || "-"} · {kullanici?.eposta || "-"}
                        </p>

                        <div className="profile-badge-row">
                            <span className="badge">{kullanici?.rol || "user"}</span>
                            <span className={kullanici?.aktif ? "badge" : "badge badge-muted"}>
                                {kullanici?.aktif ? "Aktif" : "Pasif"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="profile-info-grid">
                    <div className="profile-info-card">
                        <span className="profile-label">Ad</span>
                        <strong>{kullanici?.ad || "-"}</strong>
                    </div>

                    <div className="profile-info-card">
                        <span className="profile-label">Soyad</span>
                        <strong>{kullanici?.soyad || "-"}</strong>
                    </div>

                    <div className="profile-info-card">
                        <span className="profile-label">Kullanýcý Adý</span>
                        <strong>{kullanici?.kullanici_adi || "-"}</strong>
                    </div>

                    <div className="profile-info-card">
                        <span className="profile-label">E-posta</span>
                        <strong>{kullanici?.eposta || "-"}</strong>
                    </div>

                    <div className="profile-info-card">
                        <span className="profile-label">Rol</span>
                        <strong>{kullanici?.rol || "-"}</strong>
                    </div>

                    <div className="profile-info-card">
                        <span className="profile-label">Birim ID</span>
                        <strong>{kullanici?.birim_unvan_id || "-"}</strong>
                    </div>
                </div>

                <div className="profile-detail-grid">
                    <div className="profile-section-card">
                        <div className="panel-header">
                            <h3>Birim & Ünvan</h3>
                            <span className="badge">Organizasyon</span>
                        </div>

                        <div className="detail-list">
                            <div className="detail-row">
                                <span>Birim</span>
                                <strong>{kullanici?.birim_unvanlar?.birim || "-"}</strong>
                            </div>

                            <div className="detail-row">
                                <span>Ünvan</span>
                                <strong>{kullanici?.birim_unvanlar?.unvan || "-"}</strong>
                            </div>

                            <div className="detail-row">
                                <span>Birim aktif mi?</span>
                                <strong>{kullanici?.birim_unvanlar?.aktif ? "Evet" : "Hayýr"}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="profile-section-card">
                        <div className="panel-header">
                            <h3>Hesap Zamanlarý</h3>
                            <span className="badge">Kayýt</span>
                        </div>

                        <div className="detail-list">
                            <div className="detail-row">
                                <span>Son Giriþ</span>
                                <strong>{formatDate(kullanici?.son_giris)}</strong>
                            </div>

                            <div className="detail-row">
                                <span>Oluþturulma</span>
                                <strong>{formatDate(kullanici?.olusturma_tarihi)}</strong>
                            </div>

                            <div className="detail-row">
                                <span>Son Güncelleme</span>
                                <strong>{formatDate(kullanici?.guncelleme_tarihi)}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="profile-section-card">
                        <div className="panel-header">
                            <h3>Sistem Görünümü</h3>
                            <span className="badge">Bilgi</span>
                        </div>

                        <div className="info-card">
                            <strong>Yetki Özeti</strong>
                            <p>
                                Bu kullanýcý rol ve birim bilgisine göre görev ve talep modüllerinde
                                görünürlük kazanýr. Ayný birim eþleþmesi bulunan görevlerde düzenleme
                                yetkisi açýlabilir.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}