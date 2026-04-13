import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, LogOut, Sun, Moon, Menu } from "lucide-react";

import "../../styles/tokens.css";
import "../../styles/effects.css";
import "../../styles/pages.css";
import "../../styles/bildirim.css";
import "../../styles/app-shell.css";

import {
    getActiveAuthUser,
    signOutUser,
    subscribeToAuthChanges,
} from "../../lib/auth";

import { supabase } from "../../lib/supabase";
import { runRutinGorevler } from "../../lib/utils/rutinGorev";

import {
    getBildirimler,
    markAsRead,
    markAllAsRead,
    getBildirimLink,
} from "../../lib/queries/bildirimler";

import { useToast } from "../ToastProvider";

const ALLOWED_PATHS = ["/gorevler", "/talepler", "/takvim", "/profil"];

const FULL_ACCESS_USERS = [
    "zelal.karakulak@odaklojistik.com.tr",
    "nihat.hasserbetci@odaklojistik.com.tr",
    "gorkem.cadirci@odaklojistik.com.tr",
];

const TALEP_PANO_USERS = [
    "gorkem.cadirci@odaklojistik.com.tr",
];

function readStoredOturum() {
    try {
        const local = localStorage.getItem("oturum");
        const session = sessionStorage.getItem("oturum");
        return JSON.parse(local || session || "null");
    } catch {
        return null;
    }
}

function buildUserPermissions(email) {
    const normalizedEmail = String(email || "").toLowerCase().trim();

    const hasFullAccess = FULL_ACCESS_USERS.includes(normalizedEmail);
    const hasTalepPanoAccess = TALEP_PANO_USERS.includes(normalizedEmail);

    return {
        allowed_pages: hasFullAccess
            ? ["gorevler", "talepler", "takvim", "profil"]
            : ["talepler", "profil"],
        permissions: {
            canSeeGorevler: hasFullAccess,
            canSeeTakvim: hasFullAccess,
            canSeeTaleplerPage: true,
            canSeeTaleplerPanosu: hasTalepPanoAccess,
            canCreateTalep: true,
            canSeeAllTalepler: hasTalepPanoAccess,
            canSeeOnlyOwnTalepler: !hasTalepPanoAccess,
        },
    };
}

function getAllowedPages(user) {
    return Array.isArray(user?.allowed_pages) ? user.allowed_pages : [];
}

function getFirstAllowedPath(user) {
    const allowedPages = getAllowedPages(user);

    if (allowedPages.includes("gorevler")) return "/gorevler";
    if (allowedPages.includes("talepler")) return "/talepler";
    if (allowedPages.includes("takvim")) return "/takvim";
    if (allowedPages.includes("profil")) return "/profil";

    return "/login";
}

function canAccessPath(user, pathname) {
    const allowedPages = getAllowedPages(user);

    if (pathname.startsWith("/gorevler")) return allowedPages.includes("gorevler");
    if (pathname.startsWith("/talepler")) return allowedPages.includes("talepler");
    if (pathname.startsWith("/takvim")) return allowedPages.includes("takvim");
    if (pathname.startsWith("/profil")) return allowedPages.includes("profil");

    return pathname === "/" || pathname === "/login";
}

export default function AppShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    const panelRef = useRef(null);
    const buttonRef = useRef(null);

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("app-theme") || "dark";
    });

    const [authUser, setAuthUser] = useState(null);
    const [storedOturum, setStoredOturum] = useState(() => readStoredOturum());
    const [loggingOut, setLoggingOut] = useState(false);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);

    const [bildirimler, setBildirimler] = useState([]);
    const [showPanel, setShowPanel] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const displayUser = storedOturum || authUser || null;

    const canSeeGorevler =
        displayUser?.permissions?.canSeeGorevler ||
        displayUser?.allowed_pages?.includes("gorevler");

    const canSeeTakvim =
        displayUser?.permissions?.canSeeTakvim ||
        displayUser?.allowed_pages?.includes("takvim");

    const canSeeTalepler =
        displayUser?.permissions?.canSeeTaleplerPage ||
        displayUser?.allowed_pages?.includes("talepler");

    const canSeeProfil = displayUser?.allowed_pages?.includes("profil");

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("app-theme", theme);
    }, [theme]);

    useEffect(() => {
        async function loadUser() {
            try {
                const user = await getActiveAuthUser();
                setAuthUser(user || null);
            } catch (err) {
                console.error("Auth kullanıcı okunamadı:", err);
                setAuthUser(null);
            }
        }

        loadUser();
        setStoredOturum(readStoredOturum());

        const unsubscribe = subscribeToAuthChanges((user) => {
            setAuthUser(user || null);
            setStoredOturum(readStoredOturum());
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        runRutinGorevler();
    }, []);

    useEffect(() => {
        async function checkUserAccess() {
            try {
                setIsCheckingAccess(true);

                const oturum = readStoredOturum();
                setStoredOturum(oturum);

                const currentAuthUser = await getActiveAuthUser();

                if (!oturum && !currentAuthUser) {
                    navigate("/login", { replace: true });
                    return;
                }

                const userEmail = String(
                    currentAuthUser?.email ||
                    oturum?.eposta ||
                    oturum?.email ||
                    ""
                )
                    .toLowerCase()
                    .trim();

                if (!userEmail) {
                    navigate("/login", { replace: true });
                    return;
                }

                const { data, error } = await supabase
                    .from("kullanicilar")
                    .select("*")
                    .eq("eposta", userEmail)
                    .single();

                if (error || !data) {
                    console.error("Kullanıcı tablosunda kayıt bulunamadı:", error);
                    navigate("/login", { replace: true });
                    return;
                }

                if (data.aktif === false) {
                    navigate("/login", { replace: true });
                    return;
                }

                const derivedAccess = buildUserPermissions(userEmail);

                const mergedUser = {
                    ...(currentAuthUser || {}),
                    ...(oturum || {}),
                    ...data,
                    ...derivedAccess,
                };

                if (oturum) {
                    if (localStorage.getItem("oturum")) {
                        localStorage.setItem("oturum", JSON.stringify(mergedUser));
                    } else if (sessionStorage.getItem("oturum")) {
                        sessionStorage.setItem("oturum", JSON.stringify(mergedUser));
                    }
                }

                setStoredOturum(mergedUser);

                const currentPathAllowed = canAccessPath(mergedUser, location.pathname);
                const isKnownPath =
                    ALLOWED_PATHS.some((path) => location.pathname.startsWith(path)) ||
                    location.pathname === "/" ||
                    location.pathname === "/login";

                if (!isKnownPath && location.pathname !== "/login") {
                    navigate(getFirstAllowedPath(mergedUser), { replace: true });
                    return;
                }

                if (!currentPathAllowed && location.pathname !== "/login") {
                    navigate(getFirstAllowedPath(mergedUser), { replace: true });
                    return;
                }
            } catch (err) {
                console.error("Kullanıcı erişim kontrolü hatası:", err);
                navigate("/login", { replace: true });
            } finally {
                setIsCheckingAccess(false);
            }
        }

        checkUserAccess();
    }, [location.pathname, navigate]);

    useEffect(() => {
        if (!displayUser?.id) return;

        async function load() {
            try {
                const data = await getBildirimler(displayUser.id);
                setBildirimler(data || []);
            } catch (err) {
                console.error("Bildirimler alınamadı:", err);
            }
        }

        load();
    }, [displayUser?.id]);

    useEffect(() => {
        if (!displayUser?.id) return;

        const channel = supabase
            .channel(`bildirimler-${displayUser.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "bildirimler",
                    filter: `kullanici_id=eq.${displayUser.id}`,
                },
                (payload) => {
                    const b = payload.new;

                    setBildirimler((prev) => {
                        const exists = prev.some((x) => x.id === b.id);
                        if (exists) return prev;
                        return [b, ...prev];
                    });

                    const link = b.link || getBildirimLink(b);

                    showToast(
                        b.aciklama
                            ? `${b.baslik || "Yeni bildirim"} — ${b.aciklama}`
                            : b.baslik || "Yeni bildirim",
                        "info",
                        link
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [displayUser?.id, showToast]);

    useEffect(() => {
        function handleResize() {
            if (window.innerWidth > 900) {
                setMobileNavOpen(false);
            }
        }

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (!showPanel) return;

            const clickedInsidePanel = panelRef.current?.contains(event.target);
            const clickedButton = buttonRef.current?.contains(event.target);

            if (!clickedInsidePanel && !clickedButton) {
                setShowPanel(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showPanel]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    async function handleLogout() {
        try {
            setLoggingOut(true);
            localStorage.removeItem("oturum");
            sessionStorage.removeItem("oturum");
            setStoredOturum(null);
            setAuthUser(null);
            await signOutUser();
            navigate("/login", { replace: true });
        } catch (err) {
            console.error("Çıkış yapılamadı:", err);
        } finally {
            setLoggingOut(false);
        }
    }

    async function handleBildirimClick(b) {
        try {
            if (!b.okundu) {
                await markAsRead(b.id);

                setBildirimler((prev) =>
                    prev.map((item) =>
                        item.id === b.id ? { ...item, okundu: true } : item
                    )
                );
            }
        } catch (err) {
            console.error("Bildirim okunamadı:", err);
        }

        const link = b.link || getBildirimLink(b);

        if (link) {
            const hasAccess = canAccessPath(displayUser, link);
            navigate(hasAccess ? link : getFirstAllowedPath(displayUser));
        }

        setShowPanel(false);
    }

    async function handleMarkAllAsRead() {
        if (!displayUser?.id) return;

        try {
            await markAllAsRead(displayUser.id);
            setBildirimler((prev) => prev.map((b) => ({ ...b, okundu: true })));
        } catch (err) {
            console.error("Tümünü okundu yap hatası:", err);
        }
    }

    const okunmamisSayi = useMemo(
        () => bildirimler.filter((b) => !b.okundu).length,
        [bildirimler]
    );

    const displayUserText =
        displayUser?.ad_soyad ||
        displayUser?.ad ||
        displayUser?.isim ||
        displayUser?.yetkili_adi ||
        displayUser?.eposta ||
        displayUser?.email ||
        "Bilinmiyor";

    if (isCheckingAccess) {
        return null;
    }

    return (
        <div className="app-shell">
            <header className="app-topbar">
                <div className="app-topbar__left">
                    <button
                        type="button"
                        className="app-mobile-toggle modern-icon-btn"
                        onClick={() => setMobileNavOpen((prev) => !prev)}
                        aria-label="Menüyü aç"
                        title="Menü"
                    >
                        <Menu size={18} strokeWidth={2.3} />
                    </button>

                    <div className="app-brand">
                        <span className="app-brand__dot" />
                        <div className="app-brand__text">
                            <p className="app-brand__eyebrow">Yönetim Paneli</p>
                            <h2 className="app-brand__title">Çözüm Talep</h2>
                        </div>
                    </div>

                    <nav className={`app-nav app-nav--top ${mobileNavOpen ? "is-open" : ""}`}>
                        {canSeeGorevler && (
                            <NavLink
                                to="/gorevler"
                                className={({ isActive }) =>
                                    isActive ? "app-nav__link active" : "app-nav__link"
                                }
                                onClick={() => setMobileNavOpen(false)}
                            >
                                Görevler
                            </NavLink>
                        )}

                        {canSeeTalepler && (
                            <NavLink
                                to="/talepler"
                                className={({ isActive }) =>
                                    isActive ? "app-nav__link active" : "app-nav__link"
                                }
                                onClick={() => setMobileNavOpen(false)}
                            >
                                Talepler
                            </NavLink>
                        )}

                        {canSeeTakvim && (
                            <NavLink
                                to="/takvim"
                                className={({ isActive }) =>
                                    isActive ? "app-nav__link active" : "app-nav__link"
                                }
                                onClick={() => setMobileNavOpen(false)}
                            >
                                Takvim
                            </NavLink>
                        )}

                        {canSeeProfil && (
                            <NavLink
                                to="/profil"
                                className={({ isActive }) =>
                                    isActive ? "app-nav__link active" : "app-nav__link"
                                }
                                onClick={() => setMobileNavOpen(false)}
                            >
                                Profil
                            </NavLink>
                        )}
                    </nav>
                </div>

                <div className="app-topbar__right">
                    <button
                        type="button"
                        className="app-theme-toggle modern"
                        onClick={toggleTheme}
                        aria-label="Tema değiştir"
                        title="Tema değiştir"
                    >
                        <span className="toggle-track">
                            <span className={`toggle-thumb ${theme}`}>
                                {theme === "dark" ? (
                                    <Moon size={14} strokeWidth={2.3} />
                                ) : (
                                    <Sun size={14} strokeWidth={2.3} />
                                )}
                            </span>
                        </span>
                    </button>

                    <div className="app-notification-wrap">
                        <button
                            ref={buttonRef}
                            type="button"
                            className="app-notification-btn modern-icon-btn"
                            onClick={() => setShowPanel((prev) => !prev)}
                            aria-label="Bildirimler"
                            title="Bildirimler"
                        >
                            <Bell size={18} strokeWidth={2.2} />
                            {okunmamisSayi > 0 ? (
                                <span className="app-notification-badge">
                                    {okunmamisSayi}
                                </span>
                            ) : null}
                        </button>

                        {showPanel ? (
                            <div ref={panelRef} className="app-notification-panel">
                                <div className="app-notification-panel__header">
                                    <strong>Bildirimler</strong>

                                    {bildirimler.length > 0 ? (
                                        <button
                                            type="button"
                                            className="app-link-btn"
                                            onClick={handleMarkAllAsRead}
                                        >
                                            Tümünü okundu yap
                                        </button>
                                    ) : null}
                                </div>

                                <div className="app-notification-panel__body">
                                    {bildirimler.length === 0 ? (
                                        <div className="app-empty-state">
                                            Bildirim bulunmuyor.
                                        </div>
                                    ) : (
                                        bildirimler.map((b) => (
                                            <button
                                                key={b.id}
                                                type="button"
                                                className={`app-notification-item ${b.okundu ? "is-read" : "is-unread"}`}
                                                onClick={() => handleBildirimClick(b)}
                                            >
                                                <strong>{b.baslik || "Bildirim"}</strong>
                                                {b.aciklama ? <p>{b.aciklama}</p> : null}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="app-user-chip modern-user-chip">
                        <span className="app-user-chip__name">{displayUserText}</span>

                        <button
                            type="button"
                            className="app-logout-modern"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            aria-label="Çıkış yap"
                            title="Çıkış yap"
                        >
                            <LogOut size={16} strokeWidth={2.2} />
                            <span>{loggingOut ? "Çıkış..." : "Çıkış"}</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="app-body">
                <main className="app-content app-content--full">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}