// permissions.js

// (İstersen ileride tekrar kullanırsın diye bırakıyorum)
export function normalizeRole(role = "") {
    return role
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/ç/g, "c")
        .replace(/ğ/g, "g")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ş/g, "s")
        .replace(/ü/g, "u");
}

// 🔓 Herkes (login olan) her şeyi görebilir
export function canViewAll(user) {
    return !!user;
}

// 🔓 Herkes ekip verilerini görebilir
export function canViewTeam(user) {
    return !!user;
}

// 🔓 Herkes görev oluşturabilir
export function canCreateTask(user) {
    return true;
}
// 🔓 Herkes görev düzenleyebilir
export function canEditTask(user, gorev) {
    return !!user;
}

// 🔓 Herkes görev durumunu değiştirebilir
export function canUpdateTaskStatus(user, gorev) {
    return !!user;
}