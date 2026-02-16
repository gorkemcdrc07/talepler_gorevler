import React, { useState } from "react";
import { Box, Button, Typography, Stack, Divider, IconButton, Tooltip } from "@mui/material";
import {
    DashboardOutlined,
    AddCircleOutline,
    InboxOutlined,
    ViewKanbanOutlined,
    TimelineOutlined,
    SearchOutlined,
    SettingsOutlined, // Tır tekerleği niyetine
    LocalShippingOutlined, // Tır ikonu
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const baseBtn = (isOpen) => ({
    justifyContent: isOpen ? "flex-start" : "center",
    color: "rgba(0,242,255,0.85)",
    borderRadius: 2,
    px: isOpen ? 1.5 : 0,
    py: 1.25,
    minWidth: isOpen ? "100%" : "48px",
    border: "1px solid rgba(0,242,255,0.12)",
    bgcolor: "rgba(0,242,255,0.05)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
        bgcolor: "rgba(0,242,255,0.15)",
        borderColor: "rgba(0,242,255,0.5)",
        transform: "translateX(4px)"
    },
    "& .MuiButton-startIcon": {
        margin: isOpen ? "0 8px 0 0" : "0",
    },
    letterSpacing: "1px",
    fontWeight: 700,
});

export default function Sidebar({ role = "process" }) {
    const [open, setOpen] = useState(true);
    const navigate = useNavigate();

    const menuItems = role === "process"
        ? [
            { label: "Ana Sayfa", icon: <DashboardOutlined />, path: "/anasayfa" },
            { label: "Triage Kuyruğu", icon: <InboxOutlined />, path: "/triage" },
            { label: "Kanban", icon: <ViewKanbanOutlined />, path: "/kanban" },
            { label: "Raporlar", icon: <TimelineOutlined />, path: "/raporlar" },
            { label: "Tüm Talepler", icon: <SearchOutlined />, path: "/talepler" },
        ]
        : [
            { label: "Ana Sayfa", icon: <DashboardOutlined />, path: "/anasayfa" },
            { label: "Yeni Talep", icon: <AddCircleOutline />, path: "/talepler/yeni" },
            { label: "Taleplerim", icon: <SearchOutlined />, path: "/talepler" },
        ];

    return (
        <Box
            sx={{
                width: open ? 280 : 88,
                transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                height: "100vh",
                position: "sticky",
                top: 0,
                bgcolor: "rgba(3, 7, 18, 0.92)",
                borderRight: "2px solid rgba(0,242,255,0.2)",
                backdropFilter: "blur(20px)",
                p: 2,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "10px 0 30px rgba(0,0,0,0.5)",
            }}
        >
            {/* Header & Toggle (Tekerlek Animasyonu Burda) */}
            <Box sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: open ? "space-between" : "center",
                mb: 3
            }}>
                {open && (
                    <Box>
                        <Typography sx={{ color: "#00f2ff", fontWeight: 900, letterSpacing: "2px", fontSize: 14 }}>
                            ODAK PORTAL
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>
                            {role === "process" ? "SÜREÇ EKİBİ" : "KULLANICI"}
                        </Typography>
                    </Box>
                )}

                <Tooltip title={open ? "Daralt" : "Genişlet"} placement="right">
                    <IconButton
                        onClick={() => setOpen(!open)}
                        sx={{
                            color: "#00f2ff",
                            bgcolor: "rgba(0,242,255,0.1)",
                            transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            transform: open ? "rotate(0deg)" : "rotate(360deg)",
                            "&:hover": { bgcolor: "rgba(0,242,255,0.2)" }
                        }}
                    >
                        <SettingsOutlined sx={{ fontSize: 28 }} /> {/* Tekerlek simgesi */}
                    </IconButton>
                </Tooltip>
            </Box>

            <Divider sx={{ borderColor: "rgba(0,242,255,0.12)", mb: 2 }} />

            {/* Navigasyon Listesi */}
            <Stack gap={1.5} sx={{ flexGrow: 1 }}>
                {menuItems.map((item) => (
                    <Tooltip key={item.label} title={!open ? item.label : ""} placement="right">
                        <Button
                            onClick={() => navigate(item.path)}
                            startIcon={item.icon}
                            sx={baseBtn(open)}
                        >
                            {open && <span>{item.label}</span>}
                        </Button>
                    </Tooltip>
                ))}
            </Stack>

            <Box sx={{ mt: "auto", pt: 2, textAlign: open ? "left" : "center" }}>
                <Divider sx={{ borderColor: "rgba(0,242,255,0.12)", mb: 2 }} />
                {open ? (
                    <Typography sx={{ color: "rgba(0,242,255,0.4)", fontSize: 10, fontStyle: "italic" }}>
                        v2.4.0 - Heavy Duty System
                    </Typography>
                ) : (
                    <LocalShippingOutlined sx={{ color: "rgba(0,242,255,0.3)" }} />
                )}
            </Box>
        </Box>
    );
}