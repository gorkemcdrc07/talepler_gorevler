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
    Calendar,
    RefreshCcw,
    Filter,
    Layers,
    CircleCheck,
    AlertTriangle,
    Clock,
    PlayCircle,
    Ban,
} from "lucide-react";
import { BarChart, LineChart, PieChart } from "@mui/x-charts";
import AppLayout from "../bilesenler/AppLayout";

const API_BASE = "http://localhost:4000";

/* =======================
   Helpers
======================= */
function getSession() {
    try {
        return JSON.parse(localStorage.getItem("oturum") || "null");
    } catch {
        return null;
    }
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

function isoDay(d) {
    if (!d) return null;
    return String(d).slice(0, 10);
}

function toDateObj(iso10) {
    if (!iso10) return null;
    return new Date(`${iso10}T00:00:00`);
}

// UTC kayması olmasın diye toISOString kullanmıyoruz
function addDaysISO(iso10, days) {
    const d = toDateObj(iso10);
    if (!d) return null;
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function normalizeStatus(s) {
    const v = String(s || "").toLowerCase().trim();
    if (["bitti", "tamamlandi", "tamamlandı", "done", "completed"].includes(v)) return "tamamlandi";
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
    const due = isoDay(task?.bitis_tarih);
    if (!due) return false;
    return due < todayISO();
}

function statusMeta(task) {
    const st = isOverdue(task) ? "gecikti" : normalizeStatus(task?.durum);

    if (st === "tamamlandi") return { key: "tamamlandi", label: "Tamamlandı", icon: <CircleCheck size={14} />, c: "#22c55e" };
    if (st === "islemde") return { key: "islemde", label: "İşlemde", icon: <PlayCircle size={14} />, c: "#00f2fe" };
    if (st === "beklemede") return { key: "beklemede", label: "Beklemede", icon: <Clock size={14} />, c: "#a78bfa" };
    if (st === "iptal") return { key: "iptal", label: "İptal", icon: <Ban size={14} />, c: "#94a3b8" };
    if (st === "gecikti") return { key: "gecikti", label: "Gecikti", icon: <AlertTriangle size={14} />, c: "#ef4444" };
    return { key: "acik", label: "Açık", icon: <Clock size={14} />, c: "#f59e0b" };
}

// kapanış tarihi için olası alanlar
function getClosedISO(task) {
    const candidates = [
        task?.kapanis_tarih,
        task?.tamamlanma_tarih,
        task?.tamamlandi_tarih,
        task?.closed_at,
        task?.closedAt,
        task?.guncelleme_tarih,
        task?.updated_at,
        task?.updatedAt,
    ];
    for (const x of candidates) {
        const d = isoDay(x);
        if (d) return d;
    }
    return null;
}

// oluşturma/başlangıç tarihi için olası alanlar
function getCreatedISO(task) {
    const candidates = [
        task?.olusturma_tarih,
        task?.created_at,
        task?.createdAt,
        task?.baslangic_tarih,
    ];
    for (const x of candidates) {
        const d = isoDay(x);
        if (d) return d;
    }
    return null;
}

function formatRate(x) {
    if (!isFinite(x)) return "-";
    return `%${Math.round(x * 100)}`;
}

/* =======================
   UI Components
======================= */
function KpiCard({ title, value, sub, icon, tone = "default" }) {
    const toneMap = {
        default: { bd: "rgba(255,255,255,0.10)", bg: "rgba(255,255,255,0.05)" },
        good: { bd: "rgba(34,197,94,0.22)", bg: "rgba(34,197,94,0.10)" },
        warn: { bd: "rgba(245,158,11,0.22)", bg: "rgba(245,158,11,0.10)" },
        danger: { bd: "rgba(239,68,68,0.22)", bg: "rgba(239,68,68,0.10)" },
        info: { bd: "rgba(0,242,254,0.22)", bg: "rgba(0,242,254,0.10)" },
        purple: { bd: "rgba(167,139,250,0.22)", bg: "rgba(167,139,250,0.10)" },
    };
    const t = toneMap[tone] || toneMap.default;

    return (
        <Card
            sx={{
                borderRadius: 4,
                position: "relative",
                overflow: "hidden",
                background: "rgba(2,6,23,0.52)",
                border: `1px solid ${t.bd}`,
                backdropFilter: "blur(16px)",
                boxShadow: "0 22px 90px rgba(0,0,0,0.45)",
                "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    padding: "1px",
                    borderRadius: "inherit",
                    background:
                        "linear-gradient(135deg, rgba(0,242,254,0.22), rgba(255,255,255,0.05), rgba(167,139,250,0.14))",
                    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    opacity: 0.6,
                    pointerEvents: "none",
                },
            }}
        >
            <CardContent sx={{ p: 2.2 }}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 3,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: t.bg,
                            border: `1px solid ${t.bd}`,
                            color: "rgba(255,255,255,0.92)",
                        }}
                    >
                        {icon}
                    </Box>

                    <Stack spacing={0.25} sx={{ flex: 1 }}>
                        <Typography sx={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 900 }}>
                            {title}
                        </Typography>
                        <Typography sx={{ color: "#fff", fontSize: 22, fontWeight: 1000, letterSpacing: -0.3 }}>
                            {value}
                        </Typography>
                        {sub ? (
                            <Typography sx={{ color: "rgba(255,255,255,0.58)", fontSize: 12, fontWeight: 850 }}>
                                {sub}
                            </Typography>
                        ) : null}
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}

function ChartCard({ title, subtitle, children, right }) {
    return (
        <Card
            sx={{
                borderRadius: 4,
                background: "rgba(2,6,23,0.52)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(16px)",
                overflow: "hidden",
                boxShadow: "0 22px 90px rgba(0,0,0,0.45)",
            }}
        >
            <CardContent sx={{ p: 2.4 }}>
                <Stack spacing={1.2}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ color: "#fff", fontWeight: 1000, letterSpacing: -0.2 }}>
                                {title}
                            </Typography>
                            {subtitle ? (
                                <Typography sx={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 850, mt: 0.3 }}>
                                    {subtitle}
                                </Typography>
                            ) : null}
                        </Box>
                        {right}
                    </Stack>

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                    {children}
                </Stack>
            </CardContent>
        </Card>
    );
}

/* =======================
   Main
======================= */
function DashboardContent() {
    const session = getSession();
    const myId = session?.id || session?.user_id || session?.kullanici_id || null;

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [tasks, setTasks] = useState([]);

    const [range, setRange] = useState("30"); // 7 | 30 | 90
    const [onlyMine, setOnlyMine] = useState(false);

    useEffect(() => {
        if (!myId) setOnlyMine(false);
    }, [myId]);

    const fromISO = useMemo(() => {
        const t = todayISO();
        const days = Number(range) || 30;
        return addDaysISO(t, -days + 1);
    }, [range]);

    const load = async () => {
        setLoading(true);
        setErr("");
        try {
            const url =
                onlyMine && myId
                    ? `${API_BASE}/api/gorevler?userId=${encodeURIComponent(myId)}`
                    : `${API_BASE}/api/gorevler`;

            const data = await fetchJson(url);
            const arr = Array.isArray(data?.tasks) ? data.tasks : [];
            setTasks(arr);
        } catch (e) {
            setErr(e?.message || "Veriler yüklenemedi.");
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
            return {
                ...t,
                _statusKey: sm.key,
                _created: getCreatedISO(t),
                _closed: getClosedISO(t),
                _due: isoDay(t?.bitis_tarih),
            };
        });
    }, [tasks]);

    const inRange = useMemo(() => {
        const from = fromISO;
        const to = todayISO();
        if (!from || !to) return [];
        return enriched.filter((t) => {
            const c = t._created;
            if (!c) return false;
            return c >= from && c <= to;
        });
    }, [enriched, fromISO]);

    const kpi = useMemo(() => {
        const total = inRange.length;

        const active = inRange.filter((t) => ["acik", "islemde", "beklemede"].includes(t._statusKey)).length;
        const overdueOpen = inRange.filter((t) => isOverdue(t)).length;

        const done = inRange.filter((t) => t._statusKey === "tamamlandi");
        const doneWithClosed = done.filter((t) => !!t._closed && !!t._due);

        const onTimeDone = doneWithClosed.filter((t) => t._closed <= t._due).length;
        const lateDone = doneWithClosed.filter((t) => t._closed > t._due).length;

        const denom = onTimeDone + lateDone;
        const onTimeRate = denom > 0 ? onTimeDone / denom : NaN;

        const durations = done
            .filter((t) => t._created && t._closed)
            .map((t) => {
                const a = toDateObj(t._created);
                const b = toDateObj(t._closed);
                const ms = b.getTime() - a.getTime();
                return Math.round(ms / (1000 * 60 * 60 * 24));
            });

        const avgResolutionDays = durations.length > 0 ? durations.reduce((s, x) => s + x, 0) / durations.length : NaN;

        // durum dağılımı
        const byStatus = {
            acik: inRange.filter((t) => t._statusKey === "acik").length,
            islemde: inRange.filter((t) => t._statusKey === "islemde").length,
            beklemede: inRange.filter((t) => t._statusKey === "beklemede").length,
            tamamlandi: inRange.filter((t) => t._statusKey === "tamamlandi").length,
            iptal: inRange.filter((t) => t._statusKey === "iptal").length,
            gecikti: inRange.filter((t) => t._statusKey === "gecikti").length,
        };

        return {
            total,
            active,
            overdueOpen,
            onTimeDone,
            lateDone,
            onTimeRate,
            avgResolutionDays,
            doneButNoClosed: done.length - doneWithClosed.length,
            byStatus,
        };
    }, [inRange]);

    // ✅ DONMA FIX: güvenli zaman serisi
    const timeseries = useMemo(() => {
        const from = fromISO;
        const to = todayISO();
        if (!from || !to) return [];

        const days = [];
        let d = from;

        // en fazla 400 gün
        for (let i = 0; i < 400 && d <= to; i++) {
            days.push(d);
            const next = addDaysISO(d, 1);
            if (!next || next === d) break;
            d = next;
        }

        const map = new Map(days.map((dd) => [dd, { date: dd, acilan: 0, kapanan: 0, gecKapanan: 0 }]));

        for (const t of inRange) {
            if (t._created && map.has(t._created)) map.get(t._created).acilan += 1;

            if (t._closed && map.has(t._closed)) {
                map.get(t._closed).kapanan += 1;
                if (t._due && t._closed > t._due) map.get(t._closed).gecKapanan += 1;
            }
        }

        return days.map((dd) => map.get(dd));
    }, [inRange, fromISO]);

    const xLabels = useMemo(() => timeseries.map((x) => x.date.slice(5)), [timeseries]); // AA-GG
    const seriesOpened = useMemo(() => timeseries.map((x) => x.acilan), [timeseries]);
    const seriesClosed = useMemo(() => timeseries.map((x) => x.kapanan), [timeseries]);
    const seriesLateClosed = useMemo(() => timeseries.map((x) => x.gecKapanan), [timeseries]);

    const donutData = useMemo(() => {
        return [
            { id: 0, value: kpi.onTimeDone, label: "Zamanında" },
            { id: 1, value: kpi.lateDone, label: "Geç" },
        ];
    }, [kpi.onTimeDone, kpi.lateDone]);

    const statusPieData = useMemo(() => {
        const m = kpi.byStatus || {};
        return [
            { id: 0, value: m.acik || 0, label: "Açık" },
            { id: 1, value: m.islemde || 0, label: "İşlemde" },
            { id: 2, value: m.beklemede || 0, label: "Beklemede" },
            { id: 3, value: m.tamamlandi || 0, label: "Tamamlandı" },
            { id: 4, value: m.gecikti || 0, label: "Gecikti" },
            { id: 5, value: m.iptal || 0, label: "İptal" },
        ].filter((x) => x.value > 0);
    }, [kpi.byStatus]);

    return (
        <Box
            sx={{
                maxWidth: 1200,
                mx: "auto",
                px: { xs: 1.2, md: 0 },
                pb: 6,

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
            }}
        >
            {/* HEADER */}
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

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ position: "relative" }}>
                    <Stack spacing={0.6} sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 1000, fontSize: { xs: 22, md: 30 }, color: "#fff", letterSpacing: -0.6, lineHeight: 1.05 }}>
                            Dashboard
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.70)", fontSize: 13 }}>
                            Seçili aralıkta toplam kayıt, zamanında/geç tamamlanan, aktif işler ve trendleri görüntüle.
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.1 }}>
                            <Chip
                                icon={<Calendar size={16} />}
                                label={`Aralık: ${fromISO || "-"} → ${todayISO()}`}
                                sx={{
                                    height: 30,
                                    borderRadius: 999,
                                    fontWeight: 950,
                                    bgcolor: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    color: "rgba(255,255,255,0.85)",
                                }}
                            />
                            {kpi.doneButNoClosed > 0 && (
                                <Chip
                                    icon={<AlertTriangle size={16} />}
                                    label={`Kapanış tarihi eksik: ${kpi.doneButNoClosed}`}
                                    sx={{
                                        height: 30,
                                        borderRadius: 999,
                                        fontWeight: 950,
                                        bgcolor: "rgba(245,158,11,0.12)",
                                        border: "1px solid rgba(245,158,11,0.22)",
                                        color: "#f59e0b",
                                    }}
                                />
                            )}
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
                    </Stack>
                </Stack>
            </Box>

            {/* FILTERS */}
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
                            select
                            label="Tarih Aralığı"
                            value={range}
                            onChange={(e) => setRange(e.target.value)}
                            fullWidth
                            sx={{
                                "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.72)", fontWeight: 850 },
                                "& .MuiInputLabel-root.Mui-focused": { color: "#00f2fe" },
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2.6,
                                    bgcolor: "rgba(2,6,23,0.35)",
                                    backdropFilter: "blur(12px)",
                                    "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                                    "&:hover fieldset": { borderColor: "rgba(0,242,254,0.28)" },
                                    "&.Mui-focused fieldset": { borderColor: "rgba(0,242,254,0.55)" },
                                },
                                "& .MuiOutlinedInput-input": { color: "rgba(255,255,255,0.92)", fontWeight: 780 },
                            }}
                        >
                            <MenuItem value="7" sx={{ color: "rgba(255,255,255,0.92)" }}>Son 7 gün</MenuItem>
                            <MenuItem value="30" sx={{ color: "rgba(255,255,255,0.92)" }}>Son 30 gün</MenuItem>
                            <MenuItem value="90" sx={{ color: "rgba(255,255,255,0.92)" }}>Son 90 gün</MenuItem>
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
                                minWidth: 220,
                            }}
                        >
                            {onlyMine ? "Sadece Benim" : "Tüm Kayıtlar"}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* BODY */}
            {loading ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 7 }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 1.5, color: "rgba(255,255,255,0.7)" }}>Yükleniyor...</Typography>
                </Box>
            ) : err ? (
                <Alert severity="error" variant="outlined" sx={{ color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.18)" }}>
                    {err}
                </Alert>
            ) : (
                <Stack spacing={2}>
                    {/* KPI GRID */}
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                            gap: 2,
                        }}
                    >
                        <KpiCard title="Toplam Kayıt" value={kpi.total} sub="Seçili aralık" icon={<Layers size={18} />} tone="info" />
                        <KpiCard title="Aktif Kayıt" value={kpi.active} sub="Açık/İşlemde/Beklemede" icon={<PlayCircle size={18} />} tone="purple" />
                        <KpiCard title="Açıkta Geciken" value={kpi.overdueOpen} sub="Bitiş tarihi geçmiş" icon={<AlertTriangle size={18} />} tone="danger" />

                        <KpiCard title="Zamanında Tamamlanan" value={kpi.onTimeDone} sub="Kapanış ≤ Hedef" icon={<CircleCheck size={18} />} tone="good" />
                        <KpiCard title="Geç Tamamlanan" value={kpi.lateDone} sub="Kapanış > Hedef" icon={<AlertTriangle size={18} />} tone="warn" />
                        <KpiCard title="Zamanında Tamamlama Oranı" value={formatRate(kpi.onTimeRate)} sub="Kapanış tarihi olanlarda" icon={<Clock size={18} />} tone="info" />
                    </Box>

                    {/* Charts row */}
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", lg: "1.25fr 1fr" },
                            gap: 2,
                        }}
                    >
                        <ChartCard
                            title="Günlük Trend"
                            subtitle="Açılan ve kapanan kayıtların günlük dağılımı"
                            right={
                                <Chip
                                    size="small"
                                    label={`${fromISO || "-"} → ${todayISO()}`}
                                    sx={{
                                        borderRadius: 999,
                                        fontWeight: 950,
                                        bgcolor: "rgba(255,255,255,0.06)",
                                        border: "1px solid rgba(255,255,255,0.10)",
                                        color: "rgba(255,255,255,0.85)",
                                    }}
                                />
                            }
                        >
                            <Box sx={{ width: "100%", overflowX: "auto" }}>
                                <Box sx={{ minWidth: 900 }}>
                                    <LineChart
                                        height={320}
                                        xAxis={[
                                            {
                                                scaleType: "band",
                                                data: xLabels,
                                                label: "Gün",
                                            },
                                        ]}
                                        series={[
                                            { data: seriesOpened, label: "Açılan", showMark: false },
                                            { data: seriesClosed, label: "Kapanan", showMark: false },
                                            { data: seriesLateClosed, label: "Geç Kapanan", showMark: false },
                                        ]}
                                        grid={{ vertical: false, horizontal: true }}
                                        margin={{ left: 50, right: 20, top: 20, bottom: 30 }}
                                    />
                                </Box>
                            </Box>
                        </ChartCard>

                        <ChartCard
                            title="Zamanında / Geç"
                            subtitle="Tamamlanan kayıtların hedefe uyumu"
                            right={
                                <Chip
                                    size="small"
                                    icon={<Clock size={14} />}
                                    label="Tamamlananlar"
                                    sx={{
                                        borderRadius: 999,
                                        fontWeight: 950,
                                        bgcolor: "rgba(0,242,254,0.10)",
                                        border: "1px solid rgba(0,242,254,0.18)",
                                        color: "#00f2fe",
                                    }}
                                />
                            }
                        >
                            {donutData.reduce((s, x) => s + x.value, 0) === 0 ? (
                                <Alert
                                    severity="info"
                                    variant="outlined"
                                    sx={{ color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.18)" }}
                                >
                                    Bu aralıkta (kapanış tarihi olan) tamamlanan kayıt bulunamadı.
                                </Alert>
                            ) : (
                                <PieChart
                                    height={320}
                                    series={[
                                        {
                                            data: donutData,
                                            innerRadius: 80,
                                            outerRadius: 120,
                                            paddingAngle: 2,
                                            cornerRadius: 6,
                                        },
                                    ]}
                                    margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                                />
                            )}
                        </ChartCard>
                    </Box>

                    {/* Second charts row */}
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", lg: "1fr 1.25fr" },
                            gap: 2,
                        }}
                    >
                        <ChartCard
                            title="Durum Dağılımı"
                            subtitle="Açık/İşlemde/Beklemede/Tamamlandı/Gecikti/İptal"
                        >
                            {statusPieData.length === 0 ? (
                                <Alert
                                    severity="info"
                                    variant="outlined"
                                    sx={{ color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.18)" }}
                                >
                                    Bu aralıkta görüntülenecek veri yok.
                                </Alert>
                            ) : (
                                <PieChart
                                    height={320}
                                    series={[
                                        {
                                            data: statusPieData,
                                            innerRadius: 65,
                                            outerRadius: 120,
                                            paddingAngle: 2,
                                            cornerRadius: 6,
                                        },
                                    ]}
                                    margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                                />
                            )}
                        </ChartCard>

                        <ChartCard
                            title="Günlük Açılan Kayıt (Çubuk)"
                            subtitle="Yoğunluk analizi: hangi gün daha çok kayıt açılmış"
                        >
                            <Box sx={{ width: "100%", overflowX: "auto" }}>
                                <Box sx={{ minWidth: 900 }}>
                                    <BarChart
                                        height={320}
                                        xAxis={[
                                            {
                                                scaleType: "band",
                                                data: xLabels,
                                                label: "Gün",
                                            },
                                        ]}
                                        series={[
                                            { data: seriesOpened, label: "Açılan" },
                                        ]}
                                        grid={{ vertical: false, horizontal: true }}
                                        margin={{ left: 50, right: 20, top: 20, bottom: 30 }}
                                    />
                                </Box>
                            </Box>
                        </ChartCard>
                    </Box>
                </Stack>
            )}
        </Box>
    );
}

export default function Dashboard() {
    return (
        <AppLayout>
            <DashboardContent />
        </AppLayout>
    );
}

