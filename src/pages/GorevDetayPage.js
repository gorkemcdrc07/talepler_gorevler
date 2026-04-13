import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "../lib/supabase";
import {
    getGorevById,
    updateGorev,
    deleteGorev,
} from "../lib/queries/gorevler";
import {
    getDosyalar,
    uploadDosya,
    deleteDosya,
} from "../lib/queries/gorevDosyalar";
import {
    getYorumlar,
    createYorum,
    deleteYorum,
} from "../lib/queries/gorevYorumlar";
import {
    getGorevDurumlari,
    createGorevDurumu,
    deleteGorevDurumu,
} from "../lib/queries/gorevDurumlari";
import { getGorevDurumGecmisi } from "../lib/queries/gorevDurumGecmisi";
import {
    getAktifKullanici,
    getKullanicilar,
} from "../lib/queries/kullanicilar";
import { canCreateTask } from "../lib/utils/permissions";
import { createBildirim } from "../lib/queries/bildirimler";
import { useToast } from "../components/ToastProvider";
import {
    forceDownloadFile,
    getFileActionLabel,
    shouldDownloadFile,
} from "../lib/utils/fileActions";

import "../styles/gorevler.css";
import "../styles/task-form.css";
import "../styles/dosya.css";
import "../styles/yorum.css";
import "../styles/durum.css";

async function safeCreateBildirim(payload) {
    try {
        await createBildirim(payload);
    } catch (err) {
        console.error("Bildirim oluşturulamadı:", err);
    }
}

function formatDate(value) {
    if (!value) return "-";

    try {
        return new Date(value).toLocaleString("tr-TR");
    } catch {
        return value;
    }
}

function formatDateOnly(value) {
    if (!value) return "-";

    try {
        return new Date(value).toLocaleDateString("tr-TR");
    } catch {
        return value;
    }
}

function toDateInputValue(value) {
    if (!value) return "";

    try {
        return new Date(value).toISOString().slice(0, 10);
    } catch {
        return String(value).slice(0, 10);
    }
}

function getDurumLabel(durum) {
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

function getDurumStyle(durum) {
    switch (durum) {
        case "acik":
            return {
                background: "#dbeafe",
                color: "#1d4ed8",
                borderColor: "#93c5fd",
            };
        case "beklemede":
            return {
                background: "#fef3c7",
                color: "#b45309",
                borderColor: "#fcd34d",
            };
        case "tamamlandi":
            return {
                background: "#dcfce7",
                color: "#15803d",
                borderColor: "#86efac",
            };
        case "iptal":
            return {
                background: "#f3f4f6",
                color: "#4b5563",
                borderColor: "#d1d5db",
            };
        case "gecikti":
            return {
                background: "#fee2e2",
                color: "#b91c1c",
                borderColor: "#fca5a5",
            };
        default:
            return {
                background: "#ede9fe",
                color: "#6d28d9",
                borderColor: "#c4b5fd",
            };
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

function getOncelikStyle(oncelik) {
    switch (oncelik) {
        case "rutin":
            return {
                background: "#f3f4f6",
                color: "#374151",
                borderColor: "#d1d5db",
            };
        case "dusuk":
            return {
                background: "#ecfeff",
                color: "#0f766e",
                borderColor: "#99f6e4",
            };
        case "orta":
            return {
                background: "#ede9fe",
                color: "#6d28d9",
                borderColor: "#c4b5fd",
            };
        case "yuksek":
            return {
                background: "#ffedd5",
                color: "#c2410c",
                borderColor: "#fdba74",
            };
        case "kritik":
            return {
                background: "#fee2e2",
                color: "#b91c1c",
                borderColor: "#fca5a5",
            };
        default:
            return {
                background: "#f3f4f6",
                color: "#111827",
                borderColor: "#d1d5db",
            };
    }
}

function isTaskLate(gorev) {
    if (!gorev?.bitis_tarih) return false;
    if (gorev?.durum === "tamamlandi" || gorev?.durum === "iptal") return false;

    const now = new Date();
    const end = new Date(gorev.bitis_tarih);

    return end < now;
}

function getAvatarText(name) {
    if (!name) return "??";

    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("");
}

function getLocalUser() {
    const possibleKeys = [
        "aktifKullanici",
        "kullanici",
        "user",
        "currentUser",
        "authUser",
        "oturum",
    ];

    for (const key of possibleKeys) {
        try {
            const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (!raw) continue;

            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                return parsed;
            }
        } catch {
            // ignore
        }
    }

    return null;
}

function getKullaniciAdSoyad(kullanici) {
    if (!kullanici) return "";

    return (
        kullanici.local_kullanici_ad_soyad ||
        kullanici.ad_soyad ||
        `${kullanici.ad || ""} ${kullanici.soyad || ""}`.trim() ||
        kullanici.yetkili_adi ||
        kullanici.isim ||
        kullanici.name ||
        kullanici.email ||
        kullanici.eposta ||
        ""
    );
}

function buildKullanicilarMap(kullanicilar = []) {
    return (kullanicilar || []).reduce((acc, item) => {
        if (item?.id) {
            acc[item.id] = item;
        }
        return acc;
    }, {});
}

function getYorumDisplayName(yorum, kullanicilarMap = {}, aktifKullanici = null) {
    const yorumIcindekiAd =
        yorum?.yorum_sahibi_ad_soyad ||
        yorum?.local_kullanici_ad_soyad ||
        yorum?.kullanici_ad_soyad ||
        yorum?.ad_soyad ||
        yorum?.yazan_ad_soyad ||
        yorum?.olusturan_ad_soyad ||
        "";

    if (yorumIcindekiAd) return yorumIcindekiAd;

    const relationName = getKullaniciAdSoyad(yorum?.kullanici);
    if (relationName) return relationName;

    const fromMap = yorum?.kullanici_id
        ? getKullaniciAdSoyad(kullanicilarMap[yorum.kullanici_id])
        : "";
    if (fromMap) return fromMap;

    if (aktifKullanici?.id && yorum?.kullanici_id === aktifKullanici.id) {
        return getKullaniciAdSoyad(aktifKullanici) || "Kullanıcı";
    }

    return "Kullanıcı";
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

function SectionCard({ title, desc, right, children }) {
    return (
        <section className="gorev-detail-card">
            <div className="gorev-detail-card__head">
                <div>
                    <h3 className="gorev-detail-card__title">{title}</h3>
                    {desc ? <p className="gorev-detail-card__desc">{desc}</p> : null}
                </div>
                {right}
            </div>
            {children}
        </section>
    );
}

export default function GorevDetayPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [gorev, setGorev] = useState(null);
    const [dosyalar, setDosyalar] = useState([]);
    const [yorumlar, setYorumlar] = useState([]);
    const [durumlar, setDurumlar] = useState([]);
    const [durumGecmisi, setDurumGecmisi] = useState([]);
    const [aktifKullanici, setAktifKullanici] = useState(null);
    const [kullanicilarMap, setKullanicilarMap] = useState({});
    const [ozelDurumlar, setOzelDurumlar] = useState([]);
    const [yorumText, setYorumText] = useState("");
    const [yeniDurumText, setYeniDurumText] = useState("");
    const [seciliDurum, setSeciliDurum] = useState("");

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        baslik: "",
        aciklama: "",
        oncelik: "orta",
        gorunurluk: "bireysel",
        baslangic_tarih: "",
        bitis_tarih: "",
        etiketlerText: "",
        gizli: false,
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    const hasLiveYorumDataRef = useRef(false);
    const hasLiveDosyaDataRef = useRef(false);
    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError("");

                const [
                    gorevData,
                    dosyaData,
                    yorumData,
                    durumData,
                    durumGecmisiData,
                    aktifUserData,
                    tumKullanicilar,
                ] = await Promise.all([
                    getGorevById(id),
                    getDosyalar(id),
                    getYorumlar(id),
                    getGorevDurumlari(),
                    getGorevDurumGecmisi(id),
                    getAktifKullanici(),
                    getKullanicilar(),
                ]);

                const aktifUser = aktifUserData || getLocalUser() || null;
                const kullaniciMap = buildKullanicilarMap(tumKullanicilar || []);

                const loadedTask = gorevData ? { ...gorevData } : null;

                const normalizedYorumlar = (yorumData || []).map((yorum) => ({
                    ...yorum,
                    yorum_sahibi_ad_soyad: getYorumDisplayName(
                        yorum,
                        kullaniciMap,
                        aktifUser
                    ),
                }));

                setGorev(loadedTask);

                setDosyalar((prev) => {
                    if (hasLiveDosyaDataRef.current) return prev;
                    return dosyaData || [];
                });

                setYorumlar((prev) => {
                    if (hasLiveYorumDataRef.current) return prev;
                    return normalizedYorumlar;
                });

                setDurumlar(Array.isArray(durumData) ? durumData : []);
                setDurumGecmisi(durumGecmisiData || []);
                setAktifKullanici(aktifUser);
                setKullanicilarMap(kullaniciMap);
                setSeciliDurum(gorevData?.durum || "");
                setOzelDurumlar(Array.isArray(durumData) ? durumData : []);
            } catch (err) {
                console.error("Görev detayı yüklenemedi:", err);
                setError("Görev detayı yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [id]);

    const refreshYorumlar = useCallback(async () => {
        const updated = await getYorumlar(id);
        console.log("refreshYorumlar:", updated);
        hasLiveYorumDataRef.current = true;
        setYorumlar(updated || []);
    }, [id]);

    const refreshDosyalar = useCallback(async () => {
        const updated = await getDosyalar(id);
        console.log("refreshDosyalar:", updated);
        hasLiveDosyaDataRef.current = true;
        setDosyalar(updated || []);
    }, [id]);

    const refreshDurumGecmisi = useCallback(async () => {
        const updated = await getGorevDurumGecmisi(id);
        setDurumGecmisi(updated || []);
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`gorev-detay-${id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "gorevler",
                    filter: `id=eq.${id}`,
                },
                async () => {
                    try {
                        console.log("GOREV EVENT GELDI");
                        const updatedTask = await getGorevById(id);
                        if (updatedTask) {
                            setGorev(updatedTask);
                            setSeciliDurum(updatedTask.durum || "");
                        }
                    } catch (err) {
                        console.error("Görev realtime yenilenemedi:", err);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "gorev_durum_gecmisi",
                    filter: `gorev_id=eq.${id}`,
                },
                async () => {
                    try {
                        console.log("DURUM GECMISI EVENT GELDI");
                        const updatedHistory = await getGorevDurumGecmisi(id);
                        setDurumGecmisi(updatedHistory || []);
                    } catch (err) {
                        console.error("Durum geçmişi realtime yenilenemedi:", err);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "gorev_yorumlar",
                    filter: `gorev_id=eq.${id}`,
                },
                async () => {
                    try {
                        console.log("YORUM EVENT GELDI");
                        await refreshYorumlar();
                    } catch (err) {
                        console.error("Yorumlar realtime yenilenemedi:", err);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "gorev_dosyalar",
                    filter: `gorev_id=eq.${id}`,
                },
                async () => {
                    try {
                        console.log("DOSYA EVENT GELDI");
                        await refreshDosyalar();
                    } catch (err) {
                        console.error("Dosyalar realtime yenilenemedi:", err);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, refreshYorumlar, refreshDosyalar]);
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
    function startEditing() {
        if (!gorev) return;

        setEditForm({
            baslik: gorev.baslik || "",
            aciklama: gorev.aciklama || "",
            oncelik: gorev.oncelik || "orta",
            gorunurluk: gorev.gorunurluk || "bireysel",
            baslangic_tarih: toDateInputValue(gorev.baslangic_tarih),
            bitis_tarih: toDateInputValue(gorev.bitis_tarih),
            etiketlerText: Array.isArray(gorev.etiketler)
                ? gorev.etiketler.join(", ")
                : "",
            gizli: gorev.gizli ?? false,
        });
        setIsEditing(true);
    }

    function cancelEditing() {
        setIsEditing(false);
    }

    function handleEditChange(field, value) {
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    async function handleSaveEdit() {
        if (!editForm.baslik.trim()) {
            showToast("Başlık zorunludur.", "error");
            return;
        }

        if (
            editForm.baslangic_tarih &&
            editForm.bitis_tarih &&
            editForm.bitis_tarih < editForm.baslangic_tarih
        ) {
            showToast("Bitiş tarihi başlangıç tarihinden önce olamaz.", "error");
            return;
        }

        try {
            setSaving(true);

            const etiketler = String(editForm.etiketlerText || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            const payload = {
                baslik: editForm.baslik.trim(),
                aciklama: editForm.aciklama.trim() || null,
                oncelik: editForm.oncelik,
                gorunurluk: editForm.gorunurluk,
                baslangic_tarih: editForm.baslangic_tarih || null,
                bitis_tarih: editForm.bitis_tarih || null,
                etiketler,
                gizli: !!editForm.gizli,
            };

            const updated = await updateGorev(id, payload);

            setGorev((prev) => ({
                ...(prev || {}),
                ...(updated || {}),
                ...payload,
            }));

            setIsEditing(false);
            showToast("Görev güncellendi.", "success", `/gorevler/${id}`);
        } catch (err) {
            console.error("Görev güncellenemedi:", err);
            showToast(err?.message || "Görev güncellenemedi.", "error");
        } finally {
            setSaving(false);
        }
    }

    async function handleUpload(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        try {
            setSaving(true);

            for (const file of files) {
                await uploadDosya(file, id);
            }

            await refreshDosyalar();
            showToast(
                `${files.length} dosya başarıyla yüklendi.`,
                "success",
                `/gorevler/${id}`
            );
        } catch (err) {
            console.error("Dosya yüklenemedi:", err);

            const message =
                err?.message?.includes("row-level security")
                    ? "Dosya yükleme yetkiniz yok. Storage policy ayarı gerekli."
                    : err?.message || "Dosya yüklenemedi.";

            showToast(message, "error");
        } finally {
            setSaving(false);
            e.target.value = "";
        }
    }

    async function handleFileOpen(dosya) {
        const isDownload = shouldDownloadFile(dosya.dosya_adi, dosya.dosya_url);

        try {
            if (isDownload) {
                await forceDownloadFile(
                    dosya.dosya_url,
                    dosya.dosya_adi || "dosya"
                );
                return;
            }

            window.open(dosya.dosya_url, "_blank", "noopener,noreferrer");
        } catch (err) {
            console.error("Dosya açılamadı:", err);
            showToast("Dosya açılamadı.", "error");
        }
    }

    async function handleDeleteDosya(dosya) {
        const confirmed = window.confirm(
            `"${dosya.dosya_adi}" dosyasını silmek istediğinize emin misiniz?`
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            await deleteDosya(dosya);
            await refreshDosyalar();
            showToast("Dosya silindi.", "success", `/gorevler/${id}`);
        } catch (err) {
            console.error("Dosya silinemedi:", err);
            showToast("Dosya silinemedi.", "error");
        } finally {
            setSaving(false);
        }
    }

    async function handleDurumChange(e) {
        const yeniDurum = e.target.value;
        if (!yeniDurum || !gorev?.id) return;

        const mevcutDurum = gorev?.durum || "";
        if (mevcutDurum === yeniDurum) return;

        try {
            setSaving(true);

            await updateGorev(id, { durum: yeniDurum });

            setGorev((prev) =>
                prev
                    ? {
                        ...prev,
                        durum: yeniDurum,
                        updated_at: new Date().toISOString(),
                    }
                    : prev
            );

            setSeciliDurum(yeniDurum);
            await refreshDurumGecmisi();

            showToast("Görev durumu güncellendi.", "success", `/gorevler/${id}`);
        } catch (err) {
            console.error("Durum güncellenemedi:", err);

            const message =
                err?.message ||
                err?.error_description ||
                err?.details ||
                JSON.stringify(err) ||
                "Durum güncellenemedi.";

            showToast(message, "error");
        } finally {
            setSaving(false);
        }
    }

    async function handleOzelDurumEkle() {
        const ad = yeniDurumText.trim();
        if (!ad) return;

        try {
            setSaving(true);

            await createGorevDurumu(ad);
            const updatedDurumlar = await getGorevDurumlari();

            setDurumlar(updatedDurumlar || []);
            setOzelDurumlar(updatedDurumlar || []);
            setYeniDurumText("");

            showToast("Yeni durum eklendi.", "success");
        } catch (err) {
            console.error("Durum eklenemedi:", err);
            showToast(err?.message || "Durum eklenemedi.", "error");
        } finally {
            setSaving(false);
        }
    }
    async function handleOzelDurumSil(silinecekKod) {
        if (!silinecekKod) return;

        const silinecekDurum = ozelDurumlar.find((item) => item.kod === silinecekKod);
        const silinecekAd = silinecekDurum?.ad || silinecekKod;

        const confirmed = window.confirm(
            `"${silinecekAd}" durumunu silmek istediğinize emin misiniz?`
        );

        if (!confirmed) return;

        try {
            setSaving(true);

            await deleteGorevDurumu(silinecekKod);
            const updatedDurumlar = await getGorevDurumlari();

            setDurumlar(updatedDurumlar || []);
            setOzelDurumlar(updatedDurumlar || []);

            showToast("Özel durum silindi.", "success");
        } catch (err) {
            console.error("Özel durum silinemedi:", err);
            showToast(err?.message || "Özel durum silinemedi.", "error");
        } finally {
            setSaving(false);
        }
    }
    async function handleYorumEkle() {
        if (!yorumText.trim()) return;

        const localUser = getLocalUser();
        const fallbackUser = aktifKullanici || localUser;
        const aktifKullaniciId =
            aktifKullanici?.id || localUser?.id || localUser?.kullanici_id;

        if (!aktifKullaniciId) {
            showToast("Aktif kullanıcı bulunamadı.", "error");
            return;
        }

        const aktifKullaniciAdSoyad =
            getKullaniciAdSoyad(localUser) ||
            getKullaniciAdSoyad(aktifKullanici) ||
            "Kullanıcı";

        try {
            setSaving(true);

            const yeniYorum = await createYorum({
                gorev_id: id,
                yorum: yorumText.trim(),
                kullanici_id: aktifKullaniciId,
                created_at: new Date().toISOString(),
            });

            const sorumluIds = Array.isArray(gorev?.sorumlu_kullanicilar)
                ? gorev.sorumlu_kullanicilar
                    .map((k) => k?.id || k?.kullanici_id)
                    .filter(Boolean)
                : [];

            const ortakIds = Array.isArray(gorev?.ortak_kullanicilar)
                ? gorev.ortak_kullanicilar
                    .map((k) => k?.id || k?.kullanici_id)
                    .filter(Boolean)
                : [];

            const hedefKullanicilar = [
                gorev?.olusturan_kullanici_id,
                gorev?.atanan_kullanici_id,
                ...sorumluIds,
                ...ortakIds,
            ]
                .filter(Boolean)
                .filter((uid, index, arr) => arr.indexOf(uid) === index)
                .filter((uid) => uid !== aktifKullaniciId);

            for (const kullaniciId of hedefKullanicilar) {
                await safeCreateBildirim({
                    kullanici_id: kullaniciId,
                    tip: "yorum_eklendi",
                    baslik: "Göreve yeni yorum eklendi",
                    aciklama: `"${gorev?.baslik}" görevine ${aktifKullaniciAdSoyad} tarafından yeni bir yorum eklendi.`,
                    gorev_id: gorev?.id,
                    yorum_id: yeniYorum?.id,
                    link: `/gorevler/${gorev?.id}`,
                    okundu: false,
                    created_at: new Date().toISOString(),
                });
            }

            const localComment = {
                ...(yeniYorum || {}),
                id:
                    yeniYorum?.id ||
                    `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                gorev_id: id,
                yorum: yorumText.trim(),
                kullanici_id: aktifKullaniciId,
                created_at: yeniYorum?.created_at || new Date().toISOString(),
                kullanici: yeniYorum?.kullanici || fallbackUser || null,
                local_kullanici_ad_soyad: aktifKullaniciAdSoyad,
                yorum_sahibi_ad_soyad: aktifKullaniciAdSoyad,
            };

            setYorumText("");
            setYorumlar((prev) => [...prev, localComment]);

            try {
                await refreshYorumlar();
            } catch {
                // local kayıt kalsın
            }

            showToast("Yorum eklendi.", "success", `/gorevler/${id}`);
        } catch (err) {
            console.error("Yorum eklenemedi:", err);
            showToast("Yorum eklenemedi.", "error");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteYorum(yorum) {
        const confirmed = window.confirm(
            "Bu yorumu silmek istediğinize emin misiniz?"
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            await deleteYorum(yorum.id);
            await refreshYorumlar();
            showToast("Yorum silindi.", "success", `/gorevler/${id}`);
        } catch (err) {
            console.error("Yorum silinemedi:", err);
            showToast("Yorum silinemedi.", "error");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        const confirmed = window.confirm(
            "Bu görevi silmek istediğinize emin misiniz?"
        );

        if (!confirmed) return;

        try {
            setDeleting(true);
            await deleteGorev(id);
            showToast("Görev silindi.", "success", "/gorevler");
            navigate("/gorevler");
        } catch (err) {
            console.error("Görev silinemedi:", err);
            showToast("Görev silinemedi.", "error");
        } finally {
            setDeleting(false);
        }
    }

    const gorevGecikti = useMemo(() => isTaskLate(gorev), [gorev]);

    const tumDurumlar = useMemo(() => {
        return Array.isArray(durumlar) ? durumlar : [];
    }, [durumlar]);
    const birlesikDurumGecmisi = useMemo(() => {
        const dbHistory = Array.isArray(durumGecmisi) ? durumGecmisi : [];

        return [...dbHistory].sort((a, b) => {
            const dateA = new Date(a?.created_at || 0).getTime();
            const dateB = new Date(b?.created_at || 0).getTime();
            return dateB - dateA;
        });
    }, [durumGecmisi]);

    if (loading) {
        return (
            <div className="gorev-page">
                <div className="gorev-loading">Görev yükleniyor...</div>
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

    if (!gorev) {
        return (
            <div className="gorev-page">
                <div className="gorev-empty">Görev bulunamadı.</div>
            </div>
        );
    }

    const ekSorumlular = Array.isArray(gorev.sorumlu_kullanicilar)
        ? gorev.sorumlu_kullanicilar
            .map((k) => getKullaniciAdSoyad(k))
            .filter(Boolean)
        : [];

    const gorevSilmeYetkisi = canCreateTask(aktifKullanici);
    const dosyaSilmeYetkisi = canCreateTask(aktifKullanici);
    const duzenlemeYetkisi = canCreateTask(aktifKullanici);
    const gorunenDurum = gorev.durum;

    return (
        <div className="gorev-page">
            <section className="gorev-hero">
                <div className="gorev-hero__content">
                    <button
                        type="button"
                        className="gorev-btn gorev-btn--ghost"
                        onClick={() => navigate("/gorevler")}
                    >
                        ← Görevlere Dön
                    </button>

                    <p className="gorev-hero__eyebrow">Görev Detayı</p>

                    {isEditing ? (
                        <div style={{ marginTop: 8 }}>
                            <input
                                className="gorev-input"
                                value={editForm.baslik}
                                onChange={(e) =>
                                    handleEditChange("baslik", e.target.value)
                                }
                                placeholder="Görev başlığı"
                                disabled={saving}
                            />
                        </div>
                    ) : (
                        <h1 className="gorev-hero__title">{gorev.baslik}</h1>
                    )}

                    {isEditing ? (
                        <div style={{ marginTop: 16 }}>
                            <textarea
                                className="gorev-textarea"
                                rows={5}
                                value={editForm.aciklama}
                                onChange={(e) =>
                                    handleEditChange("aciklama", e.target.value)
                                }
                                placeholder="Görev açıklaması"
                                disabled={saving}
                            />
                        </div>
                    ) : (
                        <p className="gorev-hero__desc">
                            {gorev.aciklama || "Bu görev için açıklama girilmemiş."}
                        </p>
                    )}

                    <div className="gorev-card__meta">
                        <Badge style={getDurumStyle(gorunenDurum)}>
                            {getDurumLabel(gorunenDurum)}
                        </Badge>

                        {!isEditing ? (
                            <Badge style={getOncelikStyle(gorev.oncelik)}>
                                {getOncelikLabel(gorev.oncelik)}
                            </Badge>
                        ) : null}

                        {gorevGecikti && (
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
                </div>

                <div className="gorev-hero__actions">
                    {isEditing ? (
                        <>
                            <button
                                type="button"
                                className="gorev-btn gorev-btn--ghost"
                                onClick={cancelEditing}
                                disabled={saving}
                            >
                                Vazgeç
                            </button>

                            <button
                                type="button"
                                className="gorev-btn gorev-btn--primary"
                                onClick={handleSaveEdit}
                                disabled={saving}
                            >
                                {saving ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </>
                    ) : (
                        <>
                            {duzenlemeYetkisi && (
                                <button
                                    type="button"
                                    className="gorev-btn gorev-btn--secondary"
                                    onClick={startEditing}
                                >
                                    Düzenle
                                </button>
                            )}

                            {gorevSilmeYetkisi && (
                                <button
                                    type="button"
                                    className="gorev-btn gorev-btn--ghost"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                >
                                    {deleting ? "Siliniyor..." : "Görevi Sil"}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </section>

            <div className="gorev-detail-layout">
                <div className="gorev-detail-main">
                    {isEditing && (
                        <SectionCard
                            title="Hızlı Düzenleme"
                            desc="Görev temel alanlarını aynı sayfada güncelleyin."
                        >
                            <div className="gorev-form-grid">
                                <div className="gorev-field gorev-field--4">
                                    <label className="gorev-label">Öncelik</label>
                                    <select
                                        className="gorev-select"
                                        value={editForm.oncelik}
                                        onChange={(e) =>
                                            handleEditChange("oncelik", e.target.value)
                                        }
                                        disabled={saving}
                                    >
                                        <option value="rutin">Rutin</option>
                                        <option value="dusuk">Düşük</option>
                                        <option value="orta">Orta</option>
                                        <option value="yuksek">Yüksek</option>
                                        <option value="kritik">Kritik</option>
                                    </select>
                                </div>

                                <div className="gorev-field gorev-field--4">
                                    <label className="gorev-label">Görünürlük</label>
                                    <select
                                        className="gorev-select"
                                        value={editForm.gorunurluk}
                                        onChange={(e) =>
                                            handleEditChange("gorunurluk", e.target.value)
                                        }
                                        disabled={saving}
                                    >
                                        <option value="bireysel">Bireysel</option>
                                        <option value="ekip">Ekip</option>
                                        <option value="tum">Tüm Sistem</option>
                                    </select>
                                </div>

                                <div className="gorev-field gorev-field--4">
                                    <label className="gorev-label">Etiketler</label>
                                    <input
                                        className="gorev-input"
                                        value={editForm.etiketlerText}
                                        onChange={(e) =>
                                            handleEditChange("etiketlerText", e.target.value)
                                        }
                                        placeholder="acil, saha, rapor"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="gorev-field gorev-field--6">
                                    <label className="gorev-label">Başlangıç Tarihi</label>
                                    <input
                                        className="gorev-input"
                                        type="date"
                                        value={editForm.baslangic_tarih}
                                        onChange={(e) =>
                                            handleEditChange("baslangic_tarih", e.target.value)
                                        }
                                        disabled={saving}
                                    />
                                </div>

                                <div className="gorev-field gorev-field--6">
                                    <label className="gorev-label">Bitiş Tarihi</label>
                                    <input
                                        className="gorev-input"
                                        type="date"
                                        value={editForm.bitis_tarih}
                                        onChange={(e) =>
                                            handleEditChange("bitis_tarih", e.target.value)
                                        }
                                        disabled={saving}
                                    />
                                </div>

                                <div className="gorev-field gorev-field--12">
                                    <label className="gorev-label">Ek Ayar</label>
                                    <label className="gorev-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={editForm.gizli}
                                            onChange={(e) =>
                                                handleEditChange("gizli", e.target.checked)
                                            }
                                            disabled={saving}
                                        />
                                        <span>Sadece yetkili kullanıcılar görsün</span>
                                    </label>
                                </div>
                            </div>
                        </SectionCard>
                    )}

                    <SectionCard
                        title="Açıklama"
                        desc="Görevin amacı, kapsamı ve iş içeriği."
                    >
                        <div className="gorev-detail-text">
                            {gorev.aciklama || "Açıklama girilmemiş."}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Dosyalar"
                        desc="Göreve bağlı belge, ekran görüntüsü veya ek dosyalar."
                    >
                        <div className="dosya-section">
                            <div className="dosya-upload">
                                <div className="dosya-upload__content">
                                    <p className="dosya-upload__title">Dosya yükle</p>
                                    <p className="dosya-upload__desc">
                                        Görevle ilgili birden fazla dosyayı tek seferde ekleyin.
                                    </p>
                                </div>

                                <label className="dosya-upload__button">
                                    {saving ? "İşleniyor..." : "Dosya Seç"}
                                    <input
                                        className="dosya-upload__input"
                                        type="file"
                                        multiple
                                        onChange={handleUpload}
                                        disabled={saving}
                                    />
                                </label>
                            </div>

                            {dosyalar.length === 0 ? (
                                <div className="dosya-empty">
                                    Henüz dosya eklenmemiş.
                                </div>
                            ) : (
                                <div className="dosya-list">
                                    {dosyalar.map((dosya) => (
                                        <div key={dosya.id} className="dosya-item">
                                            <div className="dosya-item__icon">↗</div>

                                            <div className="dosya-item__body">
                                                <p className="dosya-item__name">
                                                    {dosya.dosya_adi || "Dosya"}
                                                </p>
                                                <p className="dosya-item__meta">
                                                    Yüklenme: {formatDate(dosya.created_at)}
                                                </p>
                                            </div>

                                            <div className="dosya-item__actions">
                                                <button
                                                    type="button"
                                                    className="dosya-link"
                                                    onClick={() => handleFileOpen(dosya)}
                                                >
                                                    {getFileActionLabel(
                                                        dosya.dosya_adi,
                                                        dosya.dosya_url
                                                    )}
                                                </button>

                                                {dosyaSilmeYetkisi && (
                                                    <button
                                                        type="button"
                                                        className="dosya-danger"
                                                        onClick={() => handleDeleteDosya(dosya)}
                                                        disabled={saving}
                                                    >
                                                        Sil
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Yorumlar"
                        desc="İlerleme notları, açıklamalar ve ekip iletişimi."
                    >
                        <div className="yorum-section">
                            <div className="yorum-editor">
                                <textarea
                                    className="gorev-textarea"
                                    placeholder="Görevle ilgili not veya yorum yazın..."
                                    value={yorumText}
                                    onChange={(e) => setYorumText(e.target.value)}
                                />

                                <div className="yorum-editor__actions">
                                    <button
                                        type="button"
                                        className="gorev-btn gorev-btn--primary"
                                        onClick={handleYorumEkle}
                                        disabled={saving || !yorumText.trim()}
                                    >
                                        {saving ? "Gönderiliyor..." : "Yorum Ekle"}
                                    </button>
                                </div>
                            </div>

                            {yorumlar.length === 0 ? (
                                <div className="yorum-empty">
                                    Henüz yorum bulunmuyor.
                                </div>
                            ) : (
                                <div className="yorum-list">
                                    {yorumlar.map((yorum) => {
                                        const yorumSahibi =
                                            getYorumDisplayName(
                                                yorum,
                                                kullanicilarMap,
                                                aktifKullanici
                                            ) || "Kullanıcı";

                                        return (
                                            <div key={yorum.id} className="yorum-item">
                                                <div className="yorum-item__top">
                                                    <div className="yorum-user">
                                                        <div className="yorum-user__avatar">
                                                            {getAvatarText(yorumSahibi)}
                                                        </div>

                                                        <div className="yorum-user__meta">
                                                            <p className="yorum-user__name">
                                                                {yorumSahibi}
                                                            </p>
                                                            <p className="yorum-user__date">
                                                                {formatDate(yorum.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {(canCreateTask(aktifKullanici) ||
                                                        yorum.kullanici_id ===
                                                        aktifKullanici?.id) && (
                                                            <button
                                                                type="button"
                                                                className="gorev-btn gorev-btn--ghost"
                                                                onClick={() =>
                                                                    handleDeleteYorum(yorum)
                                                                }
                                                                disabled={saving}
                                                            >
                                                                Sil
                                                            </button>
                                                        )}
                                                </div>

                                                <p className="yorum-item__text">
                                                    {yorum.yorum}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Durum Geçmişi"
                        desc="Görev üzerinde yapılan durum değişiklikleri."
                    >
                        <div className="durum-panel">
                            {birlesikDurumGecmisi.length === 0 ? (
                                <div className="durum-empty">
                                    Henüz durum geçmişi bulunmuyor.
                                </div>
                            ) : (
                                <div className="durum-gecmis">
                                    {birlesikDurumGecmisi.map((item) => {
                                        const degistiren =
                                            getKullaniciAdSoyad(item.degistiren_kullanici) ||
                                            "Sistem";

                                        return (
                                            <div
                                                key={item.id}
                                                className="durum-gecmis__item"
                                            >
                                                <p className="durum-gecmis__title">
                                                    {getDurumLabel(item.eski_durum)} →{" "}
                                                    {getDurumLabel(item.yeni_durum)}
                                                    {item.ozel ? " (özel)" : ""}
                                                </p>
                                                <p className="durum-gecmis__meta">
                                                    {degistiren} · {formatDate(item.created_at)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </SectionCard>
                </div>

                <aside className="gorev-detail-side">
                    <SectionCard
                        title="Görev Özeti"
                        desc="Görevin ana bilgileri ve hızlı aksiyonlar."
                    >
                        <div className="gorev-summary-grid">
                            <div className="gorev-info">
                                <p className="gorev-info__label">Ek Sorumlular</p>
                                <p className="gorev-info__value">
                                    {ekSorumlular.length > 0
                                        ? ekSorumlular.join(", ")
                                        : "Sorumlu yok"}
                                </p>
                            </div>

                            <div className="gorev-info">
                                <p className="gorev-info__label">Başlangıç</p>
                                <p className="gorev-info__value">
                                    {formatDateOnly(gorev.baslangic_tarih)}
                                </p>
                            </div>

                            <div className="gorev-info">
                                <p className="gorev-info__label">Bitiş</p>
                                <p className="gorev-info__value">
                                    {formatDateOnly(gorev.bitis_tarih)}
                                </p>
                            </div>

                            <div className="gorev-info">
                                <p className="gorev-info__label">Oluşturulma</p>
                                <p className="gorev-info__value">
                                    {formatDateOnly(gorev.created_at)}
                                </p>
                            </div>

                            <div className="gorev-info">
                                <p className="gorev-info__label">Görünürlük</p>
                                <p className="gorev-info__value">
                                    {gorev.gorunurluk || "-"}
                                </p>
                            </div>

                            <div className="gorev-info">
                                <p className="gorev-info__label">Güncelleme</p>
                                <p className="gorev-info__value">
                                    {formatDateOnly(gorev.updated_at)}
                                </p>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Durum Yönetimi"
                        desc="Durum değişiklikleri tüm ekipte anlık senkron olur."
                    >
                        <div className="durum-kartlari">
                            <div className="durum-karti">
                                <div className="durum-karti__top">
                                    <p className="durum-karti__title">Durum</p>
                                    <Badge style={getDurumStyle(gorunenDurum)}>
                                        {getDurumLabel(gorunenDurum)}
                                    </Badge>
                                </div>

                                <select
                                    className="gorev-select"
                                    value={seciliDurum || gorunenDurum || ""}
                                    onChange={handleDurumChange}
                                    disabled={saving}
                                >
                                    {tumDurumlar.map((durum) => {
                                        const value =
                                            durum.kod ||
                                            durum.value ||
                                            durum.slug ||
                                            durum.ad;
                                        const label =
                                            durum.ad ||
                                            durum.baslik ||
                                            getDurumLabel(value);

                                        return (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        marginTop: "12px",
                                    }}
                                >
                                    <input
                                        type="text"
                                        className="gorev-input"
                                        placeholder="Yeni durum adı ekle"
                                        value={yeniDurumText}
                                        onChange={(e) =>
                                            setYeniDurumText(e.target.value)
                                        }
                                        disabled={saving}
                                    />
                                    <button
                                        type="button"
                                        className="gorev-btn gorev-btn--secondary"
                                        onClick={handleOzelDurumEkle}
                                        disabled={saving || !yeniDurumText.trim()}
                                    >
                                        Ekle
                                    </button>
                                </div>

                                {ozelDurumlar.length > 0 && (
                                    <div style={{ marginTop: "14px" }}>
                                        <p
                                            style={{
                                                margin: "0 0 8px",
                                                fontSize: "13px",
                                                fontWeight: 700,
                                                color: "#475569",
                                            }}
                                        >
                                            Özel Durum Adları
                                        </p>

                                        <div
                                            style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: "8px",
                                            }}
                                        >
                                            {ozelDurumlar.map((durum) => (
                                                <div
                                                    key={durum.kod}
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
                                                        {durum.ad}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleOzelDurumSil(durum.kod)
                                                        }
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
                                                        disabled={saving}
                                                        title="Durumu sil"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </SectionCard>
                </aside>
            </div>
        </div>
    );
}