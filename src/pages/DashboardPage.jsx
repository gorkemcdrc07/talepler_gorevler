import { useEffect, useState } from "react";
import { getDashboardData } from "../lib/queries/dashboard";
import { getAktifKullanici } from "../lib/queries/kullanicilar";

import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js";

import { Pie } from "react-chartjs-2";

import "../styles/dashboard.css";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DashboardPage() {
    const [data, setData] = useState(null);

    useEffect(() => {
        async function load() {
            const user = await getAktifKullanici();
            if (!user) return;

            const d = await getDashboardData(user.id);
            setData(d);
        }

        load();
    }, []);

    if (!data) return <div>Yükleniyor...</div>;

    const chartData = {
        labels: ["Bekleyen", "Devam Eden", "Tamamlanan"],
        datasets: [
            {
                label: "Görev Durumu",
                data: [
                    data.bekleyen,
                    data.devam,
                    data.tamamlanan,
                ],
                backgroundColor: [
                    "#facc15",
                    "#60a5fa",
                    "#4ade80",
                ],
            },
        ],
    };

    return (
        <div className="dashboard-container">
            <h1>Dashboard</h1>

            {/* KPI */}
            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <div className="dashboard-title">Toplam Görev</div>
                    <div className="dashboard-value">{data.toplam}</div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-title">Tamamlanan</div>
                    <div className="dashboard-value">{data.tamamlanan}</div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-title">Bekleyen</div>
                    <div className="dashboard-value">{data.bekleyen}</div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-title">Devam Eden</div>
                    <div className="dashboard-value">{data.devam}</div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-title">Bana Atanan</div>
                    <div className="dashboard-value">{data.banaAtanan}</div>
                </div>
            </div>

            {/* 📊 GRAFİK */}
            <div style={{ marginTop: "40px", maxWidth: "400px" }}>
                <h3>Görev Durum Dağılımı</h3>
                <Pie data={chartData} />
            </div>
        </div>
    );
}