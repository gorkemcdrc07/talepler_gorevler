import { useEffect, useState } from "react";
import { Box, Drawer, Paper, Typography, Stack, IconButton, Divider, Switch, FormControlLabel, Button } from "@mui/material";
import { CloseRounded, SettingsOutlined } from "@mui/icons-material";
import { popupPaperSx, themeColors, iconBtnSx } from "../tema/ui";

const KEY = "app_settings_v1";

export default function AyarlarPopup({ open, onClose }) {
    const [settings, setSettings] = useState({ realtimeChat: true, compactMode: false, soundAlerts: false });

    useEffect(() => {
        if (!open) return;
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) setSettings((p) => ({ ...p, ...JSON.parse(raw) }));
        } catch { }
    }, [open]);

    const save = () => localStorage.setItem(KEY, JSON.stringify(settings));

    return (
        <Drawer open={open} onClose={onClose} anchor="right" PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, bgcolor: "transparent", p: 2 } }}>
            <Paper elevation={0} sx={{ ...popupPaperSx, height: "100%", display: "flex", flexDirection: "column" }}>
                <Box sx={{ p: 2.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box sx={{ p: 1.2, borderRadius: 2, ...iconBtnSx, display: "grid", placeItems: "center" }}><SettingsOutlined /></Box>
                        <Box>
                            <Typography sx={{ color: "#fff", fontWeight: 950, fontSize: 16 }}>Ayarlar</Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Uygulama tercihleri</Typography>
                        </Box>
                    </Stack>
                    <IconButton onClick={onClose} sx={{ ...iconBtnSx, color: "rgba(255,255,255,0.75)" }}><CloseRounded /></IconButton>
                </Box>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

                <Box sx={{ p: 2.25, flex: 1 }}>
                    <Stack spacing={1}>
                        <FormControlLabel
                            control={<Switch checked={settings.realtimeChat} onChange={(e) => setSettings((p) => ({ ...p, realtimeChat: e.target.checked }))} />}
                            label={<Typography sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 800 }}>Chat canlı güncelleme</Typography>}
                        />
                        <FormControlLabel
                            control={<Switch checked={settings.compactMode} onChange={(e) => setSettings((p) => ({ ...p, compactMode: e.target.checked }))} />}
                            label={<Typography sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 800 }}>Kompakt görünüm</Typography>}
                        />
                        <FormControlLabel
                            control={<Switch checked={settings.soundAlerts} onChange={(e) => setSettings((p) => ({ ...p, soundAlerts: e.target.checked }))} />}
                            label={<Typography sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 800 }}>Sesli uyarı</Typography>}
                        />
                    </Stack>

                    <Stack direction="row" justifyContent="flex-end" spacing={1.25} sx={{ mt: 2 }}>
                        <Button onClick={save} variant="contained" sx={{
                            borderRadius: "16px",
                            textTransform: "none",
                            fontWeight: 900,
                            background: `linear-gradient(45deg, ${themeColors.primary} 30%, ${themeColors.secondary} 90%)`,
                            color: themeColors.bgDark,
                            px: 3,
                            boxShadow: "0 6px 25px rgba(0,242,255,0.22)",
                        }}>
                            Kaydet
                        </Button>
                    </Stack>
                </Box>
            </Paper>
        </Drawer>
    );
}
