import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
    format,
    parse,
    startOfWeek,
    getDay,
    isWithinInterval,
    startOfDay,
    endOfDay,
} from "date-fns";
import { tr } from "date-fns/locale";

import { getGorevler } from "../lib/queries/gorevler";
import { getTaskCustomStatus } from "../lib/utils/taskStatus";
import "../styles/takvim.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { tr };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date) => startOfWeek(date, { locale: tr }),
    getDay,
    locales,
});

const messages = {
    allDay: "Tüm Gün",
    previous: "Geri",
    next: "İleri",
    today: "Bugün",
    month: "Ay",
    week: "Hafta",
    day: "Gün",
    agenda: "Ajanda",
    date: "Tarih",
    time: "Saat",
    event: "Görev",
    noEventsInRange: "Bu aralıkta görev yok",
};

function getDurumLabel(durum) {
    const map = {
        acik: "Açık",
        beklemede: "Beklemede",
        tamamlandi: "Tamamlandı",
        iptal: "İptal",
        gecikti: "Gecikti",
    };
    return map[durum] || durum || "-";
}

function getOncelikLabel(oncelik) {
    const map = {
        rutin: "Rutin",
        dusuk: "Düşük",
        orta: "Orta",
        yuksek: "Yüksek",
        kritik: "Kritik",
    };
    return map[oncelik] || oncelik || "-";
}

function isTaskLate(gorev) {
    if (!gorev?.bitis_tarih) return false;
    if (gorev?.durum === "tamamlandi" || gorev?.durum === "iptal") return false;
    return new Date(gorev.bitis_tarih) < new Date();
}

function getVisibleStatus(event) {
    return event?.durum_gosterim || event?.durum || "";
}

function getEventClassName(event) {
    if (event.isLate) return "tkv-event tkv-event--late";
    if (event.durum === "tamamlandi") return "tkv-event tkv-event--done";
    if (event.durum === "beklemede") return "tkv-event tkv-event--waiting";
    if (event.durum === "iptal") return "tkv-event tkv-event--cancel";
    if (event.oncelik === "kritik") return "tkv-event tkv-event--critical";
    if (event.oncelik === "yuksek") return "tkv-event tkv-event--high";
    return "tkv-event tkv-event--open";
}

function getBadgeClass(event) {
    if (event.isLate) return "tkv-badge tkv-badge--late";
    if (event.durum === "tamamlandi") return "tkv-badge tkv-badge--done";
    if (event.durum === "beklemede") return "tkv-badge tkv-badge--waiting";
    if (event.durum === "iptal") return "tkv-badge tkv-badge--cancel";
    if (event.oncelik === "kritik") return "tkv-badge tkv-badge--critical";
    if (event.oncelik === "yuksek") return "tkv-badge tkv-badge--high";
    return "tkv-badge tkv-badge--open";
}

function EventCard({ event }) {
    return (
        <div className="tkv-event__inner">
            <div className="tkv-event__title">{event.title}</div>
            <div className="tkv-event__meta">
                <span>{getDurumLabel(getVisibleStatus(event))}</span>
                <span>•</span>
                <span>{getOncelikLabel(event.oncelik)}</span>
            </div>
        </div>
    );
}

function TaskModal({ task, onClose, onNavigate }) {
    if (!task) return null;

    const progress = task.ilerleme ?? 0;

    function getProgressColor() {
        if (task.isLate) return "#dc2626";
        if (task.durum === "tamamlandi") return "#16a34a";
        if (task.oncelik === "kritik") return "#7c3aed";
        if (task.oncelik === "yuksek") return "#ea580c";
        return "#2563eb";
    }

    return (
        <div
            className="tkv-modal-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="tkv-modal" role="dialog" aria-modal="true">
                <div className="tkv-modal__header">
                    <div className="tkv-modal__title-row">
                        <h2 className="tkv-modal__title">{task.title}</h2>
                        <button
                            type="button"
                            className="tkv-modal__close"
                            onClick={onClose}
                            aria-label="Kapat"
                        >
                            ×
                        </button>
                    </div>
                    <div className="tkv-modal__badges">
                        <span className={getBadgeClass(task)}>
                            {task.isLate
                                ? "Gecikmiş"
                                : getDurumLabel(getVisibleStatus(task))}
                        </span>
                        <span className="tkv-badge tkv-badge--soft">
                            {getOncelikLabel(task.oncelik)}
                        </span>
                        {task.birim && (
                            <span className="tkv-badge tkv-badge--soft">{task.birim}</span>
                        )}
                    </div>
                </div>

                <div className="tkv-modal__body">
                    <div className="tkv-modal__info-grid">
                        {task.atanan && (
                            <div className="tkv-info-row">
                                <span className="tkv-info-row__label">Atanan kişi</span>
                                <span className="tkv-info-row__value">{task.atanan}</span>
                            </div>
                        )}
                        <div className="tkv-info-row">
                            <span className="tkv-info-row__label">Başlangıç tarihi</span>
                            <span className="tkv-info-row__value">
                                {task.start
                                    ? format(task.start, "d MMMM yyyy", { locale: tr })
                                    : "-"}
                            </span>
                        </div>
                        <div className="tkv-info-row">
                            <span className="tkv-info-row__label">Bitiş tarihi</span>
                            <span className="tkv-info-row__value">
                                {task.end
                                    ? format(task.end, "d MMMM yyyy", { locale: tr })
                                    : "-"}
                            </span>
                        </div>
                        {task.birim && (
                            <div className="tkv-info-row">
                                <span className="tkv-info-row__label">Birim</span>
                                <span className="tkv-info-row__value">{task.birim}</span>
                            </div>
                        )}
                    </div>

                    {task.aciklama && (
                        <div className="tkv-modal__desc">
                            <p className="tkv-modal__desc-label">Açıklama</p>
                            <p className="tkv-modal__desc-text">{task.aciklama}</p>
                        </div>
                    )}

                    <div className="tkv-modal__progress">
                        <div className="tkv-progress__header">
                            <span>İlerleme durumu</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="tkv-progress__bar">
                            <div
                                className="tkv-progress__fill"
                                style={{
                                    width: `${progress}%`,
                                    background: getProgressColor(),
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="tkv-modal__actions">
                    <button
                        type="button"
                        className="tkv-modal-btn"
                        onClick={onClose}
                    >
                        Kapat
                    </button>
                    <button
                        type="button"
                        className="tkv-modal-btn tkv-modal-btn--primary"
                        onClick={() => {
                            onClose();
                            onNavigate(task.id);
                        }}
                    >
                        Görev Detayına Git →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function TakvimPage() {
    const navigate = useNavigate();

    const [rawEvents, setRawEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState("month");

    const [searchText, setSearchText] = useState("");
    const [durumFilter, setDurumFilter] = useState("tum");
    const [oncelikFilter, setOncelikFilter] = useState("tum");
    const [onlyLate, setOnlyLate] = useState(false);

    const [activeView, setActiveView] = useState("calendar"); // "calendar" | "list"
    const [modalTask, setModalTask] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const gorevler = await getGorevler();

                const mapped = (gorevler || [])
                    .filter((g) => g.baslangic_tarih || g.bitis_tarih)
                    .map((g) => {
                        const startValue = g.baslangic_tarih || g.bitis_tarih;
                        const endValue = g.bitis_tarih || g.baslangic_tarih;
                        const customStatus = getTaskCustomStatus(g.id);
                        const gorunenDurum = customStatus || g.durum;

                        return {
                            id: g.id,
                            title: g.baslik || "Başlıksız Görev",
                            start: startOfDay(new Date(startValue)),
                            end: endOfDay(new Date(endValue)),
                            allDay: true,
                            durum: g.durum,
                            durum_gosterim: gorunenDurum,
                            oncelik: g.oncelik,
                            birim: g.birim,
                            aciklama: g.aciklama,
                            atanan: g.atanan,
                            ilerleme: g.ilerleme,
                            isLate: isTaskLate(g),
                        };
                    });

                setRawEvents(mapped);
            } catch (error) {
                console.error("Takvim görevleri yüklenemedi:", error);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    useEffect(() => {
        function syncStatusState() {
            setRawEvents((prev) =>
                prev.map((event) => {
                    const customStatus = getTaskCustomStatus(event.id);
                    return {
                        ...event,
                        durum_gosterim: customStatus || event.durum,
                    };
                })
            );
        }

        window.addEventListener("storage", syncStatusState);
        window.addEventListener("task-status-storage-updated", syncStatusState);

        return () => {
            window.removeEventListener("storage", syncStatusState);
            window.removeEventListener("task-status-storage-updated", syncStatusState);
        };
    }, []);

    // Close modal on Escape
    useEffect(() => {
        function onKey(e) {
            if (e.key === "Escape") setModalTask(null);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const filteredEvents = useMemo(() => {
        const query = searchText.trim().toLowerCase();

        return rawEvents.filter((event) => {
            const visibleStatus = getVisibleStatus(event);

            const matchesSearch =
                !query ||
                event.title?.toLowerCase().includes(query) ||
                event.aciklama?.toLowerCase().includes(query) ||
                event.birim?.toLowerCase().includes(query) ||
                getDurumLabel(visibleStatus).toLowerCase().includes(query);

            const matchesDurum =
                durumFilter === "tum" ||
                event.durum === durumFilter ||
                visibleStatus === durumFilter;

            const matchesOncelik =
                oncelikFilter === "tum" || event.oncelik === oncelikFilter;

            const matchesLate = !onlyLate || event.isLate;

            return matchesSearch && matchesDurum && matchesOncelik && matchesLate;
        });
    }, [rawEvents, searchText, durumFilter, oncelikFilter, onlyLate]);

    const selectedDayTasks = useMemo(() => {
        const day = startOfDay(selectedDate);
        return filteredEvents.filter((event) =>
            isWithinInterval(day, {
                start: startOfDay(event.start),
                end: endOfDay(event.end),
            })
        );
    }, [filteredEvents, selectedDate]);

    const stats = useMemo(
        () => ({
            total: rawEvents.length,
            open: rawEvents.filter((e) => e.durum === "acik").length,
            waiting: rawEvents.filter((e) => e.durum === "beklemede").length,
            done: rawEvents.filter((e) => e.durum === "tamamlandi").length,
            late: rawEvents.filter((e) => e.isLate).length,
        }),
        [rawEvents]
    );

    const resetFilters = useCallback(() => {
        setSearchText("");
        setDurumFilter("tum");
        setOncelikFilter("tum");
        setOnlyLate(false);
    }, []);

    const handleEventClick = useCallback((event) => {
        setModalTask(event);
    }, []);

    return (
        <div className="takvim-page">
            {modalTask && (
                <TaskModal
                    task={modalTask}
                    onClose={() => setModalTask(null)}
                    onNavigate={(id) => navigate(`/gorevler/${id}`)}
                />
            )}

            <section className="takvim-hero">
                <div className="takvim-hero__content">
                    <p className="takvim-hero__eyebrow">Planlama & Takip</p>
                    <h1 className="takvim-hero__title">Görev Takvimi</h1>
                    <p className="takvim-hero__desc">
                        Görevleri modern takvim görünümünde inceleyin, detay panelini açın.
                    </p>
                </div>
                <div className="takvim-stats">
                    <div className="takvim-stat takvim-stat--open">
                        <div className="takvim-stat__value">{stats.open}</div>
                        <div className="takvim-stat__label">Açık</div>
                    </div>
                    <div className="takvim-stat takvim-stat--waiting">
                        <div className="takvim-stat__value">{stats.waiting}</div>
                        <div className="takvim-stat__label">Beklemede</div>
                    </div>
                    <div className="takvim-stat takvim-stat--done">
                        <div className="takvim-stat__value">{stats.done}</div>
                        <div className="takvim-stat__label">Tamamlandı</div>
                    </div>
                    <div className="takvim-stat takvim-stat--late">
                        <div className="takvim-stat__value">{stats.late}</div>
                        <div className="takvim-stat__label">Gecikmiş</div>
                    </div>
                </div>
            </section>

            <section className="takvim-filters">
                <div className="takvim-filters__top">
                    <div>
                        <h2 className="takvim-filters__title">Filtreler</h2>
                        <p className="takvim-filters__sub">
                            Arama, durum, öncelik ve gecikmeye göre filtreleme.
                        </p>
                    </div>
                    <div className="takvim-filters__right">
                        <div className="takvim-view-toggle">
                            <button
                                type="button"
                                className={`takvim-view-btn${activeView === "calendar" ? " active" : ""
                                    }`}
                                onClick={() => setActiveView("calendar")}
                            >
                                Takvim
                            </button>
                            <button
                                type="button"
                                className={`takvim-view-btn${activeView === "list" ? " active" : ""
                                    }`}
                                onClick={() => setActiveView("list")}
                            >
                                Liste
                            </button>
                        </div>
                        <button
                            type="button"
                            className="takvim-btn takvim-btn--secondary"
                            onClick={resetFilters}
                        >
                            Filtreleri Temizle
                        </button>
                    </div>
                </div>

                <div className="takvim-filter-grid">
                    <input
                        className="takvim-input"
                        type="text"
                        placeholder="Başlık, açıklama, birim veya durum ara..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    <select
                        className="takvim-select"
                        value={durumFilter}
                        onChange={(e) => setDurumFilter(e.target.value)}
                    >
                        <option value="tum">Tüm Durumlar</option>
                        <option value="acik">Açık</option>
                        <option value="beklemede">Beklemede</option>
                        <option value="tamamlandi">Tamamlandı</option>
                        <option value="iptal">İptal</option>
                        <option value="gecikti">Gecikti</option>
                    </select>
                    <select
                        className="takvim-select"
                        value={oncelikFilter}
                        onChange={(e) => setOncelikFilter(e.target.value)}
                    >
                        <option value="tum">Tüm Öncelikler</option>
                        <option value="rutin">Rutin</option>
                        <option value="dusuk">Düşük</option>
                        <option value="orta">Orta</option>
                        <option value="yuksek">Yüksek</option>
                        <option value="kritik">Kritik</option>
                    </select>
                    <label className="takvim-check">
                        <input
                            type="checkbox"
                            checked={onlyLate}
                            onChange={(e) => setOnlyLate(e.target.checked)}
                        />
                        <span>Sadece gecikenler</span>
                    </label>
                </div>
            </section>

            <section className="takvim-layout">
                <div className="takvim-main">
                    <div className="takvim-card">
                        {loading ? (
                            <div className="takvim-loading">Takvim yükleniyor...</div>
                        ) : activeView === "calendar" ? (
                            <Calendar
                                localizer={localizer}
                                events={filteredEvents}
                                date={calendarDate}
                                view={calendarView}
                                onNavigate={(newDate) => {
                                    setCalendarDate(newDate);
                                    setSelectedDate(newDate);
                                }}
                                onView={(newView) => setCalendarView(newView)}
                                startAccessor="start"
                                endAccessor="end"
                                culture="tr"
                                messages={messages}
                                popup
                                selectable
                                views={{ month: true, week: true, day: true, agenda: true }}
                                style={{ height: 760 }}
                                eventPropGetter={(event) => ({
                                    className: getEventClassName(event),
                                })}
                                components={{ event: EventCard }}
                                onSelectEvent={handleEventClick}
                                onSelectSlot={(slotInfo) => {
                                    setSelectedDate(slotInfo.start);
                                    setCalendarDate(slotInfo.start);
                                }}
                            />
                        ) : (
                            <ListView events={filteredEvents} onEventClick={handleEventClick} />
                        )}
                    </div>
                </div>

                <aside className="takvim-sidebar">
                    <div className="takvim-card">
                        <div className="takvim-sidehead">
                            <div>
                                <h3>Seçilen Gün</h3>
                                <p>{format(selectedDate, "d MMMM yyyy", { locale: tr })}</p>
                            </div>
                        </div>
                        {selectedDayTasks.length === 0 ? (
                            <div className="takvim-empty">Bu gün için görev bulunmuyor.</div>
                        ) : (
                            <div className="takvim-tasklist">
                                {selectedDayTasks.map((task) => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        className={`takvim-taskitem${task.isLate ? " is-late" : ""
                                            }`}
                                        onClick={() => setModalTask(task)}
                                    >
                                        <div className="takvim-taskitem__top">
                                            <h4>{task.title}</h4>
                                            <span className="takvim-taskitem__date">
                                                {format(task.start, "dd.MM.yyyy")}
                                            </span>
                                        </div>
                                        <div className="takvim-taskitem__badges">
                                            <span className={getBadgeClass(task)}>
                                                {task.isLate
                                                    ? "Gecikmiş"
                                                    : getDurumLabel(getVisibleStatus(task))}
                                            </span>
                                            <span className="tkv-badge tkv-badge--soft">
                                                {getOncelikLabel(task.oncelik)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="takvim-card">
                        <h3 className="takvim-legend__title">Renk Rehberi</h3>
                        <div className="takvim-legend">
                            {[
                                { cls: "open", label: "Açık görev" },
                                { cls: "waiting", label: "Beklemede" },
                                { cls: "done", label: "Tamamlandı" },
                                { cls: "critical", label: "Kritik öncelik" },
                                { cls: "high", label: "Yüksek öncelik" },
                                { cls: "late", label: "Gecikmiş görev" },
                                { cls: "cancel", label: "İptal edildi" },
                            ].map(({ cls, label }) => (
                                <div key={cls} className="takvim-legend__item">
                                    <span
                                        className={`takvim-legend__dot takvim-legend__dot--${cls}`}
                                    />
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    );
}

function ListView({ events, onEventClick }) {
    if (events.length === 0) {
        return <div className="takvim-empty">Görev bulunamadı.</div>;
    }

    const sorted = [...events].sort((a, b) => a.start - b.start);

    return (
        <div className="takvim-listview">
            {sorted.map((event) => (
                <button
                    key={event.id}
                    type="button"
                    className={`takvim-listitem${event.isLate ? " is-late" : ""}`}
                    onClick={() => onEventClick(event)}
                >
                    <div
                        className="takvim-listitem__bar"
                        style={{ background: getEventColor(event) }}
                    />
                    <div className="takvim-listitem__info">
                        <h4>{event.title}</h4>
                        <div className="takvim-listitem__meta">
                            <span className={getBadgeClass(event)}>
                                {event.isLate
                                    ? "Gecikmiş"
                                    : getDurumLabel(getVisibleStatus(event))}
                            </span>
                            <span className="tkv-badge tkv-badge--soft">
                                {getOncelikLabel(event.oncelik)}
                            </span>
                            {event.birim && (
                                <span className="takvim-listitem__birim">{event.birim}</span>
                            )}
                        </div>
                    </div>
                    <div className="takvim-listitem__date">
                        {format(event.start, "dd.MM.yyyy")}
                    </div>
                </button>
            ))}
        </div>
    );
}

function getEventColor(event) {
    if (event.isLate) return "#dc2626";
    if (event.durum === "tamamlandi") return "#16a34a";
    if (event.durum === "beklemede") return "#d97706";
    if (event.durum === "iptal") return "#94a3b8";
    if (event.oncelik === "kritik") return "#7c3aed";
    if (event.oncelik === "yuksek") return "#ea580c";
    return "#2563eb";
}