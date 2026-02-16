import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    InputAdornment,
    IconButton,
    Container,
    Divider,
    Dialog,
    DialogContent,
    Backdrop,
    CircularProgress,
    MenuItem,
} from "@mui/material";
import {
    PersonOutline,
    LockOutlined,
    Visibility,
    VisibilityOff,
    LoginOutlined,
    Terminal,
    PersonAddAlt1,
    RestartAlt,
    EmailOutlined,
    BadgeOutlined,
    ApartmentOutlined,
    WorkOutline,
    CheckCircleOutline,
    ErrorOutline,
    InfoOutlined,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { supabase } from "./lib/supabase";

const EMAIL_DOMAIN = "@odaklojistik.com.tr";

const buildEmail = (local) => {
    const v = (local || "").trim().toLowerCase().replace(/@/g, "");
    if (!v) return "";
    return `${v}${EMAIL_DOMAIN}`;
};

const TechInput = {
    "& .MuiOutlinedInput-root": {
        color: "#00f2ff",
        backgroundColor: "rgba(0, 20, 40, 0.4)",
        borderRadius: "4px",
        fontSize: "0.95rem",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        borderLeft: "2px solid rgba(0, 242, 255, 0.3)",
        "& fieldset": { borderColor: "rgba(0, 242, 255, 0.1)" },
        "&:hover fieldset": { borderColor: "rgba(0, 242, 255, 0.4)" },
        "&.Mui-focused": {
            backgroundColor: "rgba(0, 20, 40, 0.7)",
            boxShadow: "0 0 20px rgba(0, 242, 255, 0.15)",
        },
        "&.Mui-focused fieldset": {
            borderColor: "#00f2ff",
            borderWidth: "1px",
        },
    },
    "& .MuiInputBase-input::placeholder": {
        color: "rgba(0, 242, 255, 0.5)",
        opacity: 1,
        letterSpacing: "1px",
        fontSize: "0.85rem",
    },
};

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

function ModernLogin() {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);

    // login | register | reset
    const [mode, setMode] = useState("login");

    // Form alanları
    const [emailLocal, setEmailLocal] = useState("");
    const [kullaniciAdi, setKullaniciAdi] = useState("");
    const [ad, setAd] = useState("");
    const [soyad, setSoyad] = useState("");

    const [birim, setBirim] = useState("");
    const [unvan, setUnvan] = useState("");

    const [sifre, setSifre] = useState("");
    const [sifre2, setSifre2] = useState("");

    // DB'den gelen listeler (birim_unvanlar tablosundan)
    const [birimList, setBirimList] = useState([]);
    const [unvanList, setUnvanList] = useState([]);
    const [unvanFullList, setUnvanFullList] = useState([]);

    // UI
    const [loading, setLoading] = useState(false);
    const [hata, setHata] = useState("");
    const [mesaj, setMesaj] = useState("");

    // Panel
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelType, setPanelType] = useState("info");
    const [panelTitle, setPanelTitle] = useState("");
    const [panelText, setPanelText] = useState("");

    const temizleMesaj = () => {
        setHata("");
        setMesaj("");
    };

    const openPanel = ({ type = "info", title = "Bilgi", text = "" }) => {
        setPanelType(type);
        setPanelTitle(title);
        setPanelText(text);
        setPanelOpen(true);
    };

    const closePanel = () => setPanelOpen(false);

    const iconByType = () => {
        if (panelType === "success") return <CheckCircleOutline sx={{ fontSize: 34, color: "#00f2ff" }} />;
        if (panelType === "error") return <ErrorOutline sx={{ fontSize: 34, color: "rgba(255,90,90,0.95)" }} />;
        return <InfoOutlined sx={{ fontSize: 34, color: "rgba(0,242,255,0.8)" }} />;
    };

    // ✅ Register modunda birim/unvan yükle
    useEffect(() => {
        if (mode !== "register") return;

        let alive = true;

        (async () => {
            const { data, error } = await supabase
                .from("birim_unvanlar")
                .select("id,birim,unvan,aktif")
                .eq("aktif", true)
                .order("birim", { ascending: true })
                .order("unvan", { ascending: true });

            if (!alive) return;

            if (error) {
                setHata(error.message);
                return;
            }

            const list = data || [];
            setUnvanFullList(list);

            const birimler = Array.from(new Set(list.map((x) => x.birim))).filter(Boolean);
            setBirimList(birimler);
        })();

        return () => {
            alive = false;
        };
    }, [mode]);

    // ✅ Birim değişince unvanları filtrele
    useEffect(() => {
        if (mode !== "register") return;

        setUnvan("");

        if (!birim) {
            setUnvanList([]);
            return;
        }

        const u = unvanFullList
            .filter((x) => x.birim === birim)
            .map((x) => x.unvan);

        setUnvanList(u);
    }, [birim, mode, unvanFullList]);

    // ✅ AUTH YOK: giriş = kullanicilar tablosundan kontrol
    const girisYap = async () => {
        setLoading(true);
        temizleMesaj();

        openPanel({ type: "info", title: "Giriş Yapılıyor", text: "Kontrol ediliyor, lütfen bekleyin..." });

        const email = buildEmail(emailLocal);
        if (!email) {
            setLoading(false);
            openPanel({ type: "error", title: "Hata", text: "E-posta kullanıcı adı zorunludur." });
            return setHata("E-posta kullanıcı adı zorunludur.");
        }

        try {
            const { data, error } = await supabase
                .from("kullanicilar")
                .select("id, eposta, kullanici_adi, ad, soyad, birim, unvan, rol")
                .eq("eposta", email)
                .eq("sifre", sifre) // şimdilik düz kontrol
                .eq("aktif", true)
                .single();

            if (error || !data) {
                setLoading(false);
                openPanel({ type: "error", title: "Giriş Başarısız", text: "E-posta veya şifre hatalı." });
                return setHata("E-posta veya şifre hatalı.");
            }

            // oturum bilgisi localStorage (auth yok)
            localStorage.setItem("oturum_kullanici", JSON.stringify(data));

            // son_giris güncelle
            await supabase.from("kullanicilar").update({ son_giris: new Date().toISOString() }).eq("id", data.id);

            setLoading(false);
            setMesaj("Giriş başarılı.");
            openPanel({ type: "success", title: "Giriş Başarılı", text: "Yönlendiriliyorsunuz..." });

            setTimeout(() => navigate("/anasayfa"), 500);
        } catch (e) {
            setLoading(false);
            openPanel({ type: "error", title: "Hata", text: e?.message || "Giriş yapılamadı." });
            setHata(e?.message || "Giriş yapılamadı.");
        }
    };

    // ✅ AUTH YOK: kayıt = kullanicilar tablosuna insert
    const kayitOl = async () => {
        setLoading(true);
        temizleMesaj();

        openPanel({ type: "info", title: "Kayıt Oluşturuluyor", text: "Kullanıcı kaydı yapılıyor..." });

        const email = buildEmail(emailLocal);

        if (!email) {
            setLoading(false);
            openPanel({ type: "error", title: "Hata", text: "E-posta kullanıcı adı zorunludur." });
            return setHata("E-posta kullanıcı adı zorunludur.");
        }
        if (!kullaniciAdi.trim()) {
            setLoading(false);
            openPanel({ type: "error", title: "Hata", text: "Kullanıcı adı zorunludur." });
            return setHata("Kullanıcı adı zorunludur.");
        }
        if (!ad.trim() || !soyad.trim()) {
            setLoading(false);
            openPanel({ type: "error", title: "Hata", text: "Ad ve soyad zorunludur." });
            return setHata("Ad ve soyad zorunludur.");
        }
        if (!birim.trim() || !unvan.trim()) {
            setLoading(false);
            openPanel({ type: "error", title: "Hata", text: "Birim ve ünvan seçimi zorunludur." });
            return setHata("Birim ve ünvan seçimi zorunludur.");
        }
        if (sifre.length < 6) {
            setLoading(false);
            openPanel({ type: "error", title: "Hata", text: "Şifre en az 6 karakter olmalıdır." });
            return setHata("Şifre en az 6 karakter olmalıdır.");
        }
        if (sifre !== sifre2) {
            setLoading(false);
            openPanel({ type: "error", title: "Hata", text: "Şifreler eşleşmiyor." });
            return setHata("Şifreler eşleşmiyor.");
        }

        try {
            const payload = {
                eposta: email,
                sifre: sifre, // şimdilik düz
                kullanici_adi: kullaniciAdi.trim(),
                ad: ad.trim(),
                soyad: soyad.trim(),
                birim: birim.trim(),
                unvan: unvan.trim(),
                rol: "kullanici",
                aktif: true,
            };

            const { error } = await supabase.from("kullanicilar").insert(payload);

            setLoading(false);

            if (error) {
                openPanel({ type: "error", title: "Kayıt Başarısız", text: error.message });
                return setHata(error.message);
            }

            setMesaj("Kayıt başarılı. Artık giriş yapabilirsiniz.");
            openPanel({ type: "success", title: "Kayıt Başarılı", text: "Artık giriş yapabilirsiniz." });

            // login ekranına al
            setMode("login");
        } catch (e) {
            setLoading(false);
            openPanel({ type: "error", title: "Hata", text: e?.message || "Kayıt yapılamadı." });
            setHata(e?.message || "Kayıt yapılamadı.");
        }
    };

    // ✅ Auth yokken "reset" için şimdilik bilgi veriyoruz
    const sifreSifirla = async () => {
        openPanel({
            type: "info",
            title: "Bilgi",
            text: "Auth kapalı olduğu için şifre sıfırlama şu an yok. İstersen 'kullanicilar' tablosuna reset token sistemi kurarız.",
        });
    };

    const submit = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (mode === "login") return girisYap();
        if (mode === "register") return kayitOl();
        return sifreSifirla();
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#02040a",
                backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(0, 100, 255, 0.1) 0%, transparent 50%),
          linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px)
        `,
                backgroundSize: "100% 100%, 30px 30px, 30px 30px",
                overflow: "hidden",
            }}
        >
            {/* Panel */}
            <Dialog
                open={panelOpen}
                onClose={closePanel}
                maxWidth="xs"
                fullWidth
                BackdropComponent={Backdrop}
                BackdropProps={{
                    timeout: 250,
                    sx: { backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" },
                }}
                PaperProps={{
                    sx: {
                        bgcolor: "rgba(3, 7, 18, 0.92)",
                        border: "1px solid rgba(0,242,255,0.18)",
                        boxShadow: "0 0 40px rgba(0,242,255,0.08)",
                        borderRadius: 2,
                        overflow: "hidden",
                    },
                }}
            >
                <DialogContent sx={{ p: 0 }}>
                    <MotionPaper
                        elevation={0}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        sx={{ p: 2.5, bgcolor: "transparent" }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.25 }}>
                            {iconByType()}
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ color: "#fff", fontWeight: 800, letterSpacing: "1px" }}>
                                    {panelTitle}
                                </Typography>
                                <Typography sx={{ color: "rgba(0,242,255,0.75)", fontSize: 12, mt: 0.25 }}>
                                    {panelType === "info" ? "İşlem sürüyor" : panelType === "success" ? "Tamamlandı" : "Sorun oluştu"}
                                </Typography>
                            </Box>

                            {loading && <CircularProgress size={22} thickness={4} sx={{ color: "rgba(0,242,255,0.9)" }} />}
                        </Box>

                        <Divider sx={{ borderColor: "rgba(0,242,255,0.12)", my: 1.25 }} />

                        <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.6 }}>
                            {panelText}
                        </Typography>

                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
                            <Button
                                onClick={closePanel}
                                variant="outlined"
                                disabled={loading && panelType === "info"}
                                sx={{
                                    borderColor: "rgba(0,242,255,0.25)",
                                    color: "rgba(0,242,255,0.85)",
                                    letterSpacing: "2px",
                                    "&:hover": { borderColor: "#00f2ff" },
                                }}
                            >
                                KAPAT
                            </Button>
                        </Box>
                    </MotionPaper>
                </DialogContent>
            </Dialog>

            <Container maxWidth="xs">
                <MotionBox initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            bgcolor: "rgba(3, 7, 18, 0.85)",
                            backdropFilter: "blur(20px)",
                            border: "1px solid rgba(0, 242, 255, 0.1)",
                            position: "relative",
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                right: 0,
                                width: "40px",
                                height: "40px",
                                borderRight: "2px solid #00f2ff",
                                borderTop: "2px solid #00f2ff",
                            },
                        }}
                    >
                        <Box sx={{ mb: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Terminal sx={{ color: "#00f2ff", fontSize: 28 }} />
                            <Typography
                                variant="h5"
                                sx={{
                                    color: "#fff",
                                    fontWeight: 700,
                                    letterSpacing: "2px",
                                    textTransform: "uppercase",
                                    fontSize: "1.2rem",
                                }}
                            >
                                Auth_Terminal
                            </Typography>
                        </Box>

                        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                            <Button
                                onClick={() => {
                                    setMode("login");
                                    temizleMesaj();
                                }}
                                variant="outlined"
                                size="small"
                                sx={{
                                    flex: 1,
                                    borderColor: mode === "login" ? "#00f2ff" : "rgba(0,242,255,0.2)",
                                    color: mode === "login" ? "#00f2ff" : "rgba(0,242,255,0.6)",
                                    letterSpacing: "2px",
                                    "&:hover": { borderColor: "#00f2ff" },
                                }}
                            >
                                GİRİŞ
                            </Button>

                            <Button
                                onClick={() => {
                                    setMode("register");
                                    temizleMesaj();
                                }}
                                variant="outlined"
                                size="small"
                                sx={{
                                    flex: 1,
                                    borderColor: mode === "register" ? "#00f2ff" : "rgba(0,242,255,0.2)",
                                    color: mode === "register" ? "#00f2ff" : "rgba(0,242,255,0.6)",
                                    letterSpacing: "2px",
                                    "&:hover": { borderColor: "#00f2ff" },
                                }}
                            >
                                KAYIT
                            </Button>

                            <Button
                                onClick={() => {
                                    setMode("reset");
                                    temizleMesaj();
                                }}
                                variant="outlined"
                                size="small"
                                sx={{
                                    flex: 1,
                                    borderColor: mode === "reset" ? "#00f2ff" : "rgba(0,242,255,0.2)",
                                    color: mode === "reset" ? "#00f2ff" : "rgba(0,242,255,0.6)",
                                    letterSpacing: "2px",
                                    "&:hover": { borderColor: "#00f2ff" },
                                }}
                            >
                                SIFIRLA
                            </Button>
                        </Box>

                        <Divider sx={{ borderColor: "rgba(0,242,255,0.12)", mb: 2.5 }} />

                        <Box component="form" noValidate onSubmit={submit}>
                            <TextField
                                fullWidth
                                placeholder="E-POSTA KULLANICI ADI"
                                variant="outlined"
                                margin="normal"
                                sx={TechInput}
                                value={emailLocal}
                                onChange={(e) => setEmailLocal(e.target.value.replace(/@/g, ""))}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailOutlined sx={{ color: "#00f2ff", opacity: 0.7 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Typography sx={{ color: "rgba(0,242,255,0.55)", fontSize: 12, letterSpacing: "1px", whiteSpace: "nowrap" }}>
                                                {EMAIL_DOMAIN}
                                            </Typography>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {mode === "register" && (
                                <TextField
                                    fullWidth
                                    placeholder="KULLANICI ADI"
                                    variant="outlined"
                                    margin="normal"
                                    sx={TechInput}
                                    value={kullaniciAdi}
                                    onChange={(e) => setKullaniciAdi(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonOutline sx={{ color: "#00f2ff", opacity: 0.7 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}

                            {mode === "register" && (
                                <TextField
                                    fullWidth
                                    placeholder="AD"
                                    variant="outlined"
                                    margin="normal"
                                    sx={TechInput}
                                    value={ad}
                                    onChange={(e) => setAd(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <BadgeOutlined sx={{ color: "#00f2ff", opacity: 0.7 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}

                            {mode === "register" && (
                                <TextField
                                    fullWidth
                                    placeholder="SOYAD"
                                    variant="outlined"
                                    margin="normal"
                                    sx={TechInput}
                                    value={soyad}
                                    onChange={(e) => setSoyad(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <BadgeOutlined sx={{ color: "#00f2ff", opacity: 0.7 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}

                            {mode === "register" && (
                                <TextField
                                    fullWidth
                                    select
                                    label="BİRİM"
                                    variant="outlined"
                                    margin="normal"
                                    sx={TechInput}
                                    value={birim}
                                    onChange={(e) => setBirim(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <ApartmentOutlined sx={{ color: "#00f2ff", opacity: 0.7 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                >
                                    {birimList.map((b) => (
                                        <MenuItem key={b} value={b}>
                                            {b}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}

                            {mode === "register" && (
                                <TextField
                                    fullWidth
                                    select
                                    label="ÜNVAN"
                                    variant="outlined"
                                    margin="normal"
                                    sx={TechInput}
                                    value={unvan}
                                    onChange={(e) => setUnvan(e.target.value)}
                                    disabled={!birim}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <WorkOutline sx={{ color: "#00f2ff", opacity: 0.7 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                >
                                    {unvanList.map((u) => (
                                        <MenuItem key={u} value={u}>
                                            {u}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}

                            {(mode === "login" || mode === "register") && (
                                <TextField
                                    fullWidth
                                    placeholder="ERİŞİM ŞİFRESİ"
                                    type={showPassword ? "text" : "password"}
                                    variant="outlined"
                                    margin="normal"
                                    sx={TechInput}
                                    value={sifre}
                                    onChange={(e) => setSifre(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlined sx={{ color: "#00f2ff", opacity: 0.7 }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => setShowPassword(!showPassword)} sx={{ color: "rgba(0, 242, 255, 0.4)" }}>
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}

                            {mode === "register" && (
                                <TextField
                                    fullWidth
                                    placeholder="ŞİFRE TEKRAR"
                                    type={showPassword2 ? "text" : "password"}
                                    variant="outlined"
                                    margin="normal"
                                    sx={TechInput}
                                    value={sifre2}
                                    onChange={(e) => setSifre2(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlined sx={{ color: "#00f2ff", opacity: 0.7 }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => setShowPassword2(!showPassword2)} sx={{ color: "rgba(0, 242, 255, 0.4)" }}>
                                                    {showPassword2 ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}

                            {hata && <Typography sx={{ mt: 2, color: "rgba(255,90,90,0.95)", fontSize: 13 }}>{hata}</Typography>}
                            {mesaj && <Typography sx={{ mt: 2, color: "rgba(0,242,255,0.9)", fontSize: 13 }}>{mesaj}</Typography>}

                            <Button
                                type="submit"
                                disabled={loading}
                                fullWidth
                                variant="contained"
                                endIcon={mode === "login" ? <LoginOutlined /> : mode === "register" ? <PersonAddAlt1 /> : <RestartAlt />}
                                sx={{
                                    mt: 4,
                                    py: 1.5,
                                    bgcolor: "transparent",
                                    border: "1px solid #00f2ff",
                                    color: "#00f2ff",
                                    fontWeight: 600,
                                    letterSpacing: "3px",
                                    transition: "all 0.3s",
                                    "&:hover": {
                                        bgcolor: "#00f2ff",
                                        color: "#000",
                                        boxShadow: "0 0 25px rgba(0, 242, 255, 0.5)",
                                    },
                                }}
                            >
                                {loading ? "İŞLENİYOR..." : mode === "login" ? "GİRİŞ YAP" : mode === "register" ? "KAYIT OL" : "SIFIRLA"}
                            </Button>
                        </Box>
                    </Paper>
                </MotionBox>
            </Container>
        </Box>
    );
}

export default ModernLogin;
