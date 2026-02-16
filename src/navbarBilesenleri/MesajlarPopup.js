// src/bilesenler/Mesajlar.js
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    Divider,
    Avatar,
    IconButton,
    TextField,
    Button,
    CircularProgress,
    Tabs,
    Tab,
    InputAdornment,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import {
    SendRounded,
    RefreshOutlined,
    ChatBubbleOutlineRounded,
    PeopleAltRounded,
    SearchRounded,
} from "@mui/icons-material";
import { supabase } from "../lib/supabase";

const glass = {
    bgcolor: "rgba(10, 15, 28, 0.75)",
    border: "1px solid rgba(0, 242, 255, 0.10)",
    backdropFilter: "blur(20px)",
    borderRadius: 3,
};

function fmtTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function initials(ad = "", soyad = "") {
    const a = (ad || "").trim();
    const s = (soyad || "").trim();
    const i1 = a ? a[0].toUpperCase() : "";
    const i2 = s ? s[0].toUpperCase() : "";
    return (i1 + i2) || "K";
}

// ✅ Auth yok: oturumu localStorage’dan al
function getSessionUser() {
    const raw = localStorage.getItem("oturum_kullanici");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function Mesajlar() {
    const [loading, setLoading] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingBirimler, setLoadingBirimler] = useState(false);
    const [err, setErr] = useState("");

    const [userId, setUserId] = useState(null);

    // Sol panel: 0 Konuşmalar, 1 Kişiler
    const [tab, setTab] = useState(0);

    // Kullanıcılar
    const [users, setUsers] = useState([]);
    const [userQuery, setUserQuery] = useState("");

    // ✅ Birimler {label,value}
    const [birimler, setBirimler] = useState([{ label: "Tümü", value: "Tümü" }]);
    const [selectedBirim, setSelectedBirim] = useState("Tümü");

    // Konuşmalar
    const [convos, setConvos] = useState([]);
    const [activeId, setActiveId] = useState(null);

    // Mesajlar
    const [msgs, setMsgs] = useState([]);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState("");

    const bottomRef = useRef(null);

    const active = useMemo(
        () => convos.find((c) => c.id === activeId) || null,
        [convos, activeId]
    );

    const scrollBottom = () => {
        requestAnimationFrame(() =>
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        );
    };

    // ✅ Kişi filtresi: birim + arama
    const filteredUsers = useMemo(() => {
        const q = userQuery.trim().toLowerCase();

        return users.filter((u) => {
            if (selectedBirim !== "Tümü") {
                const raw = u.birim ?? "";
                if (raw !== selectedBirim) return false;
            }

            if (!q) return true;

            const full =
                (u.ad_soyad || `${u.ad || ""} ${u.soyad || ""}`.trim()) ||
                u.eposta ||
                "Kullanıcı";

            const birim = (u.birim || "").toString().toLowerCase();
            const unvan = (u.unvan || "").toString().toLowerCase();
            const eposta = (u.eposta || "").toString().toLowerCase();

            return (
                full.toLowerCase().includes(q) ||
                birim.includes(q) ||
                unvan.includes(q) ||
                eposta.includes(q)
            );
        });
    }, [users, userQuery, selectedBirim]);

    // ✅ DM sohbet bul/oluştur
    const getOrCreateDm = async (meId, otherId) => {
        const kullanici_a = meId < otherId ? meId : otherId;
        const kullanici_b = meId < otherId ? otherId : meId;

        const { data: pair, error: pairErr } = await supabase
            .from("dm_eslesmeler")
            .select("sohbet_id")
            .eq("kullanici_a", kullanici_a)
            .eq("kullanici_b", kullanici_b)
            .maybeSingle();

        if (pairErr) throw pairErr;
        if (pair?.sohbet_id) return pair.sohbet_id;

        const { data: sohbet, error: sohbetErr } = await supabase
            .from("sohbetler")
            .insert({ tur: "dm" })
            .select("id")
            .single();

        if (sohbetErr) throw sohbetErr;

        const sohbet_id = sohbet.id;

        const { error: uyelikErr } = await supabase.from("sohbet_uyeleri").insert([
            { sohbet_id, kullanici_id: meId },
            { sohbet_id, kullanici_id: otherId },
        ]);
        if (uyelikErr) throw uyelikErr;

        const { error: esErr } = await supabase
            .from("dm_eslesmeler")
            .insert({ kullanici_a, kullanici_b, sohbet_id });
        if (esErr) throw esErr;

        return sohbet_id;
    };

    // ✅ Birimleri yükle (dropdown için)
    const loadBirimler = async () => {
        setLoadingBirimler(true);
        try {
            const { data, error } = await supabase
                .from("kullanicilar")
                .select("birim")
                .eq("aktif", true);

            if (error) throw error;

            const map = new Map(); // label -> raw
            for (const r of data || []) {
                const raw = r?.birim ?? "";
                const label = String(raw).trim();
                if (!label) continue;
                if (!map.has(label)) map.set(label, raw);
            }

            const arr = Array.from(map.entries())
                .sort((a, b) => a[0].localeCompare(b[0], "tr"))
                .map(([label, value]) => ({ label, value }));

            setBirimler([{ label: "Tümü", value: "Tümü" }, ...arr]);
        } catch (e) {
            console.log("loadBirimler error =>", e);
            setBirimler([{ label: "Tümü", value: "Tümü" }]);
        } finally {
            setLoadingBirimler(false);
        }
    };

    // ✅ Kullanıcıları yükle (avatar_url KALDIRILDI)
    const loadUsers = async (meId, birimFilter = "Tümü") => {
        setLoadingUsers(true);
        try {
            let q = supabase
                .from("kullanicilar")
                .select("id, eposta, ad, soyad, ad_soyad, birim, unvan, rol, aktif")
                .eq("aktif", true);

            if (birimFilter !== "Tümü") {
                q = q.eq("birim", birimFilter);
            }

            const { data, error } = await q;
            if (error) throw error;

            const sorted = (data || []).sort(
                (a, b) =>
                    (a.birim || "")
                        .toString()
                        .localeCompare((b.birim || "").toString(), "tr") ||
                    (
                        (a.ad_soyad || `${a.ad || ""} ${a.soyad || ""}`).trim()
                    ).localeCompare(
                        (b.ad_soyad || `${b.ad || ""} ${b.soyad || ""}`).trim(),
                        "tr"
                    )
            );

            setUsers(sorted.filter((u) => u.id !== meId));
        } catch (e) {
            setErr(e?.message || "Kullanıcılar yüklenemedi.");
            console.log("loadUsers error =>", e);
        } finally {
            setLoadingUsers(false);
        }
    };

    // ✅ Bu sohbette bana gelen okunmamışları okundu yap
    const markAsRead = async (sohbetId) => {
        if (!sohbetId || !userId) return;

        const { error } = await supabase
            .from("mesajlar")
            .update({ okundu: true, okunma_tarihi: new Date().toISOString() })
            .eq("sohbet_id", sohbetId)
            .eq("okundu", false)
            .neq("gonderen_id", userId);

        if (error) console.log("markAsRead error =>", error);
    };

    // ✅ Inbox yükle (konuşmalar + unread sayıları)
    const loadInbox = async () => {
        setLoading(true);
        setErr("");

        try {
            const session = getSessionUser();
            if (!session?.id) {
                setUserId(null);
                setConvos([]);
                setActiveId(null);
                setMsgs([]);
                setLoading(false);
                return;
            }

            setUserId(session.id);

            await loadBirimler();
            await loadUsers(session.id, selectedBirim);

            // kullanıcıya ait sohbetler
            const { data: mem, error: memErr } = await supabase
                .from("sohbet_uyeleri")
                .select("sohbet_id")
                .eq("kullanici_id", session.id);

            if (memErr) throw memErr;

            const ids = (mem || []).map((x) => x.sohbet_id);

            if (ids.length === 0) {
                setConvos([]);
                setActiveId(null);
                setMsgs([]);
                setLoading(false);
                return;
            }

            // son mesajlar
            const { data: lastMsgs, error: lastErr } = await supabase
                .from("mesajlar")
                .select("id, sohbet_id, icerik, olusturma_tarihi, gonderen_id")
                .in("sohbet_id", ids)
                .order("olusturma_tarihi", { ascending: false });

            if (lastErr) throw lastErr;

            const lastMap = new Map();
            for (const m of lastMsgs || []) {
                if (!lastMap.has(m.sohbet_id)) lastMap.set(m.sohbet_id, m);
            }

            // ✅ okunmamış sayıları (aktif kullanıcıya göre)
            // Not: bu sorgu "okundu" alanı yoksa hata verir.
            const { data: unreadRows, error: unreadErr } = await supabase
                .from("mesajlar")
                .select("sohbet_id")
                .in("sohbet_id", ids)
                .eq("okundu", false)
                .neq("gonderen_id", session.id);

            if (unreadErr) throw unreadErr;

            const unreadMap = new Map();
            for (const r of unreadRows || []) {
                unreadMap.set(r.sohbet_id, (unreadMap.get(r.sohbet_id) || 0) + 1);
            }

            // sohbet üyeleri: karşı tarafı bul
            const { data: members, error: mem2Err } = await supabase
                .from("sohbet_uyeleri")
                .select("sohbet_id, kullanici_id")
                .in("sohbet_id", ids);

            if (mem2Err) throw mem2Err;

            const otherByChat = new Map();
            for (const row of members || []) {
                if (row.kullanici_id !== session.id)
                    otherByChat.set(row.sohbet_id, row.kullanici_id);
            }

            // karşı tarafların profilini çek (avatar_url KALDIRILDI)
            const otherIds = Array.from(
                new Set(Array.from(otherByChat.values()).filter(Boolean))
            );

            let otherMap = new Map();
            if (otherIds.length > 0) {
                const { data: people, error: peopleErr } = await supabase
                    .from("kullanicilar")
                    .select("id, ad, soyad, birim, unvan, rol")
                    .in("id", otherIds)
                    .eq("aktif", true);

                if (peopleErr) throw peopleErr;
                otherMap = new Map((people || []).map((p) => [p.id, p]));
            }

            const list = ids.map((id) => {
                const lm = lastMap.get(id);
                const otherId = otherByChat.get(id);
                const other = otherId ? otherMap.get(otherId) : null;

                const title = other
                    ? `${other.ad || ""} ${other.soyad || ""}`.trim()
                    : `Sohbet ${id.slice(0, 6)}`;
                const subtitle = other
                    ? `${String(other.birim || "").trim()}${other.unvan ? " • " + other.unvan : ""
                        }`.trim()
                    : "";

                return {
                    id,
                    title: title || `Sohbet ${id.slice(0, 6)}`,
                    subtitle,
                    last_text: lm?.icerik || "",
                    last_at: lm?.olusturma_tarihi || null,
                    avatar_url: "",
                    unread: unreadMap.get(id) || 0, // ✅
                };
            });

            list.sort(
                (a, b) =>
                    (b.last_at ? new Date(b.last_at).getTime() : 0) -
                    (a.last_at ? new Date(a.last_at).getTime() : 0)
            );

            setConvos(list);
            setActiveId((prev) => prev || list?.[0]?.id || null);
        } catch (e) {
            setErr(e?.message || "Mesajlar yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (sohbetId) => {
        if (!sohbetId) return;
        setErr("");
        try {
            const { data, error } = await supabase
                .from("mesajlar")
                .select("id, gonderen_id, icerik, olusturma_tarihi")
                .eq("sohbet_id", sohbetId)
                .order("olusturma_tarihi", { ascending: true })
                .limit(250);

            if (error) throw error;

            setMsgs(data || []);
            scrollBottom();

            // ✅ sohbet açılınca: okunmamışları okundu yap
            await markAsRead(sohbetId);
            await loadInbox(); // sayı güncellensin
        } catch (e) {
            setErr(e?.message || "Mesajlar alınamadı.");
        }
    };

    const send = async () => {
        if (!text.trim() || !activeId || !userId) return;
        setSending(true);
        try {
            const { error } = await supabase.from("mesajlar").insert({
                sohbet_id: activeId,
                gonderen_id: userId,
                icerik: text.trim(),
                // okundu: false // tablo default false ise gerek yok
            });

            if (error) throw error;

            setText("");
            await loadMessages(activeId);
            await loadInbox();
        } catch (e) {
            setErr(e?.message || "Mesaj gönderilemedi.");
        } finally {
            setSending(false);
        }
    };

    const startChatWith = async (other) => {
        if (!userId || !other?.id) return;
        setErr("");
        try {
            const sohbetId = await getOrCreateDm(userId, other.id);
            setActiveId(sohbetId);
            setTab(0);
            await loadInbox();
            await loadMessages(sohbetId);
        } catch (e) {
            setErr(e?.message || "Sohbet başlatılamadı.");
        }
    };

    useEffect(() => {
        loadInbox();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeId) loadMessages(activeId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    useEffect(() => {
        if (tab === 1) {
            loadBirimler();
            if (userId) loadUsers(userId, selectedBirim);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    // Realtime: aktif sohbete yeni mesaj gelirse
    useEffect(() => {
        if (!activeId) return;

        const ch = supabase
            .channel(`chat-live-${activeId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "mesajlar",
                    filter: `sohbet_id=eq.${activeId}`,
                },
                async (payload) => {
                    setMsgs((prev) => {
                        const exists = prev.some((x) => x.id === payload.new.id);
                        if (exists) return prev;
                        return [...prev, payload.new];
                    });
                    scrollBottom();

                    // ✅ aktif sohbet açıksa ve mesaj bana geldiyse okundu say
                    if (payload?.new?.gonderen_id && payload.new.gonderen_id !== userId) {
                        await markAsRead(activeId);
                    }

                    loadInbox();
                }
            )
            .subscribe();

        return () => supabase.removeChannel(ch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId, userId]);

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
                gap: 2.5,
            }}
        >
            {/* SOL PANEL */}
            <Paper elevation={0} sx={{ ...glass, p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 2,
                                border: "1px solid rgba(0,242,255,0.18)",
                                bgcolor: "rgba(0,242,255,0.06)",
                                color: "#00f2ff",
                                display: "grid",
                                placeItems: "center",
                            }}
                        >
                            {tab === 0 ? <ChatBubbleOutlineRounded /> : <PeopleAltRounded />}
                        </Box>
                        <Box>
                            <Typography sx={{ color: "#fff", fontWeight: 900 }}>
                                {tab === 0 ? "Mesajlar" : "Kişiler"}
                            </Typography>
                            <Typography sx={{ color: "rgba(0,242,255,0.6)", fontSize: 12 }}>
                                {tab === 0
                                    ? `Konuşmalar: ${convos.length}`
                                    : `Kullanıcılar: ${filteredUsers.length}`}
                            </Typography>
                        </Box>
                    </Stack>

                    <IconButton
                        onClick={loadInbox}
                        sx={{
                            border: "1px solid rgba(0,242,255,0.18)",
                            bgcolor: "rgba(0,242,255,0.06)",
                            color: "#00f2ff",
                        }}
                    >
                        <RefreshOutlined />
                    </IconButton>
                </Stack>

                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{
                        mt: 1.5,
                        "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 900,
                            color: "rgba(255,255,255,0.55)",
                        },
                        "& .Mui-selected": { color: "#00f2ff" },
                        "& .MuiTabs-indicator": { bgcolor: "#00f2ff" },
                    }}
                >
                    <Tab label="Konuşmalar" />
                    <Tab label="Kişiler" />
                </Tabs>

                <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.06)" }} />

                {/* Konuşmalar */}
                {tab === 0 && (
                    <>
                        {loading ? (
                            <Box sx={{ display: "grid", placeItems: "center", minHeight: 200 }}>
                                <CircularProgress />
                            </Box>
                        ) : convos.length === 0 ? (
                            <Typography sx={{ color: "rgba(255,255,255,0.35)" }}>
                                Konuşma yok.
                            </Typography>
                        ) : (
                            <Stack spacing={1.25}>
                                {convos.map((c) => {
                                    const isActive = c.id === activeId;
                                    return (
                                        <Box
                                            key={c.id}
                                            onClick={() => setActiveId(c.id)}
                                            sx={{
                                                p: 1.25,
                                                borderRadius: 2,
                                                cursor: "pointer",
                                                border: isActive
                                                    ? "1px solid rgba(0,242,255,0.35)"
                                                    : "1px solid rgba(255,255,255,0.06)",
                                                bgcolor: isActive
                                                    ? "rgba(0,242,255,0.06)"
                                                    : "rgba(255,255,255,0.02)",
                                                "&:hover": { bgcolor: "rgba(0,242,255,0.05)" },
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.25} alignItems="center">
                                                <Avatar
                                                    src={c.avatar_url || ""}
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        bgcolor: "rgba(0,242,255,0.18)",
                                                        color: "#00f2ff",
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    {c.title?.[0]?.toUpperCase?.() || "S"}
                                                </Avatar>

                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Stack
                                                        direction="row"
                                                        justifyContent="space-between"
                                                        alignItems="center"
                                                    >
                                                        <Typography
                                                            sx={{
                                                                color: "#fff",
                                                                fontWeight: 900,
                                                                fontSize: 13,
                                                            }}
                                                            noWrap
                                                        >
                                                            {c.title}
                                                        </Typography>

                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            {c.unread > 0 && (
                                                                <Chip
                                                                    size="small"
                                                                    label={c.unread}
                                                                    sx={{
                                                                        height: 18,
                                                                        bgcolor: "rgba(0,242,255,0.16)",
                                                                        color: "#00f2ff",
                                                                        border: "1px solid rgba(0,242,255,0.25)",
                                                                        fontWeight: 900,
                                                                    }}
                                                                />
                                                            )}
                                                            <Typography
                                                                sx={{
                                                                    color: "rgba(255,255,255,0.35)",
                                                                    fontSize: 11,
                                                                }}
                                                            >
                                                                {fmtTime(c.last_at)}
                                                            </Typography>
                                                        </Stack>
                                                    </Stack>

                                                    {c.subtitle ? (
                                                        <Typography
                                                            sx={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}
                                                            noWrap
                                                        >
                                                            {c.subtitle}
                                                        </Typography>
                                                    ) : null}

                                                    <Typography
                                                        sx={{
                                                            color: "rgba(255,255,255,0.55)",
                                                            fontSize: 12,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {c.last_text || "—"}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </>
                )}

                {/* Kişiler */}
                {tab === 1 && (
                    <>
                        <Stack spacing={1.25} sx={{ mb: 1.25 }}>
                            <FormControl
                                size="small"
                                fullWidth
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        bgcolor: "rgba(255,255,255,0.03)",
                                        borderRadius: 2,
                                        color: "#fff",
                                        "& fieldset": { borderColor: "rgba(0,242,255,0.18)" },
                                        "&:hover fieldset": { borderColor: "rgba(0,242,255,0.30)" },
                                        "&.Mui-focused fieldset": { borderColor: "#00f2ff" },
                                    },
                                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.75)" },
                                    "& .MuiInputLabel-root.Mui-focused": { color: "#fff" },
                                    "& .MuiSelect-icon": { color: "rgba(0,242,255,0.85)" },
                                }}
                            >
                                <InputLabel id="birim-sec-label">Birim</InputLabel>

                                <Select
                                    labelId="birim-sec-label"
                                    label="Birim"
                                    value={selectedBirim}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setSelectedBirim(v);
                                        setUserQuery("");
                                        if (userId) loadUsers(userId, v);
                                    }}
                                    renderValue={(val) => {
                                        const found = birimler.find((x) => x.value === val);
                                        return found?.label || "Tümü";
                                    }}
                                    MenuProps={{
                                        PaperProps: {
                                            sx: {
                                                bgcolor: "rgba(10, 15, 28, 0.98)",
                                                border: "1px solid rgba(0,242,255,0.14)",
                                                backdropFilter: "blur(18px)",
                                                borderRadius: 2,
                                                "& .MuiMenuItem-root": { color: "#fff" },
                                                "& .MuiMenuItem-root.Mui-selected": {
                                                    bgcolor: "rgba(0,242,255,0.14)",
                                                },
                                                "& .MuiMenuItem-root.Mui-selected:hover": {
                                                    bgcolor: "rgba(0,242,255,0.18)",
                                                },
                                            },
                                        },
                                    }}
                                >
                                    {loadingBirimler ? (
                                        <MenuItem value="Tümü" disabled sx={{ color: "#fff" }}>
                                            Birimler yükleniyor...
                                        </MenuItem>
                                    ) : null}

                                    {birimler.map((b) => (
                                        <MenuItem key={b.value} value={b.value} sx={{ color: "#fff" }}>
                                            {b.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                value={userQuery}
                                onChange={(e) => setUserQuery(e.target.value)}
                                placeholder="Kişi ara (ad/soyad/unvan/eposta)..."
                                fullWidth
                                size="small"
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        bgcolor: "rgba(255,255,255,0.03)",
                                        borderRadius: 2,
                                        color: "#fff",
                                        "& fieldset": { borderColor: "rgba(0,242,255,0.18)" },
                                        "&:hover fieldset": { borderColor: "rgba(0,242,255,0.30)" },
                                        "&.Mui-focused fieldset": { borderColor: "#00f2ff" },
                                    },
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchRounded sx={{ color: "rgba(0,242,255,0.75)" }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Stack>

                        {loadingUsers ? (
                            <Box sx={{ display: "grid", placeItems: "center", minHeight: 160 }}>
                                <CircularProgress />
                            </Box>
                        ) : filteredUsers.length === 0 ? (
                            <Typography sx={{ color: "rgba(255,255,255,0.35)" }}>
                                {selectedBirim === "Tümü"
                                    ? "Kullanıcı bulunamadı."
                                    : `"${birimler.find((x) => x.value === selectedBirim)?.label || selectedBirim
                                    }" biriminde kullanıcı yok.`}
                            </Typography>
                        ) : (
                            <Stack spacing={1.1}>
                                {filteredUsers.map((u) => {
                                    const full =
                                        (u.ad_soyad || `${u.ad || ""} ${u.soyad || ""}`.trim()) ||
                                        u.eposta ||
                                        "Kullanıcı";
                                    return (
                                        <Box
                                            key={u.id}
                                            onClick={() => startChatWith(u)}
                                            sx={{
                                                p: 1.1,
                                                borderRadius: 2,
                                                cursor: "pointer",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                                bgcolor: "rgba(255,255,255,0.02)",
                                                "&:hover": {
                                                    bgcolor: "rgba(0,242,255,0.05)",
                                                    borderColor: "rgba(0,242,255,0.22)",
                                                },
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.25} alignItems="center">
                                                <Avatar
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        bgcolor: "rgba(0,242,255,0.18)",
                                                        color: "#00f2ff",
                                                        fontWeight: 900,
                                                    }}
                                                >
                                                    {initials(u.ad, u.soyad)}
                                                </Avatar>

                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography
                                                        sx={{ color: "#fff", fontWeight: 900, fontSize: 13 }}
                                                        noWrap
                                                    >
                                                        {full}
                                                    </Typography>
                                                    <Typography
                                                        sx={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}
                                                        noWrap
                                                    >
                                                        {`${String(u.birim || "").trim()}${u.unvan ? ` • ${u.unvan}` : ""
                                                            }`}
                                                    </Typography>
                                                </Box>

                                                {u.rol ? (
                                                    <Chip
                                                        size="small"
                                                        label={u.rol === "process" ? "Süreç" : "Kullanıcı"}
                                                        sx={{
                                                            bgcolor: "rgba(0,242,255,0.10)",
                                                            color: "#00f2ff",
                                                            border: "1px solid rgba(0,242,255,0.20)",
                                                            fontWeight: 900,
                                                        }}
                                                    />
                                                ) : null}
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </>
                )}
            </Paper>

            {/* SAĞ: CHAT */}
            <Paper
                elevation={0}
                sx={{ ...glass, p: 2, display: "flex", flexDirection: "column", minHeight: 520 }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography sx={{ color: "#fff", fontWeight: 900 }}>
                            {active?.title || "Sohbet"}
                        </Typography>
                        <Typography sx={{ color: "rgba(0,242,255,0.55)", fontSize: 12 }}>
                            {activeId ? `Sohbet ID: ${activeId}` : "Soldan bir konuşma seç veya Kişiler'den başlat."}
                        </Typography>
                    </Box>
                </Stack>

                <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.06)" }} />

                <Box sx={{ flex: 1, overflow: "auto", pr: 0.5 }}>
                    {err && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.25,
                                mb: 1.5,
                                borderRadius: 2,
                                bgcolor: "rgba(255,77,77,0.08)",
                                border: "1px solid rgba(255,77,77,0.18)",
                            }}
                        >
                            <Typography sx={{ color: "#ff4d4d", fontWeight: 800, fontSize: 12 }}>
                                {err}
                            </Typography>
                        </Paper>
                    )}

                    {activeId ? (
                        <Stack spacing={1.25}>
                            {msgs.map((m) => {
                                const mine = m.gonderen_id === userId;
                                return (
                                    <Box
                                        key={m.id}
                                        sx={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}
                                    >
                                        <Box
                                            sx={{
                                                maxWidth: "78%",
                                                p: 1.25,
                                                borderRadius: 2,
                                                bgcolor: mine ? "rgba(0,242,255,0.10)" : "rgba(255,255,255,0.05)",
                                                border: mine
                                                    ? "1px solid rgba(0,242,255,0.22)"
                                                    : "1px solid rgba(255,255,255,0.06)",
                                            }}
                                        >
                                            <Typography
                                                sx={{ color: "#fff", fontSize: 13, fontWeight: 650, whiteSpace: "pre-wrap" }}
                                            >
                                                {m.icerik}
                                            </Typography>
                                            <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: 11, mt: 0.5 }}>
                                                {fmtDateTime(m.olusturma_tarihi)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            })}
                            <div ref={bottomRef} />
                        </Stack>
                    ) : (
                        <Typography sx={{ color: "rgba(255,255,255,0.35)" }}>
                            Soldan bir konuşma seç veya “Kişiler” sekmesinden sohbet başlat.
                        </Typography>
                    )}
                </Box>

                <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.06)" }} />

                <Stack direction="row" spacing={1}>
                    <TextField
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Mesaj yaz..."
                        fullWidth
                        size="small"
                        disabled={!activeId}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                bgcolor: "rgba(255,255,255,0.03)",
                                borderRadius: 2,
                                color: "#fff",
                                "& fieldset": { borderColor: "rgba(0,242,255,0.18)" },
                                "&:hover fieldset": { borderColor: "rgba(0,242,255,0.30)" },
                                "&.Mui-focused fieldset": { borderColor: "#00f2ff" },
                            },
                        }}
                    />

                    <Button
                        disabled={sending || !text.trim() || !activeId}
                        onClick={send}
                        variant="outlined"
                        startIcon={<SendRounded />}
                        sx={{
                            borderColor: "rgba(0,242,255,0.25)",
                            color: "#00f2ff",
                            fontWeight: 900,
                            textTransform: "none",
                            borderRadius: 2,
                            "&:hover": { bgcolor: "rgba(0,242,255,0.08)" },
                        }}
                    >
                        {sending ? "Gönderiliyor..." : "Gönder"}
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
}
