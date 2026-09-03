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

/* =========================
   SAMPLE ANALYTICS DATA
========================= */

const performanceData = [
  { month: "Jan", views: 18000, engagement: 3200 },
  { month: "Feb", views: 24000, engagement: 4100 },
  { month: "Mar", views: 21000, engagement: 3800 },
  { month: "Apr", views: 32000, engagement: 5200 },
  { month: "May", views: 28000, engagement: 4700 },
  { month: "Jun", views: 36000, engagement: 5800 },
];

const audienceData = [
  { name: "18-24", value: 35 },
  { name: "25-34", value: 40 },
  { name: "35-44", value: 15 },
  { name: "45+", value: 10 },
];

/* =========================
   DASHBOARD
========================= */

function Dashboard() {
  return (
    <div className="dashboard">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="sidebar">

        <div className="sidebar-logo">
          ✦ CreatorIQ
        </div>

        <nav className="sidebar-nav">

          <div className="nav-item active">
            <span>▦</span>
            Dashboard
          </div>

          <div className="nav-item">
            <span>▤</span>
            Content
          </div>

          <div className="nav-item">
            <span>⌁</span>
            Analytics
          </div>

          <div className="nav-item">
            <span>◉</span>
            Audience
          </div>

          <div className="nav-item">
            <span>₹</span>
            Earnings
          </div>

          <div className="nav-item">
            <span>⚙</span>
            Settings
          </div>

        </nav>

        {/* Profile */}
        <div className="profile-section">

          <div className="profile-avatar">
            M
          </div>

          <div>
            <strong>Creator</strong>
            <span>Creator account</span>
          </div>

        </div>

      </aside>


      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="dashboard-main">

        {/* Header */}
        <header className="dashboard-header">

          <div>
            <h1>Creator Dashboard</h1>

            <p>
              Welcome back! Here's how your content is performing.
            </p>
          </div>

          <button className="theme-button">
            ☾ Dark mode
          </button>

        </header>


        {/* =========================
            KPI CARDS
        ========================= */}

        <section className="kpi-grid">

          {/* Total Views */}
          <div className="kpi-card">

            <div className="kpi-header">
              <span>Total Views</span>
              <div className="kpi-icon">◉</div>
            </div>

            <h2>128.4K</h2>

            <p className="kpi-growth">
              ↑ 12.5%
              <small>vs last month</small>
            </p>

          </div>


          {/* Followers */}
          <div className="kpi-card">

            <div className="kpi-header">
              <span>Followers</span>
              <div className="kpi-icon">◎</div>
            </div>

            <h2>24.8K</h2>

            <p className="kpi-growth">
              ↑ 8.2%
              <small>vs last month</small>
            </p>

          </div>


          {/* Engagement */}
          <div className="kpi-card">

            <div className="kpi-header">
              <span>Engagement</span>
              <div className="kpi-icon">♡</div>
            </div>

            <h2>18.6K</h2>

            <p className="kpi-growth">
              ↑ 15.4%
              <small>vs last month</small>
            </p>

          </div>


          {/* Earnings */}
          <div className="kpi-card">

            <div className="kpi-header">
              <span>Earnings</span>
              <div className="kpi-icon">₹</div>
            </div>

            <h2>₹42,850</h2>

            <p className="kpi-growth">
              ↑ 10.8%
              <small>vs last month</small>
            </p>

          </div>

        </section>


        {/* =========================
            CHARTS
        ========================= */}

        <section className="charts-grid">

          {/* Performance Chart */}
          <div className="chart-card">

            <h3>Performance Overview</h3>

            <p>
              Views and engagement over time
            </p>

            <div className="chart-container">

              <ResponsiveContainer width="100%" height={260}>

                <LineChart data={performanceData}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="month" />

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


          {/* Audience Chart */}
          <div className="chart-card">

            <h3>Audience Overview</h3>

            <p>
              Audience age distribution
            </p>

            <div className="chart-container">

              <ResponsiveContainer width="100%" height={260}>

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

                    {audienceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} />
                    ))}

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

          {/* Top Performing Content */}
          <div className="content-card">

            <h3>Top Performing Content</h3>

            <div className="content-item">
              <span>My Morning Routine</span>
              <strong>42.8K views</strong>
            </div>

            <div className="content-item">
              <span>Travel Vlog</span>
              <strong>31.4K views</strong>
            </div>

            <div className="content-item">
              <span>Creative Ideas</span>
              <strong>27.9K views</strong>
            </div>

          </div>


          {/* Quick Actions */}
          <div className="content-card">

            <h3>Quick Actions</h3>

            <button>Create Content</button>

            <button>View Analytics</button>

            <button>Edit Profile</button>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;