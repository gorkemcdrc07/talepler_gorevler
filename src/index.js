import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 🔥 GLOBAL ERROR YAKALAYICI
window.onerror = function (msg, url, line, col, error) {
    console.error("GLOBAL ERROR:", error);

    if (error?.message) {
        alert(error.message);
    } else {
        alert(JSON.stringify(error, null, 2));
    }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

reportWebVitals();