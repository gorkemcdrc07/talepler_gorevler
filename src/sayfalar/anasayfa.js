// src/sayfalar/anasayfa.js
import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Grid,
    Paper,
    Stack,
    Typography,
    LinearProgress,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    Collapse,
    IconButton,
} from "@mui/material";
import {
    DashboardOutlined,
    AddCircleOutline,
    InboxOutlined,
    TimelineOutlined,
    LocalFireDepartmentOutlined,
    AssignmentTurnedInOutlined,
    FilterListOutlined,
    ArrowForwardIosOutlined,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AppShell from "../bilesenler/AppShell";

const MotionPaper = motion(Paper);
const MotionBox = motion(Box);

// --- MODERN TASARIM SİSTEMİ ---
const themeColors = {
    primary: "#00f2ff",
    secondary: "#00d2ff",
    bgDark: "#0a0f1c",
    cardBg: "rgba(17, 25, 40, 0.75)",
    border: "rgba(255, 255, 255, 0.125)",
};

const cardSx = {
    p: 3,
    bgcolor: themeColors.cardBg,
    backgroundImage:
        "linear-gradient(to bottom right, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0))",
    backdropFilter: "blur(20px) saturate(180%)",
    borderRadius: "24px",
    border: `1px solid ${themeColors.border}`,
    position: "relative",
    overflow: "hidden",
    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    "&:hover": {
        transform: "translateY(-5px)",
        boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(0, 242, 255, 0.1)`,
        borderColor: "rgba(0, 242, 255, 0.3)",
    },
};

const glowBtn = {
    borderRadius: "14px",
    textTransform: "none",
    fontWeight: 800,
    background: `linear-gradient(45deg, ${themeColors.primary} 30%, ${themeColors.secondary} 90%)`,
    color: "#0a0f1c",
    px: 4,
    py: 1.2,
    boxShadow: `0 4px 20px rgba(0, 242, 255, 0.3)`,
    transition: "all 0.3s ease",
    "&:hover": {
        transform: "scale(1.02)",
        boxShadow: `0 6px 25px rgba(0, 242, 255, 0.5)`,
        background: `linear-gradient(45deg, ${themeColors.secondary} 30%, ${themeColors.primary} 90%)`,
    },
};

// --- ALT BİLEŞENLER ---
function StatCard({ icon, label, value, hint, progress, active, onClick }) {
    return (
        <MotionPaper
            elevation={0}
            whileTap={{ scale: 0.97 }}
            sx={{
                ...cardSx,
                cursor: "pointer",
                borderLeft: active ? `6px solid ${themeColors.primary}` : `1px solid ${themeColors.border}`,
                bgcolor: active ? "rgba(0, 242, 255, 0.05)" : themeColors.cardBg,
            }}
            onClick={onClick}
        >
            <Stack spacing={2.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: "16px",
                            bgcolor: "rgba(0, 242, 255, 0.1)",
                            color: themeColors.primary,
                            display: "flex",
                        }}
                    >
                        {icon}
                    </Box>
                    <Typography
                        sx={{
                            fontSize: "2.2rem",
                            fontWeight: 900,
                            color: "#fff",
                            lineHeight: 1,
                            letterSpacing: -1,
                        }}
                    >
                        {value}
                    </Typography>
                </Stack>

                <Box>
                    <Typography sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: "1rem", mb: 0.5 }}>
                        {label}
                    </Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: 500, letterSpacing: 0.5 }}>
                        {hint.toUpperCase()}
                    </Typography>
                </Box>

                {typeof progress === "number" && (
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: "rgba(255,255,255,0.05)",
                            "& .MuiLinearProgress-bar": {
                                borderRadius: 3,
                                background: `linear-gradient(90deg, ${themeColors.secondary}, ${themeColors.primary})`,
                                boxShadow: `0 0 10px ${themeColors.primary}`,
                            },
                        }}
                    />
                )}
            </Stack>
        </MotionPaper>
    );
}

// --- MOCK DATA ---
function buildMockTickets(kind, role) {
    const base = [
        { id: "TLP-1024", baslik: "Depo sayım süreci iyileştirme", birim: "Depo", oncelik: "Orta", durum: "Açık", gun: 2 },
        { id: "TLP-1041", baslik: "Sevkiyat planında çift kayıt", birim: "Operasyon", oncelik: "Yüksek", durum: "Triage", gun: 0 },
        { id: "TLP-1049", baslik: "Fatura onay adımı gecikmesi", birim: "Finans", oncelik: "Yüksek", durum: "SLA Risk", gun: 1 },
        { id: "TLP-0999", baslik: "İrsaliye kontrol adımı", birim: "Operasyon", oncelik: "Düşük", durum: "Tamamlandı", gun: 7 },
        { id: "TLP-1002", baslik: "Teslimat raporu formatı", birim: "Operasyon", oncelik: "Orta", durum: "Beklemede", gun: 3 },
    ];
    const map = {
        requester: {
            acik: (t) => t.durum === "Açık",
            beklemede: (t) => t.durum === "Beklemede",
            tamamlanan: (t) => t.durum === "Tamamlandı",
            slaRisk: (t) => t.durum === "SLA Risk",
            tum: () => true,
        },
        process: {
            triage: (t) => t.durum === "Triage",
            banaAtanan: (t) => t.durum === "Açık",
            slaRisk: (t) => t.durum === "SLA Risk",
            kapananBugun: (t) => t.durum === "Tamamlandı",
            tum: () => true,
        },
    };
    const fn = map[role]?.[kind] || (() => true);
    return base.filter(fn);
}

export default function AnaSayfa() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    const [activePanel, setActivePanel] = useState("tum");
    const [rows, setRows] = useState([]);
    const [detailsOpen] = useState(true);

    // ✅ role artık profile.rol üzerinden
    const role = useMemo(() => profile?.rol || profile?.role || "requester", [profile]);

    // ✅ AUTH YOK: localStorage oturum_kullanici ile boot
    useEffect(() => {
        let alive = true;

        const boot = async () => {
            setLoading(true);

            const raw = localStorage.getItem("oturum_kullanici");
            if (!raw) {
                navigate("/", { replace: true });
                return;
            }

            let sessionUser = null;
            try {
                sessionUser = JSON.parse(raw);
            } catch {
                localStorage.removeItem("oturum_kullanici");
                navigate("/", { replace: true });
                return;
            }

            // sessionUser içinde id varsa DB’den profili çek (güncel rol vs. için)
            if (sessionUser?.id) {
                const { data, error } = await supabase
                    .from("kullanicilar")
                    .select("*")
                    .eq("id", sessionUser.id)
                    .maybeSingle();

                if (!alive) return;

                // kullanıcı silinmiş / pasif olmuşsa çıkış
                if (error || !data || data.aktif === false) {
                    localStorage.removeItem("oturum_kullanici");
                    navigate("/", { replace: true });
                    return;
                }

                setProfile(data);
            } else {
                // id yoksa en azından localStorage’daki bilgiyi profile gibi kullan
                setProfile(sessionUser);
            }

            if (!alive) return;
            setLoading(false);
        };

        boot();
        return () => {
            alive = false;
        };
    }, [navigate]);

    const headerName = useMemo(() => {
        const full = `${profile?.ad || ""} ${profile?.soyad || ""}`.trim();
        return full || profile?.kullanici_adi || "Kullanıcı";
    }, [profile]);

    const requesterStats = { acik: 5, beklemede: 2, tamamlanan: 14, slaRisk: 1 };
    const processStats = { triage: 9, banaAtanan: 6, slaRisk: 3, kapananBugun: 4 };

    const navRightExtra = (
        <Button
            onClick={() => (role === "process" ? navigate("/triage") : navigate("/talepler/yeni"))}
            variant="contained"
            startIcon={role === "process" ? <InboxOutlined /> : <AddCircleOutline />}
            sx={glowBtn}
        >
            {role === "process" ? "Triage Merkezi" : "Yeni Talep Oluştur"}
        </Button>
    );

    useEffect(() => {
        if (loading) return;
        setRows(buildMockTickets(activePanel, role));
    }, [activePanel, role, loading]);

    const panelTitle = useMemo(() => {
        const mapReq = {
            acik: "Açık Talepler",
            beklemede: "Cevap Bekleyenler",
            tamamlanan: "Tamamlanan Arşivi",
            slaRisk: "Kritik SLA Riski",
            tum: "Tüm Taleplerim",
        };
        const mapPro = {
            triage: "Triage Kuyruğu",
            banaAtanan: "Üzerimdeki İşler",
            slaRisk: "SLA İhlal Riski",
            kapananBugun: "Bugün Kapatılan",
            tum: "Genel Liste",
        };
        return (role === "process" ? mapPro : mapReq)[activePanel] || "Talepler";
    }, [activePanel, role]);

    return (
        <AppShell
            role={role}
            navTitle="Kontrol Paneli"
            navSubtitle={loading ? "Veriler senkronize ediliyor..." : `Hoş geldin, ${headerName}`}
            navRightExtra={navRightExtra}
        >
            <AnimatePresence mode="wait">
                {loading ? (
                    <MotionBox
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}
                    >
                        <Stack alignItems="center" spacing={3}>
                            <Box sx={{ width: 280 }}>
                                <LinearProgress
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: "rgba(0,242,255,0.05)",
                                        "& .MuiLinearProgress-bar": {
                                            bgcolor: themeColors.primary,
                                            boxShadow: `0 0 15px ${themeColors.primary}`,
                                        },
                                    }}
                                />
                            </Box>
                            <Typography sx={{ color: themeColors.primary, fontWeight: 800, letterSpacing: 4, fontSize: "0.8rem" }}>
                                SİSTEM YÜKLENİYOR
                            </Typography>
                        </Stack>
                    </MotionBox>
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <Grid container spacing={3}>
                            {role === "process" ? (
                                <>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <StatCard
                                            icon={<InboxOutlined />}
                                            label="Triage"
                                            value={processStats.triage}
                                            hint="Bekleyen Atamalar"
                                            progress={70}
                                            active={activePanel === "triage"}
                                            onClick={() => setActivePanel("triage")}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <StatCard
                                            icon={<AssignmentTurnedInOutlined />}
                                            label="Bana Atanan"
                                            value={processStats.banaAtanan}
                                            hint="Aktif Görevler"
                                            progress={45}
                                            active={activePanel === "banaAtanan"}
                                            onClick={() => setActivePanel("banaAtanan")}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <StatCard
                                            icon={<LocalFireDepartmentOutlined />}
                                            label="SLA Riski"
                                            value={processStats.slaRisk}
                                            hint="Acil Müdahale"
                                            progress={90}
                                            active={activePanel === "slaRisk"}
                                            onClick={() => setActivePanel("slaRisk")}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <StatCard
                                            icon={<TimelineOutlined />}
                                            label="Kapanan"
                                            value={processStats.kapananBugun}
                                            hint="Günlük Performans"
                                            progress={20}
                                            active={activePanel === "kapananBugun"}
                                            onClick={() => setActivePanel("kapananBugun")}
                                        />
                                    </Grid>
                                </>
                            ) : (
                                <>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <StatCard
                                            icon={<InboxOutlined />}
                                            label="Açık"
                                            value={requesterStats.acik}
                                            hint="İşlem Görenler"
                                            progress={40}
                                            active={activePanel === "acik"}
                                            onClick={() => setActivePanel("acik")}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <StatCard
                                            icon={<DashboardOutlined />}
                                            label="Bekleyen"
                                            value={requesterStats.beklemede}
                                            hint="Aksiyon Gereken"
                                            progress={15}
                                            active={activePanel === "beklemede"}
                                            onClick={() => setActivePanel("beklemede")}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <StatCard
                                            icon={<AssignmentTurnedInOutlined />}
                                            label="Tamamlanan"
                                            value={requesterStats.tamamlanan}
                                            hint="Çözülen Talepler"
                                            progress={100}
                                            active={activePanel === "tamamlanan"}
                                            onClick={() => setActivePanel("tamamlanan")}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <StatCard
                                            icon={<LocalFireDepartmentOutlined />}
                                            label="SLA"
                                            value={requesterStats.slaRisk}
                                            hint="Süre Sınırı"
                                            progress={85}
                                            active={activePanel === "slaRisk"}
                                            onClick={() => setActivePanel("slaRisk")}
                                        />
                                    </Grid>
                                </>
                            )}
                        </Grid>

                        <Collapse in={detailsOpen}>
                            <Box>
                                <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: 3, px: 1 }}>
                                    <Box>
                                        <Typography variant="h5" sx={{ color: "#fff", fontWeight: 900, letterSpacing: -0.5 }}>
                                            {panelTitle}
                                        </Typography>
                                        <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
                                            Toplam {rows.length} kayıt listeleniyor
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <IconButton sx={{ color: "rgba(255,255,255,0.5)", bgcolor: "rgba(255,255,255,0.05)" }}>
                                            <FilterListOutlined />
                                        </IconButton>
                                    </Stack>
                                </Stack>

                                <TableContainer sx={{ overflow: "visible" }}>
                                    <Table sx={{ borderCollapse: "separate", borderSpacing: "0 12px" }}>
                                        <TableHead>
                                            <TableRow
                                                sx={{
                                                    "& th": {
                                                        border: 0,
                                                        color: "rgba(255,255,255,0.3)",
                                                        fontWeight: 700,
                                                        fontSize: "0.7rem",
                                                        textTransform: "uppercase",
                                                        px: 3,
                                                    },
                                                }}
                                            >
                                                <TableCell>ID</TableCell>
                                                <TableCell>Talep Detayı</TableCell>
                                                <TableCell>Birim</TableCell>
                                                <TableCell>Öncelik</TableCell>
                                                <TableCell>Durum</TableCell>
                                                <TableCell align="right">İşlem</TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {rows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={6}
                                                        align="center"
                                                        sx={{
                                                            py: 10,
                                                            color: "rgba(255,255,255,0.2)",
                                                            bgcolor: "rgba(255,255,255,0.02)",
                                                            borderRadius: 4,
                                                        }}
                                                    >
                                                        Henüz veri bulunmuyor.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                rows.map((r, idx) => (
                                                    <TableRow
                                                        key={r.id}
                                                        component={motion.tr}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        onClick={() => navigate(`/talepler/${r.id}`)}
                                                        sx={{
                                                            cursor: "pointer",
                                                            "& td": {
                                                                bgcolor: "rgba(255,255,255,0.03)",
                                                                border: "1px solid rgba(255,255,255,0.05)",
                                                                borderStyle: "solid none",
                                                                py: 2.5,
                                                                px: 3,
                                                                transition: "all 0.2s",
                                                            },
                                                            "& td:first-of-type": {
                                                                borderLeftStyle: "solid",
                                                                borderTopLeftRadius: "16px",
                                                                borderBottomLeftRadius: "16px",
                                                            },
                                                            "& td:last-of-type": {
                                                                borderRightStyle: "solid",
                                                                borderTopRightRadius: "16px",
                                                                borderBottomRightRadius: "16px",
                                                            },
                                                            "&:hover td": {
                                                                bgcolor: "rgba(255,255,255,0.07)",
                                                                borderColor: "rgba(0, 242, 255, 0.2)",
                                                            },
                                                        }}
                                                    >
                                                        <TableCell sx={{ color: themeColors.primary, fontWeight: 800 }}>{r.id}</TableCell>
                                                        <TableCell sx={{ color: "#fff", fontWeight: 600 }}>{r.baslik}</TableCell>
                                                        <TableCell sx={{ color: "rgba(255,255,255,0.5)" }}>{r.birim}</TableCell>
                                                        <TableCell>
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                <Box
                                                                    sx={{
                                                                        width: 8,
                                                                        height: 8,
                                                                        borderRadius: "50%",
                                                                        bgcolor: r.oncelik === "Yüksek" ? "#ff4d4d" : "#ffa500",
                                                                        boxShadow: `0 0 10px ${r.oncelik === "Yüksek" ? "#ff4d4d" : "#ffa500"}`,
                                                                    }}
                                                                />
                                                                <Typography
                                                                    sx={{
                                                                        color: r.oncelik === "Yüksek" ? "#ff4d4d" : "#ffa500",
                                                                        fontSize: "0.85rem",
                                                                        fontWeight: 700,
                                                                    }}
                                                                >
                                                                    {r.oncelik}
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={r.durum}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: "rgba(0,242,255,0.1)",
                                                                    color: themeColors.primary,
                                                                    fontWeight: 700,
                                                                    borderRadius: "8px",
                                                                    border: "1px solid rgba(0,242,255,0.2)",
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <IconButton size="small" sx={{ color: "rgba(255,255,255,0.2)" }}>
                                                                <ArrowForwardIosOutlined sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Collapse>
                    </Box>
                )}
            </AnimatePresence>
        </AppShell>
    );
}
