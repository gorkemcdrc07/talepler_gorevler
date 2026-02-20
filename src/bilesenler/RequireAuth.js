import { Navigate } from "react-router-dom";

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("oturum") || "null");
    } catch {
        return null;
    }
}

function normRole(v) {
    return String(v || "")
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i");
}

export default function RequireAuth({ children, roles }) {
    const user = getSession();

    if (!user?.id) return <Navigate to="/" replace />;

    if (roles && roles.length > 0) {
        const r = normRole(user.rol);
        if (!roles.includes(r)) return <Navigate to="/anasayfa" replace />;
    }

    return children;
}

