// src/bilesenler/Ayarlar.js
import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    Divider,
    Switch,
    FormControlLabel,
    Button,
    TextField,
    Chip,
    Snackbar,
    Alert,
    IconButton,
    CircularProgress,
} from "@mui/material";
import {
    CheckRounded,
    CloseRounded,
    RestartAltRounded,
    SaveRounded,
    BoltRounded,
    VolumeUpRounded,
    VolumeOffRounded,
    DensitySmallRounded,
    DensityMediumRounded,
} from "@mui/icons-material";

// NOTE: Bu dosyada supabase kullanılmıyor, kaldırdım.

const glass = {
    p: 2.5,
    bgcolor: "rgba(10, 15, 28, 0.75)",
    border: "1px solid rgba(0, 242, 255, 0.10)",
    backdropFilter: "blur(20px) saturate(160%)",
    borderRadius: 3.5,
    boxShadow: "0 26px 70px rgba(0,0,0,0.45)",
};

const KEY = "app_settings_v2";

// ✅ Uygulama genelinde kullanacağımız event isimleri
export const EVT_SETTINGS = "app:settings";
export const EVT_DENSITY = "app:density";

const DEFAULTS = {
    compactMode: false, // UI yoğunluğu (compact)
    realtimeChat: true, // navbar realtime subscribe açık/kapalı (uygulamada dinlenecek)
    soundAlerts: false, // bildirim/mesaj sesi
    signature: "", // mesaj/talep imzası
};

export function loadSettings() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return DEFAULTS;
        const parsed = JSON.parse(raw);
        return { ...DEFAULTS, ...parsed };
    } catch {
        return DEFAULTS;
    }
}

export function persistSettings(settings) {
    localStorage.setItem(KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(EVT_SETTINGS, { detail: settings }));
    window.dispatchEvent(
        new CustomEvent(EVT_DENSITY, {
            detail: settings.compactMode ? "compact" : "comfortable",
        })
    );
}

// ✅ Tarayıcı kısıtlarını aşmak için resume + daha duyulur envelope
export async function beep(enabled) {
    if (!enabled) return;

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();

        if (ctx.state === "suspended") {
            await ctx.resume();
        }

        const o = ctx.createOscillator();
        const g = ctx.createGain();

        o.type = "sine";
        o.frequency.value = 880;

        const now = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        o.connect(g);
        g.connect(ctx.destination);

        o.start(now);
        o.stop(now + 0.2);

        setTimeout(() => ctx.close?.(), 350);
    } catch (e) {
        // Debug için açık bırak
        // eslint-disable-next-line no-console
        console.log("beep error:", e);
    }
}

export default function Ayarlar() {
    const [settings, setSettings] = useState(DEFAULTS);

    // UI
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

    useEffect(() => {
        setSettings(loadSettings());
    }, []);

    // değişiklik takip
    useEffect(() => {
        const current = loadSettings();
        setDirty(JSON.stringify(current) !== JSON.stringify(settings));
    }, [settings]);

    const densityLabel = useMemo(() => (settings.compactMode ? "Kompakt" : "Rahat"), [settings.compactMode]);

    const save = async () => {
        setSaving(true);
        try {
            persistSettings(settings);
            setToast({ open: true, msg: "Ayarlar kaydedildi", severity: "success" });
            await beep(settings.soundAlerts);
        } catch {
            setToast({ open: true, msg: "Kaydetme başarısız", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    const reset = async () => {
        setSettings(DEFAULTS);
        persistSettings(DEFAULTS);
        setToast({ open: true, msg: "Varsayılanlara döndürüldü", severity: "info" });
        await beep(true);
    };

    const testSound = async () => {
        await beep(true);
        setToast({ open: true, msg: "Test sesi çalındı", severity: "success" });
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Paper elevation={0} sx={glass}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Box>
                        <Typography sx={{ color: "#fff", fontWeight: 950, fontSize: 16 }}>Ayarlar</Typography>
                        <Typography sx={{ color: "rgba(0,242,255,0.6)", fontSize: 12, mt: 0.5 }}>
                            Uygulama tercihlerini buradan yönet.
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            size="small"
                            icon={settings.compactMode ? <DensitySmallRounded /> : <DensityMediumRounded />}
                            label={`Yoğunluk: ${densityLabel}`}
                            sx={{
                                bgcolor: "rgba(0,242,255,0.10)",
                                color: "#00f2ff",
                                border: "1px solid rgba(0,242,255,0.25)",
                                fontWeight: 900,
                                borderRadius: 999,
                            }}
                        />
                        {dirty && (
                            <Chip
                                size="small"
                                icon={<BoltRounded />}
                                label="Kaydedilmedi"
                                sx={{
                                    bgcolor: "rgba(255,180,71,0.12)",
                                    color: "#ffb347",
                                    border: "1px solid rgba(255,180,71,0.30)",
                                    fontWeight: 900,
                                    borderRadius: 999,
                                }}
                            />
                        )}
                    </Stack>
                </Stack>

                <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.06)" }} />

                <Stack spacing={1.25}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.compactMode}
                                onChange={(e) => setSettings((p) => ({ ...p, compactMode: e.target.checked }))}
                            />
                        }
                        label={
                            <Stack spacing={0.2}>
                                <Typography sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 850 }}>
                                    Kompakt görünüm
                                </Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                                    Tablolar, kartlar ve boşluklar daha sıkı gösterilir.
                                </Typography>
                            </Stack>
                        }
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.realtimeChat}
                                onChange={(e) => setSettings((p) => ({ ...p, realtimeChat: e.target.checked }))}
                            />
                        }
                        label={
                            <Stack spacing={0.2}>
                                <Typography sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 850 }}>
                                    Canlı güncelleme (Chat/Bildirim)
                                </Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                                    Açıkken mesaj/bildirim rozetleri anlık artar.
                                </Typography>
                            </Stack>
                        }
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.soundAlerts}
                                onChange={async (e) => {
                                    const enabled = e.target.checked;
                                    setSettings((p) => ({ ...p, soundAlerts: enabled }));
                                    if (enabled) await beep(true);
                                }}
                            />
                        }
                        label={
                            <Stack spacing={0.2}>
                                <Typography sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 850 }}>
                                    Sesli uyarılar
                                </Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                                    Mesaj/bildirim geldiğinde kısa bir ses çalar.
                                </Typography>
                            </Stack>
                        }
                    />

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                        <Button
                            onClick={testSound}
                            disabled={!settings.soundAlerts}
                            startIcon={settings.soundAlerts ? <VolumeUpRounded /> : <VolumeOffRounded />}
                            variant="outlined"
                            sx={{
                                textTransform: "none",
                                fontWeight: 900,
                                borderRadius: 2.5,
                                borderColor: "rgba(0,242,255,0.25)",
                                color: "#00f2ff",
                                "&:hover": { bgcolor: "rgba(0,242,255,0.08)" },
                                "&.Mui-disabled": {
                                    borderColor: "rgba(255,255,255,0.10)",
                                    color: "rgba(255,255,255,0.35)",
                                },
                            }}
                        >
                            Ses Testi
                        </Button>

                        <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                            (Sesli uyarılar açıkken)
                        </Typography>
                    </Stack>

                    <TextField
                        label="İmza (opsiyonel)"
                        value={settings.signature}
                        onChange={(e) => setSettings((p) => ({ ...p, signature: e.target.value }))}
                        size="small"
                        fullWidth
                        sx={{
                            mt: 1,
                            "& .MuiOutlinedInput-root": {
                                bgcolor: "rgba(255,255,255,0.03)",
                                borderRadius: 2.5,
                                color: "#fff",
                                "& fieldset": { borderColor: "rgba(0,242,255,0.18)" },
                                "&:hover fieldset": { borderColor: "rgba(0,242,255,0.30)" },
                                "&.Mui-focused fieldset": { borderColor: "#00f2ff" },
                            },
                            "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.55)" },
                        }}
                    />

                    <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ mt: 1 }}>
                        <Button
                            onClick={reset}
                            startIcon={<RestartAltRounded />}
                            sx={{
                                textTransform: "none",
                                color: "rgba(255,255,255,0.70)",
                                fontWeight: 900,
                                borderRadius: 2.5,
                                "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
                            }}
                        >
                            Sıfırla
                        </Button>

                        <Button
                            onClick={save}
                            variant="outlined"
                            startIcon={saving ? <CircularProgress size={16} /> : <SaveRounded />}
                            disabled={saving || !dirty}
                            sx={{
                                textTransform: "none",
                                fontWeight: 950,
                                borderRadius: 2.5,
                                borderColor: "rgba(0,242,255,0.25)",
                                color: "#00f2ff",
                                "&:hover": { bgcolor: "rgba(0,242,255,0.08)" },
                                "&.Mui-disabled": {
                                    borderColor: "rgba(255,255,255,0.10)",
                                    color: "rgba(255,255,255,0.35)",
                                },
                            }}
                        >
                            Kaydet
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            <Snackbar
                open={toast.open}
                autoHideDuration={2400}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    severity={toast.severity}
                    variant="filled"
                    icon={toast.severity === "success" ? <CheckRounded /> : undefined}
                    action={
                        <IconButton size="small" onClick={() => setToast((t) => ({ ...t, open: false }))} sx={{ color: "rgba(255,255,255,0.85)" }}>
                            <CloseRounded fontSize="small" />
                        </IconButton>
                    }
                    sx={{ fontWeight: 900 }}
                >
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
