import { useEffect, useMemo, useState, useCallback } from "react";
import {
    Box,
    Typography,
    Stack,
    Chip,
    Skeleton,
    Fade,
    Divider,
    Paper,
    TextField,
    MenuItem,
    InputAdornment,
    IconButton,
    Tooltip,
    Drawer,
    Button,
    Snackbar,
    Alert,
    LinearProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    AccessTime,
    FiberManualRecord,
    ChevronRight,
    Search,
    Refresh,
    Close,
    AttachFile,
    OpenInNew,
    Flag,
    Subject,
    Person,
    CalendarMonth,
} from "@mui/icons-material";
import AppLayout from "../bilesenler/AppLayout";
import { supabase } from "../lib/supabase";

/* ---------- Session ---------- */
function getSession() {
    try {
        return JSON.parse(localStorage.getItem("oturum") || "null");
    } catch {
        return null;
    }
}

/* ---------- Utils ---------- */
function useDebouncedValue(value, delay = 250) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
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

/* ---------- Constants ---------- */
const DURUMLAR = ["Hepsi", "Beklemede", "Ä°nceleniyor", "TamamlandÄ±", "Reddedildi"];
const ONCELIKLER = ["Hepsi", "Düşük", "Normal", "Yüksek", "Acil"];
const SIRALAMA = {
    "En Yeni": "newest",
    "En Eski": "oldest",
    "Öncelik > Durum > Tarih": "prio_status_date",
    "Durum > Öncelik > Tarih": "status_prio_date",
};
const DURUM_STILLERI = {
    Beklemede: { renk: "#f59e0b", bg: "rgba(245, 158, 11, 0.14)" },
    "İnceleniyor": { renk: "#06b6d4", bg: "rgba(6, 182, 212, 0.14)" },
    Tamamlandı: { renk: "#10b981", bg: "rgba(16, 185, 129, 0.14)" },
    Reddedildi: { renk: "#ef4444", bg: "rgba(239, 68, 68, 0.14)" },
    default: { renk: "#94a3b8", bg: "rgba(148, 163, 184, 0.14)" },
};

const ONCELIK_STILLERI = {
    Düşük: { renk: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
    Normal: { renk: "#60a5fa", bg: "rgba(96,165,250,0.14)" },
    Yüksek: { renk: "#f97316", bg: "rgba(249,115,22,0.14)" },
    Acil: { renk: "#ef4444", bg: "rgba(239,68,68,0.14)" },
    default: { renk: "#94a3b8", bg: "rgba(148, 163, 184, 0.14)" },
};

const prioWeight = (p) => ({ Acil: 0, Yüksek: 1, Normal: 2, Düşük: 3 }[p] ?? 9);
const statusWeight = (s) => ({ Beklemede: 0, "inceleniyor": 1, Tamamlandı: 2, Reddedildi: 3 }[s] ?? 9);

/* ---------- Modern tokens ---------- */
const ACCENT = "#00f2fe";
const ACCENT2 = "#4facfe";
const softText = {
    primary: "#fff",
    secondary: "rgba(255,255,255,0.62)",
    muted: "rgba(255,255,255,0.42)",
};

const glass = (extra = {}) => ({
    bgcolor: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "0 22px 80px rgba(0,0,0,0.50)",
    ...extra,
});

export default function Taleplerim() {
    const oturum = useMemo(() => getSession(), []);
    const userId = oturum?.id;

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 250);

    const [filterDurum, setFilterDurum] = useState("Hepsi");
    const [filterOncelik, setFilterOncelik] = useState("Hepsi");
    const [sirala, setSirala] = useState("newest");

    const [selected, setSelected] = useState(null);
    const openDetail = (row) => setSelected(row);
    const closeDetail = () => setSelected(null);

    const [toast, setToast] = useState({ open: false, type: "info", text: "" });
    const openToast = (type, text) => setToast({ open: true, type, text });
    const closeToast = () => setToast((t) => ({ ...t, open: false }));

    const load = useCallback(async () => {
        if (!userId) {
            setRows([]);
            setLoading(false);
            openToast("error", "Oturum bulunamadı. Lütfen tekrar giriş yap.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
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
                istenilen_tarih
            `
            )
            .eq("olusturan_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            console.log("SUPABASE ERROR:", error);
            openToast("error", error.message || "Talepler Ã§ekilemedi.");
            setRows([]);
            setLoading(false);
            return;
        }

        setRows(data || []);
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    const stats = useMemo(() => {
        const total = rows.length;
        const byDurum = {
            Beklemede: rows.filter((r) => (r.durum || "Beklemede") === "Beklemede").length,
            "İnceleniyor": rows.filter((r) => (r.durum || "Beklemede") === "İnceleniyor").length,
            Tamamlandı: rows.filter((r) => (r.durum || "Beklemede") === "Tamamlandı").length,
            Reddedildi: rows.filter((r) => (r.durum || "Beklemede") === "Reddedildi").length,
        };
        const urgent = rows.filter((r) => (r.oncelik || "Normal") === "Acil").length;
        return { total, byDurum, urgent };
    }, [rows]);

    const filteredRows = useMemo(() => {
        let list = [...rows];

        if (filterDurum !== "Hepsi") list = list.filter((r) => (r.durum || "Beklemede") === filterDurum);
        if (filterOncelik !== "Hepsi") list = list.filter((r) => (r.oncelik || "Normal") === filterOncelik);

        const q = debouncedSearch.trim().toLowerCase();
        if (q) {
            list = list.filter((r) => {
                const haystack = `${r.talep_no ?? ""} ${r.baslik ?? ""}`.toLowerCase();
                return haystack.includes(q);
            });
        }

        return list;
    }, [rows, filterDurum, filterOncelik, debouncedSearch]);

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
        // prio_status_date
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
            {/* HERO HEADER */}
            <Box
                sx={{
                    mb: 2.5,
                    p: 2.2,
                    borderRadius: 4,
                    position: "relative",
                    overflow: "hidden",
                    ...glass({
                        backgroundImage: `
                          radial-gradient(900px 420px at 10% -10%, rgba(0,242,254,0.22), transparent 60%),
                          radial-gradient(820px 460px at 95% 10%, rgba(79,172,254,0.18), transparent 60%),
                          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))
                        `,
                    }),
                }}
            >
                <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 980,
                                letterSpacing: "-1px",
                                color: softText.primary,
                                lineHeight: 1.05,
                            }}
                        >
                            Taleplerim
                        </Typography>
                        <Typography variant="body2" sx={{ color: softText.secondary, mt: 0.9, maxWidth: 620 }}>
                            Gönderdiğiniz talepleri filtreleyin, detaylarını açın ve ekleri görüntüleyin.
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                        <Tooltip title="Yenile">
                            <IconButton
                                onClick={load}
                                size="small"
                                sx={{
                                    ...glass({ bgcolor: "rgba(255,255,255,0.03)" }),
                                    borderRadius: 2.2,
                                    color: softText.secondary,
                                    "&:hover": { borderColor: alpha(ACCENT, 0.55), color: "#fff" },
                                    "&:active": { transform: "scale(0.98)" },
                                }}
                            >
                                <Refresh fontSize="small" />
                            </IconButton>
                        </Tooltip>

                        <Chip
                            label={`${rows.length} Kayıt`}
                            sx={{
                                height: 30,
                                borderRadius: 999,
                                ...glass({ bgcolor: "rgba(255,255,255,0.03)" }),
                                color: "rgba(255,255,255,0.9)",
                                fontWeight: 950,
                            }}
                        />
                    </Stack>
                </Box>
            </Box>

            {/* STATS */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2.5 }}>
                <StatCard title="Toplam" value={stats.total} />
                <StatCard title="Beklemede" value={stats.byDurum.Beklemede} accent={DURUM_STILLERI.Beklemede.renk} />
                <StatCard title="İnceleniyor" value={stats.byDurum["İnceleniyor"]} accent={DURUM_STILLERI["İnceleniyor"].renk} />
                <StatCard title="Tamamlandı" value={stats.byDurum.Tamamlandı} accent={DURUM_STILLERI.Tamamlandı.renk} />
                <StatCard title="Reddedildi" value={stats.byDurum.Reddedildi} accent={DURUM_STILLERI.Reddedildi.renk} />
                <StatCard title="Acil" value={stats.urgent} accent={ONCELIK_STILLERI.Acil.renk} />
            </Stack>

            {/* PANEL */}
            <Paper sx={panelSx}>
                {/* TOP CONTROLS */}
                <Box sx={{ p: 1.6 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
                        <Box sx={{ flex: 1, minWidth: 260 }}>
                            <TextField
                                fullWidth
                                size="small"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                label="Ara"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search sx={{ color: softText.muted }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={topInputSx}
                            />
                        </Box>

                        <TextField
                            select
                            size="small"
                            label="Durum"
                            value={filterDurum}
                            onChange={(e) => setFilterDurum(e.target.value)}
                            sx={miniSelectSx}
                        >
                            {DURUMLAR.map((d) => (
                                <MenuItem key={d} value={d}>
                                    {d}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            size="small"
                            label="Öncelik"
                            value={filterOncelik}
                            onChange={(e) => setFilterOncelik(e.target.value)}
                            sx={miniSelectSx}
                        >
                            {ONCELIKLER.map((p) => (
                                <MenuItem key={p} value={p}>
                                    {p}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField select size="small" label="Sıralama" value={sirala} onChange={(e) => setSirala(e.target.value)} sx={miniSelectSx}>
                            {Object.entries(SIRALAMA).map(([label, val]) => (
                                <MenuItem key={val} value={val}>
                                    {label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Button
                            onClick={() => {
                                setSearch("");
                                setFilterDurum("Hepsi");
                                setFilterOncelik("Hepsi");
                                setSirala("newest");
                            }}
                            size="small"
                            variant="outlined"
                            sx={cleanBtnSx}
                        >
                            Temizle
                        </Button>
                    </Stack>
                </Box>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

                {/* CONTENT */}
                <Box sx={{ px: 1.6, pb: 1.6 }}>
                    {loading ? (
                        <Stack spacing={1.2} sx={{ py: 1.2 }}>
                            <LinearProgress sx={{ borderRadius: 99, bgcolor: "rgba(255,255,255,0.06)" }} />
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} variant="rounded" height={86} sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: 3 }} />
                            ))}
                        </Stack>
                    ) : sortedRows.length === 0 ? (
                        <Box
                            sx={{
                                textAlign: "center",
                                py: 8,
                                borderRadius: 4,
                                ...glass({
                                    bgcolor: "rgba(255,255,255,0.02)",
                                    border: "1px dashed rgba(255,255,255,0.14)",
                                    boxShadow: "none",
                                }),
                            }}
                        >
                            <Typography sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 980 }}>Sonuç bulunamadı</Typography>
                            <Typography sx={{ color: softText.muted, mt: 0.6 }}>Arama/filtreleri değiştirip tekrar dene.</Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1.2} sx={{ py: 1.1 }}>
                            {sortedRows.map((r, index) => {
                                const durum = r.durum || "Beklemede";
                                const oncelik = r.oncelik || "Normal";
                                const dStil = DURUM_STILLERI[durum] || DURUM_STILLERI.default;
                                const pStil = ONCELIK_STILLERI[oncelik] || ONCELIK_STILLERI.default;

                                const created = new Date(r.created_at);
                                const ekler = Array.isArray(r.ekler) ? r.ekler : [];
                                const ekSayisi = ekler.length;

                                const isActive = selected?.id === r.id;

                                return (
                                    <Fade in timeout={180 + index * 45} key={r.id}>
                                        <Paper
                                            onClick={() => openDetail(r)}
                                            sx={{
                                                ...rowCardSx,
                                                cursor: "pointer",
                                                borderColor: isActive ? alpha(ACCENT, 0.26) : "rgba(255,255,255,0.08)",
                                            }}
                                        >
                                            {/* Accent bar */}
                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    left: 0,
                                                    top: "18%",
                                                    bottom: "18%",
                                                    width: 4,
                                                    borderRadius: "0 6px 6px 0",
                                                    bgcolor: dStil.renk,
                                                    boxShadow: `0 0 18px ${alpha(dStil.renk, 0.35)}`,
                                                }}
                                            />

                                            <Stack spacing={0.8} sx={{ pl: 1.4, minWidth: 0, flex: 1 }}>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontWeight: 980, fontSize: 15, color: "#fff", minWidth: 0 }} noWrap>
                                                        {r.talep_no ? `${r.talep_no} • ` : ""}
                                                        {r.baslik}
                                                    </Typography>

                                                    {ekSayisi > 0 && (
                                                        <Chip
                                                            size="small"
                                                            icon={<AttachFile sx={{ fontSize: 16 }} />}
                                                            label={ekSayisi}
                                                            sx={{
                                                                height: 24,
                                                                borderRadius: 999,
                                                                bgcolor: "rgba(255,255,255,0.04)",
                                                                color: "rgba(255,255,255,0.82)",
                                                                fontWeight: 950,
                                                                border: "1px solid rgba(255,255,255,0.12)",
                                                                "& .MuiChip-icon": { color: "rgba(255,255,255,0.55)" },
                                                            }}
                                                        />
                                                    )}

                                                    <Chip
                                                        size="small"
                                                        label={oncelik}
                                                        sx={{
                                                            ml: "auto",
                                                            height: 24,
                                                            borderRadius: 999,
                                                            bgcolor: pStil.bg,
                                                            color: pStil.renk,
                                                            fontWeight: 980,
                                                            border: `1px solid ${alpha(pStil.renk, 0.25)}`,
                                                            ...(oncelik === "Acil"
                                                                ? {
                                                                    boxShadow: `0 0 0 4px ${alpha(pStil.renk, 0.10)}`,
                                                                }
                                                                : {}),
                                                        }}
                                                    />
                                                </Stack>

                                                <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap">
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                                                        <AccessTime sx={{ fontSize: 14, color: softText.muted }} />
                                                        <Typography sx={{ fontSize: 12, color: softText.secondary }}>
                                                            {created.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                                                        </Typography>
                                                    </Box>

                                                    <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.10)", height: 12, my: "auto" }} />

                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                                                        <FiberManualRecord sx={{ fontSize: 10, color: dStil.renk }} />
                                                        <Typography sx={{ fontSize: 12, fontWeight: 980, color: dStil.renk, letterSpacing: 0.4 }}>
                                                            {durum}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Stack>

                                            <ChevronRight sx={{ color: "rgba(255,255,255,0.18)" }} />
                                        </Paper>
                                    </Fade>
                                );
                            })}
                        </Stack>
                    )}
                </Box>
            </Paper>

            {/* DRAWER */}
            <Drawer
                anchor="right"
                open={!!selected}
                onClose={closeDetail}
                PaperProps={{
                    sx: {
                        width: { xs: "100%", sm: 480 },
                        bgcolor: "rgba(10, 15, 28, 0.82)",
                        backdropFilter: "blur(18px)",
                        WebkitBackdropFilter: "blur(18px)",
                        backgroundImage:
                            "radial-gradient(900px 420px at 20% 0%, rgba(0,242,254,0.16), transparent 60%), radial-gradient(800px 480px at 110% 10%, rgba(79,172,254,0.14), transparent 60%)",
                        borderLeft: "1px solid rgba(255,255,255,0.08)",
                    },
                }}
            >
                {/* Sticky header */}
                <Box
                    sx={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        ...glass({ bgcolor: "rgba(10, 15, 28, 0.72)", boxShadow: "none" }),
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2.2, pb: 1.3 }}>
                        <Typography sx={{ fontWeight: 980, color: "#fff", letterSpacing: "-0.6px" }} variant="h6">
                            Talep Detayları
                        </Typography>
                        <IconButton onClick={closeDetail} size="small" sx={{ color: softText.secondary, "&:hover": { color: "#fff" } }}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Stack>
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                </Box>

                <Box sx={{ p: 2.2 }}>
                    {selected && (
                        <Stack spacing={1.5}>
                            <Box>
                                <Typography sx={{ color: softText.muted, fontSize: 12, fontWeight: 900 }}>BAŞLIK</Typography>
                                <Typography sx={{ color: "#fff", fontWeight: 980, mt: 0.5 }}>
                                    {selected.talep_no ? `${selected.talep_no} • ` : ""}
                                    {selected.baslik}
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip size="small" label={selected.oncelik || "Normal"} sx={drawerChipSx} />
                                <Chip size="small" label={selected.durum || "Beklemede"} sx={drawerChipSx} />
                                <Chip size="small" label={new Date(selected.created_at).toLocaleString("tr-TR")} sx={{ ...drawerChipSx, color: softText.secondary }} />
                            </Stack>

                            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                            <InfoRow icon={<Flag sx={infoIconSx} />} label="Öncelik" value={selected.oncelik || "Normal"} />
                            <InfoRow icon={<Person sx={infoIconSx} />} label="Talep Edilen" value={selected.talep_edilen || "—"} />
                            <InfoRow icon={<CalendarMonth sx={infoIconSx} />} label="İstenilen Tarih" value={selected.istenilen_tarih || "—"} />

                            <Box>
                                <Typography sx={{ color: softText.muted, fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
                                    <Subject sx={infoIconSx} /> Açıklama
                                </Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.88)", mt: 0.7, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                                    {selected.aciklama || "—"}
                                </Typography>
                            </Box>

                            {/* Ekler */}
                            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                            <Typography sx={{ color: softText.muted, fontSize: 12, fontWeight: 900 }}>
                                Ekler
                            </Typography>

                            {Array.isArray(selected.ekler) && selected.ekler.length > 0 ? (
                                <Stack spacing={1}>
                                    {selected.ekler.map((f, idx) => {
                                        const url = f?.url;
                                        const name = f?.name || `dosya-${idx + 1}`;
                                        const type = f?.type || "";
                                        const size = f?.size;

                                        const kind = isPdf(type) ? "PDF" : isImage(type) ? "Görsel" : "Dosya";

                                        return (
                                            <Paper
                                                key={`${name}-${idx}`}
                                                sx={{
                                                    p: 1.2,
                                                    borderRadius: 2.6,
                                                    ...glass({
                                                        bgcolor: "rgba(255,255,255,0.02)",
                                                        border: "1px solid rgba(255,255,255,0.08)",
                                                        boxShadow: "none",
                                                    }),
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 1.2,
                                                }}
                                            >
                                                <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ color: "#fff", fontWeight: 950, fontSize: 13 }} noWrap>
                                                        {name}
                                                    </Typography>
                                                    <Typography sx={{ color: softText.secondary, fontSize: 12 }} noWrap>
                                                        {kind} {type ? `• ${type}` : ""} {size ? `• ${niceBytes(size)}` : ""}
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
                                                            borderRadius: 999,
                                                            borderColor: alpha(ACCENT, 0.38),
                                                            color: "rgba(255,255,255,0.88)",
                                                            fontWeight: 950,
                                                            whiteSpace: "nowrap",
                                                            "&:hover": { borderColor: alpha(ACCENT, 0.65), bgcolor: "rgba(255,255,255,0.04)" },
                                                        }}
                                                    >
                                                        AÇ
                                                    </Button>
                                                ) : (
                                                    <Chip size="small" label="URL yok" sx={{ bgcolor: "rgba(255,255,255,0.04)", color: softText.secondary, fontWeight: 900 }} />
                                                )}
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            ) : (
                                <Typography sx={{ color: softText.muted, fontSize: 13 }}>Ek bulunmuyor.</Typography>
                            )}
                        </Stack>
                    )}
                </Box>
            </Drawer>

            <Snackbar open={toast.open} autoHideDuration={2800} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert onClose={closeToast} severity={toast.type} variant="filled" sx={{ width: "100%" }}>
                    {toast.text}
                </Alert>
            </Snackbar>
        </AppLayout>
    );
}

/* ---------- Mini UI ---------- */

function StatCard({ title, value, accent }) {
    return (
        <Paper
            sx={{
                flex: 1,
                p: 1.6,
                borderRadius: 3.2,
                position: "relative",
                overflow: "hidden",
                ...glass({
                    bgcolor: "rgba(255,255,255,0.03)",
                    backgroundImage: accent
                        ? `radial-gradient(700px 240px at 0% 0%, ${alpha(accent, 0.22)}, transparent 60%)`
                        : `radial-gradient(700px 240px at 0% 0%, rgba(0,242,254,0.16), transparent 60%)`,
                }),
                transition: "transform .18s ease, border-color .18s ease",
                "&:hover": {
                    transform: "translateY(-2px)",
                    borderColor: "rgba(255,255,255,0.14)",
                },
            }}
        >
            <Typography sx={{ color: softText.muted, fontSize: 12, fontWeight: 900 }}>{title}</Typography>
            <Typography sx={{ color: "#fff", fontSize: 28, fontWeight: 980, letterSpacing: "-1px", mt: 0.6 }}>
                {value}
            </Typography>
        </Paper>
    );
}

function InfoRow({ icon, label, value }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                {icon}
                <Typography sx={{ color: softText.muted, fontSize: 12, fontWeight: 900 }}>
                    {label}
                </Typography>
            </Stack>
            <Typography sx={{ color: "rgba(255,255,255,0.88)", fontWeight: 900, fontSize: 13, textAlign: "right" }}>
                {value}
            </Typography>
        </Box>
    );
}

/* ---------- Styles ---------- */

const panelSx = {
    borderRadius: 4,
    overflow: "hidden",
    background: "linear-gradient(180deg, rgba(30,41,59,0.45) 0%, rgba(15,23,42,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 28px 80px rgba(0,0,0,0.45)",
};

const rowCardSx = {
    position: "relative",
    p: 2,
    borderRadius: 3.2,
    display: "flex",
    gap: 2,
    alignItems: "center",
    justifyContent: "space-between",
    bgcolor: "rgba(255,255,255,0.028)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    transition: "transform .18s ease, border-color .18s ease, background-color .18s ease",
    "&:before": {
        content: '""',
        position: "absolute",
        inset: 0,
        padding: "1px",
        borderRadius: "inherit",
        background: "linear-gradient(135deg, rgba(0,242,254,0.22), rgba(255,255,255,0.06), rgba(79,172,254,0.18))",
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        opacity: 0.0,
        transition: "opacity .18s ease",
        pointerEvents: "none",
    },
    "&:hover": {
        transform: "translateY(-2px)",
        bgcolor: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.10)",
        boxShadow: "0 18px 70px rgba(0,0,0,0.45)",
    },
    "&:hover:before": { opacity: 1 },
    "&:active": { transform: "translateY(0px) scale(0.995)" },
};

const topInputSx = {
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 2.4,
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: alpha(ACCENT, 0.38) },
        "&.Mui-focused fieldset": { borderColor: ACCENT },
        "&.Mui-focused": {
            boxShadow: `0 0 0 4px ${alpha(ACCENT, 0.14)}`,
        },
    },
    "& .MuiInputLabel-root": { color: softText.secondary },
    "& .MuiSvgIcon-root": { color: softText.muted },
};

const miniSelectSx = {
    minWidth: 170,
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 2.2,
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: alpha(ACCENT2, 0.35) },
        "&.Mui-focused fieldset": { borderColor: ACCENT2 },
        "&.Mui-focused": {
            boxShadow: `0 0 0 4px ${alpha(ACCENT2, 0.12)}`,
        },
    },
    "& .MuiInputLabel-root": { color: softText.secondary },
    "& .MuiSelect-icon": { color: softText.muted },
};

const cleanBtnSx = {
    borderRadius: 999,
    borderColor: "rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.86)",
    fontWeight: 980,
    px: 1.6,
    "&:hover": { borderColor: alpha(ACCENT, 0.55), bgcolor: "rgba(255,255,255,0.04)" },
};

const drawerChipSx = {
    height: 28,
    borderRadius: 999,
    bgcolor: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.90)",
    fontWeight: 950,
    border: "1px solid rgba(255,255,255,0.10)",
};

const infoIconSx = { fontSize: 16, color: "rgba(255,255,255,0.42)" };

