import "./Dashboard.css";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Dashboard() {
  // =========================
  // NAVIGATION
  // =========================

  const navigate = useNavigate();

  // =========================
  // API DATA
  // =========================

  const [analytics, setAnalytics] = useState([]);
  const [audience, setAudience] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [earnings, setEarnings] = useState([]);

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {
    const loadData = async () => {
      try {
        const analyticsResponse =
          await api.get("/analytics/1");

        const audienceResponse =
          await api.get("/audience/1");

        const growthResponse =
          await api.get("/analytics/1/growth");

        const earningsResponse =
          await api.get("/earnings/1");

        setAnalytics(
          Array.isArray(analyticsResponse.data)
            ? analyticsResponse.data
            : []
        );

        setAudience(
          Array.isArray(audienceResponse.data)
            ? audienceResponse.data
            : []
        );

        setGrowth(
          Array.isArray(growthResponse.data?.growth)
            ? growthResponse.data.growth
            : []
        );

        setEarnings(
          Array.isArray(earningsResponse.data)
            ? earningsResponse.data
            : []
        );
      } catch (error) {
        console.error(
          "Error loading dashboard data:",
          error
        );

        setAnalytics([]);
        setAudience([]);
        setGrowth([]);
        setEarnings([]);
      }
    };

    loadData();
  }, []);

  // =========================
  // SIGN OUT
  // =========================

  const handleSignOut = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // =========================
  // PERFORMANCE DATA
  // =========================

  const performanceData = growth.map((item) => ({
    month: item.date,
    views: Number(item.views || 0),
    engagement: Number(item.engagement || 0),
  }));

  // =========================
  // AUDIENCE DATA
  // =========================

  const audienceData = audience.map((item) => ({
    name: item.age_group,
    value: Number(item.audience_count || 0),
  }));

  // =========================
  // KPI DATA
  // =========================

  const totalViews = analytics.reduce(
    (sum, item) =>
      sum + Number(item.views || 0),
    0
  );

  const totalFollowers =
    analytics.length > 0
      ? Number(
          analytics[analytics.length - 1]
            ?.followers || 0
        )
      : 0;

  const totalEngagement = analytics.reduce(
    (sum, item) =>
      sum +
      Number(item.likes || 0) +
      Number(item.comments || 0) +
      Number(item.shares || 0) +
      Number(item.saves || 0),
    0
  );

  // =========================
  // TOTAL REVENUE
  // =========================

  const totalRevenue = earnings.reduce(
    (sum, item) =>
      sum +
      Number(
        item.estimated_revenue || 0
      ),
    0
  );

  // =========================
  // PIE COLORS
  // =========================

  const pieColors = [
    "#6366f1",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
  ];

  // =========================
  // RENDER
  // =========================

  return (
    <div className="dashboard">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="sidebar">

        {/* LOGO */}

        <div
          className="sidebar-logo"
          onClick={() =>
            navigate("/dashboard")
          }
          style={{ cursor: "pointer" }}
        >
          ✦ CreatorIQ
        </div>

        {/* =========================
            NAVIGATION
        ========================= */}

        <nav className="sidebar-nav">

          {/* DASHBOARD */}

          <div
            className="nav-item active"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <span>▦</span>
            Dashboard
          </div>

          {/* CONTENT */}

          <div
            className="nav-item"
            onClick={() =>
              navigate("/content")
            }
          >
            <span>▤</span>
            Content
          </div>

          {/* AUDIENCE */}

          <div
            className="nav-item"
            onClick={() =>
              navigate("/audience")
            }
          >
            <span>◉</span>
            Audience
          </div>

          {/* GROWTH & TRENDS */}

          <div
            className="nav-item"
            onClick={() =>
              navigate("/growth-trends")
            }
          >
            <span>↗</span>
            Growth & Trends
          </div>

          {/* EARNINGS */}

          <div
            className="nav-item"
            onClick={() =>
              navigate("/earnings")
            }
          >
            <span>$</span>
            Earnings
          </div>

          {/* SOCIAL MEDIA */}

          <div
            className="nav-item"
            onClick={() =>
              navigate("/social-media")
            }
          >
            <span>🔗</span>
            Social Media
          </div>

          {/* SETTINGS */}

          <div
            className="nav-item"
            onClick={() =>
              navigate("/settings")
            }
          >
            <span>⚙</span>
            Settings
          </div>

        </nav>

        {/* =========================
            SIDEBAR BOTTOM
        ========================= */}

        <div className="sidebar-bottom">

          {/* PROFILE */}

          <div className="profile-section">

            <div className="profile-avatar">
              M
            </div>

            <div className="profile-info">

              <strong>
                Creator
              </strong>

              <span>
                Creator account
              </span>

            </div>

          </div>

          {/* SIGN OUT */}

          <div
            className="nav-item signout-item"
            onClick={handleSignOut}
          >
            <span>
              ⇥
            </span>

            Sign Out
          </div>

        </div>

      </aside>

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="dashboard-main">

        {/* =========================
            HEADER
        ========================= */}

        <header className="dashboard-header">

          <div>

            <h1>
              Creator Dashboard
            </h1>

            <p>
              Welcome back! Here's how your
              content is performing.
            </p>

          </div>

        </header>

        {/* =========================
            KPI CARDS
        ========================= */}

        <section className="kpi-grid">

          {/* TOTAL VIEWS */}

          <div className="kpi-card">

            <div className="kpi-header">

              <span>
                Total Views
              </span>

              <div className="kpi-icon">
                ◉
              </div>

            </div>

            <h2>
              {totalViews.toLocaleString()}
            </h2>

            <p className="kpi-growth">
              ↑ 12.5%

              <small>
                vs last month
              </small>
            </p>

          </div>

          {/* FOLLOWERS */}

          <div className="kpi-card">

            <div className="kpi-header">

              <span>
                Followers
              </span>

              <div className="kpi-icon">
                ◎
              </div>

            </div>

            <h2>
              {totalFollowers.toLocaleString()}
            </h2>

            <p className="kpi-growth">
              ↑ 8.2%

              <small>
                vs last month
              </small>
            </p>

          </div>

          {/* ENGAGEMENT */}

          <div className="kpi-card">

            <div className="kpi-header">

              <span>
                Engagement
              </span>

              <div className="kpi-icon">
                ♡
              </div>

            </div>

            <h2>
              {totalEngagement.toLocaleString()}
            </h2>

            <p className="kpi-growth">
              ↑ 15.4%

              <small>
                vs last month
              </small>
            </p>

          </div>

          {/* EARNINGS */}

          <div className="kpi-card">

            <div className="kpi-header">

              <span>
                Earnings
              </span>

              <div className="kpi-icon">
                $
              </div>

            </div>

            <h2>
              ${totalRevenue.toFixed(2)}
            </h2>

            <p className="kpi-growth">
              ↑ 10.8%

              <small>
                vs last month
              </small>
            </p>

          </div>

        </section>

        {/* =========================
            CHARTS
        ========================= */}

        <section className="charts-grid">

          {/* PERFORMANCE CHART */}

          <div className="chart-card">

            <h3>
              Performance Overview
            </h3>

            <p>
              Views and engagement over time
            </p>

            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height={260}
              >

                <LineChart
                  data={performanceData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="month"
                  />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke="#111827"
                    strokeWidth={2}
                  />

                  <Line
                    type="monotone"
                    dataKey="engagement"
                    name="Engagement"
                    stroke="#6366f1"
                    strokeWidth={2}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* =========================
              AUDIENCE CHART
          ========================= */}

          <div className="chart-card">

            <h3>
              Audience Overview
            </h3>

            <p>
              Audience age distribution
            </p>

            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height={260}
              >

                <PieChart>

                  <Pie
                    data={audienceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    label
                  >

                    {audienceData.map(
                      (entry, index) => (

                        <Cell
                          key={`cell-${index}`}
                          fill={
                            pieColors[
                              index %
                              pieColors.length
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            </div>

          </div>

        </section>

        {/* =========================
            BOTTOM SECTION
        ========================= */}

        <section className="bottom-grid">

          {/* TOP PERFORMING CONTENT */}

          <div className="content-card">

            <h3>
              Top Performing Content
            </h3>

            <div className="content-item">

              <span>
                My Morning Routine
              </span>

              <strong>
                42.8K views
              </strong>

            </div>

            <div className="content-item">

              <span>
                Travel Vlog
              </span>

              <strong>
                31.4K views
              </strong>

            </div>

            <div className="content-item">

              <span>
                Creative Ideas
              </span>

              <strong>
                27.9K views
              </strong>

            </div>

          </div>

          {/* QUICK ACTIONS */}

          <div className="content-card">

            <h3>
              Quick Actions
            </h3>

            <button
              onClick={() =>
                navigate("/content")
              }
            >
              Create Content
            </button>

            <button
              onClick={() =>
                navigate("/growth-trends")
              }
            >
              View Growth & Trends
            </button>

            <button
              onClick={() =>
                navigate("/settings")
              }
            >
              Edit Profile
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;