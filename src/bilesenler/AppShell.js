import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppShell({ role = "requester", navTitle, navSubtitle, navRightExtra, children }) {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "#02040a",
                backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(0, 100, 255, 0.10) 0%, transparent 55%),
          radial-gradient(circle at 80% 40%, rgba(0, 242, 255, 0.08) 0%, transparent 60%),
          linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px)
        `,
                backgroundSize: "100% 100%, 100% 100%, 30px 30px, 30px 30px",
            }}
        >
            <Box sx={{ display: "flex", width: "100%" }}>
                {/* Sidebar sabit desktop */}
                <Sidebar role={role} />

                {/* Content area */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Navbar title={navTitle} subtitle={navSubtitle} rightExtra={navRightExtra} />

                    <Box
                        sx={{
                            p: 3,
                            height: "calc(100vh - 64px)",
                            overflow: "auto",
                        }}
                    >
                        {children}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
