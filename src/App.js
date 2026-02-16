import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import AnaSayfa from "./sayfalar/anasayfa";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />

                {/* Ana panel */}
                <Route path="/anasayfa" element={<AnaSayfa />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
