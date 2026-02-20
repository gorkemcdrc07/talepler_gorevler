import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Typography,
    Tooltip,
    Button,
    Alert,
} from "@mui/material";
import {
    Search,
    Filter,
    Calendar,
    CircleCheck,
    Clock,
    AlertTriangle,
    RefreshCcw,
    Plus,
    PlayCircle,
    Ban,
    Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../bilesenler/AppLayout";

const API_BASE = "http://localhost:4000";

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("oturum") || "null");
    } catch {
        return null;
    }
}

function pillSx(active = false) {
    return {
        height: 30,
        borderRadius: 999,
        fontWeight: 950,
        letterSpacing: 0.2,
        bgcolor: active ? "rgba(0,242,254,0.14)" : "rgba(255,255,255,0.06)",
        border: "1px solid",
        borderColor: active ? "rgba(0,242,254,0.30)" : "rgba(255,255,255,0.10)",
        color: active ? "#00f2fe" : "rgba(255,255,255,0.85)",
        transition: "transform .15s ease, border-color .15s ease, background .15s ease",
        "&:hover": { transform: "translateY(-1px)" },
    };
}

function fieldSx() {
    return {
        "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.72)", fontWeight: 850 },
        "& .MuiInputLabel-root.Mui-focused": { color: "#00f2fe" },
        "& .MuiOutlinedInput-root": {
            borderRadius: 2.6,
            bgcolor: "rgba(2,6,23,0.35)",
            backdropFilter: "blur(12px)",
            transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
            "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
            "&:hover fieldset": { borderColor: "rgba(0,242,254,0.28)" },
            "&.Mui-focused fieldset": { borderColor: "rgba(0,242,254,0.55)" },
            "&:hover": {
                boxShadow: "0 0 0 1px rgba(0,242,254,0.10), 0 14px 32px rgba(0,0,0,0.30)",
                transform: "translateY(-1px)",
            },
        },
        "& .MuiOutlinedInput-input": { color: "rgba(255,255,255,0.92)", fontWeight: 780 },
        "& input::placeholder": { color: "rgba(255,255,255,0.35)", opacity: 1 },
        "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.70)" },
        "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.52)", marginLeft: 0 },
    };
}

const menuPropsDark = {
    PaperProps: {
        sx: {
            mt: 1,
            borderRadius: 2.5,
            bgcolor: "rgba(2,6,23,0.96)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(12px)",
            color: "rgba(255,255,255,0.92)",
            overflow: "hidden",
        },
    },
};

function formatDate(d) {
    if (!d) return "-";
    return String(d).slice(0, 10);
}

function priorityColor(p) {
    const v = String(p || "").toLowerCase();
    if (v === "kritik") return { bg: "rgba(239,68,68,0.15)", bd: "rgba(239,68,68,0.35)", tx: "#ef4444" };
    if (v === "yuksek") return { bg: "rgba(245,158,11,0.14)", bd: "rgba(245,158,11,0.35)", tx: "#f59e0b" };
    if (v === "orta") return { bg: "rgba(0,242,254,0.12)", bd: "rgba(0,242,254,0.25)", tx: "#00f2fe" };
    if (v === "dusuk") return { bg: "rgba(34,211,238,0.10)", bd: "rgba(34,211,238,0.22)", tx: "#22d3ee" };
    return { bg: "rgba(148,163,184,0.10)", bd: "rgba(148,163,184,0.18)", tx: "rgba(255,255,255,0.75)" };
}

const STATUS = [
    { value: "hepsi", label: "Hepsi", icon: <Layers size={14} /> },
    { value: "acik", label: "Açık", icon: <Clock size={14} /> },
    { value: "islemde", label: "İşlemde", icon: <PlayCircle size={14} /> },
    { value: "beklemede", label: "Beklemede", icon: <Clock size={14} /> },
    { value: "tamamlandi", label: "Tamamlandı", icon: <CircleCheck size={14} /> },
    { value: "iptal", label: "İptal", icon: <Ban size={14} /> },
    { value: "gecikti", label: "Gecikti", icon: <AlertTriangle size={14} /> },
];

function normalizeStatus(s) {
    const v = String(s || "").toLowerCase().trim();
    if (["bitti", "tamamlandi", "tamamlandı"].includes(v)) return "tamamlandi";
    if (["islemde", "işlemde", "inprogress"].includes(v)) return "islemde";
    if (["beklemede", "pending"].includes(v)) return "beklemede";
    if (["iptal", "iptal edildi", "cancelled"].includes(v)) return "iptal";
    if (["gecikti", "gecikmis", "gecikmiş", "overdue"].includes(v)) return "gecikti";
    if (["acik", "açık", "open"].includes(v)) return "acik";
    return v || "acik";
}

function isOverdue(task) {
    const st = normalizeStatus(task?.durum);
    if (st === "tamamlandi" || st === "iptal") return false;
    const end = String(task?.bitis_tarih || "").slice(0, 10);
    if (!end) return false;
    const today = new Date().toISOString().slice(0, 10);
    return end < today;
}

function statusMeta(task) {
    const st = isOverdue(task) ? "gecikti" : normalizeStatus(task?.durum);

    if (st === "tamamlandi")
        return { key: "tamamlandi", label: "Tamamlandı", icon: <CircleCheck size={14} />, c: "#22c55e", bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.28)", progress: 100 };
    if (st === "islemde")
        return { key: "islemde", label: "İşlemde", icon: <PlayCircle size={14} />, c: "#00f2fe", bg: "rgba(0,242,254,0.12)", bd: "rgba(0,242,254,0.25)", progress: 60 };
    if (st === "beklemede")
        return { key: "beklemede", label: "Beklemede", icon: <Clock size={14} />, c: "#a78bfa", bg: "rgba(167,139,250,0.12)", bd: "rgba(167,139,250,0.25)", progress: 30 };
    if (st === "iptal")
        return { key: "iptal", label: "İptal", icon: <Ban size={14} />, c: "#94a3b8", bg: "rgba(148,163,184,0.12)", bd: "rgba(148,163,184,0.22)", progress: 0 };
    if (st === "gecikti")
        return { key: "gecikti", label: "Gecikti", icon: <AlertTriangle size={14} />, c: "#ef4444", bg: "rgba(239,68,68,0.14)", bd: "rgba(239,68,68,0.28)", progress: 80 };
    return { key: "acik", label: "Açık", icon: <Clock size={14} />, c: "#f59e0b", bg: "rgba(245,158,11,0.14)", bd: "rgba(245,158,11,0.28)", progress: 15 };
}

async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
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

function dayDiff(toISO) {
    if (!toISO) return null;
    const end = new Date(String(toISO).slice(0, 10) + "T00:00:00");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ms = end.getTime() - today.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
}

function dueBadge(task) {
    const d = dayDiff(task?.bitis_tarih);
    if (d == null) return null;
    if (d < 0) return { text: `${Math.abs(d)} gün gecikti`, tone: "danger" };
    if (d === 0) return { text: "Bugün bitiyor", tone: "warn" };
    if (d <= 2) return { text: `${d} gün kaldı`, tone: "warn" };
    return { text: `${d} gün kaldı`, tone: "ok" };
}

function toneChip(tone) {
    if (tone === "danger") return { bg: "rgba(239,68,68,0.14)", bd: "rgba(239,68,68,0.28)", tx: "#ef4444" };
    if (tone === "warn") return { bg: "rgba(245,158,11,0.14)", bd: "rgba(245,158,11,0.28)", tx: "#f59e0b" };
    return { bg: "rgba(34,211,238,0.10)", bd: "rgba(34,211,238,0.20)", tx: "#22d3ee" };
}

function ModernSectionTitle({ title, count }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, mb: 1.2 }}>
            <Box
                sx={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "linear-gradient(90deg, rgba(0,242,254,1), rgba(167,139,250,0.95))",
                    boxShadow: "0 0 0 5px rgba(0,242,254,0.08)",
                }}
            />
            <Typography sx={{ color: "rgba(255,255,255,0.92)", fontWeight: 1000, letterSpacing: -0.2 }}>
                {title}
            </Typography>
            <Chip
                label={count}
                sx={{
                    height: 24,
                    borderRadius: 999,
                    fontWeight: 950,
                    bgcolor: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.85)",
                }}
            />
            <Box sx={{ flex: 1 }} />
            <Box sx={{ height: 1, flex: 1, bgcolor: "rgba(255,255,255,0.06)" }} />
        </Stack>
    );
}

function GorevlerimContent() {
    const navigate = useNavigate();
    const session = getSession();
    const myId = session?.id || session?.user_id || session?.kullanici_id || null;

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [tasks, setTasks] = useState([]);

    // filters
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("hepsi");
    const [priority, setPriority] = useState("hepsi");
    const [onlyMine, setOnlyMine] = useState(true);

    useEffect(() => {
        if (!myId) setOnlyMine(false);
    }, [myId]);

    const load = async () => {
        setLoading(true);
        setErr("");
        try {
            const url =
                onlyMine && myId
                    ? `${API_BASE}/api/gorevler?userId=${encodeURIComponent(myId)}`
                    : `${API_BASE}/api/gorevler`;

            const data = await fetchJson(url);
            setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
        } catch (e) {
            setErr(e?.message || "Görevler yüklenemedi.");
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onlyMine]);

    const enriched = useMemo(() => {
        return (tasks || []).map((t) => {
            const sm = statusMeta(t);
            return { ...t, _statusKey: sm.key };
        });
    }, [tasks]);

    const filtered = useMemo(() => {
        let arr = [...enriched];

        const qx = q.trim().toLowerCase();
        if (qx) {
            arr = arr.filter((t) => {
                const hay = `${t?.baslik || ""} ${t?.aciklama || ""} ${t?.birim || ""}`.toLowerCase();
                return hay.includes(qx);
            });
        }

        if (status !== "hepsi") arr = arr.filter((t) => t?._statusKey === status);
        if (priority !== "hepsi") arr = arr.filter((t) => String(t?.oncelik || "").toLowerCase() === priority);

        // bitiş tarihi yakın olan üstte
        arr.sort((a, b) => String(a?.bitis_tarih || "").localeCompare(String(b?.bitis_tarih || "")));
        return arr;
    }, [enriched, q, status, priority]);

    const stats = useMemo(() => {
        const total = enriched.length;
        const open = enriched.filter((t) => t?._statusKey === "acik").length;
        const inprog = enriched.filter((t) => t?._statusKey === "islemde").length;
        const done = enriched.filter((t) => t?._statusKey === "tamamlandi").length;
        const overdue = enriched.filter((t) => t?._statusKey === "gecikti").length;
        return { total, open, inprog, done, overdue };
    }, [enriched]);

    // Sectioned rendering for premium dashboard feel
    const sections = useMemo(() => {
        const a = filtered.filter((t) => statusMeta(t).key === "gecikti");
        const b = filtered.filter((t) => {
            const d = dayDiff(t?.bitis_tarih);
            return d != null && d >= 0 && d <= 2 && statusMeta(t).key !== "gecikti";
        });
        const c = filtered.filter((t) => !a.includes(t) && !b.includes(t));
        return [
            { title: "Gecikenler", items: a },
            { title: "Yaklaşanlar (0-2 gün)", items: b },
            { title: "Diğerleri", items: c },
        ].filter((s) => s.items.length);
    }, [filtered]);

    return (
        <Box
            sx={{
                maxWidth: 1180,
                mx: "auto",
                position: "relative",
                px: { xs: 1.2, md: 0 },
                pb: 6,

                // Aurora background
                "&::before": {
                    content: '""',
                    position: "fixed",
                    inset: 0,
                    zIndex: -2,
                    background:
                        "radial-gradient(1200px 800px at 15% 10%, rgba(0,242,254,0.18), transparent 55%)," +
                        "radial-gradient(1000px 700px at 80% 20%, rgba(167,139,250,0.14), transparent 55%)," +
                        "radial-gradient(900px 650px at 60% 85%, rgba(34,211,238,0.12), transparent 55%)," +
                        "linear-gradient(180deg, rgba(2,6,23,0.95), rgba(2,6,23,0.92))",
                },
                "&::after": {
                    content: '""',
                    position: "fixed",
                    inset: 0,
                    zIndex: -1,
                    pointerEvents: "none",
                    background:
                        "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                    maskImage: "radial-gradient(circle at 30% 10%, black 25%, transparent 70%)",
                    opacity: 0.35,
                },

                "@keyframes borderFlow": {
                    "0%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                    "100%": { backgroundPosition: "0% 50%" },
                },
                "@keyframes shimmer": {
                    "0%": { transform: "translateX(-120%)" },
                    "100%": { transform: "translateX(120%)" },
                },
            }}
        >
            {/* HERO HEADER */}
            <Box
                sx={{
                    mb: 2,
                    p: { xs: 2, md: 3 },
                    borderRadius: 4,
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background:
                        "linear-gradient(135deg, rgba(0,242,254,0.14), rgba(2,6,23,0.55) 45%, rgba(167,139,250,0.10))",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        inset: -2,
                        background:
                            "linear-gradient(90deg, rgba(0,242,254,0.0), rgba(0,242,254,0.20), rgba(167,139,250,0.18), rgba(0,242,254,0.0))",
                        backgroundSize: "220% 220%",
                        animation: "borderFlow 7s ease infinite",
                        opacity: 0.75,
                        pointerEvents: "none",
                    }}
                />
                <Box
                    sx={{
                        position: "absolute",
                        right: -120,
                        top: -120,
                        width: 320,
                        height: 320,
                        background: "radial-gradient(circle, rgba(0,242,254,0.18), transparent 60%)",
                        filter: "blur(2px)",
                        opacity: 0.9,
                        pointerEvents: "none",
                    }}
                />

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ position: "relative" }}>
                    <Stack spacing={0.6} sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 1000, fontSize: { xs: 22, md: 28 }, color: "#fff", letterSpacing: -0.5, lineHeight: 1.05 }}>
                            Görevlerim
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.70)", fontSize: 13 }}>
                            Ara • filtrele • durumlara göre yönet — bitiş tarihi yakın olanlar en üstte.
                        </Typography>

                        {/* Stat mini cards */}
                        <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap sx={{ mt: 1.2 }}>
                            {[
                                { k: "hepsi", t: "Toplam", v: stats.total },
                                { k: "acik", t: "Açık", v: stats.open },
                                { k: "islemde", t: "İşlemde", v: stats.inprog },
                                { k: "tamamlandi", t: "Tamam", v: stats.done },
                                { k: "gecikti", t: "Gecikti", v: stats.overdue },
                            ].map((x) => (
                                <Box
                                    key={x.k}
                                    onClick={() => setStatus(x.k)}
                                    role="button"
                                    sx={{
                                        cursor: "pointer",
                                        userSelect: "none",
                                        px: 1.4,
                                        py: 0.9,
                                        borderRadius: 3,
                                        border: "1px solid",
                                        borderColor: status === x.k ? "rgba(0,242,254,0.35)" : "rgba(255,255,255,0.10)",
                                        bgcolor: status === x.k ? "rgba(0,242,254,0.10)" : "rgba(255,255,255,0.05)",
                                        backdropFilter: "blur(10px)",
                                        transition: "transform .15s ease, border-color .15s ease, background .15s ease",
                                        "&:hover": {
                                            transform: "translateY(-1px)",
                                            borderColor: "rgba(0,242,254,0.28)",
                                            bgcolor: "rgba(0,242,254,0.08)",
                                        },
                                    }}
                                >
                                    <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.62)", fontWeight: 900 }}>
                                        {x.t}
                                    </Typography>
                                    <Typography sx={{ fontSize: 14, color: "#fff", fontWeight: 1000, letterSpacing: -0.2 }}>
                                        {x.v}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mt: 1.1 }} flexWrap="wrap" useFlexGap>
                            <Chip icon={<Calendar size={16} />} label="Bitiş tarihi yaklaşanlar üstte" sx={pillSx(true)} />
                        </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Yenile">
                            <IconButton
                                onClick={load}
                                sx={{
                                    borderRadius: 2.5,
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    color: "rgba(255,255,255,0.92)",
                                    bgcolor: "rgba(255,255,255,0.04)",
                                    "&:hover": { background: "rgba(0,242,254,0.06)", borderColor: "rgba(0,242,254,0.25)" },
                                }}
                            >
                                <RefreshCcw size={18} />
                            </IconButton>
                        </Tooltip>

                        <Button
                            variant="contained"
                            startIcon={<Plus size={18} />}
                            onClick={() => navigate("/gorev/ekle")}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 1000,
                                px: 2.2,
                                background: "linear-gradient(90deg, rgba(0,242,254,1), rgba(167,139,250,0.92))",
                                color: "#02121a",
                                boxShadow: "0 18px 60px rgba(0,242,254,0.18)",
                                "&:hover": {
                                    background: "linear-gradient(90deg, rgba(0,242,254,1), rgba(167,139,250,1))",
                                    boxShadow: "0 22px 70px rgba(0,242,254,0.22)",
                                },
                            }}
                        >
                            Görev Ekle
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            {/* FILTER TOOLBAR (sticky glass) */}
            <Card
                sx={{
                    mb: 2,
                    borderRadius: 4,
                    position: "sticky",
                    top: 14,
                    zIndex: 5,
                    background: "rgba(2,6,23,0.50)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    backdropFilter: "blur(18px)",
                    overflow: "hidden",
                    boxShadow: "0 18px 70px rgba(0,0,0,0.35)",
                }}
            >
                <Box
                    sx={{
                        height: 2,
                        width: "100%",
                        background:
                            "linear-gradient(90deg, rgba(0,242,254,0.0), rgba(0,242,254,0.65), rgba(167,139,250,0.55), rgba(0,242,254,0.0))",
                        opacity: 0.75,
                    }}
                />
                <CardContent sx={{ p: { xs: 1.6, md: 2.2 } }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                        <TextField
                            fullWidth
                            label="Ara"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Başlık, açıklama, birim..."
                            sx={fieldSx()}
                            InputProps={{
                                startAdornment: (
                                    <Box sx={{ mr: 1, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.85)" }}>
                                        <Search size={18} />
                                    </Box>
                                ),
                            }}
                        />

                        <TextField
                            select
                            label="Durum"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            sx={fieldSx()}
                            SelectProps={{ MenuProps: menuPropsDark }}
                            fullWidth
                        >
                            {STATUS.map((s) => (
                                <MenuItem key={s.value} value={s.value} sx={{ color: "rgba(255,255,255,0.92)" }}>
                                    {s.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Öncelik"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            sx={fieldSx()}
                            SelectProps={{ MenuProps: menuPropsDark }}
                            fullWidth
                        >
                            <MenuItem value="hepsi" sx={{ color: "rgba(255,255,255,0.92)" }}>
                                Hepsi
                            </MenuItem>
                            <MenuItem value="rutin" sx={{ color: "rgba(255,255,255,0.92)" }}>
                                RUTİN
                            </MenuItem>
                            <MenuItem value="dusuk" sx={{ color: "rgba(255,255,255,0.92)" }}>
                                Düşük
                            </MenuItem>
                            <MenuItem value="orta" sx={{ color: "rgba(255,255,255,0.92)" }}>
                                Orta
                            </MenuItem>
                            <MenuItem value="yuksek" sx={{ color: "rgba(255,255,255,0.92)" }}>
                                Yüksek
                            </MenuItem>
                            <MenuItem value="kritik" sx={{ color: "rgba(255,255,255,0.92)" }}>
                                Kritik
                            </MenuItem>
                        </TextField>

                        <Button
                            variant={onlyMine ? "contained" : "outlined"}
                            onClick={() => setOnlyMine((v) => !v)}
                            startIcon={<Filter size={18} />}
                            sx={{
                                borderRadius: 2.6,
                                fontWeight: 1000,
                                ...(onlyMine
                                    ? {
                                        background: "rgba(0,242,254,0.14)",
                                        color: "#00f2fe",
                                        border: "1px solid rgba(0,242,254,0.22)",
                                        "&:hover": { background: "rgba(0,242,254,0.18)" },
                                    }
                                    : {
                                        borderColor: "rgba(255,255,255,0.16)",
                                        color: "rgba(255,255,255,0.92)",
                                        "&:hover": { borderColor: "rgba(0,242,254,0.25)", background: "rgba(0,242,254,0.06)" },
                                    }),
                                minWidth: 170,
                            }}
                        >
                            {onlyMine ? "Sadece Benim" : "Tüm Görevler"}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* LIST */}
            {loading ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 7 }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 1.5, color: "rgba(255,255,255,0.7)" }}>Yükleniyor...</Typography>
                </Box>
            ) : err ? (
                <Alert severity="error" variant="outlined" sx={{ color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.18)" }}>
                    {err}
                </Alert>
            ) : filtered.length === 0 ? (
                <Card
                    sx={{
                        borderRadius: 4,
                        background: "rgba(2,6,23,0.45)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        backdropFilter: "blur(12px)",
                        overflow: "hidden",
                    }}
                >
                    <Box
                        sx={{
                            height: 2,
                            width: "100%",
                            background:
                                "linear-gradient(90deg, rgba(0,242,254,0.0), rgba(0,242,254,0.65), rgba(167,139,250,0.55), rgba(0,242,254,0.0))",
                            opacity: 0.65,
                        }}
                    />
                    <CardContent sx={{ p: 3 }}>
                        <Typography sx={{ fontWeight: 1000, color: "#fff" }}>Görev bulunamadı</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.70)", mt: 0.5 }}>
                            Filtreleri temizleyebilir veya yeni görev ekleyebilirsin.
                        </Typography>

                        <Button
                            sx={{
                                mt: 2,
                                borderRadius: 2.6,
                                fontWeight: 1000,
                                background: "linear-gradient(90deg, rgba(0,242,254,1), rgba(167,139,250,0.92))",
                                color: "#02121a",
                                "&:hover": { background: "linear-gradient(90deg, rgba(0,242,254,1), rgba(167,139,250,1))" },
                            }}
                            variant="contained"
                            startIcon={<Plus size={18} />}
                            onClick={() => navigate("/gorev/ekle")}
                        >
                            Görev Ekle
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {sections.map((sec) => (
                        <Box key={sec.title}>
                            <ModernSectionTitle title={sec.title} count={sec.items.length} />

                            <Stack spacing={2}>
                                {sec.items.map((t) => {
                                    const p = priorityColor(t?.oncelik);
                                    const sm = statusMeta(t);
                                    const due = dueBadge(t);
                                    const dueTone = due ? toneChip(due.tone) : null;

                                    return (
                                        <Card
                                            key={t?.id}
                                            sx={{
                                                borderRadius: 4,
                                                position: "relative",
                                                overflow: "hidden",
                                                background: "rgba(2,6,23,0.55)",
                                                border: "1px solid rgba(255,255,255,0.10)",
                                                backdropFilter: "blur(16px)",
                                                boxShadow: "0 26px 110px rgba(0,0,0,0.45)",
                                                transition: "transform .18s ease, box-shadow .18s ease",
                                                "&:hover": { transform: "translateY(-3px)", boxShadow: "0 34px 140px rgba(0,0,0,0.55)" },

                                                // Gradient border overlay
                                                "&::before": {
                                                    content: '""',
                                                    position: "absolute",
                                                    inset: 0,
                                                    padding: "1px",
                                                    borderRadius: "inherit",
                                                    background:
                                                        "linear-gradient(135deg, rgba(0,242,254,0.35), rgba(255,255,255,0.06), rgba(167,139,250,0.22))",
                                                    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                                                    WebkitMaskComposite: "xor",
                                                    maskComposite: "exclude",
                                                    opacity: 0.65,
                                                    pointerEvents: "none",
                                                },
                                            }}
                                        >
                                            {/* mini progress */}
                                            <Box sx={{ height: 4, width: "100%", bgcolor: "rgba(255,255,255,0.06)" }}>
                                                <Box
                                                    sx={{
                                                        height: 4,
                                                        width: `${sm.progress}%`,
                                                        bgcolor: sm.c,
                                                        transition: "width .25s ease",
                                                        position: "relative",
                                                        overflow: "hidden",
                                                        "&::after": {
                                                            content: '""',
                                                            position: "absolute",
                                                            inset: 0,
                                                            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
                                                            animation: "shimmer 1.6s ease-in-out infinite",
                                                        },
                                                    }}
                                                />
                                            </Box>

                                            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                                                <Stack spacing={1.2}>
                                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                                                        <Typography sx={{ flex: 1, fontWeight: 1000, color: "#fff", fontSize: 16, letterSpacing: -0.2 }}>
                                                            {t?.baslik}
                                                        </Typography>

                                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                                                            <Chip
                                                                icon={sm.icon}
                                                                label={sm.label}
                                                                sx={{
                                                                    height: 30,
                                                                    borderRadius: 999,
                                                                    fontWeight: 1000,
                                                                    bgcolor: sm.bg,
                                                                    border: "1px solid",
                                                                    borderColor: sm.bd,
                                                                    color: sm.c,
                                                                }}
                                                            />

                                                            <Chip
                                                                label={String(t?.oncelik || "rutin").toUpperCase()}
                                                                sx={{
                                                                    height: 30,
                                                                    borderRadius: 999,
                                                                    fontWeight: 1000,
                                                                    bgcolor: p.bg,
                                                                    border: "1px solid",
                                                                    borderColor: p.bd,
                                                                    color: p.tx,
                                                                }}
                                                            />

                                                            {due && (
                                                                <Chip
                                                                    label={due.text}
                                                                    sx={{
                                                                        height: 30,
                                                                        borderRadius: 999,
                                                                        fontWeight: 1000,
                                                                        bgcolor: dueTone.bg,
                                                                        border: "1px solid",
                                                                        borderColor: dueTone.bd,
                                                                        color: dueTone.tx,
                                                                    }}
                                                                />
                                                            )}

                                                            {/* Quick action: detail */}
                                                            <Tooltip title="Detay">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => navigate(`/gorev/${t?.id}`)}
                                                                    sx={{
                                                                        borderRadius: 2,
                                                                        border: "1px solid rgba(255,255,255,0.12)",
                                                                        color: "rgba(255,255,255,0.85)",
                                                                        bgcolor: "rgba(255,255,255,0.04)",
                                                                        "&:hover": { bgcolor: "rgba(0,242,254,0.06)", borderColor: "rgba(0,242,254,0.25)" },
                                                                    }}
                                                                >
                                                                    <Search size={16} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Stack>
                                                    </Stack>

                                                    {(t?.aciklama || "").trim() && (
                                                        <Typography sx={{ color: "rgba(255,255,255,0.74)", fontSize: 13, lineHeight: 1.55 }}>
                                                            {t.aciklama}
                                                        </Typography>
                                                    )}

                                                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                                                        <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>
                                                            <b>Birim:</b> {t?.birim || "-"}
                                                        </Typography>

                                                        <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>
                                                            <b>Tarih:</b> {formatDate(t?.baslangic_tarih)} → {formatDate(t?.bitis_tarih)}
                                                        </Typography>

                                                        <Box sx={{ flex: 1 }} />

                                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                            {(t?.sorumlular || []).slice(0, 3).map((u) => (
                                                                <Chip
                                                                    key={`${t?.id}-${u?.id}-${u?.ad_soyad}`}
                                                                    label={u?.ad_soyad}
                                                                    sx={{
                                                                        height: 28,
                                                                        borderRadius: 999,
                                                                        bgcolor: "rgba(255,255,255,0.06)",
                                                                        border: "1px solid rgba(255,255,255,0.10)",
                                                                        color: "rgba(255,255,255,0.90)",
                                                                        fontWeight: 900,
                                                                    }}
                                                                />
                                                            ))}
                                                            {(t?.sorumlular || []).length > 3 && (
                                                                <Chip
                                                                    label={`+${(t?.sorumlular || []).length - 3}`}
                                                                    sx={{
                                                                        height: 28,
                                                                        borderRadius: 999,
                                                                        bgcolor: "rgba(0,242,254,0.10)",
                                                                        border: "1px solid rgba(0,242,254,0.18)",
                                                                        color: "#00f2fe",
                                                                        fontWeight: 950,
                                                                    }}
                                                                />
                                                            )}
                                                        </Stack>
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            )}
        </Box>
    );
}

export default function Gorevlerim() {
    return (
        <AppLayout>
            <GorevlerimContent />
        </AppLayout>
    );
}

