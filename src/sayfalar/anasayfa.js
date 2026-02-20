import { Box, Typography } from "@mui/material";
import AppLayout from "../bilesenler/AppLayout";

export default function AnaSayfa() {
    return (
        <AppLayout>
            <WelcomePanel />
        </AppLayout>
    );
}

function WelcomePanel() {
    const user = JSON.parse(localStorage.getItem("oturum") || "null");

    return (
        <Box
            sx={{
                p: { xs: 2.6, sm: 3.2 },
                borderRadius: 3,
                background: "rgba(15,23,42,0.85)",
                border: "1px solid rgba(0,242,254,0.22)",
                boxShadow: "0 0 0 1px rgba(0,242,254,0.06), 0 26px 70px rgba(0,0,0,0.55)",
            }}
        >
            <Typography variant="h4" sx={{ fontWeight: 950 }}>
                Hoş geldin, {user?.ad} 👋
            </Typography>

            <Typography sx={{ mt: 1, color: "rgba(255,255,255,0.55)" }}>
                Buradan taleplerini yönetebilir, yeni talep oluşturabilir ve süreçleri takip edebilirsin.
            </Typography>

            <Box
                sx={{
                    mt: 3,
                    p: 2.2,
                    borderRadius: 2.5,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                }}
            >
                <Typography sx={{ fontWeight: 900, mb: 0.8 }}>Profil</Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.65)" }}>
                    {user?.birim} • {user?.unvan}
                </Typography>
            </Box>
        </Box>
    );
}

