import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveAuthUser } from "../lib/auth";
import { createGorev } from "../lib/queries/gorevler";

export default function GorevOlusturPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        baslik: "",
        aciklama: "",
        durum: "bekliyor",
        oncelik: "normal",
        atanan_id: "",
    });

    const [saving, setSaving] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setSaving(true);

            const user = await getActiveAuthUser();
            if (!user) {
                alert("Oturum bulunamadı");
                return;
            }

            const gorev = await createGorev({
                baslik: form.baslik,
                aciklama: form.aciklama,
                durum: form.durum,
                oncelik: form.oncelik,
                olusturan_id: user.id,
                atanan_id: form.atanan_id || null,
            });

            navigate(`/gorevler/${gorev.id}`);
        } catch (err) {
            console.error("Görev oluşturulamadı:", err);
            alert("Görev oluşturulamadı");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ padding: "24px" }}>
            <h1>Görev Oluştur</h1>

            <form
                onSubmit={handleSubmit}
                style={{
                    display: "grid",
                    gap: "12px",
                    maxWidth: "600px",
                    marginTop: "20px",
                }}
            >
                <input
                    type="text"
                    name="baslik"
                    placeholder="Başlık"
                    value={form.baslik}
                    onChange={handleChange}
                    required
                />

                <textarea
                    name="aciklama"
                    placeholder="Açıklama"
                    rows={5}
                    value={form.aciklama}
                    onChange={handleChange}
                />

                <select
                    name="durum"
                    value={form.durum}
                    onChange={handleChange}
                >
                    <option value="bekliyor">Bekliyor</option>
                    <option value="devam_ediyor">Devam Ediyor</option>
                    <option value="tamamlandi">Tamamlandı</option>
                </select>

                <select
                    name="oncelik"
                    value={form.oncelik}
                    onChange={handleChange}
                >
                    <option value="dusuk">Düşük</option>
                    <option value="normal">Normal</option>
                    <option value="yuksek">Yüksek</option>
                    <option value="kritik">Kritik</option>
                </select>

                <input
                    type="text"
                    name="atanan_id"
                    placeholder="Atanan kullanıcı id"
                    value={form.atanan_id}
                    onChange={handleChange}
                />

                <button type="submit" disabled={saving}>
                    {saving ? "Oluşturuluyor..." : "Görev Oluştur"}
                </button>
            </form>
        </div>
    );
}