const DEFAULT_DURUMLAR = [
    { kod: "acik", ad: "Açık" },
    { kod: "beklemede", ad: "Beklemede" },
    { kod: "tamamlandi", ad: "Tamamlandı" },
    { kod: "iptal", ad: "İptal" },
    { kod: "gecikti", ad: "Gecikti" },
];

export const SAFE_DB_DURUM = "beklemede";
export const STANDART_DURUMLAR = DEFAULT_DURUMLAR.map((item) => item.kod);

const OZEL_DURUM_STORAGE_KEY = "gorev_ozel_durumlari_global_v1";
const TASK_CUSTOM_STATUS_KEY = "gorev_ozel_durum_secimleri_v1";
const TASK_CUSTOM_HISTORY_KEY = "gorev_ozel_durum_gecmisi_v1";

export function getDefaultDurumlar() {
    return DEFAULT_DURUMLAR;
}

export function slugifyDurum(text) {
    return String(text || "")
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replace(/ı/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/\s+/g, "_")
        .replace(/[^\w_]/g, "");
}

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : fallback;
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(
        new CustomEvent("task-status-storage-updated", {
            detail: { key, value },
        })
    );
}

export function getGlobalOzelDurumlar() {
    const parsed = readJson(OZEL_DURUM_STORAGE_KEY, []);
    return Array.isArray(parsed) ? parsed : [];
}

export function setGlobalOzelDurumlar(list) {
    writeJson(OZEL_DURUM_STORAGE_KEY, Array.isArray(list) ? list : []);
}

export function addGlobalOzelDurum(ad) {
    const kod = slugifyDurum(ad);
    if (!kod) {
        return { ok: false, error: "Geçerli bir durum adı girin." };
    }

    const mevcut = getGlobalOzelDurumlar();
    const existsInCustom = mevcut.some((item) => item.kod === kod);
    const existsInDefault = STANDART_DURUMLAR.includes(kod);

    if (existsInCustom || existsInDefault) {
        return { ok: true, kod, exists: true };
    }

    const next = [...mevcut, { kod, ad, ozel: true }];
    setGlobalOzelDurumlar(next);

    return { ok: true, kod, exists: false };
}

export function removeGlobalOzelDurum(kod) {
    const mevcut = getGlobalOzelDurumlar();
    const next = mevcut.filter((item) => item.kod !== kod);
    setGlobalOzelDurumlar(next);

    const statusMap = getTaskStatusMap();
    const updatedStatusMap = { ...statusMap };

    Object.keys(updatedStatusMap).forEach((taskId) => {
        if (updatedStatusMap[taskId] === kod) {
            delete updatedStatusMap[taskId];
        }
    });

    setTaskStatusMap(updatedStatusMap);
}

export function getTaskStatusMap() {
    const parsed = readJson(TASK_CUSTOM_STATUS_KEY, {});
    return parsed && typeof parsed === "object" ? parsed : {};
}

export function setTaskStatusMap(map) {
    writeJson(TASK_CUSTOM_STATUS_KEY, map && typeof map === "object" ? map : {});
}

export function getTaskCustomStatus(taskId) {
    const map = getTaskStatusMap();
    return map[String(taskId)] || "";
}

export function setTaskCustomStatus(taskId, statusValue) {
    const map = getTaskStatusMap();

    if (statusValue) {
        map[String(taskId)] = statusValue;
    } else {
        delete map[String(taskId)];
    }

    setTaskStatusMap(map);
}

export function getCustomHistoryMap() {
    const parsed = readJson(TASK_CUSTOM_HISTORY_KEY, {});
    return parsed && typeof parsed === "object" ? parsed : {};
}

export function setCustomHistoryMap(map) {
    writeJson(TASK_CUSTOM_HISTORY_KEY, map && typeof map === "object" ? map : {});
}

export function getTaskCustomHistory(taskId) {
    const map = getCustomHistoryMap();
    const list = map[String(taskId)];
    return Array.isArray(list) ? list : [];
}

export function pushTaskCustomHistory(taskId, item) {
    const map = getCustomHistoryMap();
    const current = Array.isArray(map[String(taskId)]) ? map[String(taskId)] : [];
    map[String(taskId)] = [...current, item];
    setCustomHistoryMap(map);
}

export function buildTumDurumlar(apiDurumlar = []) {
    const baseDurumlar =
        Array.isArray(apiDurumlar) && apiDurumlar.length > 0
            ? apiDurumlar
            : DEFAULT_DURUMLAR;

    const ekstraDurumlar = getGlobalOzelDurumlar().map((item) => ({
        kod: item.kod,
        ad: item.ad,
        ozel: true,
    }));

    const map = new Map();

    [...baseDurumlar, ...ekstraDurumlar].forEach((durum) => {
        const value = durum.kod || durum.value || durum.slug || durum.ad;
        const label = durum.ad || durum.baslik || value;

        if (!value) return;

        if (!map.has(value)) {
            map.set(value, {
                ...durum,
                kod: value,
                ad: label,
                ozel: !!durum.ozel,
            });
        }
    });

    return Array.from(map.values());
}