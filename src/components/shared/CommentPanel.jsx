import { useMemo, useState } from "react";

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("tr-TR");
}

function getDisplayName(user) {
    return (
        user?.ad_soyad ||
        `${user?.ad || ""} ${user?.soyad || ""}`.trim() ||
        user?.kullanici_adi ||
        user?.eposta ||
        "Bilinmeyen kullanýcý"
    );
}

export default function CommentPanel({
    title = "Yorumlar",
    comments = [],
    onSubmit,
    submitting = false,
    canComment = true,
    placeholder = "Yorum ekle...",
}) {
    const [text, setText] = useState("");

    const count = useMemo(() => comments.length, [comments]);

    async function handleSubmit(event) {
        event.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        await onSubmit?.(trimmed);
        setText("");
    }

    return (
        <div className="detail-section-card">
            <div className="panel-header">
                <h3>{title}</h3>
                <span className="badge">{count}</span>
            </div>

            <div className="comment-list">
                {comments.length ? (
                    comments.map((item) => (
                        <div key={item.id} className="comment-card">
                            <strong>{getDisplayName(item.kullanicilar)}</strong>
                            <p>{item.yorum || item.icerik || item.metin || "-"}</p>
                            <span>{formatDate(item.created_at || item.olusturma_tarihi)}</span>
                        </div>
                    ))
                ) : (
                    <div className="info-card">
                        <strong>Kayýt yok</strong>
                        <p>Henüz yorum eklenmemiþ.</p>
                    </div>
                )}
            </div>

            {canComment ? (
                <form className="comment-composer" onSubmit={handleSubmit}>
                    <textarea
                        rows="4"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={placeholder}
                    />
                    <div className="form-actions">
                        <button
                            type="submit"
                            className="quick-btn"
                            disabled={submitting || !text.trim()}
                        >
                            {submitting ? "Gönderiliyor..." : "Yorumu Gönder"}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="status-box warning-box">
                    Yorum eklemek için oturum ve yetki gerekiyor.
                </div>
            )}
        </div>
    );
}