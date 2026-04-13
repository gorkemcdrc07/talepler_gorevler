import { getAktifKullanici, clearAktifKullanici } from "./aktifKullanici";

/**
 * Aktif kullanýcýyý döndürür.
 * Kullanýcý yoksa bu normal bir durum olabilir, log basmayýz.
 */
export async function getActiveAuthUser() {
    try {
        return (await getAktifKullanici()) || null;
    } catch (err) {
        console.error("Auth kullanýcý okunamadý:", err);
        return null;
    }
}

/**
 * Auth deðiþimini basit polling ile izler.
 * Kullanýcý yoksa callback(null) döner ama konsolu spamlemez.
 */
export function subscribeToAuthChanges(callback) {
    let prevSerialized = "__init__";
    let isCancelled = false;

    const check = async () => {
        if (isCancelled) return;

        try {
            const user = await getAktifKullanici();
            const nextSerialized = JSON.stringify(user || null);

            if (nextSerialized !== prevSerialized) {
                prevSerialized = nextSerialized;
                callback(user || null);
            }
        } catch (err) {
            console.error("Auth deðiþimi kontrol edilemedi:", err);
        }
    };

    check();

    const timer = setInterval(check, 3000);

    return () => {
        isCancelled = true;
        clearInterval(timer);
    };
}

/**
 * Çýkýþ iþlemi
 */
export async function signOutUser() {
    try {
        clearAktifKullanici();
        localStorage.removeItem("oturum");
        sessionStorage.removeItem("oturum");
    } catch (err) {
        console.error("Çýkýþ hatasý:", err);
    }
}