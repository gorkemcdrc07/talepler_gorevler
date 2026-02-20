import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("oturum") || "null");
    } catch {
        return null;
    }
}

export default function AppLayout({ children }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [mini, setMini] = useState(false);

    useEffect(() => {
        const s = getSession();
        if (!s?.id) {
            navigate("/", { replace: true });
            return;
        }
        setUser(s);
    }, [navigate]);

    if (!user) return null;

    return (
        <Box
            sx={{
                height: "100vh",          // ✅ minHeight değil
                overflow: "hidden",       // ✅ sayfa scroll yapmasın
                bgcolor: "#020617",
                color: "#fff",
                position: "relative",
            }}
        >
            {/* Background */}
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `
            radial-gradient(circle at 15% 20%, rgba(0,242,254,0.18) 0%, transparent 45%),
            radial-gradient(circle at 80% 80%, rgba(34,211,238,0.14) 0%, transparent 45%),
            linear-gradient(rgba(0,242,254,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,242,254,0.05) 1px, transparent 1px)
          `,
                    backgroundSize: "100% 100%, 100% 100%, 40px 40px, 40px 40px",
                    pointerEvents: "none",
                    opacity: 0.95,
                    zIndex: 0,
                }}
            />

            {/* Layout */}
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    height: "100vh",        // ✅ sidebar + içerik aynı yükseklikte
                    overflow: "hidden",
                }}
            >
                {/* Sidebar (sabit) */}
                <Sidebar user={user} mini={mini} setMini={setMini} />

                {/* Sağ taraf: Topbar + içerik */}
                <Box
                    sx={{
                        flex: 1,
                        height: "100vh",
                        overflow: "hidden",   // ✅ sağ alan kendi içinde yönetilecek
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,          // ✅ taşma/scroll bug fix
                    }}
                >
                    {/* Topbar sabit */}
                    <Box sx={{ flexShrink: 0 }}>
                        <Topbar user={user} onToggleSidebar={() => setMini((v) => !v)} />
                    </Box>

                    {/* İçerik: SCROLL BURADA */}
                    <Box
                        sx={{
                            flex: 1,
                            overflow: "auto",   // ✅ scroll sadece burada
                            p: { xs: 2.5, sm: 3.5 },
                            minHeight: 0,       // ✅ önemli: flex overflow fix
                        }}
                    >
                        {children}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

