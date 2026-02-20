import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Avatar,
    Box,
    Button,
    Divider,
    IconButton,
    Stack,
    Typography,
    Chip,
    Tooltip,
    Collapse,
} from "@mui/material";
import {
    Cpu,
    LayoutDashboard,
    ClipboardList,
    PlusCircle,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    ListChecks,
    Plus,
    Briefcase,
    ClipboardCheck,
    Sparkles,
    User,
    Zap,
} from "lucide-react";

const SIDEBAR_W = 270;
const SIDEBAR_W_MINI = 92;

function normRole(v) {
    return String(v || "").trim().toLocaleLowerCase("tr-TR").replaceAll("Ä±", "i");
}

function isActivePath(currentPath, itemPath) {
    if (!itemPath) return false;
    return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}

function initials(name = "") {
    const parts = String(name).trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    const a = parts[0]?.[0] ?? "U";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (a + b).toUpperCase();
}

export default function Sidebar({ user, mini, setMini }) {
    const navigate = useNavigate();
    const location = useLocation();
    const sidebarWidth = mini ? SIDEBAR_W_MINI : SIDEBAR_W;

    const role = useMemo(() => normRole(user?.rol), [user?.rol]);
    const isAdmin = role === "admin" || role === "process";

    const fullName = useMemo(
        () => `${user?.ad ?? ""} ${user?.soyad ?? ""}`.trim(),
        [user?.ad, user?.soyad]
    );
    const avatarText = useMemo(() => initials(fullName), [fullName]);

    const [open, setOpen] = useState({
        talepler: true,
        gorevlerim: false,
    });

    const toggleGroup = (key) => setOpen((s) => ({ ...s, [key]: !s[key] }));

    const menu = useMemo(() => {
        return [
            {
                type: "item",
                key: "dashboard",
                label: "Dashboard",
                path: "/dashboard",
                icon: <LayoutDashboard size={20} />,
            },
            {
                type: "group",
                key: "talepler",
                label: "Talepler",
                icon: <ClipboardList size={20} />,
                children: [
                    { key: "talep_new", label: "Yeni Talep", path: "/talep/yeni", icon: <PlusCircle size={18} /> },
                    { key: "talep_mine", label: "Benim Taleplerim", path: "/taleplerim", icon: <ClipboardCheck size={18} /> },
                    {
                        key: "talep_assigned",
                        label: "Bana Atanan Talepler",
                        path: isAdmin ? "/admin/talepler" : "/atamalarim",
                        icon: <ShieldCheck size={18} />,
                    },
                ],
            },
            {
                type: "group",
                key: "gorevlerim",
                label: "Görevlerim",
                icon: <ListChecks size={20} />,
                children: [
                    { key: "gorev_add", label: "Görev Ekle", path: "/gorev/ekle", icon: <Plus size={18} /> },
                    { key: "gorev_mine", label: "Görevlerim", path: "/gorevlerim", icon: <Briefcase size={18} /> },
                    {
                        key: "gorev_unit",
                        label: "Birim Görevleri",
                        path: "/birim-gorevleri",
                        icon: <LayoutDashboard size={18} />,
                        disabled: true,
                    },
                ],
            },
            {
                type: "item",
                key: "settings",
                label: "Ayarlar",
                path: "/ayarlar",
                icon: <Settings size={20} />,
                disabled: true,
            },
        ];
    }, [isAdmin]);

    const NavItem = ({ item, indent = 0 }) => {
        const active = isActivePath(location.pathname, item.path);
        const disabled = !!item.disabled;

        const node = (
            <Box
                onClick={() => !disabled && item.path && navigate(item.path)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    px: 1.6,
                    py: 1.15,
                    borderRadius: 2.6,
                    cursor: disabled ? "not-allowed" : "pointer",
                    userSelect: "none",
                    opacity: disabled ? 0.45 : 1,
                    background: active ? "rgba(0,242,254,0.10)" : "rgba(255,255,255,0.02)",
                    border: "1px solid",
                    borderColor: active ? "rgba(0,242,254,0.35)" : "rgba(255,255,255,0.06)",
                    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
                    ml: indent ? `${indent}px` : 0,
                    "&:hover": disabled
                        ? {}
                        : {
                            borderColor: "rgba(0,242,254,0.35)",
                            background: "rgba(0,242,254,0.06)",
                            boxShadow: "0 16px 55px rgba(0,0,0,0.40)",
                            transform: "translateY(-1px)",
                        },
                }}
            >
                <Box sx={{ color: active ? "#00f2fe" : "rgba(255,255,255,0.78)" }}>{item.icon}</Box>
                {!mini && <Typography sx={{ fontWeight: 900, fontSize: 13 }}>{item.label}</Typography>}
            </Box>
        );

        return mini ? (
            <Tooltip title={item.label} placement="right">
                <Box>{node}</Box>
            </Tooltip>
        ) : (
            node
        );
    };

    const GroupHeader = ({ group }) => {
        const anyChildActive = group.children.some((c) => isActivePath(location.pathname, c.path));
        const isOpen = open[group.key];

        const node = (
            <Box
                onClick={() => toggleGroup(group.key)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    px: 1.6,
                    py: 1.15,
                    borderRadius: 2.6,
                    cursor: "pointer",
                    userSelect: "none",
                    background: anyChildActive ? "rgba(0,242,254,0.08)" : "rgba(255,255,255,0.02)",
                    border: "1px solid",
                    borderColor: anyChildActive ? "rgba(0,242,254,0.25)" : "rgba(255,255,255,0.06)",
                    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
                    "&:hover": {
                        borderColor: "rgba(0,242,254,0.28)",
                        background: "rgba(0,242,254,0.05)",
                        boxShadow: "0 16px 55px rgba(0,0,0,0.35)",
                        transform: "translateY(-1px)",
                    },
                }}
            >
                <Box sx={{ color: anyChildActive ? "#00f2fe" : "rgba(255,255,255,0.78)" }}>{group.icon}</Box>

                {!mini && (
                    <>
                        <Typography sx={{ fontWeight: 950, fontSize: 13 }}>{group.label}</Typography>
                        <Box sx={{ flex: 1 }} />
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </>
                )}
            </Box>
        );

        return mini ? (
            <Tooltip title={group.label} placement="right">
                <Box>{node}</Box>
            </Tooltip>
        ) : (
            node
        );
    };

    const logout = () => {
        localStorage.removeItem("oturum");
        navigate("/", { replace: true });
    };

    return (
        <Box
            sx={{
                width: sidebarWidth,
                transition: "width .2s ease",
                minHeight: "100vh",
                borderRight: "1px solid rgba(0,242,254,0.14)",
                background: "rgba(2,6,23,0.68)",
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                "@keyframes floatPulse": {
                    "0%, 100%": { transform: "translateY(0px)", opacity: 0.7 },
                    "50%": { transform: "translateY(-2px)", opacity: 1 },
                },
                "@keyframes shine": {
                    "0%": { transform: "translateX(-120%) rotate(12deg)" },
                    "100%": { transform: "translateX(120%) rotate(12deg)" },
                },
            }}
        >
            {/* Ã¼st aurora glow */}
            <Box
                sx={{
                    position: "absolute",
                    inset: -120,
                    background:
                        "radial-gradient(600px 320px at 20% 10%, rgba(0,242,254,0.18), transparent 60%)," +
                        "radial-gradient(520px 300px at 85% 18%, rgba(167,139,250,0.16), transparent 60%)," +
                        "radial-gradient(520px 340px at 60% 90%, rgba(34,211,238,0.12), transparent 60%)",
                    filter: "blur(1px)",
                    opacity: 0.92,
                    pointerEvents: "none",
                }}
            />

            {/* Logo / Brand */}
            <Stack direction="row" alignItems="center" spacing={1.2} sx={{ px: 2.2, py: 2, position: "relative" }}>
                <Cpu size={28} color="#00f2fe" />
                {!mini && (
                    <Typography sx={{ fontWeight: 980, letterSpacing: 0.7 }}>
                        CORE<span style={{ color: "#00f2fe" }}>RESOLVE</span>
                    </Typography>
                )}
                <Box sx={{ flex: 1 }} />

                <Tooltip title={mini ? "GeniÅŸlet" : "Daralt"}>
                    <IconButton
                        onClick={() => setMini((v) => !v)}
                        sx={{
                            color: "rgba(255,255,255,0.92)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 2.2,
                            bgcolor: "rgba(255,255,255,0.03)",
                            "&:hover": { borderColor: "rgba(0,242,254,0.25)", background: "rgba(0,242,254,0.06)" },
                        }}
                    >
                        {mini ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </IconButton>
                </Tooltip>
            </Stack>

            <Divider sx={{ borderColor: "rgba(0,242,254,0.14)" }} />

            {/* Profil kartÄ± */}
            <Box sx={{ px: 2, py: 2, position: "relative" }}>
                <Box
                    sx={{
                        borderRadius: 3.2,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.03))",
                        boxShadow: "0 18px 70px rgba(0,0,0,0.40)",
                        overflow: "hidden",
                        position: "relative",
                        "&:after": {
                            content: '""',
                            position: "absolute",
                            inset: -2,
                            background:
                                "radial-gradient(380px 200px at 20% 0%, rgba(0,242,254,0.14), transparent 60%)," +
                                "radial-gradient(340px 220px at 95% 10%, rgba(167,139,250,0.12), transparent 62%)",
                            pointerEvents: "none",
                            opacity: 0.9,
                        },
                    }}
                >
                    <Box
                        sx={{
                            height: 3,
                            background:
                                "linear-gradient(90deg, rgba(0,242,254,0.0), rgba(0,242,254,0.75), rgba(167,139,250,0.65), rgba(0,242,254,0.0))",
                            opacity: 0.85,
                        }}
                    />
                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ p: 1.6, position: "relative" }}>
                        <Avatar
                            sx={{
                                width: mini ? 40 : 46,
                                height: mini ? 40 : 46,
                                borderRadius: 3,
                                bgcolor: "rgba(0,242,254,0.14)",
                                border: "1px solid rgba(0,242,254,0.22)",
                                color: "#00f2fe",
                                fontWeight: 1000,
                            }}
                        >
                            {avatarText}
                        </Avatar>

                        {!mini && (
                            <Stack spacing={0.2} sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 1000, color: "#fff", lineHeight: 1.1 }} noWrap>
                                    {fullName || "Kullanıcı"}
                                </Typography>

                                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.62)", fontWeight: 850 }} noWrap>
                                    {user?.birim || "-"} seç {user?.unvan || "-"}
                                </Typography>

                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.7 }} flexWrap="wrap" useFlexGap>
                                    <Chip
                                        size="small"
                                        icon={<User size={14} />}
                                        label={(role || "kullanici").toUpperCase()}
                                        sx={{
                                            height: 24,
                                            borderRadius: 999,
                                            bgcolor: "rgba(0,242,254,0.10)",
                                            color: "#00f2fe",
                                            fontWeight: 950,
                                            border: "1px solid rgba(0,242,254,0.16)",
                                        }}
                                    />
                                    <Chip
                                        size="small"
                                        label="ONLINE"
                                        sx={{
                                            height: 24,
                                            borderRadius: 999,
                                            bgcolor: "rgba(34,197,94,0.10)",
                                            color: "#22c55e",
                                            fontWeight: 950,
                                            border: "1px solid rgba(34,197,94,0.18)",
                                        }}
                                    />
                                </Stack>
                            </Stack>
                        )}
                    </Stack>

                    {/* Mini modda kÃ¼Ã§Ã¼k aksiyon */}
                    {mini && (
                        <Box sx={{ px: 1.6, pb: 1.2, position: "relative" }}>
                            <Tooltip title="Dashboard">
                                <IconButton
                                    onClick={() => navigate("/dashboard")}
                                    sx={{
                                        width: "100%",
                                        borderRadius: 2.8,
                                        border: "1px solid rgba(255,255,255,0.10)",
                                        bgcolor: "rgba(255,255,255,0.03)",
                                        color: "rgba(255,255,255,0.92)",
                                        "&:hover": { borderColor: "rgba(0,242,254,0.25)", background: "rgba(0,242,254,0.06)" },
                                    }}
                                >
                                    <Sparkles size={18} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Nav */}
            <Stack spacing={0.6} sx={{ px: 1.2, position: "relative" }}>
                {menu.map((entry) => {
                    if (entry.type === "item") return <NavItem key={entry.key} item={entry} />;

                    return (
                        <Box key={entry.key}>
                            <GroupHeader group={entry} />
                            {!mini && (
                                <Collapse in={open[entry.key]} timeout={180} unmountOnExit>
                                    <Stack spacing={0.6} sx={{ mt: 0.6 }}>
                                        {entry.children.map((child) => (
                                            <NavItem key={child.key} item={child} indent={14} />
                                        ))}
                                    </Stack>
                                </Collapse>
                            )}
                        </Box>
                    );
                })}
            </Stack>

            {/* ALT SABÄ°T ALAN â€” ULTRA MODERN */}
            <Box sx={{ mt: "auto", px: 1.35, pb: 1.4, position: "relative" }}>
                {/* deeper glow */}
                <Box
                    sx={{
                        position: "absolute",
                        left: -60,
                        right: -60,
                        bottom: -80,
                        height: 260,
                        background:
                            "radial-gradient(320px 170px at 20% 35%, rgba(0,242,254,0.24), transparent 70%)," +
                            "radial-gradient(300px 170px at 85% 55%, rgba(167,139,250,0.20), transparent 72%)," +
                            "radial-gradient(260px 160px at 55% 110%, rgba(34,211,238,0.16), transparent 72%)",
                        filter: "blur(22px)",
                        opacity: 0.95,
                        pointerEvents: "none",
                    }}
                />

                {/* glass card */}
                <Box
                    sx={{
                        position: "relative",
                        borderRadius: 4,
                        overflow: "hidden",
                        p: 1.2,
                        background:
                            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                        border: "1px solid rgba(255,255,255,0.10)",
                        boxShadow: "0 30px 90px rgba(0,0,0,0.62)",
                        backdropFilter: "blur(16px)",
                        transform: "translateZ(0)",
                        "&:before": {
                            content: '""',
                            position: "absolute",
                            inset: 0,
                            padding: "1px",
                            borderRadius: 16,
                            background:
                                "linear-gradient(135deg, rgba(0,242,254,0.60), rgba(167,139,250,0.45), rgba(255,255,255,0.10))",
                            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                            WebkitMaskComposite: "xor",
                            maskComposite: "exclude",
                            opacity: 0.62,
                            pointerEvents: "none",
                        },
                        // animated shine
                        "&:after": {
                            content: '""',
                            position: "absolute",
                            top: -80,
                            left: -120,
                            width: 180,
                            height: 260,
                            background:
                                "linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.10), rgba(255,255,255,0.0))",
                            transform: "translateX(-120%) rotate(12deg)",
                            animation: mini ? "none" : "shine 3.8s ease-in-out infinite",
                            opacity: 0.6,
                            pointerEvents: "none",
                        },
                    }}
                >
                    {/* top accent line */}
                    <Box
                        sx={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: 0,
                            height: 2,
                            background:
                                "linear-gradient(90deg, rgba(0,242,254,0.0), rgba(0,242,254,0.70), rgba(167,139,250,0.62), rgba(0,242,254,0.0))",
                            opacity: 0.85,
                        }}
                    />

                    <Stack spacing={1.0} sx={{ p: 1.0, position: "relative" }}>
                        {/* header */}
                        {!mini && (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 3.2,
                                        display: "grid",
                                        placeItems: "center",
                                        border: "1px solid rgba(0,242,254,0.22)",
                                        bgcolor: "rgba(0,242,254,0.10)",
                                        boxShadow: "0 20px 65px rgba(0,0,0,0.45)",
                                    }}
                                >
                                    <Zap size={18} color="#00f2fe" />
                                </Box>

                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 1100, color: "rgba(255,255,255,0.92)", lineHeight: 1.1 }}>
                                        Quick Actions
                                    </Typography>
                                    <Typography sx={{ fontSize: 11, fontWeight: 850, color: "rgba(255,255,255,0.56)" }} noWrap>
                                        Akıllı kısayollar
                                    </Typography>
                                </Box>

                                <Box sx={{ flex: 1 }} />

                                {/* status */}
                                <Stack direction="row" spacing={0.8} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 999,
                                            bgcolor: "rgba(34,197,94,0.95)",
                                            boxShadow: "0 0 0 6px rgba(34,197,94,0.10)",
                                            animation: "floatPulse 1.6s ease-in-out infinite",
                                        }}
                                    />
                                    <Typography sx={{ fontSize: 11, fontWeight: 1000, color: "rgba(34,197,94,0.95)", letterSpacing: 0.2 }}>
                                        Live
                                    </Typography>
                                </Stack>
                            </Stack>
                        )}

                        {/* actions */}
                        {mini ? (
                            <Stack spacing={0.9}>
                                <Tooltip title="Yeni Talep" placement="right">
                                    <IconButton
                                        onClick={() => navigate("/talep/yeni")}
                                        sx={{
                                            width: "100%",
                                            borderRadius: 3.2,
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            bgcolor: "rgba(255,255,255,0.03)",
                                            color: "rgba(255,255,255,0.92)",
                                            transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
                                            "&:hover": {
                                                borderColor: "rgba(0,242,254,0.32)",
                                                background: "rgba(0,242,254,0.10)",
                                                boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
                                                transform: "translateY(-1px)",
                                            },
                                        }}
                                    >
                                        <PlusCircle size={18} />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="GÃ¶rev Ekle" placement="right">
                                    <IconButton
                                        onClick={() => navigate("/gorev/ekle")}
                                        sx={{
                                            width: "100%",
                                            borderRadius: 3.2,
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            bgcolor: "rgba(255,255,255,0.03)",
                                            color: "rgba(255,255,255,0.92)",
                                            transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
                                            "&:hover": {
                                                borderColor: "rgba(167,139,250,0.34)",
                                                background: "rgba(167,139,250,0.12)",
                                                boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
                                                transform: "translateY(-1px)",
                                            },
                                        }}
                                    >
                                        <Plus size={18} />
                                    </IconButton>
                                </Tooltip>

                                <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

                                <Tooltip title="Ã‡Ä±kÄ±ÅŸ Yap" placement="right">
                                    <IconButton
                                        onClick={logout}
                                        sx={{
                                            width: "100%",
                                            borderRadius: 3.2,
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            bgcolor: "rgba(255,255,255,0.03)",
                                            color: "rgba(255,255,255,0.92)",
                                            transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
                                            "&:hover": {
                                                borderColor: "rgba(239,68,68,0.60)",
                                                background: "rgba(239,68,68,0.12)",
                                                color: "#ef4444",
                                                boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
                                                transform: "translateY(-1px)",
                                            },
                                        }}
                                    >
                                        <LogOut size={18} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        ) : (
                            <>
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        onClick={() => navigate("/talep/yeni")}
                                        variant="outlined"
                                        startIcon={<PlusCircle size={18} />}
                                        sx={{
                                            flex: 1,
                                            borderRadius: 999,
                                            px: 1.6,
                                            py: 1.1,
                                            fontWeight: 1100,
                                            color: "rgba(255,255,255,0.92)",
                                            borderColor: "rgba(255,255,255,0.14)",
                                            bgcolor: "rgba(255,255,255,0.02)",
                                            position: "relative",
                                            overflow: "hidden",
                                            transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
                                            "&:hover": {
                                                borderColor: "rgba(0,242,254,0.34)",
                                                background: "rgba(0,242,254,0.10)",
                                                boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
                                                transform: "translateY(-1px)",
                                            },
                                        }}
                                    >
                                        Yeni Talep
                                    </Button>

                                    <Button
                                        onClick={() => navigate("/gorev/ekle")}
                                        variant="outlined"
                                        startIcon={<Plus size={18} />}
                                        sx={{
                                            flex: 1,
                                            borderRadius: 999,
                                            px: 1.6,
                                            py: 1.1,
                                            fontWeight: 1100,
                                            color: "rgba(255,255,255,0.92)",
                                            borderColor: "rgba(255,255,255,0.14)",
                                            bgcolor: "rgba(255,255,255,0.02)",
                                            transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
                                            "&:hover": {
                                                borderColor: "rgba(167,139,250,0.36)",
                                                background: "rgba(167,139,250,0.12)",
                                                boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
                                                transform: "translateY(-1px)",
                                            },
                                        }}
                                    >
                                        Görev Ekle
                                    </Button>
                                </Stack>

                                <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

                                <Button
                                    fullWidth
                                    onClick={logout}
                                    startIcon={<LogOut size={18} />}
                                    variant="contained"
                                    sx={{
                                        borderRadius: 999,
                                        py: 1.15,
                                        fontWeight: 1200,
                                        letterSpacing: 0.2,
                                        color: "rgba(255,255,255,0.96)",
                                        background:
                                            "linear-gradient(90deg, rgba(239,68,68,0.78), rgba(245,158,11,0.38))",
                                        boxShadow: "0 22px 80px rgba(0,0,0,0.55)",
                                        transition: "transform .18s ease, box-shadow .18s ease, filter .18s ease",
                                        "&:hover": {
                                            transform: "translateY(-1px)",
                                            boxShadow: "0 30px 95px rgba(0,0,0,0.65)",
                                            filter: "saturate(1.15)",
                                            background:
                                                "linear-gradient(90deg, rgba(239,68,68,0.92), rgba(245,158,11,0.48))",
                                        },
                                    }}
                                >
                                    ÇIKIŞ Yap
                                </Button>
                            </>
                        )}
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}

