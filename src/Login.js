import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    TextField,
    Typography,
    Stack,
    InputAdornment,
    IconButton,
    Snackbar,
    Alert,
    Checkbox,
    FormControlLabel,
    useMediaQuery,
    useTheme,
    Link,
    Divider,
    Dialog,
    DialogContent,
    Chip
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Sparkles,
    CheckCircle2,
    CalendarDays,
    UserCircle2,
    ClipboardList,
    TicketCheck,
    ShieldCheck,
    Zap,
    MessageSquare
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./styles/Login.css";
const EMAIL_DOMAIN = "@odaklojistik.com.tr";

const FULL_ACCESS_USERS = [
    "zelal.karakulak@odaklojistik.com.tr",
    "nihat.hasserbetci@odaklojistik.com.tr",
    "gorkem.cadirci@odaklojistik.com.tr"
];

const TALEP_PANO_USERS = [
    "gorkem.cadirci@odaklojistik.com.tr"
];

/* ─── Stat verileri – sol panel ─── */
const STATS = [
    { value: "847", label: "Çözülen Talep", icon: <TicketCheck size={20} /> },
    { value: "99%", label: "Memnuniyet", icon: <ShieldCheck size={20} /> },
    { value: "<2s", label: "Ort. Yanıt", icon: <Zap size={20} /> },
    { value: "3", label: "Aktif Ekip", icon: <MessageSquare size={20} /> }
];

/* ─── Özellik listesi – sol panel ─── */
const FEATURES = [
    "Talep oluştur, takip et ve kapat",
    "Öncelikli destek kuyruğu yönetimi",
    "Ekip içi yorum ve bildirim sistemi",
    "Takvim entegrasyonu ile planlama"
];

export default function Login() {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [toast, setToast] = useState({ open: false, type: "info", text: "" });
    const [successOpen, setSuccessOpen] = useState(false);
    const [activeUser, setActiveUser] = useState(null);
    const [form, setForm] = useState({ eposta: "", sifre: "" });

    const openToast = (type, text) => setToast({ open: true, type, text });
    const closeToast = () => setToast((prev) => ({ ...prev, open: false }));

    const emailNormalized = useMemo(() => {
        const raw = (form.eposta || "").trim().toLowerCase();
        if (!raw) return "";
        return raw.includes("@") ? raw : `${raw}${EMAIL_DOMAIN}`;
    }, [form.eposta]);

    const getLandingPage = (user) => {
        if (user?.allowed_pages?.includes("gorevler")) return "/gorevler";
        if (user?.allowed_pages?.includes("talepler")) return "/talepler";
        if (user?.allowed_pages?.includes("profil")) return "/profil";
        return "/";
    };

    useEffect(() => {
        let timer;
        if (successOpen && activeUser) {
            timer = setTimeout(() => {
                navigate(getLandingPage(activeUser));
            }, 1800);
        }
        return () => clearTimeout(timer);
    }, [successOpen, activeUser, navigate]);

    const girisYap = async () => {
        if (!form.eposta || !form.sifre) {
            return openToast("error", "Lütfen tüm alanları doldurun.");
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("kullanicilar")
                .select("*")
                .eq("eposta", emailNormalized)
                .eq("sifre", form.sifre)
                .maybeSingle();

            if (error) throw new Error("Giriş sırasında bir hata oluştu.");
            if (!data) throw new Error("Giriş bilgileri hatalı.");

            const hasFullAccess = FULL_ACCESS_USERS.includes(emailNormalized);
            const hasTalepPanoAccess = TALEP_PANO_USERS.includes(emailNormalized);

            const sessionUser = {
                ...data,
                allowed_pages: hasFullAccess
                    ? ["gorevler", "talepler", "takvim", "profil"]
                    : ["talepler", "profil"],
                permissions: {
                    canSeeGorevler: hasFullAccess,
                    canSeeTakvim: hasFullAccess,
                    canSeeTaleplerPage: true,
                    canSeeTaleplerPanosu: hasTalepPanoAccess,
                    canCreateTalep: true,
                    canSeeAllTalepler: hasTalepPanoAccess,
                    canSeeOnlyOwnTalepler: !hasTalepPanoAccess
                }
            };

            localStorage.removeItem("oturum");
            sessionStorage.removeItem("oturum");

            if (rememberMe) {
                localStorage.setItem("oturum", JSON.stringify(sessionUser));
            } else {
                sessionStorage.setItem("oturum", JSON.stringify(sessionUser));
            }

            setActiveUser(sessionUser);
            setSuccessOpen(true);
        } catch (e) {
            openToast("error", e.message || "Giriş sırasında bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") girisYap();
    };

    const displayName =
        activeUser?.ad ||
        activeUser?.isim ||
        activeUser?.ad_soyad ||
        activeUser?.yetkili_adi ||
        activeUser?.eposta ||
        form.eposta ||
        "Hoş geldin";

    return (
        <>
            <Box className="login-root">
                {/* ──── SOL PANEL ──── */}
                {!isMobile && <HeroSection />}

                {/* ──── SAĞ PANEL (Form) ──── */}
                <Box className="login-form-panel">
                    {/* Dekoratif blur toplar */}
                    <span className="blur-orb blur-orb--tr" />
                    <span className="blur-orb blur-orb--bl" />

                    <motion.div
                        initial={{ opacity: 0, x: 28 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.55 }}
                        style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 2 }}
                    >
                        {/* Logo / başlık */}
                        <div className="login-logo">
                            <span className="login-logo__icon">
                                <TicketCheck size={22} />
                            </span>
                            <span className="login-logo__text">Odak Destek</span>
                        </div>

                        <Stack spacing={4}>
                            <Box>
                                <Typography className="login-title">
                                    Giriş Yap
                                </Typography>
                                <Typography className="login-subtitle">
                                    Talep sistemine erişmek için bilgilerinizi girin.
                                </Typography>
                            </Box>

                            <Stack spacing={2}>
                                <AuthInput
                                    placeholder="kullaniciadi"
                                    value={form.eposta}
                                    onChange={(e) => {
                                        let value = e.target.value.replace(/@/g, "");
                                        setForm({ ...form, eposta: value });
                                    }}
                                    onKeyDown={handleKeyDown}
                                    startIcon={<Mail size={18} />}
                                    endIcon={
                                        <InputAdornment position="end">
                                            <Typography className="domain-suffix">
                                                @odaklojistik.com.tr
                                            </Typography>
                                        </InputAdornment>
                                    }
                                />

                                <AuthInput
                                    type={showPass ? "text" : "password"}
                                    placeholder="Şifreniz"
                                    value={form.sifre}
                                    onChange={(e) => setForm({ ...form, sifre: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    startIcon={<Lock size={18} />}
                                    endIcon={
                                        <IconButton
                                            onClick={() => setShowPass((p) => !p)}
                                            edge="end"
                                            className="eye-btn"
                                        >
                                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </IconButton>
                                    }
                                />
                            </Stack>

                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                flexWrap="wrap"
                                gap={1}
                            >
                                <FormControlLabel
                                    sx={{ m: 0 }}
                                    control={
                                        <Checkbox
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="remember-checkbox"
                                        />
                                    }
                                    label={
                                        <Typography className="remember-label">
                                            Beni hatırla
                                        </Typography>
                                    }
                                />
                                <Link href="#" underline="hover" className="forgot-link">
                                    Şifremi unuttum
                                </Link>
                            </Stack>

                            <button
                                className={`login-btn${loading ? " login-btn--loading" : ""}`}
                                onClick={girisYap}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="login-btn__spinner" />
                                ) : (
                                    <>
                                        Giriş Yap
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            <Divider className="login-divider" />

                            <Typography className="login-note">
                                Bu panelde yalnızca kayıtlı kullanıcılar işlem yapabilir.
                            </Typography>
                        </Stack>
                    </motion.div>
                </Box>
            </Box>

            {/* Toast */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={closeToast}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={closeToast}
                    severity={toast.type}
                    variant="filled"
                    sx={{ borderRadius: "12px" }}
                >
                    {toast.text}
                </Alert>
            </Snackbar>

            {/* Başarı dialog */}
            <WelcomeSuccessDialog
                open={successOpen}
                name={displayName}
                user={activeUser}
                onClose={() => {
                    setSuccessOpen(false);
                    navigate(getLandingPage(activeUser));
                }}
            />
        </>
    );
}

/* ═══════════════════════════════════════════════
   SOL HERO PANELİ — resim yok, tamamen kod
═══════════════════════════════════════════════ */
function HeroSection() {
    return (
        <Box className="hero">
            {/* Arka plan deseni */}
            <div className="hero__grid" aria-hidden="true" />

            {/* Hareketli blur alanlar */}
            <div className="hero__blob hero__blob--1" />
            <div className="hero__blob hero__blob--2" />
            <div className="hero__blob hero__blob--3" />

            <motion.div
                className="hero__content"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
            >
                {/* Badge */}
                <div className="hero__badge">
                    <TicketCheck size={15} />
                    Çözüm Talep Sistemi
                </div>

                {/* Başlık */}
                <h1 className="hero__title">
                    Taleplerinizi
                    <br />
                    <span className="hero__title--accent">hızla çözüyoruz.</span>
                </h1>

                <p className="hero__desc">
                    Odak Lojistik iç destek platformu — talep açın, durumunu anlık takip
                    edin, ekibinizle koordineli çalışın.
                </p>

                {/* İstatistikler */}
                <div className="hero__stats">
                    {STATS.map((s) => (
                        <div className="hero__stat" key={s.label}>
                            <span className="hero__stat-icon">{s.icon}</span>
                            <span className="hero__stat-value">{s.value}</span>
                            <span className="hero__stat-label">{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Özellik listesi */}
                <ul className="hero__features">
                    {FEATURES.map((f) => (
                        <li key={f} className="hero__feature-item">
                            <CheckCircle2 size={16} className="hero__feature-check" />
                            {f}
                        </li>
                    ))}
                </ul>

                {/* Alt şerit */}
                <div className="hero__footer">
                    <ShieldCheck size={15} />
                    Kurumsal ağ üzerinden güvenli erişim
                </div>
            </motion.div>
        </Box>
    );
}

/* ═══════════════════════════════════════════════
   BAŞARI DİYALOĞU
═══════════════════════════════════════════════ */
function WelcomeSuccessDialog({ open, name, user, onClose }) {
    const gorevGorebilir = user?.permissions?.canSeeGorevler;
    const takvimGorebilir = user?.permissions?.canSeeTakvim;
    const talepGorebilir = user?.permissions?.canSeeTaleplerPage;
    const talepPanoGorebilir = user?.permissions?.canSeeTaleplerPanosu;

    return (
        <AnimatePresence>
            {open && (
                <Dialog
                    open={open}
                    onClose={onClose}
                    fullWidth
                    maxWidth="sm"
                    PaperProps={{
                        className: "success-dialog"
                    }}
                >
                    <DialogContent sx={{ p: 0 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 14, scale: 0.96 }}
                            transition={{ duration: 0.35 }}
                        >
                            <Box className="success-dialog__inner">
                                <span className="success-dialog__blob success-dialog__blob--tr" />
                                <span className="success-dialog__blob success-dialog__blob--bl" />

                                <Stack spacing={3} sx={{ position: "relative", zIndex: 2 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                        <div className="success-icon">
                                            <CheckCircle2 size={28} />
                                        </div>
                                        <Chip
                                            icon={<Sparkles size={15} />}
                                            label="Giriş başarılı"
                                            className="success-chip"
                                        />
                                    </Stack>

                                    <Box>
                                        <Typography className="success-title">
                                            Merhaba {name} ✨
                                        </Typography>
                                        <Typography className="success-sub">
                                            Sisteme başarıyla giriş yaptın. Yetkine uygun ekranlara
                                            yönlendiriliyorsun.
                                        </Typography>
                                    </Box>

                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1.5}
                                        flexWrap="wrap"
                                    >
                                        {gorevGorebilir && (
                                            <InfoMiniCard
                                                icon={<ClipboardList size={18} />}
                                                title="Görevler"
                                                text="Görev akışını görüntüle, filtrele ve yönet."
                                            />
                                        )}
                                        {takvimGorebilir && (
                                            <InfoMiniCard
                                                icon={<CalendarDays size={18} />}
                                                title="Takvim"
                                                text="Planlanan işleri ve tarih aralıklarını takip et."
                                            />
                                        )}
                                        {talepGorebilir && (
                                            <InfoMiniCard
                                                icon={<TicketCheck size={18} />}
                                                title="Talepler"
                                                text={
                                                    talepPanoGorebilir
                                                        ? "Tüm talepleri ve talepler panosunu görüntüleyebilirsin."
                                                        : "Talep oluşturabilir, kendi taleplerinizi takip edebilirsin."
                                                }
                                            />
                                        )}
                                        <InfoMiniCard
                                            icon={<UserCircle2 size={18} />}
                                            title="Profil"
                                            text="Kullanıcı bilgilerini ve hesap alanını görüntüle."
                                        />
                                    </Stack>

                                    <button className="login-btn" onClick={onClose}>
                                        Panele Geç
                                        <ArrowRight size={18} />
                                    </button>
                                </Stack>
                            </Box>
                        </motion.div>
                    </DialogContent>
                </Dialog>
            )}
        </AnimatePresence>
    );
}

function InfoMiniCard({ icon, title, text }) {
    return (
        <div className="mini-card">
            <div className="mini-card__header">
                <span className="mini-card__icon">{icon}</span>
                <span className="mini-card__title">{title}</span>
            </div>
            <p className="mini-card__text">{text}</p>
        </div>
    );
}

function AuthInput({ startIcon, endIcon, ...props }) {
    return (
        <TextField
            {...props}
            fullWidth
            variant="outlined"
            InputProps={{
                startAdornment: startIcon ? (
                    <InputAdornment position="start">
                        <Box className="input-icon">{startIcon}</Box>
                    </InputAdornment>
                ) : null,
                endAdornment: endIcon ? (
                    <InputAdornment position="end">{endIcon}</InputAdornment>
                ) : null
            }}
            sx={{
                "& .MuiOutlinedInput-root": {
                    height: 60,
                    borderRadius: "14px",
                    bgcolor: "#f8fafc",
                    color: "#0f172a",
                    fontSize: "0.97rem",
                    "& fieldset": { borderColor: "#e2e8f0", borderWidth: "1.5px" },
                    "&:hover fieldset": { borderColor: "#cbd5e1" },
                    "&.Mui-focused fieldset": {
                        borderColor: "#0ea5e9",
                        borderWidth: "2px"
                    }
                },
                "& input::placeholder": { color: "#94a3b8", opacity: 1 }
            }}
        />
    );
}