import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getActiveAuthUser } from "../../lib/auth";

export default function ProtectedRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(undefined);

    useEffect(() => {
        let mounted = true;

        async function checkUser() {
            try {
                const currentUser = await getActiveAuthUser();
                if (mounted) {
                    setUser(currentUser || null);
                }
            } catch (err) {
                if (mounted) {
                    setUser(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        checkUser();

        return () => {
            mounted = false;
        };
    }, []);

    if (loading) {
        return <div className="auth-screen-message">Oturum kontrol ediliyor...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}