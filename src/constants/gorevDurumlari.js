// src/constants/gorevDurumlari.js

/**
 * BU LÝSTEYÝ veritabanýndaki gorevler_durum_check ile birebir ayný tut.
 * Yeni durum ekleyeceksen önce DB constraint güncellenmeli.
 */
export const GOREV_DURUMLARI = [
    "beklemede",
    "devam_ediyor",
    "tamamlandi",
    "iptal",
];

export function isValidGorevDurumu(durum) {
    return GOREV_DURUMLARI.includes(durum);
}