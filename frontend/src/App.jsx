import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import Register from "./pages/register";

import Dashboard from "./pages/dashboard";
import Content from "./pages/content";
import Audience from "./pages/Audience";
import GrowthTrends from "./pages/growth-trends";
import Earnings from "./pages/Earnings";
import SocialMedia from "./pages/SocialMedia";
import Settings from "./pages/Settings";


function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* =========================
            LOGIN
        ========================= */}

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =========================
            REGISTER
        ========================= */}

        <Route
          path="/register"
          element={<Register />}
        />


        {/* =========================
            DASHBOARD
        ========================= */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />


        {/* =========================
            CONTENT
        ========================= */}

        <Route
          path="/content"
          element={<Content />}
        />


        {/* =========================
            AUDIENCE
        ========================= */}

        <Route
          path="/audience"
          element={<Audience />}
        />


        {/* =========================
            GROWTH & TRENDS
        ========================= */}

        <Route
          path="/growth-trends"
          element={<GrowthTrends />}
        />


        {/* =========================
            EARNINGS
        ========================= */}

        <Route
          path="/earnings"
          element={<Earnings />}
        />


        {/* =========================
            SOCIAL MEDIA
        ========================= */}

        <Route
          path="/social-media"
          element={<SocialMedia />}
        />


        {/* =========================
            SETTINGS
        ========================= */}

        <Route
          path="/settings"
          element={<Settings />}
        />

      </Routes>

    </BrowserRouter>

  );

}


export default App;