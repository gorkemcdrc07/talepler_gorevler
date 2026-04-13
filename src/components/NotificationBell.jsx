import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
    getBildirimler,
    markAsRead,
} from "../lib/queries/bildirimler";
import { getAktifKullanici } from "../lib/queries/kullanicilar";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [bildirimler, setBildirimler] = useState([]);
    const [open, setOpen] = useState(false);

    // 🔹 ilk yükleme
    useEffect(() => {
        async function load() {
            const u = await getAktifKullanici();
            if (!u) return;

            setUser(u);

            const data = await getBildirimler(u.id);
            setBildirimler(data);
        }

        load();
    }, []);

    // 🔥 REALTIME SUBSCRIBE
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel("bildirimler-realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "bildirimler",
                    filter: `kullanici_id=eq.${user.id}`,
                },
                (payload) => {
                    setBildirimler((prev) => [
                        payload.new,
                        ...prev,
                    ]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    async function handleClick(b) {
        if (!b.okundu) {
            await markAsRead(b.id);
        }

        setBildirimler((prev) =>
            prev.map((x) =>
                x.id === b.id ? { ...x, okundu: true } : x
            )
        );

        if (b.link) {
            navigate(b.link);
            setOpen(false);
        }
    }

    async function markAllRead() {
        for (const b of bildirimler) {
            if (!b.okundu) {
                await markAsRead(b.id);
            }
        }

        setBildirimler((prev) =>
            prev.map((b) => ({ ...b, okundu: true }))
        );
    }

    const unreadCount = bildirimler.filter((b) => !b.okundu).length;

    return (
        <div style={{ position: "relative" }}>
            {/* 🔔 BUTTON */}
            <button
                onClick={() => setOpen(!open)}
                style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    cursor: "pointer",
                }}
            >
                🔔 {unreadCount > 0 && `(${unreadCount})`}
            </button>

            {/* PANEL */}
            {open && (
                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        top: "40px",
                        width: "320px",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        zIndex: 100,
                    }}
                >
                    <div
                        style={{
                            padding: "12px",
                            borderBottom: "1px solid #eee",
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <strong>Bildirimler</strong>
                        <button onClick={markAllRead}>
                            Tümünü okundu yap
                        </button>
                    </div>

                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {bildirimler.length === 0 ? (
                            <div style={{ padding: "12px" }}>
                                Bildirim yok
                            </div>
                        ) : (
                            bildirimler.map((b) => (
                                <div
                                    key={b.id}
                                    onClick={() => handleClick(b)}
                                    style={{
                                        padding: "12px",
                                        cursor: "pointer",
                                        background: b.okundu
                                            ? "#fff"
                                            : "#eef2ff",
                                        borderBottom: "1px solid #f3f4f6",
                                    }}
                                >
                                    <div style={{ fontWeight: 600 }}>
                                        {b.baslik}
                                    </div>
                                    <div style={{ fontSize: "13px" }}>
                                        {b.aciklama}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}