// src/bilesenler/Navbar.js
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    Divider,
    Avatar,
    Badge,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Stack,
    TextField,
    InputAdornment,
    Collapse,
    Button,

    Snackbar,
    Alert,
} from "@mui/material";
import {
    SearchOutlined,
    NotificationsNoneOutlined,
    LogoutOutlined,
    ChatBubbleOutlineRounded,
    SettingsOutlined,
    PersonOutline,
    CloseRounded,
    OpenInNewRounded,
    KeyboardCommandKeyRounded,
    FiberManualRecordRounded,
    ContentCopyRounded,
    CheckRounded,
} from "@mui/icons-material";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

import RightPanelDrawer from "../navbarBilesenleri/RightPanelDrawer";
import BildirimlerPopup from "../navbarBilesenleri/BildirimlerPopup";
import MesajlarPopup from "../navbarBilesenleri/MesajlarPopup";
import ProfilPopup from "../navbarBilesenleri/ProfilPopup";
import AyarlarPopup from "../navbarBilesenleri/AyarlarPopup";

/**
 * Modern Navbar Özellikleri (bu versiyon):
 * ✅ Daha modern cam efekt + gölge + gradient çizgi
 * ✅ Arama butonu artık "Quick Search" açar (kısayol: Ctrl/⌘ + K)
 * ✅ Çevrimiçi durumu (Realtime channel bağlı) göstergesi
 * ✅ Kullanıcı menüsünde profil kartı (ad/soyad, eposta, rol, birim/unvan)
 * ✅ Kopyala: eposta / kullanıcı adı tek tık
 * ✅ Mini bildirim: kopyalandı snackbar
 * ✅ Panel açılınca badge sayısını sıfırlama (opsiyonel)
 */

const theme = {
    primary: "#00f2ff",
    secondary: "#00d2ff",
    glassBg: "rgba(3, 7, 18, 0.72)",
    glass2: "rgba(10, 15, 28, 0.92)",
    border: "rgba(0,242,255,0.14)",
    textSoft: "rgba(255,255,255,0.55)",
    textFaint: "rgba(255,255,255,0.35)",
    ok: "#3ef0b2",
    warn: "#ffb347",
    danger: "#ff4d4d",
};

const iconBtnSx = {
    border: "1px solid rgba(0,242,255,0.18)",
    bgcolor: "rgba(0,242,255,0.06)",
    color: theme.primary,
    transition: "all .2s ease",
    "&:hover": {
        bgcolor: "rgba(0,242,255,0.12)",
        transform: "translateY(-1px)",
        boxShadow: "0 10px 22px rgba(0,0,0,0.22)",
    },
};

const pillChipSx = {
    bgcolor: "rgba(0,242,255,0.10)",
    color: theme.primary,
    border: "1px solid rgba(0,242,255,0.25)",
    fontWeight: 850,
    borderRadius: 999,
};

function safeFirstChar(s) {
    const ch = (s || "").trim()[0];
    return (ch ? ch.toUpperCase() : "K");
}

export default function Navbar({
    title = "Panel",
    subtitle = "",
    rightExtra = null,
    user = null,
    profile = null,
    initialUnreadChats = 0,
    initialUnreadNotifs = 0,
    // opsiyonel: panel açınca badge sıfırlansın mı?
    resetBadgesOnOpen = true,
}) {
    const navigate = useNavigate();

    const [anchorUser, setAnchorUser] = useState(null);

    // ✅ tek drawer state
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelType, setPanelType] = useState(null); // "chat" | "notifs" | "profile" | "settings"

    const [unreadChats, setUnreadChats] = useState(initialUnreadChats);
    const [unreadNotifs, setUnreadNotifs] = useState(initialUnreadNotifs);

    // ✅ Navbar kendi içinde profile'ı tamamlayabilsin
    const [localProfile, setLocalProfile] = useState(profile);

    // Quick Search
    const [quickOpen, setQuickOpen] = useState(false);
    const [q, setQ] = useState("");
    const quickInputRef = useRef(null);

    // Realtime bağlantı durumu (basit gösterge)
    const [live, setLive] = useState(false);

    // Snackbar
    const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

    useEffect(() => {
        if (profile) setLocalProfile(profile);
    }, [profile]);

    useEffect(() => {
        if (profile) return;
        if (!user?.id) return;

        let alive = true;

        (async () => {
            // NOTE: senin şemanda role yok, rol var.
            // Ayrıca ad/soyad/birim/unvan gibi alanlar var.
            const { data, error } = await supabase
                .from("kullanicilar")
                .select("ad,soyad,avatar_url,rol,birim,unvan,kullanici_adi,eposta,aktif")
                .eq("id", user.id)
                .maybeSingle();

            if (!alive) return;
            if (!error) setLocalProfile(data || null);
        })();

        return () => { alive = false; };
    }, [user?.id, profile]);

    const displayName = useMemo(() => {
        const a = localProfile?.ad || "";
        const s = localProfile?.soyad || "";
        const f = `${a} ${s}`.trim();
        return f || (user?.email ? user.email.split("@")[0] : "Kullanıcı");
    }, [localProfile, user]);

    const avatarSrc = localProfile?.avatar_url || "";
    const rol = localProfile?.rol || "";
    const birim = localProfile?.birim || "";
    const unvan = localProfile?.unvan || "";
    const kullaniciAdi = localProfile?.kullanici_adi || (user?.email ? user.email.split("@")[0] : "");
    const eposta = localProfile?.eposta || user?.email || "";
    const aktif = typeof localProfile?.aktif === "boolean" ? localProfile.aktif : true;

    const logout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    // Realtime (opsiyonel)
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel("navbar-live")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
                setUnreadChats((x) => x + 1);
            })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "bildirimler" }, () => {
                setUnreadNotifs((x) => x + 1);
            })
            .subscribe((status) => {
                // status: "SUBSCRIBED" vb.
                setLive(status === "SUBSCRIBED");
            });

        return () => {
            setLive(false);
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const openPanel = (type) => {
        setPanelType(type);
        setPanelOpen(true);

        if (!resetBadgesOnOpen) return;
        if (type === "chat") setUnreadChats(0);
        if (type === "notifs") setUnreadNotifs(0);
    };

    const closePanel = () => setPanelOpen(false);

    const openQuick = () => {
        setQuickOpen(true);
        // küçük gecikme ile focus
        setTimeout(() => quickInputRef.current?.focus?.(), 60);
    };

    const closeQuick = () => {
        setQuickOpen(false);
        setQ("");
    };

    // Ctrl/⌘ + K ile quick search
    useEffect(() => {
        const onKeyDown = (e) => {
            const isMac = navigator.platform.toLowerCase().includes("mac");
            const mod = isMac ? e.metaKey : e.ctrlKey;

            if (mod && (e.key === "k" || e.key === "K")) {
                e.preventDefault();
                setQuickOpen((x) => {
                    const next = !x;
                    if (!x && next) setTimeout(() => quickInputRef.current?.focus?.(), 60);
                    return next;
                });
            }
            if (e.key === "Escape") {
                if (quickOpen) closeQuick();
                if (anchorUser) setAnchorUser(null);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [quickOpen, anchorUser]);

    const quickActions = useMemo(() => {
        const list = [
            { key: "talepler", label: "Taleplere Git", hint: "/talepler", onGo: () => navigate("/talepler") },
            { key: "yeni", label: "Yeni Talep Oluştur", hint: "/talepler/yeni", onGo: () => navigate("/talepler/yeni") },
            { key: "triage", label: "Triage Merkezi", hint: "/triage", onGo: () => navigate("/triage") },
            { key: "ayarlar", label: "Ayarlar", hint: "Panel", onGo: () => openPanel("settings") },
            { key: "profil", label: "Profil", hint: "Panel", onGo: () => openPanel("profile") },
        ];

        const qq = q.trim().toLowerCase();
        if (!qq) return list;

        return list.filter((x) => (x.label + " " + x.hint).toLowerCase().includes(qq));
    }, [q, navigate, openPanel]);

    const copyToClipboard = async (text, label = "Kopyalandı") => {
        try {
            await navigator.clipboard.writeText(text);
            setToast({ open: true, msg: label, severity: "success" });
        } catch {
            setToast({ open: true, msg: "Kopyalama başarısız", severity: "error" });
        }
    };

    return (
        <>
            <Box
                sx={{
                    height: 76,
                    px: { xs: 1.25, sm: 2.5 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: theme.glassBg,
                    borderBottom: `1px solid ${theme.border}`,
                    backdropFilter: "blur(24px) saturate(160%)",
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    overflow: "hidden",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        height: 2,
                        background: `linear-gradient(90deg, transparent, rgba(0,242,255,0.75), transparent)`,
                        opacity: 0.9,
                    },
                    "&::after": {
                        content: '""',
                        position: "absolute",
                        left: -120,
                        top: -80,
                        width: 240,
                        height: 240,
                        background: `radial-gradient(circle, rgba(0,242,255,0.16), transparent 60%)`,
                        filter: "blur(4px)",
                        pointerEvents: "none",
                    },
                }}
            >
                {/* SOL */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <Box
                        sx={{
                            width: 10,
                            height: 30,
                            borderRadius: 999,
                            background: `linear-gradient(180deg, rgba(0,242,255,0.95), rgba(0,242,255,0.08))`,
                            boxShadow: "0 0 18px rgba(0,242,255,0.25)",
                        }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography
                                sx={{
                                    color: "#fff",
                                    fontWeight: 950,
                                    letterSpacing: "2px",
                                    textTransform: "uppercase",
                                    fontSize: 13,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {title}
                            </Typography>

                            {/* canlı bağlantı / aktiflik */}
                            <Tooltip title={live ? "Canlı bağlantı aktif" : "Canlı bağlantı bekleniyor"}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                                    <FiberManualRecordRounded
                                        sx={{
                                            fontSize: 12,
                                            color: live ? theme.ok : "rgba(255,255,255,0.25)",
                                            filter: live ? "drop-shadow(0 0 10px rgba(62,240,178,0.45))" : "none",
                                        }}
                                    />
                                </Box>
                            </Tooltip>
                        </Stack>

                        <Typography
                            sx={{
                                color: "rgba(0,242,255,0.60)",
                                fontSize: 12,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: { xs: 170, sm: 420, md: 640 },
                            }}
                        >
                            {subtitle}
                        </Typography>
                    </Box>

                    <Divider
                        orientation="vertical"
                        flexItem
                        sx={{
                            ml: 1,
                            borderColor: theme.border,
                            display: { xs: "none", sm: "block" },
                        }}
                    />

                    {!!rol && (
                        <Chip
                            size="small"
                            label={rol === "process" ? "Süreç" : rol === "admin" ? "Admin" : "Kullanıcı"}
                            sx={{ display: { xs: "none", sm: "inline-flex" }, ...pillChipSx }}
                        />
                    )}

                    {aktif === false && (
                        <Chip
                            size="small"
                            label="Pasif"
                            sx={{
                                display: { xs: "none", sm: "inline-flex" },
                                bgcolor: "rgba(255,77,77,0.12)",
                                color: theme.danger,
                                border: "1px solid rgba(255,77,77,0.35)",
                                fontWeight: 850,
                                borderRadius: 999,
                            }}
                        />
                    )}
                </Box>

                {/* SAĞ */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {rightExtra}

                    <Tooltip title="Hızlı Ara (Ctrl/⌘ + K)">
                        <IconButton onClick={openQuick} sx={iconBtnSx}>
                            <SearchOutlined />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Mesajlar">
                        <IconButton onClick={() => openPanel("chat")} sx={iconBtnSx}>
                            <Badge badgeContent={unreadChats} color="error" overlap="circular" max={99}>
                                <ChatBubbleOutlineRounded />
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Bildirimler">
                        <IconButton onClick={() => openPanel("notifs")} sx={iconBtnSx}>
                            <Badge badgeContent={unreadNotifs} color="error" overlap="circular" max={99}>
                                <NotificationsNoneOutlined />
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Hesap">
                        <IconButton
                            onClick={(e) => setAnchorUser(e.currentTarget)}
                            sx={{
                                p: 0.5,
                                ml: 0.5,
                                borderRadius: 999,
                                border: "1px solid rgba(0,242,255,0.25)",
                                bgcolor: "rgba(0,242,255,0.06)",
                                transition: "all .2s ease",
                                "&:hover": {
                                    bgcolor: "rgba(0,242,255,0.12)",
                                    transform: "translateY(-1px)",
                                    boxShadow: "0 10px 22px rgba(0,0,0,0.22)",
                                },
                            }}
                        >
                            <Avatar
                                src={avatarSrc}
                                alt={displayName}
                                sx={{
                                    width: 34,
                                    height: 34,
                                    fontWeight: 950,
                                    bgcolor: "rgba(0,242,255,0.20)",
                                    color: theme.primary,
                                }}
                            >
                                {safeFirstChar(displayName)}
                            </Avatar>
                        </IconButton>
                    </Tooltip>

                    {/* USER MENU */}
                    <Menu
                        anchorEl={anchorUser}
                        open={Boolean(anchorUser)}
                        onClose={() => setAnchorUser(null)}
                        PaperProps={{
                            sx: {
                                mt: 1,
                                minWidth: 320,
                                bgcolor: theme.glass2,
                                border: `1px solid ${theme.border}`,
                                backdropFilter: "blur(18px) saturate(170%)",
                                borderRadius: 4,
                                overflow: "hidden",
                                boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
                            },
                        }}
                    >
                        {/* PROFIL KARTI */}
                        <Box sx={{ px: 2, pt: 1.8, pb: 1.2 }}>
                            <Stack direction="row" spacing={1.4} alignItems="center">
                                <Avatar
                                    src={avatarSrc}
                                    alt={displayName}
                                    sx={{
                                        width: 42,
                                        height: 42,
                                        bgcolor: "rgba(0,242,255,0.20)",
                                        color: theme.primary,
                                        fontWeight: 950,
                                        border: "1px solid rgba(0,242,255,0.25)",
                                    }}
                                >
                                    {safeFirstChar(displayName)}
                                </Avatar>

                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ color: "#fff", fontWeight: 950, lineHeight: 1.2 }}>
                                        {displayName}
                                    </Typography>
                                    <Typography sx={{ color: theme.textSoft, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {eposta}
                                    </Typography>

                                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                                        {!!rol && <Chip size="small" label={rol} sx={pillChipSx} />}
                                        {!!birim && (
                                            <Chip
                                                size="small"
                                                label={birim}
                                                sx={{
                                                    bgcolor: "rgba(255,255,255,0.06)",
                                                    color: "rgba(255,255,255,0.78)",
                                                    border: "1px solid rgba(255,255,255,0.10)",
                                                    fontWeight: 800,
                                                    borderRadius: 999,
                                                }}
                                            />
                                        )}
                                        {!!unvan && (
                                            <Chip
                                                size="small"
                                                label={unvan}
                                                sx={{
                                                    bgcolor: "rgba(255,255,255,0.04)",
                                                    color: "rgba(255,255,255,0.65)",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                    fontWeight: 800,
                                                    borderRadius: 999,
                                                }}
                                            />
                                        )}
                                    </Stack>
                                </Box>

                                <Tooltip title="Menüyü kapat">
                                    <IconButton onClick={() => setAnchorUser(null)} sx={{ color: "rgba(255,255,255,0.45)" }}>
                                        <CloseRounded />
                                    </IconButton>
                                </Tooltip>
                            </Stack>

                            {/* Kopyala satırı */}
                            <Stack spacing={1} sx={{ mt: 1.4 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 1,
                                        p: 1,
                                        borderRadius: 2,
                                        bgcolor: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                    }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ color: theme.textFaint, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>
                                            KULLANICI ADI
                                        </Typography>
                                        <Typography sx={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 850 }}>
                                            {kullaniciAdi || "-"}
                                        </Typography>
                                    </Box>
                                    <Tooltip title="Kopyala">
                                        <IconButton
                                            size="small"
                                            onClick={() => copyToClipboard(kullaniciAdi || "", "Kullanıcı adı kopyalandı")}
                                            sx={{ color: theme.primary, bgcolor: "rgba(0,242,255,0.08)" }}
                                        >
                                            <ContentCopyRounded sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 1,
                                        p: 1,
                                        borderRadius: 2,
                                        bgcolor: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                    }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ color: theme.textFaint, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>
                                            E-POSTA
                                        </Typography>
                                        <Typography sx={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 850 }}>
                                            {eposta || "-"}
                                        </Typography>
                                    </Box>
                                    <Tooltip title="Kopyala">
                                        <IconButton
                                            size="small"
                                            onClick={() => copyToClipboard(eposta || "", "E-posta kopyalandı")}
                                            sx={{ color: theme.primary, bgcolor: "rgba(0,242,255,0.08)" }}
                                        >
                                            <ContentCopyRounded sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Stack>
                        </Box>

                        <Divider sx={{ borderColor: "rgba(0,242,255,0.10)" }} />

                        {/* MENÜ */}
                        <MenuItem
                            onClick={() => {
                                setAnchorUser(null);
                                openPanel("profile");
                            }}
                        >
                            <ListItemIcon sx={{ color: theme.primary }}>
                                <PersonOutline fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Profil"
                                secondary="Bilgilerini güncelle"
                                secondaryTypographyProps={{ sx: { color: theme.textSoft, fontSize: 12 } }}
                                primaryTypographyProps={{ sx: { color: "#fff", fontWeight: 800 } }}
                            />
                            <OpenInNewRounded sx={{ color: "rgba(255,255,255,0.25)", fontSize: 18 }} />
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                setAnchorUser(null);
                                openPanel("settings");
                            }}
                        >
                            <ListItemIcon sx={{ color: theme.primary }}>
                                <SettingsOutlined fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Ayarlar"
                                secondary="Tema, bildirim, tercih"
                                secondaryTypographyProps={{ sx: { color: theme.textSoft, fontSize: 12 } }}
                                primaryTypographyProps={{ sx: { color: "#fff", fontWeight: 800 } }}
                            />
                            <OpenInNewRounded sx={{ color: "rgba(255,255,255,0.25)", fontSize: 18 }} />
                        </MenuItem>

                        <Divider sx={{ borderColor: "rgba(0,242,255,0.10)" }} />

                        <MenuItem
                            onClick={() => {
                                setAnchorUser(null);
                                logout();
                            }}
                        >
                            <ListItemIcon sx={{ color: theme.danger }}>
                                <LogoutOutlined fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Çıkış Yap"
                                secondary="Oturumu kapat"
                                secondaryTypographyProps={{ sx: { color: theme.textSoft, fontSize: 12 } }}
                                primaryTypographyProps={{ sx: { color: "#fff", fontWeight: 900 } }}
                            />
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>

            {/* QUICK SEARCH */}
            <Collapse in={quickOpen}>
                <Box
                    sx={{
                        position: "sticky",
                        top: 76,
                        zIndex: 19,
                        px: { xs: 1.25, sm: 2.5 },
                        py: 1.5,
                        bgcolor: "rgba(3, 7, 18, 0.62)",
                        borderBottom: `1px solid ${theme.border}`,
                        backdropFilter: "blur(18px) saturate(140%)",
                    }}
                >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
                        <TextField
                            inputRef={quickInputRef}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Hızlı komut ara... (örn: talepler, yeni, triage)"
                            fullWidth
                            size="small"
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    bgcolor: "rgba(255,255,255,0.04)",
                                    borderRadius: 3,
                                    color: "#fff",
                                    "& fieldset": { borderColor: "rgba(0,242,255,0.18)" },
                                    "&:hover fieldset": { borderColor: "rgba(0,242,255,0.30)" },
                                    "&.Mui-focused fieldset": { borderColor: "rgba(0,242,255,0.45)" },
                                },
                                "& input::placeholder": { color: "rgba(255,255,255,0.35)" },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchOutlined sx={{ color: "rgba(0,242,255,0.75)" }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Chip
                                            size="small"
                                            icon={<KeyboardCommandKeyRounded sx={{ fontSize: 16 }} />}
                                            label="Ctrl/⌘ K"
                                            sx={{
                                                bgcolor: "rgba(255,255,255,0.06)",
                                                color: "rgba(255,255,255,0.70)",
                                                border: "1px solid rgba(255,255,255,0.10)",
                                                fontWeight: 800,
                                                borderRadius: 999,
                                            }}
                                        />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            onClick={closeQuick}
                            variant="outlined"
                            startIcon={<CloseRounded />}
                            sx={{
                                borderRadius: 3,
                                borderColor: "rgba(0,242,255,0.25)",
                                color: theme.primary,
                                fontWeight: 900,
                                textTransform: "none",
                                "&:hover": { borderColor: "rgba(0,242,255,0.40)", bgcolor: "rgba(0,242,255,0.06)" },
                            }}
                        >
                            Kapat
                        </Button>
                    </Stack>

                    <Box sx={{ mt: 1.25, display: "grid", gap: 0.75 }}>
                        {quickActions.map((a) => (
                            <Box
                                key={a.key}
                                onClick={() => {
                                    a.onGo();
                                    closeQuick();
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        a.onGo();
                                        closeQuick();
                                    }
                                }}
                                sx={{
                                    px: 1.5,
                                    py: 1.1,
                                    borderRadius: 3,
                                    cursor: "pointer",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    bgcolor: "rgba(255,255,255,0.03)",
                                    transition: "all .18s ease",
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.06)",
                                        borderColor: "rgba(0,242,255,0.25)",
                                        transform: "translateY(-1px)",
                                    },
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>
                                            {a.label}
                                        </Typography>
                                        <Typography sx={{ color: theme.textSoft, fontSize: 12 }}>{a.hint}</Typography>
                                    </Box>
                                    <OpenInNewRounded sx={{ color: "rgba(255,255,255,0.25)", fontSize: 18 }} />
                                </Stack>
                            </Box>
                        ))}

                        {quickActions.length === 0 && (
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 2,
                                    borderRadius: 3,
                                    border: "1px dashed rgba(255,255,255,0.12)",
                                    color: theme.textSoft,
                                    textAlign: "center",
                                }}
                            >
                                Sonuç yok.
                            </Box>
                        )}
                    </Box>
                </Box>
            </Collapse>

            {/* ✅ TEK DRAWER */}
            <RightPanelDrawer open={panelOpen} onClose={closePanel}>
                {panelType === "chat" && <MesajlarPopup open={panelOpen} onClose={closePanel} />}
                {panelType === "notifs" && <BildirimlerPopup open={panelOpen} onClose={closePanel} />}
                {panelType === "profile" && <ProfilPopup open={panelOpen} onClose={closePanel} />}
                {panelType === "settings" && <AyarlarPopup open={panelOpen} onClose={closePanel} />}
            </RightPanelDrawer>

            {/* TOAST */}
            <Snackbar
                open={toast.open}
                autoHideDuration={2200}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    severity={toast.severity}
                    variant="filled"
                    icon={toast.severity === "success" ? <CheckRounded /> : undefined}
                    sx={{ fontWeight: 900 }}
                >
                    {toast.msg}
                </Alert>
            </Snackbar>
        </>
    );
}
