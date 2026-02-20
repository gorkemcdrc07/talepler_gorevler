import { useMemo, useEffect, useState, useCallback } from "react";
import {
    Box,
    Typography,
    Stack,
    Chip,
    Avatar,
    IconButton,
    Tooltip,
    TextField,
    MenuItem,
    Snackbar,
    Alert,
    Divider,
    Paper,
    InputAdornment,
    Tabs,
    Tab,
    Skeleton,
    Drawer,
    Button,
    Badge,
    LinearProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    Visibility,
    Person,
    Timer,
    Sort,
    Search,
    FilterAlt,
    Refresh,
    Close,
    Bolt,
    AssignmentTurnedIn,
    Cancel,
    HourglassEmpty,
    AttachFile,
    OpenInNew,
    CheckCircle,
    DoNotDisturbOn,
    LowPriority,
    PriorityHigh,
    Report,
} from "@mui/icons-material";
import AppLayout from "../bilesenler/AppLayout";
import { supabase } from "../lib/supabase";

/* -------------------- Helpers -------------------- */

function useDebouncedValue(value, delay = 250) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("oturum") || "null");
    } catch {
        return null;
    }
}
function normRole(v) {
    return String(v || "").trim().toLocaleLowerCase("tr-TR").replaceAll("Ä±", "i");
}
function toTrUpper(s) {
    return String(s || "").trim().toLocaleUpperCase("tr-TR");
}
function sessionFullName(session) {
    if (session?.ad_soyad) return toTrUpper(session.ad_soyad);
    const ad = session?.ad || "";
    const soyad = session?.soyad || "";
    return toTrUpper(`${ad} ${soyad}`.trim());
}

function isImage(mime = "") {
    return String(mime).toLowerCase().startsWith("image/");
}
function isPdf(mime = "") {
    return String(mime).toLowerCase().includes("pdf");
}
function niceBytes(n) {
    if (!n && n !== 0) return "";
    const kb = n / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

function fmtDuration(ms) {
    if (!ms || ms < 0) return "â€”";
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);

    if (d > 0) return `${d}g ${h}s ${m}dk`;
    if (h > 0) return `${h}s ${m}dk`;
    return `${m}dk`;
}

/* -------------------- Constants -------------------- */

const DURUMLAR = [
    "BEKLEMEDE",
    "SIRAYA ALINDI",
    "İNCELENİYOR",
    "İŞLEME ALINDI",
    "TEST EDİLİYOR",
    "TAMAMLANDI",
    "REDDEDİLDİ°",
];

const ONCELIKLER = ["DÜŞÜK", "NORMAL", "YÜKSEK", "ACİL"];

const SIRALAMA = {
    "Ã–ncelik > Durum > Tarih": "prio_status_date",
    "Durum > Ã–ncelik > Tarih": "status_prio_date",
    "En Yeni": "newest",
    "En Eski": "oldest",
};

const DURUM_STILLERI = {
    BEKLEMEDE: {
        renk: "#f59e0b",
        bg: "rgba(245,158,11,0.14)",
        icon: <HourglassEmpty sx={{ fontSize: 16 }} />,
    },
    "SIRAYA ALINDI": {
        renk: "#a78bfa",
        bg: "rgba(167,139,250,0.14)",
        icon: <Timer sx={{ fontSize: 16 }} />,
    },
    "İNCELENİYOR": {
        renk: "#06b6d4",
        bg: "rgba(6,182,212,0.14)",
        icon: <Bolt sx={{ fontSize: 16 }} />,
    },
    "İŞLEME ALINDI": {
        renk: "#22c55e",
        bg: "rgba(34,197,94,0.14)",
        icon: <CheckCircle sx={{ fontSize: 16 }} />,
    },
    "TEST EDİLECEK": {
        renk: "#38bdf8",
        bg: "rgba(56,189,248,0.14)",
        icon: <AssignmentTurnedIn sx={{ fontSize: 16 }} />,
    },
    TAMAMLANDI: {
        renk: "#10b981",
        bg: "rgba(16,185,129,0.14)",
        icon: <AssignmentTurnedIn sx={{ fontSize: 16 }} />,
    },
    "REDDEDİLDİ": {
        renk: "#ef4444",
        bg: "rgba(239,68,68,0.14)",
        icon: <Cancel sx={{ fontSize: 16 }} />,
    },
    default: { renk: "#94a3b8", bg: "rgba(148,163,184,0.14)", icon: null },
};

const ONCELIK_STILLERI = {
    DÜŞÜK: { renk: "#94a3b8", bg: "rgba(148,163,184,0.14)", icon: <LowPriority sx={{ fontSize: 16 }} /> },
    Normal: { renk: "#60a5fa", bg: "rgba(96,165,250,0.14)", icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    YÜKSEK: { renk: "#f97316", bg: "rgba(249,115,22,0.14)", icon: <PriorityHigh sx={{ fontSize: 16 }} /> },
    Acil: { renk: "#ef4444", bg: "rgba(239,68,68,0.14)", icon: <Report sx={{ fontSize: 16 }} /> },
    default: { renk: "#94a3b8", bg: "rgba(148,163,184,0.14)", icon: <DoNotDisturbOn sx={{ fontSize: 16 }} /> },
};

const prioWeight = (p) => ({ Acil: 0, YÜKSEK: 1, Normal: 2, DÜŞÜK: 3 }[p] ?? 9);
const statusWeight = (s) =>
({
    BEKLEMEDE: 0,
    "SIRAYA ALINDI": 1,
    "İNCELENİYOR": 2,
    "İŞLEME ALINDI": 3,
    "TEST EDİLECEK": 4,
    TAMAMLANDI: 5,
    "REDDEDİLDİ": 6,
}[s] ?? 99);

/* -------------------- Component -------------------- */

export default function AdminTalepler() {
    const oturum = getSession();
    const role = useMemo(() => normRole(oturum?.rol), [oturum?.rol]);
    const isAdmin = role === "admin" || role === "process";
    const hedefAdSoyad = useMemo(() => sessionFullName(oturum), [oturum]);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const [sirala, setSirala] = useState(SIRALAMA["Ã–ncelik > Durum > Tarih"]);
    const [tab, setTab] = useState("TÃ¼mÃ¼");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 250);

    const [filterDurum, setFilterDurum] = useState("Hepsi");
    const [filterOncelik, setFilterOncelik] = useState("Hepsi");

    const [selected, setSelected] = useState(null);
    const openDetail = (row) => setSelected(row);
    const closeDetail = () => setSelected(null);

    const [toast, setToast] = useState({ open: false, type: "info", text: "" });
    const openToast = (type, text) => setToast({ open: true, type, text });
    const closeToast = () => setToast((t) => ({ ...t, open: false }));

    const load = useCallback(async () => {
        setLoading(true);

        let q = supabase
            .from("talepler")
            .select(
                `
          id,
          talep_no,
          baslik,
          durum,
          oncelik,
          created_at,
          aciklama,
          ekler,
          talep_edilen,
          olusturan_id,
          isleme_alindi_at,
          tamamlandi_at,
          olusturan: kullanicilar!talepler_olusturan_id_fkey ( ad, soyad )
        `
            )
            .order("created_at", { ascending: false });

        // Admin deÄŸilse: sadece bana atananlar
        if (!isAdmin) {
            if (!hedefAdSoyad) {
                openToast("error", "Oturum bilgisi yok. LÃ¼tfen tekrar giriÅŸ yap.");
                setRows([]);
                setLoading(false);
                return;
            }
            q = q.eq("talep_edilen", hedefAdSoyad);
        }

        const { data, error } = await q;

        if (error) {
            console.log("SUPABASE ERROR:", error);
            openToast("error", error.message || "Talepler Ã§ekilemedi.");
            setRows([]);
            setLoading(false);
            return;
        }

        setRows(data || []);
        setLoading(false);
    }, [isAdmin, hedefAdSoyad]);

    useEffect(() => {
        load();
    }, [load]);

    // Herkes gÃ¼ncelleyebilir (istersen buraya yetki eklenir)
    const updateField = async (id, patch) => {
        // optimistic
        setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
        setSelected((p) => (p?.id === id ? { ...p, ...patch } : p));

        const { error } = await supabase.from("talepler").update(patch).eq("id", id);

        if (error) {
            console.log("UPDATE ERROR:", error);
            openToast("error", error.message || "GÃ¼ncelleme baÅŸarÄ±sÄ±z.");
            await load();
            return;
        }

        openToast("success", "GÃ¼ncellendi âœ…");
    };

    const handleDurumChange = (id, yeniDurum) => {
        const nowIso = new Date().toISOString();
        const patch = { durum: yeniDurum };

        if (yeniDurum === "Ä°ÅLEME ALINDI") {
            const row = rows.find((x) => x.id === id);
            // ilk kez iÅŸleme alÄ±ndÄ±ysa setle (reset istersen bu if'i kaldÄ±r)
            if (!row?.isleme_alindi_at) patch.isleme_alindi_at = nowIso;
        }

        if (yeniDurum === "TEST EDÄ°LECEK" || yeniDurum === "TAMAMLANDI") {
            patch.tamamlandi_at = nowIso;
        }

        return updateField(id, patch);
    };

    const handleOncelikChange = (id, yeniOncelik) => updateField(id, { oncelik: yeniOncelik });

    const stats = useMemo(() => {
        const total = rows.length;
        const byDurum = DURUMLAR.reduce((acc, d) => {
            acc[d] = rows.filter((r) => (r.durum || "BEKLEMEDE") === d).length;
            return acc;
        }, {});
        const urgent = rows.filter((r) => (r.oncelik || "Normal") === "Acil").length;
        const pending = rows.filter((r) => (r.durum || "BEKLEMEDE") === "BEKLEMEDE").length;
        const inReview = rows.filter((r) => (r.durum || "BEKLEMEDE") === "Ä°NCELENÄ°YOR").length;
        const done = rows.filter((r) => (r.durum || "BEKLEMEDE") === "TAMAMLANDI").length;
        return { total, byDurum, urgent, pending, inReview, done };
    }, [rows]);

    const filteredRows = useMemo(() => {
        let list = [...rows];

        if (tab !== "TÃ¼mÃ¼") list = list.filter((r) => (r.durum || "BEKLEMEDE") === tab);
        if (filterDurum !== "Hepsi") list = list.filter((r) => (r.durum || "BEKLEMEDE") === filterDurum);
        if (filterOncelik !== "Hepsi") list = list.filter((r) => (r.oncelik || "Normal") === filterOncelik);

        const q = debouncedSearch.trim().toLowerCase();
        if (q) {
            list = list.filter((r) => {
                const adSoyad = r.olusturan ? `${r.olusturan.ad ?? ""} ${r.olusturan.soyad ?? ""}`.trim() : "";
                const haystack = `${r.talep_no ?? ""} ${r.baslik ?? ""} ${adSoyad} ${r.talep_edilen ?? ""}`.toLowerCase();
                return haystack.includes(q);
            });
        }
        return list;
    }, [rows, tab, filterDurum, filterOncelik, debouncedSearch]);

    const sortedRows = useMemo(() => {
        const copy = [...filteredRows];

        if (sirala === "newest") {
            copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return copy;
        }
        if (sirala === "oldest") {
            copy.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            return copy;
        }
        if (sirala === "status_prio_date") {
            copy.sort((a, b) => {
                const ds = statusWeight(a.durum) - statusWeight(b.durum);
                if (ds !== 0) return ds;
                const dp = prioWeight(a.oncelik) - prioWeight(b.oncelik);
                if (dp !== 0) return dp;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            return copy;
        }

        copy.sort((a, b) => {
            const dp = prioWeight(a.oncelik) - prioWeight(b.oncelik);
            if (dp !== 0) return dp;
            const ds = statusWeight(a.durum) - statusWeight(b.durum);
            if (ds !== 0) return ds;
            return new Date(b.created_at) - new Date(a.created_at);
        });
        return copy;
    }, [filteredRows, sirala]);

    return (
        <AppLayout>
            {/* Header */}
            <Box sx={{ mb: 2.5, display: "flex", gap: 2, alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap" }}>
                <Box sx={{ minWidth: 280 }}>
                    <Typography variant="h4" sx={{ fontWeight: 950, color: "#fff", letterSpacing: "-1.2px", lineHeight: 1.05 }}>
                        {isAdmin ? "Talep YÃ¶netimi" : "Bana Atanan Talepler"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)", mt: 0.5 }}>
                        {isAdmin ? "Talepleri filtrele, sÄ±rala ve anÄ±nda yÃ¶net." : `Atanan kiÅŸi: ${hedefAdSoyad || "â€”"}`}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                    <Tooltip title="Yenile">
                        <IconButton
                            onClick={load}
                            size="small"
                            sx={{
                                color: "rgba(255,255,255,0.6)",
                                border: "1px solid rgba(255,255,255,0.10)",
                                bgcolor: "rgba(255,255,255,0.03)",
                                "&:hover": { bgcolor: "rgba(255,255,255,0.06)", borderColor: "rgba(0,242,254,0.35)" },
                            }}
                        >
                            <Refresh fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Box sx={{ minWidth: 280 }}>
                        <TextField
                            fullWidth
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            label="Ara (talep no / baÅŸlÄ±k / kullanÄ±cÄ± / atanan)"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: "rgba(255,255,255,0.45)" }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={topInputSx}
                        />
                    </Box>

                    <Box sx={{ minWidth: 260 }}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            value={sirala}
                            onChange={(e) => setSirala(e.target.value)}
                            label="SÄ±ralama"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Sort sx={{ color: "rgba(255,255,255,0.45)" }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={topInputSx}
                        >
                            {Object.entries(SIRALAMA).map(([label, val]) => (
                                <MenuItem key={val} value={val}>
                                    {label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Stack>
            </Box>

            {/* Stats */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2.5 }}>
                <StatCard title="Toplam" value={stats.total} />
                <StatCard title="Beklemede" value={stats.pending} accent="#f59e0b" />
                <StatCard title="İnceleniyor" value={stats.inReview} accent="#06b6d4" />
                <StatCard title="Tamamlandı" value={stats.done} accent="#10b981" />
                <StatCard title="Acil" value={stats.urgent} accent="#ef4444" />
            </Stack>

            <Paper sx={panelSx}>
                {/* Tabs */}
                <Box sx={{ px: 1.5, pt: 1.2 }}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            "& .MuiTab-root": { textTransform: "none", fontWeight: 900, color: "rgba(255,255,255,0.65)", minHeight: 42 },
                            "& .Mui-selected": { color: "#fff" },
                            "& .MuiTabs-indicator": { height: 3, borderRadius: 99, background: "linear-gradient(90deg, #00f2fe, #4facfe)" },
                        }}
                    >
                        <Tab value="TÃ¼mÃ¼" label={<TabLabel label="TÃ¼mÃ¼" count={stats.total} />} />
                        {DURUMLAR.map((d) => (
                            <Tab key={d} value={d} label={<TabLabel label={d} count={stats.byDurum[d] ?? 0} />} />
                        ))}
                    </Tabs>
                </Box>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

                {/* Filters */}
                <Box sx={{ p: 1.5 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "rgba(255,255,255,0.5)" }}>
                            <FilterAlt sx={{ fontSize: 18 }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.2 }}>Filtreler</Typography>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flex: 1 }}>
                            <TextField select size="small" label="Durum" value={filterDurum} onChange={(e) => setFilterDurum(e.target.value)} sx={miniSelectSx}>
                                <MenuItem value="Hepsi">Hepsi</MenuItem>
                                {DURUMLAR.map((d) => (
                                    <MenuItem key={d} value={d}>
                                        {d}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField select size="small" label="Ã–ncelik" value={filterOncelik} onChange={(e) => setFilterOncelik(e.target.value)} sx={miniSelectSx}>
                                <MenuItem value="Hepsi">Hepsi</MenuItem>
                                {ONCELIKLER.map((p) => (
                                    <MenuItem key={p} value={p}>
                                        {p}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <Box sx={{ flex: 1 }} />

                            <Button
                                onClick={() => {
                                    setTab("TÃ¼mÃ¼");
                                    setSearch("");
                                    setFilterDurum("Hepsi");
                                    setFilterOncelik("Hepsi");
                                }}
                                size="small"
                                variant="outlined"
                                sx={{
                                    alignSelf: { xs: "stretch", sm: "center" },
                                    borderRadius: 2,
                                    borderColor: "rgba(255,255,255,0.14)",
                                    color: "rgba(255,255,255,0.75)",
                                    fontWeight: 950,
                                    "&:hover": { borderColor: "rgba(0,242,254,0.45)", bgcolor: "rgba(255,255,255,0.04)" },
                                }}
                            >
                                Temizle
                            </Button>
                        </Stack>
                    </Stack>
                </Box>

                {/* List */}
                <Box sx={{ px: 1.5, pb: 1.5 }}>
                    {loading ? (
                        <Stack spacing={1.2} sx={{ py: 1 }}>
                            <LinearProgress sx={{ borderRadius: 99, bgcolor: "rgba(255,255,255,0.06)" }} />
                            {Array.from({ length: 6 }).map((_, i) => (
                                <SkeletonRow key={i} />
                            ))}
                        </Stack>
                    ) : sortedRows.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: "center" }}>
                            <Typography sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 950 }}>SonuÃ§ bulunamadÄ±</Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: 13, mt: 0.5 }}>Arama/filtreleri deÄŸiÅŸtirip tekrar dene.</Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1.1} sx={{ py: 1 }}>
                            {sortedRows.map((r) => {
                                const durum = r.durum || "BEKLEMEDE";
                                const oncelik = r.oncelik || "Normal";
                                const stil = DURUM_STILLERI[durum] || DURUM_STILLERI.default;
                                const pStil = ONCELIK_STILLERI[oncelik] || ONCELIK_STILLERI.default;

                                const adSoyad = r.olusturan ? `${r.olusturan.ad ?? ""} ${r.olusturan.soyad ?? ""}`.trim() : "Bilinmeyen KullanÄ±cÄ±";
                                const avatarChar = (adSoyad?.[0] || "?").toUpperCase();
                                const created = new Date(r.created_at);

                                const ekler = Array.isArray(r.ekler) ? r.ekler : [];
                                const ekSayisi = ekler.length;

                                const startAt = r.isleme_alindi_at ? new Date(r.isleme_alindi_at) : null;
                                const endAt = r.tamamlandi_at ? new Date(r.tamamlandi_at) : null;
                                const durationMs = startAt && endAt ? endAt - startAt : null;
                                const isRunning = !!startAt && !endAt && (durum === "Ä°ÅLEME ALINDI");

                                return (
                                    <Paper key={r.id} sx={rowCardSx}>
                                        <Stack direction="row" spacing={1.6} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                            <Badge
                                                overlap="circular"
                                                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                                badgeContent={
                                                    <Box
                                                        sx={{
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: 99,
                                                            bgcolor: stil.renk,
                                                            boxShadow: `0 0 0 4px ${alpha(stil.renk, 0.12)}`,
                                                        }}
                                                    />
                                                }
                                            >
                                                <Avatar
                                                    sx={{
                                                        bgcolor: alpha("#00f2fe", 0.18),
                                                        color: "#e2e8f0",
                                                        fontWeight: 950,
                                                        border: "1px solid rgba(255,255,255,0.10)",
                                                    }}
                                                >
                                                    {avatarChar}
                                                </Avatar>
                                            </Badge>

                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexWrap: "wrap" }}>
                                                    <Typography sx={{ fontWeight: 950, color: "#f8fafc", letterSpacing: "-0.4px", minWidth: 0 }} noWrap>
                                                        {r.talep_no ? `${r.talep_no} â€¢ ` : ""}
                                                        {r.baslik}
                                                    </Typography>

                                                    {ekSayisi > 0 && (
                                                        <Chip
                                                            size="small"
                                                            icon={<AttachFile sx={{ fontSize: 16 }} />}
                                                            label={ekSayisi}
                                                            sx={{
                                                                height: 24,
                                                                bgcolor: "rgba(255,255,255,0.04)",
                                                                color: "rgba(255,255,255,0.78)",
                                                                fontWeight: 950,
                                                                border: "1px solid rgba(255,255,255,0.12)",
                                                                "& .MuiChip-icon": { color: "rgba(255,255,255,0.55)" },
                                                            }}
                                                        />
                                                    )}

                                                    {durationMs && (
                                                        <Chip
                                                            size="small"
                                                            icon={<Timer sx={{ fontSize: 16 }} />}
                                                            label={`Tamamlanma: ${fmtDuration(durationMs)}`}
                                                            sx={{
                                                                height: 24,
                                                                bgcolor: "rgba(255,255,255,0.04)",
                                                                color: "rgba(255,255,255,0.82)",
                                                                fontWeight: 950,
                                                                border: "1px solid rgba(255,255,255,0.12)",
                                                                "& .MuiChip-icon": { color: "rgba(255,255,255,0.55)" },
                                                            }}
                                                        />
                                                    )}

                                                    {isRunning && (
                                                        <Chip
                                                            size="small"
                                                            icon={<Bolt sx={{ fontSize: 16 }} />}
                                                            label="Ä°ÅŸlemdeâ€¦"
                                                            sx={{
                                                                height: 24,
                                                                bgcolor: alpha("#22c55e", 0.12),
                                                                color: "#22c55e",
                                                                fontWeight: 950,
                                                                border: `1px solid ${alpha("#22c55e", 0.25)}`,
                                                                "& .MuiChip-icon": { color: "#22c55e" },
                                                            }}
                                                        />
                                                    )}

                                                    {/* Ã–ncelik chip + ikon */}
                                                    <Chip
                                                        size="small"
                                                        icon={pStil.icon}
                                                        label={oncelik}
                                                        sx={{
                                                            ml: "auto",
                                                            height: 26,
                                                            bgcolor: pStil.bg,
                                                            color: pStil.renk,
                                                            fontWeight: 950,
                                                            border: `1px solid ${alpha(pStil.renk, 0.25)}`,
                                                            "& .MuiChip-icon": { color: pStil.renk },
                                                        }}
                                                    />
                                                </Stack>

                                                <Stack direction="row" spacing={1.4} alignItems="center" sx={{ mt: 0.6, minWidth: 0, flexWrap: "wrap" }}>
                                                    <Meta icon={<Person sx={metaIconSx} />} text={adSoyad} />
                                                    <Meta icon={<Timer sx={metaIconSx} />} text={`${created.toLocaleDateString("tr-TR")} â€¢ ${created.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`} />
                                                    <Meta icon={<Person sx={metaIconSx} />} text={`Atanan: ${r.talep_edilen || "â€”"}`} />
                                                </Stack>
                                            </Box>
                                        </Stack>

                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" sx={{ ml: "auto" }}>
                                            <TextField
                                                select
                                                size="small"
                                                label="Ã–ncelik"
                                                value={oncelik}
                                                onChange={(e) => handleOncelikChange(r.id, e.target.value)}
                                                sx={miniSelectSx}
                                            >
                                                {ONCELIKLER.map((p) => (
                                                    <MenuItem key={p} value={p}>
                                                        {p}
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            <TextField
                                                select
                                                size="small"
                                                label="Durum"
                                                value={durum}
                                                onChange={(e) => handleDurumChange(r.id, e.target.value)}
                                                sx={miniSelectSx}
                                            >
                                                {DURUMLAR.map((d) => (
                                                    <MenuItem key={d} value={d}>
                                                        {d}
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            {/* durum chip + ikon */}
                                            <Chip
                                                icon={stil.icon}
                                                label={durum}
                                                size="small"
                                                sx={{
                                                    height: 30,
                                                    bgcolor: stil.bg,
                                                    color: stil.renk,
                                                    fontWeight: 950,
                                                    borderRadius: 99,
                                                    border: `1px solid ${alpha(stil.renk, 0.28)}`,
                                                    "& .MuiChip-icon": { color: stil.renk },
                                                }}
                                            />

                                            <Tooltip title="DetaylarÄ± GÃ¶rÃ¼ntÃ¼le">
                                                <IconButton
                                                    onClick={() => openDetail(r)}
                                                    size="small"
                                                    sx={{
                                                        color: "rgba(255,255,255,0.45)",
                                                        border: "1px solid rgba(255,255,255,0.10)",
                                                        bgcolor: "rgba(255,255,255,0.03)",
                                                        "&:hover": { color: "#00f2fe", borderColor: "rgba(0,242,254,0.45)", bgcolor: "rgba(255,255,255,0.06)" },
                                                    }}
                                                >
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Paper>
                                );
                            })}
                        </Stack>
                    )}
                </Box>
            </Paper>

            {/* Drawer Detail */}
            <Drawer
                anchor="right"
                open={!!selected}
                onClose={closeDetail}
                PaperProps={{
                    sx: {
                        width: { xs: "100%", sm: 460 },
                        bgcolor: "rgba(10, 15, 28, 0.98)",
                        backgroundImage:
                            "radial-gradient(800px 400px at 20% 0%, rgba(0,242,254,0.12), transparent 60%), radial-gradient(700px 420px at 100% 20%, rgba(79,172,254,0.10), transparent 60%)",
                        borderLeft: "1px solid rgba(255,255,255,0.08)",
                    },
                }}
            >
                <Box sx={{ p: 2.2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 950, color: "#fff", letterSpacing: "-0.6px" }} variant="h6">
                            Talep DetayÄ±
                        </Typography>
                        <IconButton onClick={closeDetail} size="small" sx={{ color: "rgba(255,255,255,0.55)", "&:hover": { color: "#fff" } }}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Stack>

                    <Divider sx={{ my: 1.6, borderColor: "rgba(255,255,255,0.08)" }} />

                    {selected && (
                        <Stack spacing={1.4}>
                            <Box>
                                <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 900 }}>BaÅŸlÄ±k</Typography>
                                <Typography sx={{ color: "#fff", fontWeight: 950, mt: 0.4 }}>
                                    {selected.talep_no ? `${selected.talep_no} â€¢ ` : ""}
                                    {selected.baslik}
                                </Typography>
                            </Box>

                            {/* SÃ¼re chip */}
                            {selected.isleme_alindi_at && (
                                <Chip
                                    size="small"
                                    icon={<Timer sx={{ fontSize: 16 }} />}
                                    label={
                                        selected.tamamlandi_at
                                            ? `Bu kadar sÃ¼rede tamamlandÄ±: ${fmtDuration(new Date(selected.tamamlandi_at) - new Date(selected.isleme_alindi_at))}`
                                            : `Ä°ÅŸleme alÄ±ndÄ±: ${new Date(selected.isleme_alindi_at).toLocaleString("tr-TR")}`
                                    }
                                    sx={{
                                        bgcolor: "rgba(255,255,255,0.04)",
                                        color: "rgba(255,255,255,0.78)",
                                        fontWeight: 950,
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        "& .MuiChip-icon": { color: "rgba(255,255,255,0.55)" },
                                        alignSelf: "flex-start",
                                    }}
                                />
                            )}

                            {/* Drawer iÃ§inden de deÄŸiÅŸtir */}
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="Ã–ncelik"
                                    value={selected.oncelik || "Normal"}
                                    onChange={(e) => handleOncelikChange(selected.id, e.target.value)}
                                    sx={miniSelectSx}
                                >
                                    {ONCELIKLER.map((p) => (
                                        <MenuItem key={p} value={p}>
                                            {p}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="Durum"
                                    value={selected.durum || "BEKLEMEDE"}
                                    onChange={(e) => handleDurumChange(selected.id, e.target.value)}
                                    sx={miniSelectSx}
                                >
                                    {DURUMLAR.map((d) => (
                                        <MenuItem key={d} value={d}>
                                            {d}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Stack>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                            <Box>
                                <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 900 }}>OluÅŸturan</Typography>
                                <Typography sx={{ color: "#fff", fontWeight: 900, mt: 0.4 }}>
                                    {selected.olusturan ? `${selected.olusturan.ad ?? ""} ${selected.olusturan.soyad ?? ""}`.trim() : "Bilinmeyen KullanÄ±cÄ±"}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 900 }}>Talep Edilen</Typography>
                                <Typography sx={{ color: "#fff", fontWeight: 900, mt: 0.4 }}>{selected.talep_edilen || "â€”"}</Typography>
                            </Box>

                            <Box>
                                <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 900 }}>AÃ§Ä±klama</Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.86)", mt: 0.4, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                    {selected.aciklama || "â€”"}
                                </Typography>
                            </Box>

                            {/* Attachments */}
                            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 900 }}>Ekler</Typography>

                            {Array.isArray(selected.ekler) && selected.ekler.length > 0 ? (
                                <Stack spacing={1}>
                                    {selected.ekler.map((f, idx) => {
                                        const url = f?.url;
                                        const name = f?.name || `dosya-${idx + 1}`;
                                        const type = f?.type || "";
                                        const size = f?.size;

                                        return (
                                            <Paper
                                                key={`${name}-${idx}`}
                                                sx={{
                                                    p: 1.2,
                                                    borderRadius: 2.4,
                                                    bgcolor: "rgba(255,255,255,0.02)",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 1.2,
                                                }}
                                            >
                                                <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: 13 }} noWrap>
                                                        {name}
                                                    </Typography>
                                                    <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }} noWrap>
                                                        {type || "dosya"} {size ? `â€¢ ${niceBytes(size)}` : ""}
                                                        {isPdf(type) ? " â€¢ PDF" : ""}
                                                        {isImage(type) ? " â€¢ GÃ¶rsel" : ""}
                                                    </Typography>
                                                </Stack>

                                                {url ? (
                                                    <Button
                                                        component="a"
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        size="small"
                                                        variant="outlined"
                                                        endIcon={<OpenInNew fontSize="small" />}
                                                        sx={{
                                                            borderRadius: 2,
                                                            borderColor: "rgba(0,242,254,0.35)",
                                                            color: "rgba(255,255,255,0.85)",
                                                            fontWeight: 950,
                                                            whiteSpace: "nowrap",
                                                            "&:hover": { borderColor: "rgba(0,242,254,0.55)", bgcolor: "rgba(255,255,255,0.03)" },
                                                        }}
                                                    >
                                                        AÃ§
                                                    </Button>
                                                ) : (
                                                    <Chip size="small" label="URL yok" sx={{ bgcolor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontWeight: 900 }} />
                                                )}
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            ) : (
                                <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Ek bulunmuyor.</Typography>
                            )}

                            {/* HÄ±zlÄ± aksiyonlar */}
                            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 900 }}>HÄ±zlÄ± Aksiyonlar</Typography>

                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Button size="small" variant="contained" startIcon={<Bolt />} onClick={() => handleDurumChange(selected.id, "Ä°NCELENÄ°YOR")} sx={quickBtnSx}>
                                    Ä°nceleniyor
                                </Button>
                                <Button size="small" variant="contained" startIcon={<CheckCircle />} onClick={() => handleDurumChange(selected.id, "Ä°ÅLEME ALINDI")} sx={quickBtnSx}>
                                    Ä°ÅŸleme AlÄ±ndÄ±
                                </Button>
                                <Button size="small" variant="contained" startIcon={<AssignmentTurnedIn />} onClick={() => handleDurumChange(selected.id, "TEST EDÄ°LECEK")} sx={quickBtnSx}>
                                    Test Edilecek
                                </Button>
                                <Button size="small" variant="contained" startIcon={<AssignmentTurnedIn />} onClick={() => handleDurumChange(selected.id, "TAMAMLANDI")} sx={quickBtnSx}>
                                    TamamlandÄ±
                                </Button>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<Cancel />}
                                    onClick={() => handleDurumChange(selected.id, "REDDEDÄ°LDÄ°")}
                                    sx={{ ...quickBtnSx, bgcolor: alpha("#ef4444", 0.22), "&:hover": { bgcolor: alpha("#ef4444", 0.28) } }}
                                >
                                    Reddedildi
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                </Box>
            </Drawer>

            <Snackbar open={toast.open} autoHideDuration={2600} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert onClose={closeToast} severity={toast.type} variant="filled" sx={{ width: "100%" }}>
                    {toast.text}
                </Alert>
            </Snackbar>
        </AppLayout>
    );
}

/* ---------- Mini Components ---------- */

function StatCard({ title, value, accent }) {
    return (
        <Paper
            sx={{
                flex: 1,
                p: 1.7,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                backgroundImage: accent
                    ? `radial-gradient(700px 260px at 0% 0%, ${alpha(accent, 0.18)}, transparent 60%)`
                    : "radial-gradient(700px 260px at 0% 0%, rgba(0,242,254,0.10), transparent 60%)",
                boxShadow: "0 22px 55px rgba(0,0,0,0.30)",
            }}
        >
            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 900 }}>{title}</Typography>
            <Typography sx={{ color: "#fff", fontSize: 26, fontWeight: 950, letterSpacing: "-0.8px", mt: 0.6 }}>{value}</Typography>
        </Paper>
    );
}

function TabLabel({ label, count }) {
    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <span>{label}</span>
            <Box
                sx={{
                    px: 1,
                    py: 0.2,
                    borderRadius: 99,
                    bgcolor: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 12,
                    fontWeight: 950,
                    color: "rgba(255,255,255,0.75)",
                }}
            >
                {count}
            </Box>
        </Stack>
    );
}

function SkeletonRow() {
    return (
        <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                    <Skeleton width="70%" height={18} />
                    <Skeleton width="45%" height={14} />
                </Box>
                <Skeleton width={120} height={36} sx={{ borderRadius: 2 }} />
                <Skeleton width={120} height={36} sx={{ borderRadius: 2 }} />
                <Skeleton width={36} height={36} sx={{ borderRadius: 2 }} />
            </Stack>
        </Paper>
    );
}

function Meta({ icon, text }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, minWidth: 0 }}>
            {icon}
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }} noWrap>
                {text}
            </Typography>
        </Box>
    );
}

/* ---------- Styles ---------- */

const panelSx = {
    borderRadius: 4,
    overflow: "hidden",
    background: "linear-gradient(180deg, rgba(30,41,59,0.50) 0%, rgba(15,23,42,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 26px 70px rgba(0,0,0,0.35)",
};

const rowCardSx = {
    p: 2,
    borderRadius: 3,
    display: "flex",
    gap: 2,
    alignItems: "center",
    justifyContent: "space-between",
    bgcolor: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    transition: "0.18s ease",
    "&:hover": {
        bgcolor: "rgba(255,255,255,0.05)",
        borderColor: "rgba(0,242,254,0.34)",
        transform: "translateY(-1px)",
    },
};

const topInputSx = {
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 2.2,
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: "rgba(0,242,254,0.35)" },
        "&.Mui-focused fieldset": { borderColor: "#00f2fe" },
    },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.55)" },
    "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.45)" },
};

const miniSelectSx = {
    minWidth: 160,
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 2,
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: "rgba(0,242,254,0.35)" },
        "&.Mui-focused fieldset": { borderColor: "#00f2fe" },
    },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.55)" },
    "& .MuiSelect-icon": { color: "rgba(255,255,255,0.35)" },
};

const metaIconSx = { fontSize: 14, color: "rgba(255,255,255,0.38)" };

const quickBtnSx = {
    borderRadius: 2,
    fontWeight: 950,
    textTransform: "none",
    bgcolor: "rgba(0,242,254,0.18)",
    boxShadow: "none",
    "&:hover": { bgcolor: "rgba(0,242,254,0.24)", boxShadow: "none" },
};

