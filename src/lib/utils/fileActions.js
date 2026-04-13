const DOWNLOADABLE_EXTENSIONS = [
    "xls",
    "xlsx",
    "csv",
    "xlsm",
    "xlsb",
    "ods",
    "zip",
    "rar",
    "7z",
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "txt",
];

function getExtension(value = "") {
    const clean = String(value).split("?")[0].split("#")[0];
    const parts = clean.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function shouldDownloadFile(fileName, fileUrl) {
    const ext = getExtension(fileName) || getExtension(fileUrl);
    return DOWNLOADABLE_EXTENSIONS.includes(ext);
}

export function getFileActionLabel(fileName, fileUrl) {
    return shouldDownloadFile(fileName, fileUrl) ? "İndir" : "Aç";
}

export async function forceDownloadFile(url, fileName = "dosya") {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Dosya indirilemedi.");
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(blobUrl);
}