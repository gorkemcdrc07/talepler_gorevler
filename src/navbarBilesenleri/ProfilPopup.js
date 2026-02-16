import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    Avatar,
    Divider,
    CircularProgress,
    TextField,
    Button,
} from "@mui/material";
import { supabase } from "../lib/supabase";

const glass = {
    p: 2.5,
    bgcolor: "rgba(10, 15, 28, 0.75)",
    border: "1px solid rgba(0, 242, 255, 0.10)",
    backdropFilter: "blur(20px)",
    borderRadius: 3,
};

export default function Profil() {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);

    const [form, setForm] = useState({
        ad: "",
        soyad: "",
        unvan: "",
        birim: "",
        avatar_url: "",
    });

    const fullName = useMemo(() => {
        const a = form.ad || "";
        const s = form.soyad || "";
        return `${a} ${s}`.trim() || "Kullanıcı";
    }, [form.ad, form.soyad]);

    const load = async () => {
        setLoading(true);
        setErr("");
        try {
            const { data: auth } = await supabase.auth.getUser();
            const u = auth?.user;
            if (!u) {
                setUser(null);
                setProfile(null);
                setLoading(false);
                return;
            }
            setUser(u);

            const { data, error } = await supabase
                .from("kullanicilar")
                .select("*")
                .eq("id", u.id)
                .maybeSingle();

            if (error) throw error;

            setProfile(data || null);
            setForm({
                ad: data?.ad || "",
                soyad: data?.soyad || "",
                unvan: data?.unvan || "",
                birim: data?.birim || "",
                avatar_url: data?.avatar_url || "",
            });
        } catch (e) {
            setErr(e?.message || "Profil yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    const save = async () => {
        if (!user?.id) return;
        setErr("");
        try {
            const payload = {
                id: user.id,
                ad: form.ad,
                soyad: form.soyad,
                unvan: form.unvan,
                birim: form.birim,
                avatar_url: form.avatar_url,
            };

            const { error } = await supabase.from("kullanicilar").upsert(payload);
            if (error) throw error;

            await load();
        } catch (e) {
            setErr(e?.message || "Kaydedilemedi.");
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 260 }}>
                <Stack alignItems="center" spacing={1.5}>
                    <CircularProgress />
                    <Typography sx={{ color: "rgba(0,242,255,0.65)", fontWeight: 700 }}>
                        Yükleniyor...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {err && (
                <Paper elevation={0} sx={{ ...glass, bgcolor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.22)" }}>
                    <Typography sx={{ color: "#ff4d4d", fontWeight: 900 }}>{err}</Typography>
                </Paper>
            )}

            <Paper elevation={0} sx={glass}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                    <Avatar
                        src={form.avatar_url || ""}
                        alt={fullName}
                        sx={{
                            width: 72,
                            height: 72,
                            bgcolor: "rgba(0,242,255,0.18)",
                            color: "#00f2ff",
                            fontWeight: 900,
                            border: "1px solid rgba(0,242,255,0.25)",
                        }}
                    >
                        {fullName?.[0]?.toUpperCase?.() || "K"}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ color: "#fff", fontWeight: 950, fontSize: 18 }}>
                            {fullName}
                        </Typography>
                        <Typography sx={{ color: "rgba(0,242,255,0.6)", fontSize: 12 }}>
                            {profile?.role === "process" ? "Süreç Geliştirme" : "Kullanıcı"} • {user?.email || ""}
                        </Typography>
                    </Box>
                </Stack>

                <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.06)" }} />

                <Stack spacing={1.5}>
                    <TextField
                        label="Ad"
                        value={form.ad}
                        onChange={(e) => setForm((p) => ({ ...p, ad: e.target.value }))}
                        size="small"
                        fullWidth
                        sx={fieldSx}
                    />
                    <TextField
                        label="Soyad"
                        value={form.soyad}
                        onChange={(e) => setForm((p) => ({ ...p, soyad: e.target.value }))}
                        size="small"
                        fullWidth
                        sx={fieldSx}
                    />
                    <TextField
                        label="Ünvan"
                        value={form.unvan}
                        onChange={(e) => setForm((p) => ({ ...p, unvan: e.target.value }))}
                        size="small"
                        fullWidth
                        sx={fieldSx}
                    />
                    <TextField
                        label="Birim"
                        value={form.birim}
                        onChange={(e) => setForm((p) => ({ ...p, birim: e.target.value }))}
                        size="small"
                        fullWidth
                        sx={fieldSx}
                    />
                    <TextField
                        label="Avatar URL"
                        value={form.avatar_url}
                        onChange={(e) => setForm((p) => ({ ...p, avatar_url: e.target.value }))}
                        size="small"
                        fullWidth
                        helperText="Şimdilik URL ile. İstersen Supabase Storage upload ekranını da ekleriz."
                        sx={fieldSx}
                    />

                    <Stack direction="row" justifyContent="flex-end" gap={1}>
                        <Button
                            onClick={load}
                            sx={{
                                textTransform: "none",
                                color: "rgba(255,255,255,0.7)",
                            }}
                        >
                            Vazgeç
                        </Button>
                        <Button
                            onClick={save}
                            variant="outlined"
                            sx={{
                                textTransform: "none",
                                fontWeight: 900,
                                borderColor: "rgba(0,242,255,0.25)",
                                color: "#00f2ff",
                                "&:hover": { bgcolor: "rgba(0,242,255,0.08)" },
                            }}
                        >
                            Kaydet
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        bgcolor: "rgba(255,255,255,0.03)",
        borderRadius: 2,
        color: "#fff",
        "& fieldset": { borderColor: "rgba(0,242,255,0.18)" },
        "&:hover fieldset": { borderColor: "rgba(0,242,255,0.30)" },
        "&.Mui-focused fieldset": { borderColor: "#00f2ff" },
    },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.55)" },
    "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.35)" },
};
