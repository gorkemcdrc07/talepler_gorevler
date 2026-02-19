import { Box, Chip, IconButton, Stack, Typography } from "@mui/material";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

function getTitle(path) {
    if (path === "/anasayfa") return "Dashboard";
    if (path === "/taleplerim") return "Taleplerim";
    if (path === "/talep/yeni") return "Yeni Talep";
    return "CORE RESOLVE";
}

export default function Topbar({ user, onToggleSidebar }) {
    const location = useLocation();
    const title = getTitle(location.pathname);

    return (
        <Box
            sx={{
                px: 2.5,
                py: 1.5,
                borderBottom: "1px solid rgba(0,242,254,0.12)",
                background: "rgba(2,6,23,0.6)",
                backdropFilter: "blur(10px)",
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <IconButton onClick={onToggleSidebar} sx={{ color: "#fff" }}>
                    <Menu size={20} />
                </IconButton>

                <Typography sx={{ fontWeight: 900 }}>{title}</Typography>

                <Box sx={{ flex: 1 }} />

                <Chip
                    size="small"
                    label={user?.eposta}
                    sx={{
                        bgcolor: "rgba(255,255,255,0.08)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.12)",
                    }}
                />
            </Stack>
        </Box>
    );
}
