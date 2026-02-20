import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Button,
    Divider,
    MenuItem,
    Snackbar,
    Alert,
    Stack,
    TextField,
    Typography,
    InputAdornment,
    Chip,
    LinearProgress,
    Dialog,
    DialogContent,
} from "@mui/material";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import {
    ClipboardPlus,
    AlignLeft,
    Flag,
    Send,
    Loader2,
    User,
    Boxes,
    Calendar,
    Paperclip,
    X,
    UploadCloud,
    Building2,
    Sparkles,
    CheckCircle2,
} from "lucide-react";
import AppLayout from "../bilesenler/AppLayout";

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("oturum") || "null");
    } catch {
        return null;
    }
}

function normRole(v) {
    return String(v || "").trim().toLocaleLowerCase("tr-TR").replaceAll("Ã„Â±", "i");
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.headers || {}),
        },
    });

    const contentType = res.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
        data = await res.json().catch(() => null);
    } else {
        const text = await res.text().catch(() => "");
        data = { message: text?.slice(0, 300) || "JSON olmayan cevap dÃƒÂ¶ndÃƒÂ¼." };
    }

    if (!res.ok) {
        const msg =
            data?.message || `HTTP ${res.status} ${res.statusText || ""}`.trim();
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }

    return data;
}

export default function YeniTalep() {
    const navigate = useNavigate();
    const user = getSession();

    const role = useMemo(() => normRole(user?.rol), [user?.rol]);
    const isAdmin = role === "admin" || role === "process";

    // Ã¢Å“â€¦ Proxy ile ÃƒÂ§alÃ„Â±Ã…Å¸acaÃ„Å¸Ã„Â±mÃ„Â±z iÃƒÂ§in BASE URL yok:
    // Root package.json iÃƒÂ§ine:  "proxy": "http://localhost:4000"
    const API = "http://localhost:4000";
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ open: false, type: "info", text: "" });
    const openToast = (type, text) => setToast({ open: true, type, text });
    const closeToast = () => setToast((t) => ({ ...t, open: false }));

    const sistemlerGorkem = useMemo(
        () => [
            "FTS",
            "ETS",
            "GELÃ„Â°R GÃ„Â°DER",
            "SÃ„Â°PARÃ„Â°Ã…Â OTOMASYON",
            "TEDARÃ„Â°K ANALÃ„Â°Z",
            "TALEP Ãƒâ€¡Ãƒâ€“ZÃƒÅ“M",
            "YENÃ„Â° SÃ„Â°STEM",
            "DÃ„Â°Ã„ÂER",
        ],
        []
    );

    const priorities = ["DÃƒÂ¼Ã…Å¸ÃƒÂ¼k", "Normal", "YÃƒÂ¼ksek", "Acil"];

    const [form, setForm] = useState({
        baslik: "",
        oncelik: "Normal",
        aciklama: "",
        birim: "",
        talep_edilen_id: "",
        talep_edilen: "",
        talep_edilecek_sistem: "",
        istenilen_tarih: "",
    });

    const [files, setFiles] = useState([]);
    const maxFiles = 6;
    const maxSizeMB = 15;

    const [birimler, setBirimler] = useState([]);
    const [birimUsers, setBirimUsers] = useState([]);
    const [loadingBirimler, setLoadingBirimler] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Ã¢Å“â€¦ baÃ…Å¸arÃ„Â± gÃƒÂ¶rseli / animasyon
    const [successOpen, setSuccessOpen] = useState(false);
    const [createdNo, setCreatedNo] = useState("");
    // Ã¢Å“â€¦ Birimler yÃƒÂ¼kle
    useEffect(() => {
        let alive = true;

        (async () => {
            setLoadingBirimler(true);
            try {
                const json = await fetchJson(`${API}/api/birimler`);
                if (!alive) return;

                const list = Array.isArray(json?.birimler) ? json.birimler : [];
                if (!list.length) openToast("warning", "Birim listesi boÃ…Å¸ geldi.");
                setBirimler(list);
            } catch (e) {
                openToast(
                    "error",
                    `Birimler alÃ„Â±namadÃ„Â±. ${e?.status ? `(HTTP ${e.status}) ` : ""}${e?.message || ""
                        }`.trim()
                );
                if (alive) setBirimler([]);
            } finally {
                if (alive) setLoadingBirimler(false);
            }
        })();

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Ã¢Å“â€¦ Birim seÃƒÂ§ilince kullanÃ„Â±cÃ„Â±larÃ„Â± yÃƒÂ¼kle
    useEffect(() => {
        let alive = true;

        if (!form.birim) {
            setBirimUsers([]);
            setForm((p) => ({
                ...p,
                talep_edilen_id: "",
                talep_edilen: "",
                talep_edilecek_sistem: "",
            }));
            return;
        }

        (async () => {
            setLoadingUsers(true);
            try {
                const json = await fetchJson(
                    `${API}/api/kullanicilar?birim=${encodeURIComponent(form.birim)}`
                );
                if (!alive) return;

                const list = Array.isArray(json?.users) ? json.users : [];
                setBirimUsers(list);

                if (
                    form.talep_edilen_id &&
                    !list.some((u) => String(u.id) === String(form.talep_edilen_id))
                ) {
                    setForm((p) => ({
                        ...p,
                        talep_edilen_id: "",
                        talep_edilen: "",
                        talep_edilecek_sistem: "",
                    }));
                }
            } catch (e) {
                openToast(
                    "error",
                    `KullanÃ„Â±cÃ„Â±lar alÃ„Â±namadÃ„Â±. ${e?.status ? `(HTTP ${e.status}) ` : ""}${e?.message || ""
                        }`.trim()
                );
                if (!alive) return;
                setBirimUsers([]);
            } finally {
                if (alive) setLoadingUsers(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [form.birim, form.talep_edilen_id]); // Ã¢Å“â€¦ API sabit, dependency'den ÃƒÂ§Ã„Â±kardÃ„Â±m

    const showSistemSelect = form.talep_edilen === "GÃƒâ€“RKEM Ãƒâ€¡ADIRCI";

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "birim") {
            setForm((p) => ({
                ...p,
                birim: value,
                talep_edilen_id: "",
                talep_edilen: "",
                talep_edilecek_sistem: "",
            }));
            return;
        }

        if (name === "talep_edilen_id") {
            const u = birimUsers.find((x) => String(x.id) === String(value));
            const adSoyad = u?.ad_soyad || "";
            setForm((p) => {
                const next = {
                    ...p,
                    talep_edilen_id: value,
                    talep_edilen: adSoyad,
                };
                if (adSoyad !== "GÃƒâ€“RKEM Ãƒâ€¡ADIRCI") next.talep_edilecek_sistem = "";
                return next;
            });
            return;
        }

        setForm((p) => ({ ...p, [name]: value }));
    };

    const onPickFiles = (e) => {
        const picked = Array.from(e.target.files || []);
        e.target.value = "";
        if (!picked.length) return;

        const merged = [...files, ...picked].slice(0, maxFiles);

        for (const f of merged) {
            const sizeMB = f.size / (1024 * 1024);
            if (sizeMB > maxSizeMB) {
                openToast("error", `Dosya ÃƒÂ§ok bÃƒÂ¼yÃƒÂ¼k: ${f.name} (max ${maxSizeMB}MB)`);
                return;
            }
        }
        setFiles(merged);
    };

    const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

    const validate = () => {
        if (!user?.id) return "Oturum bulunamadÃ„Â±. LÃƒÂ¼tfen tekrar giriÃ…Å¸ yap.";

        if (!form.birim) return "Birim seÃƒÂ§ilmeli.";
        if (!form.talep_edilen_id || !form.talep_edilen)
            return "Talep edilen kiÃ…Å¸i seÃƒÂ§ilmeli.";

        if (showSistemSelect) {
            if (!form.talep_edilecek_sistem) return "Talep edilecek sistem seÃƒÂ§ilmeli.";
            if (!sistemlerGorkem.includes(form.talep_edilecek_sistem))
                return "GeÃƒÂ§ersiz sistem seÃƒÂ§imi.";
        }

        if (!form.istenilen_tarih) return "Ã„Â°stenilen tarih seÃƒÂ§ilmeli.";

        const today = new Date();
        const todayStr = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        )
            .toISOString()
            .slice(0, 10);
        if (form.istenilen_tarih < todayStr) return "Ã„Â°stenilen tarih geÃƒÂ§miÃ…Å¸ olamaz.";

        if (!form.baslik.trim()) return "BaÃ…Å¸lÃ„Â±k zorunlu.";
        if (form.baslik.trim().length < 4) return "BaÃ…Å¸lÃ„Â±k en az 4 karakter olmalÃ„Â±.";

        if (!form.aciklama.trim()) return "AÃƒÂ§Ã„Â±klama zorunlu.";
        if (form.aciklama.trim().length < 10)
            return "AÃƒÂ§Ã„Â±klama en az 10 karakter olmalÃ„Â±.";

        if (files.length > maxFiles) return `En fazla ${maxFiles} dosya ekleyebilirsin.`;

        return null;
    };

    const submit = async () => {
        if (loading) return;

        const err = validate();
        if (err) return openToast("error", err);

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("baslik", form.baslik.trim());
            fd.append("aciklama", form.aciklama.trim());
            fd.append("oncelik", form.oncelik);
            fd.append("durum", "BEKLEMEDE");
            fd.append("istenilen_tarih", form.istenilen_tarih);
            fd.append("talep_edilen", form.talep_edilen);
            fd.append("talep_edilecek_sistem", showSistemSelect ? form.talep_edilecek_sistem : "");
            fd.append("olusturan_id", String(user.id));
            files.forEach((f) => fd.append("files", f));

            // Ã¢Å“â€¦ proxy sayesinde direkt /api/... ÃƒÂ§aÃ„Å¸Ã„Â±rÃ„Â±yoruz
            const res = await fetch(`${API}/api/talepler/create`, {
                method: "POST",
                body: fd,
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.message || "Talep oluÃ…Å¸turulamadÃ„Â±.");

            setCreatedNo(json?.talep_no || "");
            setSuccessOpen(true);

            setFiles([]);
            setForm((p) => ({ ...p, baslik: "", aciklama: "", oncelik: "Normal", istenilen_tarih: "" }));

            setTimeout(() => {
                setSuccessOpen(false);
                if (isAdmin) navigate("/admin/talepler", { replace: true });
                else navigate("/taleplerim", { replace: true });
            }, 1400);
        } catch (e) {
            openToast("error", e?.message || "Talep oluÃ…Å¸turulamadÃ„Â±.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Stack spacing={2.2} sx={{ maxWidth: 860, mx: "auto" }}>
                    <Stack direction="row" alignItems="center" spacing={1.2}>
                        <ClipboardPlus size={26} color="#00f2fe" />
                        <Typography variant="h5" sx={{ fontWeight: 950 }}>
                            Yeni Talep OluÃ…Å¸tur
                        </Typography>
                    </Stack>

                    <Typography sx={{ color: "rgba(255,255,255,0.55)" }}>
                        Talebini detaylÃ„Â± yazarsan ÃƒÂ§ÃƒÂ¶zÃƒÂ¼m sÃƒÂ¼reci daha hÃ„Â±zlÃ„Â± ilerler.
                    </Typography>

                    <Box
                        sx={{
                            p: { xs: 2.2, sm: 3 },
                            borderRadius: 3,
                            background: "rgba(15,23,42,0.86)",
                            border: "1px solid rgba(0,242,254,0.20)",
                            boxShadow: "0 0 0 1px rgba(0,242,254,0.06), 0 26px 70px rgba(0,0,0,0.55)",
                        }}
                    >
                        <Stack spacing={2}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    name="birim"
                                    value={form.birim}
                                    onChange={handleChange}
                                    label="Birim"
                                    disabled={loadingBirimler}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start" sx={{ color: "#00f2fe" }}>
                                                <Building2 size={16} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={selectSx}
                                >
                                    {loadingBirimler ? (
                                        <MenuItem value="">Birimler yÃƒÂ¼kleniyor...</MenuItem>
                                    ) : (
                                        [
                                            <MenuItem key="sec" value="">
                                                SeÃƒÂ§iniz
                                            </MenuItem>,
                                            ...birimler.map((b) => (
                                                <MenuItem key={b} value={b}>
                                                    {b}
                                                </MenuItem>
                                            )),
                                        ]
                                    )}
                                </TextField>

                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    name="talep_edilen_id"
                                    value={form.talep_edilen_id}
                                    onChange={handleChange}
                                    label="Talep Edilen KiÃ…Å¸i"
                                    disabled={!form.birim || loadingUsers}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start" sx={{ color: "#00f2fe" }}>
                                                <User size={16} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={selectSx}
                                >
                                    {!form.birim ? (
                                        <MenuItem value="">Ãƒâ€“nce birim seÃƒÂ§</MenuItem>
                                    ) : loadingUsers ? (
                                        <MenuItem value="">KullanÃ„Â±cÃ„Â±lar yÃƒÂ¼kleniyor...</MenuItem>
                                    ) : (
                                        [
                                            <MenuItem key="usec" value="">
                                                SeÃƒÂ§iniz
                                            </MenuItem>,
                                            ...birimUsers.map((u) => (
                                                <MenuItem key={u.id} value={u.id}>
                                                    {u.ad_soyad}
                                                </MenuItem>
                                            )),
                                        ]
                                    )}
                                </TextField>

                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    name="oncelik"
                                    value={form.oncelik}
                                    onChange={handleChange}
                                    label="Ãƒâ€“ncelik"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start" sx={{ color: "#00f2fe" }}>
                                                <Flag size={16} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={selectSx}
                                >
                                    {priorities.map((p) => (
                                        <MenuItem key={p} value={p}>
                                            {p}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Stack>

                            <ModernInput
                                name="baslik"
                                label="BaÃ…Å¸lÃ„Â±k"
                                value={form.baslik}
                                onChange={handleChange}
                                placeholder="Ãƒâ€“rn: YazÃ„Â±cÃ„Â± baÃ„Å¸lantÃ„Â± sorunu"
                                icon={<ClipboardPlus size={16} />}
                            />

                            <TextField
                                fullWidth
                                size="small"
                                name="istenilen_tarih"
                                value={form.istenilen_tarih}
                                onChange={handleChange}
                                label="Ã„Â°stenilen Tarih"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start" sx={{ color: "#00f2fe" }}>
                                            <Calendar size={16} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={inputSx}
                            />

                            {showSistemSelect && (
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    name="talep_edilecek_sistem"
                                    value={form.talep_edilecek_sistem}
                                    onChange={handleChange}
                                    label="Talep Edilecek Sistem"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start" sx={{ color: "#00f2fe" }}>
                                                <Boxes size={16} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={selectSx}
                                >
                                    {sistemlerGorkem.map((s) => (
                                        <MenuItem key={s} value={s}>
                                            {s}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}

                            <TextField
                                fullWidth
                                multiline
                                minRows={6}
                                name="aciklama"
                                value={form.aciklama}
                                onChange={handleChange}
                                label="AÃƒÂ§Ã„Â±klama"
                                placeholder="Sorunu detaylÃ„Â± anlat: ne oldu, ne zaman oldu, hata mesajÃ„Â± var mÃ„Â±, hangi cihaz/uygulama?"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment
                                            position="start"
                                            sx={{ color: "#00f2fe", alignSelf: "flex-start", mt: 1.2 }}
                                        >
                                            <AlignLeft size={16} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={textAreaSx}
                            />

                            {/* Dosyalar */}
                            <Box
                                sx={{
                                    p: 1.4,
                                    borderRadius: 2.4,
                                    border: "1px dashed rgba(0,242,254,0.35)",
                                    bgcolor: "rgba(255,255,255,0.02)",
                                }}
                            >
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ sm: "center" }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                                        <Paperclip size={16} color="#00f2fe" />
                                        <Box>
                                            <Typography sx={{ fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>
                                                Dosya Ekle (opsiyonel)
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.50)" }}>
                                                En fazla {maxFiles} dosya Ã¢â‚¬Â¢ Maks {maxSizeMB}MB / dosya
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Button
                                        component="label"
                                        variant="outlined"
                                        startIcon={<UploadCloud size={18} />}
                                        sx={{
                                            borderRadius: 2,
                                            borderColor: "rgba(0,242,254,0.40)",
                                            color: "#e2e8f0",
                                            fontWeight: 900,
                                            "&:hover": { borderColor: "rgba(0,242,254,0.75)", bgcolor: "rgba(255,255,255,0.03)" },
                                        }}
                                        disabled={loading || files.length >= maxFiles}
                                    >
                                        Dosya SeÃƒÂ§
                                        <input hidden type="file" multiple onChange={onPickFiles} />
                                    </Button>
                                </Stack>

                                {files.length > 0 && (
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.4 }}>
                                        {files.map((f, idx) => (
                                            <Chip
                                                key={`${f.name}-${idx}`}
                                                label={`${f.name} Ã¢â‚¬Â¢ ${Math.round(f.size / 1024)} KB`}
                                                onDelete={() => removeFile(idx)}
                                                deleteIcon={<X size={14} />}
                                                sx={{
                                                    bgcolor: "rgba(255,255,255,0.04)",
                                                    color: "rgba(255,255,255,0.85)",
                                                    border: "1px solid rgba(255,255,255,0.10)",
                                                    fontWeight: 800,
                                                    "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.55)" },
                                                    "&:hover .MuiChip-deleteIcon": { color: "#fff" },
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Box>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                            {loading && <LinearProgress sx={{ borderRadius: 99, bgcolor: "rgba(255,255,255,0.08)" }} />}

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                                        OluÃ…Å¸turan:{" "}
                                        <b style={{ color: "rgba(255,255,255,0.85)" }}>
                                            {user?.ad} {user?.soyad}
                                        </b>
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                                        {user?.birim} Ã¢â‚¬Â¢ {user?.unvan}
                                    </Typography>
                                </Box>

                                <Button
                                    onClick={submit}
                                    disabled={loading}
                                    variant="contained"
                                    endIcon={
                                        loading ? (
                                            <motion.span
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                                                style={{ display: "inline-flex" }}
                                            >
                                                <Loader2 size={18} />
                                            </motion.span>
                                        ) : (
                                            <Send size={18} />
                                        )
                                    }
                                    sx={{
                                        px: 2.2,
                                        py: 1.2,
                                        borderRadius: 2,
                                        bgcolor: "#00f2fe",
                                        color: "#020617",
                                        fontWeight: 900,
                                        "&:hover": { bgcolor: "#22d3ee" },
                                        boxShadow: "0 0 0 1px rgba(0,242,254,0.20), 0 14px 40px rgba(0,242,254,0.12)",
                                    }}
                                >
                                    Talebi GÃƒÂ¶nder
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                </Stack>
            </motion.div>

            {/* Ã¢Å“â€¦ Dinamik baÃ…Å¸arÃ„Â± gÃƒÂ¶rseli */}
            <Dialog
                open={successOpen}
                onClose={() => setSuccessOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: "rgba(10,15,28,0.98)",
                        borderRadius: 4,
                        border: "1px solid rgba(255,255,255,0.08)",
                    },
                }}
            >
                <DialogContent sx={{ p: 3 }}>
                    <Confetti numberOfPieces={260} recycle={false} />
                    <Stack spacing={1.4} alignItems="center" sx={{ textAlign: "center", minWidth: { xs: 280, sm: 360 } }}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 280, damping: 18 }}
                        >
                            <Box
                                sx={{
                                    width: 78,
                                    height: 78,
                                    borderRadius: 999,
                                    display: "grid",
                                    placeItems: "center",
                                    bgcolor: "rgba(0,242,254,0.14)",
                                    border: "1px solid rgba(0,242,254,0.26)",
                                    boxShadow: "0 0 0 10px rgba(0,242,254,0.06)",
                                }}
                            >
                                <CheckCircle2 size={34} color="#00f2fe" />
                            </Box>
                        </motion.div>

                        <Typography sx={{ color: "#fff", fontWeight: 950, fontSize: 18, letterSpacing: "-0.4px" }}>
                            Talep baÃ…Å¸arÃ„Â±yla oluÃ…Å¸turuldu!
                        </Typography>

                        {createdNo ? (
                            <Chip
                                icon={<Sparkles size={16} />}
                                label={`Talep No: ${createdNo}`}
                                sx={{
                                    mt: 0.2,
                                    bgcolor: "rgba(255,255,255,0.04)",
                                    color: "rgba(255,255,255,0.9)",
                                    fontWeight: 950,
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    "& .MuiChip-icon": { color: "#00f2fe" },
                                }}
                            />
                        ) : (
                            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                                Talep numarasÃ„Â± backendÃ¢â‚¬â„¢den dÃƒÂ¶ndÃƒÂ¼rÃƒÂ¼lmedi (API cevabÃ„Â±na talep_no ekle).
                            </Typography>
                        )}

                        <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                            YÃƒÂ¶nlendiriliyorsunÃ¢â‚¬Â¦
                        </Typography>
                    </Stack>
                </DialogContent>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={3200}
                onClose={closeToast}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={closeToast} severity={toast.type} variant="filled" sx={{ width: "100%" }}>
                    {toast.text}
                </Alert>
            </Snackbar>
        </AppLayout>
    );
}

function ModernInput({ icon, ...props }) {
    return (
        <TextField
            {...props}
            fullWidth
            size="small"
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start" sx={{ color: "#00f2fe" }}>
                        {icon}
                    </InputAdornment>
                ),
            }}
            sx={inputSx}
        />
    );
}

const inputSx = {
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 2.2,
        "& fieldset": { borderColor: "rgba(255,255,255,0.10)" },
        "&:hover fieldset": { borderColor: "rgba(0,242,254,0.35)" },
        "&.Mui-focused fieldset": { borderColor: "#00f2fe" },
    },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.55)" },
};

const selectSx = {
    ...inputSx,
    "& .MuiSelect-icon": { color: "rgba(255,255,255,0.35)" },
};

const textAreaSx = {
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 2.2,
        alignItems: "flex-start",
        "& fieldset": { borderColor: "rgba(255,255,255,0.10)" },
        "&:hover fieldset": { borderColor: "rgba(0,242,254,0.35)" },
        "&.Mui-focused fieldset": { borderColor: "#00f2fe" },
    },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.55)" },
};
