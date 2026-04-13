import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmail, signUpWithProfile } from "../lib/auth";
import { getBirimUnvanlari } from "../lib/queries/kullanicilar";

const initialLoginForm = {
    eposta: "",
    sifre: "",
};

const initialRegisterForm = {
    ad: "",
    soyad: "",
    kullanici_adi: "",
    eposta: "",
    sifre: "",
    birim_unvan_id: "",
};

export default function LoginPage() {
    const navigate = useNavigate();

    const [mode, setMode] = useState("login");
    const [loginForm, setLoginForm] = useState(initialLoginForm);
    const [registerForm, setRegisterForm] = useState(initialRegisterForm);
    const [birimUnvanlari, setBirimUnvanlari] = useState([]);

    const [loading, setLoading] = useState(false);
    const [loadingUnits, setLoadingUnits] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        async function loadUnits() {
            try {
                setLoadingUnits(true);
                const data = await getBirimUnvanlari();
                setBirimUnvanlari(data);
            } catch (err) {
                console.error("Birim/unvan listesi alınamadı:", err);
            } finally {
                setLoadingUnits(false);
            }
        }

        loadUnits();
    }, []);

    async function handleLoginSubmit(event) {
        event.preventDefault();

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            await signInWithEmail(loginForm.eposta, loginForm.sifre);
            navigate("/", { replace: true });
        } catch (err) {
            console.error("Login hatası:", err);
            setError("Giriş başarısız. E-posta veya şifreyi kontrol et.");
        } finally {
            setLoading(false);
        }
    }

    async function handleRegisterSubmit(event) {
        event.preventDefault();

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            await signUpWithProfile({
                eposta: registerForm.eposta,
                sifre: registerForm.sifre,
                ad: registerForm.ad,
                soyad: registerForm.soyad,
                kullanici_adi: registerForm.kullanici_adi,
                birim_unvan_id: registerForm.birim_unvan_id || null,
            });

            setSuccess(
                "Kayıt oluşturuldu. E-posta doğrulaması açıksa önce mailini onaylaman gerekebilir."
            );
            setRegisterForm(initialRegisterForm);
            setMode("login");
        } catch (err) {
            console.error("Kayıt hatası:", err);
            setError("Kayıt oluşturulamadı. Bilgileri kontrol et.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page-shell">
            <div className="login-card">
                <div className="login-header">
                    <p className="eyebrow">Command Center Access</p>
                    <h1 className="module-page-title">
                        {mode === "login" ? "Sisteme Giriş" : "Yeni Kullanıcı Kaydı"}
                    </h1>
                    <p className="module-page-subtitle">
                        {mode === "login"
                            ? "Talep ve görev sistemine erişmek için giriş yap."
                            : "Yeni kullanıcı oluştur ve sisteme erişim tanımla."}
                    </p>
                </div>

                <div className="creator-mode-switch">
                    <button
                        type="button"
                        className={mode === "login" ? "task-tab active" : "task-tab"}
                        onClick={() => {
                            setMode("login");
                            setError("");
                            setSuccess("");
                        }}
                    >
                        Giriş Yap
                    </button>

                    <button
                        type="button"
                        className={mode === "register" ? "task-tab active" : "task-tab"}
                        onClick={() => {
                            setMode("register");
                            setError("");
                            setSuccess("");
                        }}
                    >
                        Kayıt Ol
                    </button>
                </div>

                {error ? <div className="status-box error-box">{error}</div> : null}
                {success ? <div className="status-box success-box">{success}</div> : null}

                {mode === "login" && (
                    <form onSubmit={handleLoginSubmit} className="login-form">
                        <div className="form-field">
                            <label>E-posta</label>
                            <input
                                type="email"
                                value={loginForm.eposta}
                                onChange={(e) =>
                                    setLoginForm((prev) => ({ ...prev, eposta: e.target.value }))
                                }
                                placeholder="ornek@sirket.com"
                            />
                        </div>

                        <div className="form-field">
                            <label>Şifre</label>
                            <input
                                type="password"
                                value={loginForm.sifre}
                                onChange={(e) =>
                                    setLoginForm((prev) => ({ ...prev, sifre: e.target.value }))
                                }
                                placeholder="••••••••"
                            />
                        </div>

                        <button type="submit" className="quick-btn login-submit-btn" disabled={loading}>
                            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                        </button>
                    </form>
                )}

                {mode === "register" && (
                    <form onSubmit={handleRegisterSubmit} className="login-form">
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Ad</label>
                                <input
                                    type="text"
                                    value={registerForm.ad}
                                    onChange={(e) =>
                                        setRegisterForm((prev) => ({ ...prev, ad: e.target.value }))
                                    }
                                    placeholder="Ad"
                                />
                            </div>

                            <div className="form-field">
                                <label>Soyad</label>
                                <input
                                    type="text"
                                    value={registerForm.soyad}
                                    onChange={(e) =>
                                        setRegisterForm((prev) => ({ ...prev, soyad: e.target.value }))
                                    }
                                    placeholder="Soyad"
                                />
                            </div>

                            <div className="form-field">
                                <label>Kullanıcı Adı</label>
                                <input
                                    type="text"
                                    value={registerForm.kullanici_adi}
                                    onChange={(e) =>
                                        setRegisterForm((prev) => ({
                                            ...prev,
                                            kullanici_adi: e.target.value,
                                        }))
                                    }
                                    placeholder="kullanici.adi"
                                />
                            </div>

                            <div className="form-field">
                                <label>E-posta</label>
                                <input
                                    type="email"
                                    value={registerForm.eposta}
                                    onChange={(e) =>
                                        setRegisterForm((prev) => ({ ...prev, eposta: e.target.value }))
                                    }
                                    placeholder="ornek@sirket.com"
                                />
                            </div>

                            <div className="form-field">
                                <label>Şifre</label>
                                <input
                                    type="password"
                                    value={registerForm.sifre}
                                    onChange={(e) =>
                                        setRegisterForm((prev) => ({ ...prev, sifre: e.target.value }))
                                    }
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="form-field">
                                <label>Birim / Ünvan</label>
                                <select
                                    value={registerForm.birim_unvan_id}
                                    onChange={(e) =>
                                        setRegisterForm((prev) => ({
                                            ...prev,
                                            birim_unvan_id: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">
                                        {loadingUnits ? "Yükleniyor..." : "Seçiniz"}
                                    </option>
                                    {birimUnvanlari.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.birim} — {item.unvan}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="quick-btn login-submit-btn" disabled={loading}>
                            {loading ? "Kayıt oluşturuluyor..." : "Kayıt Oluştur"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}