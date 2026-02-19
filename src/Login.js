import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    TextField,
    Button,
    Typography,
    Stack,
    InputAdornment,
    Divider,
    Snackbar,
    Alert,
    IconButton,
} from "@mui/material";
import { motion } from "framer-motion";
import {
    Mail,
    Lock,
    Cpu,
    Loader2,
    Eye,
    EyeOff,
    ArrowRight,
    ShieldCheck,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const EMAIL_DOMAIN = "@odaklojistik.com.tr";

function normRole(v) {
    return String(v || "")
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i");
}

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("oturum") || "null");
    } catch {
        return null;
    }
}

export default function CleanTechAuth() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const [toast, setToast] = useState({ open: false, type: "info", text: "" });
    const openToast = (type, text) => setToast({ open: true, type, text });
    const closeToast = () => setToast((t) => ({ ...t, open: false }));

    const [form, setForm] = useState({
        eposta: "",
        sifre: "",
    });

    // ✅ Oturum varsa direkt yönlendir
    useEffect(() => {
        const s = getSession();
        if (s?.id) {
            const r = normRole(s.rol);
            if (r === "admin" || r === "process") navigate("/admin", { replace: true });
            else navigate("/anasayfa", { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const emailNormalized = useMemo(() => {
        const raw = (form.eposta || "").trim().toLowerCase();
        if (!raw) return "";
        if (raw.includes("@")) return raw;
        return `${raw}${EMAIL_DOMAIN}`;
    }, [form.eposta]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    };

    const validate = () => {
        const email = emailNormalized;
        if (!email) return "E-posta zorunlu.";
        if (!email.endsWith(EMAIL_DOMAIN))
            return `Sadece ${EMAIL_DOMAIN} uzantılı mail kabul ediliyor.`;
        if (!form.sifre || form.sifre.length < 4) return "Şifre zorunlu.";
        return null;
    };

    const girisYap = async () => {
        const err = validate();
        if (err) return openToast("error", err);

        setLoading(true);
        try {
            const email = emailNormalized;

            const { data, error } = await supabase
                .from("kullanicilar")
                .select("id, eposta, ad, soyad, birim, unvan, rol, aktif")
                .eq("eposta", email)
                .eq("sifre", form.sifre)
                .eq("aktif", true)
                .single();

            if (error || !data) throw new Error("E-posta veya şifre hatalı.");

            await supabase
                .from("kullanicilar")
                .update({ son_giris: new Date().toISOString() })
                .eq("id", data.id);

            localStorage.setItem("oturum", JSON.stringify(data));

            const r = normRole(data.rol);
            openToast("success", `Hoş geldin ${data.ad} 👋`);

            setTimeout(() => {
                if (r === "admin" || r === "process") navigate("/admin");
                else navigate("/anasayfa");
            }, 250);
        } catch (e) {
            openToast("error", e?.message || "Giriş yapılamadı.");
        } finally {
            setLoading(false);
        }
    };

    const submit = async () => {
        if (loading) return;
        return girisYap();
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                p: { xs: 2, sm: 3 },
                position: "relative",
                overflow: "hidden",
                background:
                    "radial-gradient(1200px 600px at 20% 10%, rgba(0,242,254,0.18), transparent 55%), radial-gradient(900px 500px at 90% 85%, rgba(34,211,238,0.14), transparent 60%), #050816",
            }}
        >
            {/* subtle grid */}
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
                    backgroundSize: "56px 56px",
                    opacity: 0.1,
                    pointerEvents: "none",
                }}
            />

            {/* soft vignette */}
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "radial-gradient(circle at 50% 20%, transparent 0%, rgba(0,0,0,0.55) 70%)",
                    pointerEvents: "none",
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                style={{ width: "100%", maxWidth: 440, zIndex: 1 }}
            >
                <Box
                    sx={{
                        borderRadius: 4,
                        p: { xs: 3, sm: 4 },
                        position: "relative",
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 30px 120px rgba(0,0,0,0.55)",
                        backdropFilter: "blur(14px)",
                    }}
                >
                    {/* top accent */}
                    <Box
                        aria-hidden
                        sx={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: 0,
                            height: 2,
                            background:
                                "linear-gradient(90deg, transparent, rgba(0,242,254,0.95), transparent)",
                            opacity: 0.9,
                        }}
                    />

                    {/* Header */}
                    <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 2.5,
                                    display: "grid",
                                    placeItems: "center",
                                    background: "rgba(0,242,254,0.10)",
                                    border: "1px solid rgba(0,242,254,0.22)",
                                    boxShadow: "0 10px 40px rgba(0,242,254,0.10)",
                                }}
                            >
                                <Cpu size={22} color="#00f2fe" />
                            </Box>

                            <Typography
                                sx={{
                                    fontWeight: 950,
                                    color: "#fff",
                                    letterSpacing: 0.8,
                                    fontSize: 20,
                                }}
                            >
                                CORE<span style={{ color: "#00f2fe" }}>RESOLVE</span>
                            </Typography>
                        </Stack>

                        <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                            Dahili Talep ve Çözüm Yönetimi
                        </Typography>

                        <Divider
                            sx={{
                                width: 72,
                                borderColor: "rgba(0,242,254,0.55)",
                                borderWidth: 1,
                                opacity: 0.9,
                            }}
                        />

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "rgba(255,255,255,0.55)" }}>
                            <ShieldCheck size={16} />
                            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                                Kurumsal Giriş
                            </Typography>
                        </Stack>
                    </Stack>

                    {/* Form */}
                    <Stack spacing={2}>
                        <CompactInput
                            name="eposta"
                            label="Kurumsal E-Posta"
                            value={form.eposta}
                            icon={<Mail size={16} />}
                            onChange={handleChange}
                            placeholder={`kullaniciadi${EMAIL_DOMAIN}`}
                            helperText={
                                !form.eposta
                                    ? ""
                                    : emailNormalized.endsWith(EMAIL_DOMAIN)
                                        ? `Tam: ${emailNormalized}`
                                        : `Sadece ${EMAIL_DOMAIN}`
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") submit();
                            }}
                        />

                        <CompactInput
                            name="sifre"
                            label="Güvenlik Şifresi"
                            value={form.sifre}
                            type={showPass ? "text" : "password"}
                            icon={<Lock size={16} />}
                            onChange={handleChange}
                            endAdornment={
                                <IconButton
                                    size="small"
                                    onClick={() => setShowPass((s) => !s)}
                                    sx={{ color: "rgba(255,255,255,0.70)" }}
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </IconButton>
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") submit();
                            }}
                        />

                        <Button
                            fullWidth
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
                                    <ArrowRight size={18} />
                                )
                            }
                            sx={{
                                mt: 0.5,
                                py: 1.45,
                                borderRadius: 2.5,
                                fontWeight: 950,
                                letterSpacing: 0.3,
                                color: "#06101b",
                                background: "linear-gradient(135deg, #00f2fe, #22d3ee)",
                                boxShadow: "0 18px 50px rgba(0,242,254,0.16)",
                                "&:hover": {
                                    background: "linear-gradient(135deg, #22d3ee, #00f2fe)",
                                    transform: "translateY(-1px)",
                                    boxShadow: "0 22px 70px rgba(0,242,254,0.18)",
                                },
                                transition: "all .18s ease",
                            }}
                        >
                            Sisteme Giriş Yap
                        </Button>

                        <Typography
                            sx={{
                                mt: 1,
                                textAlign: "center",
                                color: "rgba(255,255,255,0.45)",
                                fontSize: 12,
                                lineHeight: 1.6,
                            }}
                        >
                            Hesap oluşturma kapalıdır. Erişim için IT / Sistem yöneticinizle iletişime geçin.
                        </Typography>
                    </Stack>
                </Box>
            </motion.div>

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
        </Box>
    );
}

function CompactInput({ icon, endAdornment, helperText, ...props }) {
    return (
        <Stack spacing={0.7}>
            <Typography
                sx={{
                    color: "rgba(255,255,255,0.58)",
                    fontSize: 12,
                    fontWeight: 900,
                    ml: 0.4,
                    letterSpacing: 0.7,
                }}
            >
                {String(props.label || "").toUpperCase()}
            </Typography>

            <TextField
                {...props}
                label=""
                fullWidth
                variant="outlined"
                size="small"
                FormHelperTextProps={{ sx: { color: "rgba(255,255,255,0.45)" } }}
                helperText={helperText}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start" sx={{ color: "rgba(0,242,254,0.95)" }}>
                            {icon}
                        </InputAdornment>
                    ),
                    endAdornment: endAdornment ? <InputAdornment position="end">{endAdornment}</InputAdornment> : undefined,
                }}
                sx={{
                    "& .MuiOutlinedInput-root": {
                        color: "#fff",
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: "14px",
                        fontSize: "0.95rem",
                        transition: "all .16s ease",
                        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                        "&:hover fieldset": { borderColor: "rgba(0,242,254,0.45)" },
                        "&.Mui-focused fieldset": { borderColor: "rgba(0,242,254,0.95)" },
                        "&.Mui-focused": { boxShadow: "0 0 0 5px rgba(0,242,254,0.10)" },
                    },
                    "& .MuiInputBase-input::placeholder": { color: "rgba(255,255,255,0.35)", opacity: 1 },
                }}
            />
        </Stack>
    );
}
