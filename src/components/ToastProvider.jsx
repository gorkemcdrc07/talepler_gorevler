import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";

const ToastContext = createContext(null);

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const navigate = useNavigate();
    const timersRef = useRef({});
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        const timer = timersRef.current[id];

        if (timer) {
            clearTimeout(timer);
            delete timersRef.current[id];
        }

        setToasts((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const showToast = useCallback((message, type = "info", link = null, options = {}) => {
        const id = Date.now() + Math.random();
        const duration = options.duration ?? 3500;

        setToasts((prev) => [
            ...prev,
            {
                id,
                message,
                type,
                link,
            },
        ]);

        timersRef.current[id] = setTimeout(() => {
            removeToast(id);
        }, duration);
    }, [removeToast]);

    function handleToastClick(toast) {
        if (toast.link) {
            navigate(toast.link);
        }

        removeToast(toast.id);
    }

    function getToastStyle(type) {
        switch (type) {
            case "success":
                return {
                    background: "#22c55e",
                    color: "#fff",
                };
            case "error":
                return {
                    background: "#ef4444",
                    color: "#fff",
                };
            case "warning":
                return {
                    background: "#f59e0b",
                    color: "#fff",
                };
            default:
                return {
                    background: "#111827",
                    color: "#fff",
                };
        }
    }

    const value = useMemo(
        () => ({
            showToast,
            removeToast,
        }),
        [showToast, removeToast]
    );
    return (
        <ToastContext.Provider value={value}>
            {children}

            <div
                style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    zIndex: 9999,
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    width: "380px",
                    maxWidth: "calc(100vw - 24px)",
                }}
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        onClick={() => handleToastClick(toast)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                handleToastClick(toast);
                            }
                        }}
                        style={{
                            ...getToastStyle(toast.type),
                            padding: "14px 16px",
                            borderRadius: "12px",
                            fontWeight: 600,
                            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                            cursor: toast.link ? "pointer" : "default",
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: "12px",
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div>{toast.message}</div>

                            {toast.link && (
                                <div
                                    style={{
                                        fontSize: "12px",
                                        marginTop: "6px",
                                        opacity: 0.9,
                                        fontWeight: 500,
                                    }}
                                >
                                    Detaya git →
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeToast(toast.id);
                            }}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#fff",
                                fontSize: "16px",
                                cursor: "pointer",
                                padding: 0,
                                lineHeight: 1,
                            }}
                            aria-label="Toast kapat"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}