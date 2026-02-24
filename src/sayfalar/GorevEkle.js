import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    FormControlLabel,
    MenuItem,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Plus, Save, ShieldCheck, Sparkles, Tag, Users, X } from "lucide-react";

import AppLayout from "../bilesenler/AppLayout";
import { supabase } from "../lib/supabase";

const API_BASE = (process.env.REACT_APP_API_BASE || "http://localhost:4000").replace(/\/$/, "");
const PRIORITIES = [
    { value: "rutin", label: "RUTİN" },
    { value: "dusuk", label: "Düşük" },
    { value: "orta", label: "Orta" },
    { value: "yuksek", label: "Yüksek" },
    { value: "kritik", label: "Kritik" },
];

/** session */
function getSession() {
    try {
        return JSON.parse(localStorage.getItem("oturum") || "null");
    } catch {
        return null;
    }
}

async function postJson(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }
    if (!res.ok) throw new Error(data?.message || `${res.status} ${res.statusText}`);
    return data;
}

/** ✅ Koyu tema için tek yerden modern field stili */
function fieldSx() {
    return {
        "& .MuiInputLabel-root": {
            color: "rgba(255,255,255,0.72)",
            fontWeight: 800,
        },
        "& .MuiInputLabel-root.Mui-focused": {
            color: "#00f2fe",
        },

        "& .MuiOutlinedInput-root": {
            borderRadius: 2.2,
            bgcolor: "rgba(2,6,23,0.35)",
            backdropFilter: "blur(10px)",
            transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",

            "& fieldset": {
                borderColor: "rgba(255,255,255,0.12)",
            },
            "&:hover fieldset": {
                borderColor: "rgba(0,242,254,0.28)",
            },
            "&.Mui-focused fieldset": {
                borderColor: "rgba(0,242,254,0.55)",
            },

            "&:hover": {
                boxShadow: "0 0 0 1px rgba(0,242,254,0.10), 0 10px 28px rgba(0,0,0,0.32)",
                transform: "translateY(-1px)",
            },
        },

        "& .MuiOutlinedInput-input": {
            color: "rgba(255,255,255,0.92)",
            fontWeight: 750,
        },

        "& input::placeholder, & textarea::placeholder": {
            color: "rgba(255,255,255,0.35)",
            opacity: 1,
        },

        "& .MuiFormHelperText-root": {
            color: "rgba(255,255,255,0.52)",
            marginLeft: 0,
        },

        "& .MuiSvgIcon-root": {
            color: "rgba(255,255,255,0.70)",
        },
    };
}

/** ✅ Dark dropdown menüsü */
const menuPropsDark = {
    PaperProps: {
        sx: {
            mt: 1,
            borderRadius: 2,
            bgcolor: "rgba(2,6,23,0.95)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(10px)",
            color: "rgba(255,255,255,0.92)",
            overflow: "hidden",
        },
    },
};

function pillSx(active = false) {
    return {
        height: 30,
        borderRadius: 999,
        fontWeight: 900,
        letterSpacing: 0.2,
        bgcolor: active ? "rgba(0,242,254,0.14)" : "rgba(255,255,255,0.06)",
        border: "1px solid",
        borderColor: active ? "rgba(0,242,254,0.30)" : "rgba(255,255,255,0.10)",
        color: active ? "#00f2fe" : "rgba(255,255,255,0.85)",
    };
}

function GorevEkleContent() {
    const navigate = useNavigate();
    const session = getSession();
    const olusturanId = session?.id || null;

    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });

    // ✅ Birim artık formda yok; oturumdan user birimini bulacağız
    const [userBirim, setUserBirim] = useState("");
    const [userBirimLoading, setUserBirimLoading] = useState(false);
    const [userBirimErr, setUserBirimErr] = useState("");

    const [kullanicilar, setKullanicilar] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userErr, setUserErr] = useState("");

    const [form, setForm] = useState({
        baslik: "",
        aciklama: "",
        oncelik: "rutin",
        sorumlular: [],
        baslangicTarih: "",
        bitisTarih: "",
        etiket: "",
        etiketler: [],
        gizli: false,
    });

    const setField = (k) => (ev) => {
        const v = ev?.target?.type === "checkbox" ? ev.target.checked : ev.target.value;
        setForm((s) => ({ ...s, [k]: v }));
    };

    // ✅ Başlangıç seçilince bitiş boşsa otomatik aynı gün (UX)
    useEffect(() => {
        if (form.baslangicTarih && !form.bitisTarih) {
            setForm((s) => ({ ...s, bitisTarih: s.baslangicTarih }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.baslangicTarih]);

    // ✅ 1) giriş yapan kullanıcının birimini kullanicilar tablosundan bul
    useEffect(() => {
        let alive = true;

        (async () => {
            setUserBirimLoading(true);
            setUserBirimErr("");
            setUserBirim("");

            if (!olusturanId) {
                setUserBirimLoading(false);
                setUserBirimErr('Oturum bulunamadı. localStorage "oturum" içinde id olmalı.');
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("kullanicilar")
                    .select("birim")
                    .eq("id", olusturanId)
                    .maybeSingle();

                if (error) throw error;
                if (!alive) return;

                const b = String(data?.birim || "").trim();
                if (!b) {
                    setUserBirimErr("Kullanıcının birimi boş. kullanicilar.birim alanını kontrol et.");
                    setUserBirim("");
                } else {
                    setUserBirim(b);
                }
            } catch (e) {
                if (!alive) return;
                setUserBirimErr(e?.message || "Kullanıcının birimi alınamadı.");
                setUserBirim("");
            } finally {
                if (alive) setUserBirimLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [olusturanId]);

    // ✅ 2) userBirim'e göre aynı birimdeki kullanıcıları çek -> sorumlular listesi
    useEffect(() => {
        let alive = true;

        (async () => {
            setUserErr("");
            const b = String(userBirim || "").trim();

            if (!b) {
                setKullanicilar([]);
                setForm((s) => ({ ...s, sorumlular: [] }));
                return;
            }

            setLoadingUsers(true);
            try {
                const { data, error } = await supabase
                    .from("kullanicilar")
                    .select("id, ad_soyad, birim")
                    .eq("birim", b)
                    .order("ad_soyad", { ascending: true });

                if (error) throw error;
                if (!alive) return;

                const cleaned = (Array.isArray(data) ? data : [])
                    .map((u) => ({
                        id: u?.id ?? null,
                        ad_soyad: String(u?.ad_soyad || "").trim(),
                        birim: u?.birim ?? b,
                    }))
                    .filter((u) => u.ad_soyad);

                setKullanicilar(cleaned);

                // seçili sorumlular birimde yoksa düşür
                setForm((s) => ({
                    ...s,
                    sorumlular: s.sorumlular.filter((x) =>
                        cleaned.some((u) => (u.id != null && x.id != null ? u.id === x.id : u.ad_soyad === x.ad_soyad))
                    ),
                }));

                if (!cleaned.length) setUserErr("Bu birimde kullanıcı bulunamadı.");
            } catch (e) {
                if (!alive) return;
                setKullanicilar([]);
                setForm((s) => ({ ...s, sorumlular: [] }));
                setUserErr(e?.message || "Kullanıcılar yüklenemedi.");
            } finally {
                if (alive) setLoadingUsers(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [userBirim]);

    const errors = useMemo(() => {
        const e = {};
        const baslik = form.baslik.trim();

        if (!baslik) e.baslik = "Başlık zorunlu";
        else if (baslik.length < 4) e.baslik = "Başlık en az 4 karakter olmalı";

        if (!form.baslangicTarih) e.baslangicTarih = "Başlangıç tarihi zorunlu";
        if (!form.bitisTarih) e.bitisTarih = "Bitiş tarihi zorunlu";
        if (form.baslangicTarih && form.bitisTarih && form.bitisTarih < form.baslangicTarih) {
            e.bitisTarih = "Bitiş tarihi başlangıçtan önce olamaz";
        }

        if (!form.sorumlular?.length) e.sorumlular = "En az 1 sorumlu seçmelisin";

        // kullanıcı birimi yoksa form geçersiz say
        if (!String(userBirim || "").trim()) e.birim = "Kullanıcının birimi bulunamadı";

        return e;
    }, [form, userBirim]);

    const isValid = Object.keys(errors).length === 0;

    const addTag = () => {
        const t = form.etiket.trim();
        if (!t) return;

        const exists = form.etiketler.some((x) => x.toLocaleLowerCase("tr-TR") === t.toLocaleLowerCase("tr-TR"));
        if (exists) {
            setForm((s) => ({ ...s, etiket: "" }));
            return;
        }
        setForm((s) => ({ ...s, etiketler: [...s.etiketler, t], etiket: "" }));
    };

    const removeTag = (tag) => {
        setForm((s) => ({ ...s, etiketler: s.etiketler.filter((x) => x !== tag) }));
    };

    const onSubmit = async () => {
        if (!isValid) {
            setToast({ open: true, type: "error", msg: "Lütfen zorunlu alanları kontrol edin." });
            return;
        }
        if (!olusturanId) {
            setToast({ open: true, type: "error", msg: "Oturum bulunamadı. Lütfen tekrar giriş yapın." });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                baslik: form.baslik.trim(),
                aciklama: form.aciklama.trim(),
                oncelik: form.oncelik,
                birim: userBirim, // ✅ birim otomatik
                baslangic_tarih: form.baslangicTarih,
                bitis_tarih: form.bitisTarih,
                etiketler: form.etiketler,
                gizli: form.gizli,
                olusturan_id: olusturanId,
                sorumlular: form.sorumlular.map((u) => u.id).filter(Boolean),
            };

            await postJson(`${API_BASE}/api/gorevler/create`, payload);

            setToast({ open: true, type: "success", msg: "Görev oluşturuldu." });
            setTimeout(() => navigate("/gorevlerim"), 600);
        } catch (e) {
            setToast({
                open: true,
                type: "error",
                msg: e?.message?.includes("404")
                    ? "Kaydetme endpoint'i yok. Backend'e /api/gorevler/create eklemelisin."
                    : e?.message || "Görev oluşturulamadı. Tekrar deneyin.",
            });
        } finally {
            setSaving(false);
        }
    };

    const priorityChip = useMemo(() => {
        const label = PRIORITIES.find((p) => p.value === form.oncelik)?.label ?? "RUTİN";
        const active = form.oncelik === "kritik" || form.oncelik === "yuksek";
        return <Chip icon={<ShieldCheck size={16} />} label={`Öncelik: ${label}`} sx={pillSx(active)} />;
    }, [form.oncelik]);

    return (
        <Box
            sx={{
                maxWidth: 1180,
                mx: "auto",
                "@keyframes glow": {
                    "0%": { filter: "drop-shadow(0 0 0 rgba(0,242,254,0))" },
                    "50%": { filter: "drop-shadow(0 0 14px rgba(0,242,254,0.30))" },
                    "100%": { filter: "drop-shadow(0 0 0 rgba(0,242,254,0))" },
                },
                "@keyframes borderFlow": {
                    "0%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                    "100%": { backgroundPosition: "0% 50%" },
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    mb: 2,
                    p: { xs: 2, md: 2.6 },
                    borderRadius: 3,
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background:
                        "linear-gradient(135deg, rgba(0,242,254,0.16), rgba(2,6,23,0.45) 40%, rgba(34,211,238,0.10))",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        inset: -2,
                        background:
                            "linear-gradient(90deg, rgba(0,242,254,0.0), rgba(0,242,254,0.22), rgba(34,211,238,0.0))",
                        backgroundSize: "200% 200%",
                        animation: "borderFlow 6s ease infinite",
                        opacity: 0.7,
                        pointerEvents: "none",
                    }}
                />

                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ position: "relative" }}>
                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ flex: 1 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2.4,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: "rgba(0,242,254,0.14)",
                                border: "1px solid rgba(0,242,254,0.26)",
                                animation: "glow 2.6s ease-in-out infinite",
                            }}
                        >
                            <Sparkles size={20} color="#00f2fe" />
                        </Box>

                        <Box>
                            <Typography sx={{ fontWeight: 980, fontSize: 24, lineHeight: 1.05, color: "#fff" }}>Görev Ekle</Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 13, mt: 0.5 }}>
                                Sorumlular otomatik olarak <b>{userBirimLoading ? "..." : userBirim || "—"}</b> biriminden gelir.
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ mt: 1.1 }} flexWrap="wrap" useFlexGap>
                                {priorityChip}
                                <Chip icon={<Tag size={16} />} label={`Etiket: ${form.etiketler.length}`} sx={pillSx(form.etiketler.length > 0)} />
                                <Chip icon={<Users size={16} />} label={`Sorumlu: ${form.sorumlular.length}`} sx={pillSx(form.sorumlular.length > 0)} />
                            </Stack>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(-1)}
                            startIcon={<X size={18} />}
                            sx={{
                                borderRadius: 2,
                                borderColor: "rgba(255,255,255,0.20)",
                                color: "rgba(255,255,255,0.92)",
                                "&:hover": { borderColor: "rgba(0,242,254,0.35)", background: "rgba(0,242,254,0.06)" },
                            }}
                        >
                            Vazgeç
                        </Button>

                        <Button
                            variant="contained"
                            onClick={onSubmit}
                            disabled={saving || !isValid}
                            startIcon={saving ? <CircularProgress size={16} /> : <Save size={18} />}
                            sx={{
                                borderRadius: 2,
                                fontWeight: 950,
                                background: "linear-gradient(90deg, rgba(0,242,254,0.98), rgba(34,211,238,0.88))",
                                color: "#02121a",
                                boxShadow: "0 18px 60px rgba(0,242,254,0.20)",
                                "&:hover": {
                                    background: "linear-gradient(90deg, rgba(0,242,254,1), rgba(34,211,238,0.98))",
                                    boxShadow: "0 22px 70px rgba(0,242,254,0.28)",
                                },
                                "&.Mui-disabled": { opacity: 0.45, color: "rgba(2,6,23,0.55)" },
                            }}
                        >
                            {saving ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                {/* Form */}
                <Card
                    sx={{
                        flex: 1.2,
                        borderRadius: 3,
                        background: "rgba(2,6,23,0.50)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        backdropFilter: "blur(14px)",
                        overflow: "hidden",
                        transition: "transform .18s ease, box-shadow .18s ease",
                        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 30px 100px rgba(0,0,0,0.45)" },
                    }}
                >
                    <CardContent sx={{ p: { xs: 2, md: 2.6 } }}>
                        <Stack spacing={2}>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Başlık *"
                                    value={form.baslik}
                                    onChange={setField("baslik")}
                                    error={!!errors.baslik}
                                    helperText={errors.baslik || " "}
                                    sx={fieldSx()}
                                />

                                <TextField
                                    fullWidth
                                    select
                                    label="Öncelik"
                                    value={form.oncelik}
                                    onChange={setField("oncelik")}
                                    sx={fieldSx()}
                                    SelectProps={{ MenuProps: menuPropsDark }}
                                >
                                    {PRIORITIES.map((x) => (
                                        <MenuItem
                                            key={x.value}
                                            value={x.value}
                                            sx={{ color: "rgba(255,255,255,0.92)", "&:hover": { background: "rgba(0,242,254,0.08)" } }}
                                        >
                                            {x.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Stack>

                            <TextField
                                fullWidth
                                label="Açıklama"
                                value={form.aciklama}
                                onChange={setField("aciklama")}
                                multiline
                                minRows={5}
                                placeholder="Görevin detaylarını yazın..."
                                sx={fieldSx()}
                            />

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Başlangıç Tarihi *"
                                    type="date"
                                    value={form.baslangicTarih}
                                    onChange={setField("baslangicTarih")}
                                    error={!!errors.baslangicTarih}
                                    helperText={errors.baslangicTarih || " "}
                                    InputLabelProps={{ shrink: true }}
                                    sx={fieldSx()}
                                />

                                <TextField
                                    fullWidth
                                    label="Bitiş Tarihi *"
                                    type="date"
                                    value={form.bitisTarih}
                                    onChange={setField("bitisTarih")}
                                    error={!!errors.bitisTarih}
                                    helperText={errors.bitisTarih || " "}
                                    InputLabelProps={{ shrink: true }}
                                    sx={fieldSx()}
                                />
                            </Stack>

                            <Autocomplete
                                multiple
                                options={kullanicilar}
                                value={form.sorumlular}
                                loading={loadingUsers}
                                disableCloseOnSelect
                                getOptionLabel={(opt) => opt?.ad_soyad ?? ""}
                                isOptionEqualToValue={(a, b) => a?.id === b?.id || a?.ad_soyad === b?.ad_soyad}
                                onChange={(_, vals) => setForm((s) => ({ ...s, sorumlular: vals }))}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            {...getTagProps({ index })}
                                            key={option?.id ?? option?.ad_soyad ?? index}
                                            label={option?.ad_soyad}
                                            sx={{
                                                bgcolor: "rgba(0,242,254,0.12)",
                                                border: "1px solid rgba(0,242,254,0.22)",
                                                color: "#00f2fe",
                                                fontWeight: 900,
                                            }}
                                        />
                                    ))
                                }
                                PaperComponent={({ children }) => (
                                    <Box
                                        sx={{
                                            mt: 1,
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            bgcolor: "rgba(2,6,23,0.96)",
                                            border: "1px solid rgba(255,255,255,0.10)",
                                            backdropFilter: "blur(12px)",
                                            color: "rgba(255,255,255,0.92)",
                                        }}
                                    >
                                        {children}
                                    </Box>
                                )}
                                renderOption={(props, option) => (
                                    <Box
                                        component="li"
                                        {...props}
                                        sx={{
                                            px: 1.2,
                                            py: 1,
                                            borderRadius: 1.5,
                                            color: "rgba(255,255,255,0.92)",
                                            "&:hover": { background: "rgba(0,242,254,0.08)" },
                                        }}
                                    >
                                        {option.ad_soyad}
                                    </Box>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Sorumlu(lar) *"
                                        placeholder={userBirim ? "Kullanıcı seç..." : "Birim bulunamadı"}
                                        error={!!errors.sorumlular || !!errors.birim}
                                        helperText={errors.sorumlular || errors.birim || userErr || userBirimErr || " "}
                                        sx={fieldSx()}
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <>
                                                    <Box sx={{ mr: 1, display: "grid", placeItems: "center", opacity: 0.9, color: "rgba(255,255,255,0.85)" }}>
                                                        <Users size={18} />
                                                    </Box>
                                                    {params.InputProps.startAdornment}
                                                </>
                                            ),
                                            endAdornment: (
                                                <>
                                                    {loadingUsers || userBirimLoading ? <CircularProgress size={16} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                            />

                            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                                <TextField
                                    fullWidth
                                    label="Etiket"
                                    value={form.etiket}
                                    onChange={setField("etiket")}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                    placeholder="Örn: depo, rapor, acil..."
                                    sx={fieldSx()}
                                    InputProps={{
                                        startAdornment: (
                                            <Box sx={{ mr: 1, display: "grid", placeItems: "center", opacity: 0.9, color: "rgba(255,255,255,0.85)" }}>
                                                <Tag size={18} />
                                            </Box>
                                        ),
                                    }}
                                />

                                <Button
                                    variant="outlined"
                                    onClick={addTag}
                                    startIcon={<Plus size={18} />}
                                    sx={{
                                        minWidth: 170,
                                        borderRadius: 2,
                                        borderColor: "rgba(255,255,255,0.18)",
                                        color: "rgba(255,255,255,0.92)",
                                        "&:hover": { borderColor: "rgba(0,242,254,0.38)", background: "rgba(0,242,254,0.06)" },
                                    }}
                                >
                                    Etiket Ekle
                                </Button>

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={form.gizli}
                                            onChange={setField("gizli")}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": { color: "#00f2fe" },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                                    backgroundColor: "rgba(0,242,254,0.45)",
                                                },
                                            }}
                                        />
                                    }
                                    label={<Typography sx={{ color: "rgba(255,255,255,0.82)", fontWeight: 900 }}>Gizli görev</Typography>}
                                />
                            </Stack>

                            {form.etiketler.length > 0 && (
                                <Box
                                    sx={{
                                        mt: 0.4,
                                        p: 1.2,
                                        borderRadius: 2.2,
                                        border: "1px dashed rgba(0,242,254,0.28)",
                                        background: "rgba(0,242,254,0.06)",
                                    }}
                                >
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {form.etiketler.map((t) => (
                                            <Chip
                                                key={t}
                                                label={t}
                                                onDelete={() => removeTag(t)}
                                                sx={{
                                                    borderRadius: 999,
                                                    bgcolor: "rgba(2,6,23,0.35)",
                                                    border: "1px solid rgba(255,255,255,0.12)",
                                                    color: "rgba(255,255,255,0.92)",
                                                    fontWeight: 900,
                                                    "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.55)" },
                                                    "&:hover .MuiChip-deleteIcon": { color: "#ef4444" },
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                {/* Right panel */}
                <Card
                    sx={{
                        flex: { xs: "unset", md: 0.55 },
                        borderRadius: 3,
                        background: "rgba(2,6,23,0.45)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        backdropFilter: "blur(14px)",
                        position: { md: "sticky" },
                        top: { md: 18 },
                        alignSelf: { md: "flex-start" },
                        transition: "transform .18s ease, box-shadow .18s ease",
                        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 30px 100px rgba(0,0,0,0.45)" },
                    }}
                >
                    <CardContent sx={{ p: { xs: 2, md: 2.6 } }}>
                        <Typography sx={{ fontWeight: 980, color: "#fff", mb: 1.2 }}>Kontrol</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.65 }}>
                            Kaydetmek için <b>Başlık</b>, <b>Tarih aralığı</b> ve en az <b>1 sorumlu</b> gerekli.
                        </Typography>

                        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 1.4 }} />

                        {!isValid ? (
                            <Alert severity="warning" variant="outlined" sx={{ borderColor: "rgba(255,255,255,0.20)", color: "rgba(255,255,255,0.88)" }}>
                                Eksik alanlar var. Sol taraftaki kırmızı uyarıları tamamla.
                            </Alert>
                        ) : (
                            <Alert severity="success" variant="outlined" sx={{ borderColor: "rgba(0,242,254,0.25)", color: "rgba(255,255,255,0.90)" }}>
                                Form hazır. Kaydedebilirsin.
                            </Alert>
                        )}

                        {!olusturanId && (
                            <Alert sx={{ mt: 1.2 }} severity="error" variant="outlined">
                                Oturum (olusturan_id) bulunamadı. localStorage "oturum" içinde id olmalı.
                            </Alert>
                        )}

                        {userBirimErr && (
                            <Alert sx={{ mt: 1.2 }} severity="info" variant="outlined">
                                {userBirimErr}
                            </Alert>
                        )}

                        {userErr && (
                            <Alert sx={{ mt: 1.2 }} severity="info" variant="outlined">
                                {userErr}
                            </Alert>
                        )}

                        <Box sx={{ mt: 1.2 }}>
                            <Typography sx={{ color: "rgba(255,255,255,0.72)", fontWeight: 900, fontSize: 13 }}>
                                Kullanıcının Birimi:
                            </Typography>
                            <Typography sx={{ color: "#fff", fontWeight: 950, mt: 0.3 }}>
                                {userBirimLoading ? "Yükleniyor..." : userBirim || "—"}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Stack>

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={toast.type} variant="filled" onClose={() => setToast((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default function GorevEkle() {
    return (
        <AppLayout>
            <GorevEkleContent />
        </AppLayout>
    );
}