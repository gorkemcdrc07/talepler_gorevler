import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";

import AnaSayfa from "./sayfalar/anasayfa";
import Taleplerim from "./sayfalar/Taleplerim";
import AdminTalepler from "./sayfalar/AdminTalepler";
import YeniTalep from "./sayfalar/YeniTalep";

import GorevEkle from "./sayfalar/GorevEkle";
import Gorevlerim from "./sayfalar/Gorevlerim";

// ✅ Dashboard
import Dashboard from "./sayfalar/Dashboard";

import RequireAuth from "./bilesenler/RequireAuth";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route
                    path="/anasayfa"
                    element={
                        <RequireAuth>
                            <AnaSayfa />
                        </RequireAuth>
                    }
                />

                {/* ✅ Dashboard route */}
                <Route
                    path="/dashboard"
                    element={
                        <RequireAuth>
                            <Dashboard />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/taleplerim"
                    element={
                        <RequireAuth>
                            <Taleplerim />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/talep/yeni"
                    element={
                        <RequireAuth>
                            <YeniTalep />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/atamalarim"
                    element={
                        <RequireAuth>
                            <AdminTalepler />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/admin/talepler"
                    element={
                        <RequireAuth roles={["admin", "process"]}>
                            <AdminTalepler />
                        </RequireAuth>
                    }
                />

                {/* ✅ GÖREVLERİM */}
                <Route
                    path="/gorevlerim"
                    element={
                        <RequireAuth>
                            <Gorevlerim />
                        </RequireAuth>
                    }
                />

                {/* ✅ GÖREV EKLE */}
                <Route
                    path="/gorev/ekle"
                    element={
                        <RequireAuth>
                            <GorevEkle />
                        </RequireAuth>
                    }
                />

                {/* İstersen /anasayfa yerine dashboard'a yönlendir */}
                {/* <Route path="/anasayfa" element={<Navigate to="/dashboard" replace />} /> */}

                <Route path="/admin" element={<Navigate to="/admin/talepler" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

