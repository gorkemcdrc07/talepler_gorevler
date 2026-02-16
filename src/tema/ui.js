// src/tema/ui.js
export const themeColors = {
    primary: "#00f2ff",
    secondary: "#00d2ff",
    bgDark: "#0a0f1c",
    cardBg: "rgba(17, 25, 40, 0.75)",
    border: "rgba(255, 255, 255, 0.125)",
};

export const glassCard = {
    bgcolor: themeColors.cardBg,
    backgroundImage:
        "linear-gradient(to bottom right, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0))",
    backdropFilter: "blur(20px) saturate(180%)",
    borderRadius: "24px",
    border: `1px solid ${themeColors.border}`,
};

export const popupPaperSx = {
    ...glassCard,
    borderRadius: "22px",
    border: `1px solid rgba(0, 242, 255, 0.18)`,
    boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
    overflow: "hidden",
};

export const iconBtnSx = {
    border: "1px solid rgba(0,242,255,0.18)",
    bgcolor: "rgba(0,242,255,0.06)",
    color: themeColors.primary,
    "&:hover": { bgcolor: "rgba(0,242,255,0.12)" },
};
