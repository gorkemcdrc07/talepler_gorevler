import { Drawer, Paper, Box } from "@mui/material";

const paperSx = {
    width: { xs: "100%", sm: 560, md: 980 },
    bgcolor: "transparent",
    background: "transparent",
    p: 2,
};

const panelSx = {
    height: "100%",
    borderRadius: "22px",
    overflow: "hidden",
    bgcolor: "rgba(10, 15, 28, 0.92)",
    border: "1px solid rgba(0,242,255,0.18)",
    backdropFilter: "blur(22px)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
};

export default function RightPanelDrawer({ open, onClose, children }) {
    return (
        <Drawer
            open={open}
            onClose={onClose}
            anchor="right"
            variant="temporary"
            ModalProps={{
                keepMounted: true,
            }}
            PaperProps={{ sx: paperSx }}
        >
            <Paper elevation={0} sx={panelSx}>
                <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    {children}
                </Box>
            </Paper>
        </Drawer>
    );
}
