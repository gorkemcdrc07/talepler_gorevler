import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../components/ToastProvider";
import AppShell from "../components/layout/AppShell";

import Login from "../Login";
import GorevlerPage from "../pages/GorevlerPage";
import GorevDetayPage from "../pages/GorevDetayPage";
import GorevYeniPage from "../pages/GorevYeniPage";
import GorevDuzenlePage from "../pages/GorevDuzenlePage";
import TakvimPage from "../pages/TakvimPage";

import TaleplerPage from "../pages/TaleplerPage";
import TalepDetayPage from "../pages/TalepDetayPage";
import TalepYeniPage from "../pages/TalepYeniPage";

function ProfilPage() {
    return <div style={{ padding: 24 }}>Profil</div>;
}

export default function Router() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route path="/" element={<AppShell />}>
                        <Route index element={<Navigate to="/gorevler" replace />} />

                        <Route path="gorevler" element={<GorevlerPage />} />
                        <Route path="gorevler/yeni" element={<GorevYeniPage />} />
                        <Route path="gorevler/:id" element={<GorevDetayPage />} />
                        <Route
                            path="gorevler/:id/duzenle"
                            element={<GorevDuzenlePage />}
                        />

                        <Route path="talepler" element={<TaleplerPage />} />
                        <Route path="talepler/yeni" element={<TalepYeniPage />} />
                        <Route path="talepler/:id" element={<TalepDetayPage />} />

                        <Route path="takvim" element={<TakvimPage />} />
                        <Route path="profil" element={<ProfilPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/gorevler" replace />} />
                </Routes>
            </ToastProvider>
        </BrowserRouter>
    );
}