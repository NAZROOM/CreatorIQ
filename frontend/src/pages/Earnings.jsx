import "./earnings.css";

import { useEffect, useMemo, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { useNavigate } from "react-router-dom";

import api from "../services/api";


function Earnings() {

  const navigate = useNavigate();


  // =====================================================
  // STATES
  // =====================================================

  const [earnings, setEarnings] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // =====================================================
  // CREATOR ID
  // =====================================================

  const creatorId = 1;


  // =====================================================
  // LOAD EARNINGS FROM BACKEND
  // =====================================================

  useEffect(() => {

    const loadEarnings = async () => {

      try {

        setLoading(true);

        setError("");


        console.log(
          `Fetching earnings for creator ${creatorId}`
        );


        const response = await api.get(
          `/earnings/${creatorId}`
        );


        console.log(
          "Earnings API response:",
          response.data
        );


        const result = response?.data;


        // -----------------------------------------------
        // BACKEND RETURNS ARRAY
        // -----------------------------------------------

        if (Array.isArray(result)) {

          setEarnings(result);

          return;

        }


        // -----------------------------------------------
        // BACKEND RETURNS { earnings: [] }
        // -----------------------------------------------

        if (
          result &&
          Array.isArray(result.earnings)
        ) {

          setEarnings(result.earnings);

          return;

        }


        // -----------------------------------------------
        // BACKEND RETURNS { data: [] }
        // -----------------------------------------------

        if (
          result &&
          Array.isArray(result.data)
        ) {

          setEarnings(result.data);

          return;

        }


        // -----------------------------------------------
        // NO DATA
        // -----------------------------------------------

        setEarnings([]);

      } catch (err) {

        console.error(
          "Earnings API error:",
          err
        );


        // -----------------------------------------------
        // 404 MEANS CREATOR HAS NO EARNINGS
        // -----------------------------------------------

        if (err?.response?.status === 404) {

          setEarnings([]);

          setError("");

        } else {

          setError(
            err?.response?.data?.detail ||
            "Unable to load earnings data."
          );

          setEarnings([]);

        }

      } finally {

        setLoading(false);

      }

    };


    loadEarnings();

  }, []);


  // =====================================================
  // FORMAT NUMBER
  // =====================================================

  const formatNumber = (number) => {

    const value = Number(number);


    if (!Number.isFinite(value)) {

      return "0";

    }


    if (value >= 1000000000) {

      return (
        (value / 1000000000).toFixed(1) +
        "B"
      );

    }


    if (value >= 1000000) {

      return (
        (value / 1000000).toFixed(1) +
        "M"
      );

    }


    if (value >= 1000) {

      return (
        (value / 1000).toFixed(1) +
        "K"
      );

    }


    return value.toLocaleString("en-IN");

  };


  // =====================================================
  // TOTAL REVENUE
  // =====================================================

  const totalRevenue = useMemo(() => {

    return earnings.reduce(

      (sum, item) => {

        return (
          sum +
          Number(
            item?.estimated_revenue || 0
          )
        );

      },

      0

    );

  }, [earnings]);


  // =====================================================
  // TOTAL AD REVENUE
  // =====================================================

  const totalAdRevenue = useMemo(() => {

    return earnings.reduce(

      (sum, item) => {

        return (
          sum +
          Number(
            item?.ad_revenue || 0
          )
        );

      },

      0

    );

  }, [earnings]);


  // =====================================================
  // TOTAL MONETIZED VIEWS
  // =====================================================

  const totalMonetizedViews = useMemo(() => {

    return earnings.reduce(

      (sum, item) => {

        return (
          sum +
          Number(
            item?.monetized_views || 0
          )
        );

      },

      0

    );

  }, [earnings]);


  // =====================================================
  // REVENUE TREND
  // =====================================================

  const revenueData = useMemo(() => {

    return earnings

      .slice()

      .sort(

        (a, b) =>

          new Date(a.date) -
          new Date(b.date)

      )

      .map((item, index) => {

        return {

          date: item?.date

            ? new Date(
                item.date
              ).toLocaleDateString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "short",
                }
              )

            : `Period ${index + 1}`,

          revenue: Number(
            item?.estimated_revenue || 0
          ),

          adRevenue: Number(
            item?.ad_revenue || 0
          ),

        };

      });

  }, [earnings]);


  // =====================================================
  // MONTHLY REVENUE
  // =====================================================

  const monthlyRevenue = useMemo(() => {

    const monthly = {};


    earnings.forEach((item) => {

      if (!item?.date) {

        return;

      }


      const date = new Date(
        item.date
      );


      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;


      const label = date.toLocaleDateString(
        "en-IN",
        {
          month: "short",
          year: "numeric",
        }
      );


      if (!monthly[key]) {

        monthly[key] = {

          month: label,

          revenue: 0,

        };

      }


      monthly[key].revenue += Number(
        item?.estimated_revenue || 0
      );

    });


    return Object.values(monthly)

      .sort((a, b) => {

        return (
          new Date(
            `1 ${a.month}`
          ) -
          new Date(
            `1 ${b.month}`
          )
        );

      })

      .map((item) => {

        return {

          month: item.month,

          revenue: Number(
            item.revenue.toFixed(2)
          ),

        };

      });

  }, [earnings]);


  // =====================================================
  // THIS MONTH REVENUE
  // =====================================================

  const thisMonthRevenue = useMemo(() => {

    if (!earnings.length) {

      return 0;

    }


    const now = new Date();


    const currentMonth =
      now.getMonth();


    const currentYear =
      now.getFullYear();


    return earnings.reduce(

      (sum, item) => {

        if (!item?.date) {

          return sum;

        }


        const date = new Date(
          item.date
        );


        if (

          date.getMonth() ===
            currentMonth &&

          date.getFullYear() ===
            currentYear

        ) {

          return (

            sum +
            Number(
              item?.estimated_revenue || 0
            )

          );

        }


        return sum;

      },

      0

    );

  }, [earnings]);


  // =====================================================
  // REVENUE SOURCES
  // =====================================================

  const revenueSources = useMemo(() => {

    const youtubeAds =
      totalAdRevenue;


    const otherRevenue =
      Math.max(
        totalRevenue -
          totalAdRevenue,
        0
      );


    const total =
      youtubeAds +
      otherRevenue;


    if (total <= 0) {

      return [

        {
          name: "YouTube Ads",
          value: 0,
        },

        {
          name: "Other Revenue",
          value: 0,
        },

      ];

    }


    return [

      {

        name: "YouTube Ads",

        value: Number(

          (
            (youtubeAds / total) *
            100

          ).toFixed(1)

        ),

      },

      {

        name: "Other Revenue",

        value: Number(

          (
            (otherRevenue / total) *
            100

          ).toFixed(1)

        ),

      },

    ];

  }, [
    totalRevenue,
    totalAdRevenue,
  ]);


  const sourceColors = [

    "#173f6f",

    "#4e82b8",

  ];


  // =====================================================
  // NAVIGATION
  // =====================================================

  const goTo = (path) => {

    navigate(path);

  };


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="earnings-page">


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="earnings-sidebar">


        <div
          className="earnings-logo"
          onClick={() =>
            goTo("/dashboard")
          }
        >

          <span className="logo-mark">
            ✦
          </span>

          CreatorIQ

        </div>


        <nav className="earnings-navigation">


          <div
            className="earnings-nav-item"
            onClick={() =>
              goTo("/dashboard")
            }
          >

            <span>▦</span>

            Dashboard

          </div>


          <div
            className="earnings-nav-item"
            onClick={() =>
              goTo("/content")
            }
          >

            <span>▤</span>

            Content

          </div>


          <div
            className="earnings-nav-item"
            onClick={() =>
              goTo("/audience")
            }
          >

            <span>◉</span>

            Audience

          </div>


          <div
            className="earnings-nav-item"
            onClick={() =>
              goTo("/growth-trends")
            }
          >

            <span>↗</span>

            Growth & Trends

          </div>


          <div className="earnings-nav-item active">

            <span>₹</span>

            Earnings

          </div>


          <div
            className="earnings-nav-item"
            onClick={() =>
              goTo("/social-media")
            }
          >

            <span>◎</span>

            Social Media

          </div>


          <div
            className="earnings-nav-item"
            onClick={() =>
              goTo("/settings")
            }
          >

            <span>⚙</span>

            Settings

          </div>


        </nav>

      </aside>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="earnings-main">


        {/* HEADER */}

        <header className="earnings-header">

          <div>

            <div className="page-label">
              MONETIZATION
            </div>

            <h1>
              Earnings Analytics
            </h1>

            <p>
              Track your revenue and
              monetization performance.
            </p>

          </div>


          <div className="earnings-live-status">

            <span className="live-dot"></span>

            Revenue tracking

          </div>

        </header>


        {/* ERROR */}

        {error && (

          <div className="earnings-error">

            {error}

          </div>

        )}


        {/* LOADING */}

        {loading ? (

          <section className="earnings-loading">

            <div className="loading-spinner"></div>

            <h2>
              Loading earnings...
            </h2>

            <p>
              Fetching your monetization data.
            </p>

          </section>

        ) : (

          <>


            {/* =================================================
                KPI CARDS
            ================================================= */}

            <section className="earnings-kpi-grid">


              <div className="earnings-kpi-card">

                <div className="earnings-kpi-top">

                  <span>
                    TOTAL REVENUE
                  </span>

                  <div className="earnings-kpi-icon">
                    $
                  </div>

                </div>


                <h2>
                  ${formatNumber(totalRevenue)}
                </h2>


                <p>
                  Total estimated revenue
                </p>

              </div>


              <div className="earnings-kpi-card">

                <div className="earnings-kpi-top">

                  <span>
                    AD REVENUE
                  </span>

                  <div className="earnings-kpi-icon">
                    ◉
                  </div>

                </div>


                <h2>
                  ${formatNumber(totalAdRevenue)}
                </h2>


                <p>
                  Estimated advertising revenue
                </p>

              </div>


              <div className="earnings-kpi-card">

                <div className="earnings-kpi-top">

                  <span>
                    MONETIZED VIEWS
                  </span>

                  <div className="earnings-kpi-icon">
                    ◉
                  </div>

                </div>


                <h2>
                  {formatNumber(
                    totalMonetizedViews
                  )}
                </h2>


                <p>
                  Views generating revenue
                </p>

              </div>


              <div className="earnings-kpi-card">

                <div className="earnings-kpi-top">

                  <span>
                    THIS MONTH
                  </span>

                  <div className="earnings-kpi-icon">
                    ↗
                  </div>

                </div>


                <h2>
                  ${formatNumber(
                    thisMonthRevenue
                  )}
                </h2>


                <p>
                  Current month revenue
                </p>

              </div>


            </section>


            {/* =================================================
                EMPTY DATABASE MESSAGE
            ================================================= */}

            {earnings.length === 0 && (

              <section className="earnings-empty-state">

                <div className="earnings-empty-icon">
                  $
                </div>

                <h2>
                  No earnings data yet
                </h2>

                <p>
                  Creator {creatorId} does not
                  have any earnings records in
                  the database yet.
                </p>

                <p>
                  Add earnings data through the
                  backend API to display revenue
                  analytics here.
                </p>

              </section>

            )}


            {/* =================================================
                REVENUE TREND
            ================================================= */}

            <section className="earnings-chart-card">


              <div className="earnings-section-header">

                <div>

                  <div className="section-label">
                    REVENUE PERFORMANCE
                  </div>

                  <h2>
                    Revenue Trend
                  </h2>

                  <p>
                    Track your estimated earnings
                    over time.
                  </p>

                </div>


                <div className="revenue-period">

                  {earnings.length}
                  {" "}
                  records

                </div>

              </div>


              <div className="earnings-chart">

                {revenueData.length === 0 ? (

                  <div className="empty-content">

                    No revenue data available.

                  </div>

                ) : (

                  <ResponsiveContainer
                    width="100%"
                    height={320}
                  >

                    <LineChart
                      data={revenueData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 0,
                        bottom: 10,
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#d8e3f0"
                      />


                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: "#7890a6",
                          fontSize: 12,
                        }}
                      />


                      <YAxis
                        tick={{
                          fill: "#7890a6",
                          fontSize: 12,
                        }}
                      />


                      <Tooltip
                        formatter={(value) =>
                          `$${formatNumber(value)}`
                        }
                      />


                      <Legend />


                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Estimated Revenue"
                        stroke="#173f6f"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: "#173f6f",
                        }}
                        activeDot={{
                          r: 7,
                        }}
                      />


                      <Line
                        type="monotone"
                        dataKey="adRevenue"
                        name="Ad Revenue"
                        stroke="#4e82b8"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: "#4e82b8",
                        }}
                      />

                    </LineChart>

                  </ResponsiveContainer>

                )}

              </div>

            </section>


            {/* =================================================
                TWO COLUMN
            ================================================= */}

            <section className="earnings-two-column">


              {/* REVENUE SOURCES */}

              <div className="earnings-card">

                <div className="earnings-card-header">

                  <div>

                    <div className="section-label">
                      REVENUE BREAKDOWN
                    </div>

                    <h2>
                      Revenue Sources
                    </h2>

                    <p>
                      Breakdown of your revenue.
                    </p>

                  </div>

                </div>


                <div className="revenue-source-chart">

                  <ResponsiveContainer
                    width="100%"
                    height={270}
                  >

                    <PieChart>

                      <Pie
                        data={revenueSources}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >

                        {revenueSources.map(
                          (item, index) => (

                            <Cell
                              key={item.name}
                              fill={
                                sourceColors[
                                  index %
                                  sourceColors.length
                                ]
                              }
                            />

                          )
                        )}

                      </Pie>


                      <Tooltip
                        formatter={(value) =>
                          `${value}%`
                        }
                      />


                      <Legend />

                    </PieChart>

                  </ResponsiveContainer>

                </div>


                <div className="revenue-source-list">

                  {revenueSources.map(
                    (item, index) => (

                      <div
                        className="revenue-source-row"
                        key={item.name}
                      >

                        <div>

                          <span
                            className="legend-dot"
                            style={{
                              background:
                                sourceColors[
                                  index %
                                  sourceColors.length
                                ],
                            }}
                          />

                          {item.name}

                        </div>


                        <strong>
                          {item.value}%
                        </strong>

                      </div>

                    )
                  )}

                </div>

              </div>


              {/* MONTHLY REVENUE */}

              <div className="earnings-card">

                <div className="earnings-card-header">

                  <div>

                    <div className="section-label">
                      MONTHLY PERFORMANCE
                    </div>

                    <h2>
                      Monthly Revenue
                    </h2>

                    <p>
                      Revenue generated each month.
                    </p>

                  </div>

                </div>


                <div className="monthly-chart">

                  {monthlyRevenue.length === 0 ? (

                    <div className="empty-content">

                      No monthly earnings data.

                    </div>

                  ) : (

                    <ResponsiveContainer
                      width="100%"
                      height={320}
                    >

                      <BarChart
                        data={monthlyRevenue}
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 10,
                        }}
                      >

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#d8e3f0"
                        />


                        <XAxis
                          dataKey="month"
                          tick={{
                            fill: "#7890a6",
                            fontSize: 12,
                          }}
                        />


                        <YAxis
                          tick={{
                            fill: "#7890a6",
                            fontSize: 12,
                          }}
                        />


                        <Tooltip
                          formatter={(value) =>
                            `$${formatNumber(value)}`
                          }
                        />


                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          fill="#173f6f"
                          radius={[
                            6,
                            6,
                            0,
                            0
                          ]}
                        />

                      </BarChart>

                    </ResponsiveContainer>

                  )}

                </div>

              </div>

            </section>


            {/* =================================================
                EARNINGS RECORDS
            ================================================= */}

            <section className="sponsorship-section">


              <div className="earnings-section-header">

                <div>

                  <div className="section-label">
                    EARNINGS DATA
                  </div>

                  <h2>
                    Earnings Records
                  </h2>

                  <p>
                    Revenue data received from
                    the backend.
                  </p>

                </div>

              </div>


              <div className="sponsorship-table">


                <div className="sponsorship-table-header">

                  <span>
                    DATE
                  </span>

                  <span>
                    ESTIMATED REVENUE
                  </span>

                  <span>
                    AD REVENUE
                  </span>

                  <span>
                    MONETIZED VIEWS
                  </span>

                </div>


                {earnings.length === 0 ? (

                  <div className="empty-content">

                    No earnings records found.

                  </div>

                ) : (

                  earnings

                    .slice()

                    .sort(
                      (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                    )

                    .map(
                      (item, index) => (

                        <div
                          className="sponsorship-row"
                          key={
                            item.id ||
                            index
                          }
                        >

                          <strong>

                            {item.date

                              ? new Date(
                                  item.date
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )

                              : "-"}

                          </strong>


                          <span>

                            $
                            {formatNumber(
                              item.estimated_revenue
                            )}

                          </span>


                          <strong>

                            $
                            {formatNumber(
                              item.ad_revenue
                            )}

                          </strong>


                          <span>

                            {formatNumber(
                              item.monetized_views
                            )}

                          </span>

                        </div>

                      )
                    )

                )}

              </div>

            </section>


            {/* =================================================
                FINANCIAL INSIGHTS
            ================================================= */}

            <section className="financial-insights">


              <div className="section-label">
                FINANCIAL INSIGHTS
              </div>


              <h2>
                Monetization Overview
              </h2>


              <div className="financial-insight-grid">


                <div className="financial-insight-item">

                  <div className="financial-icon">
                    $
                  </div>


                  <div>

                    <strong>
                      Revenue Tracking
                    </strong>

                    <p>

                      CreatorIQ is reading
                      earnings directly from
                      the backend earnings table.

                    </p>

                  </div>

                </div>


                <div className="financial-insight-item">

                  <div className="financial-icon">
                    ◉
                  </div>


                  <div>

                    <strong>
                      Monetized Views
                    </strong>

                    <p>

                      Monetized views measure
                      how much content is
                      contributing to revenue.

                    </p>

                  </div>

                </div>


                <div className="financial-insight-item">

                  <div className="financial-icon">
                    ↗
                  </div>


                  <div>

                    <strong>
                      Revenue Growth
                    </strong>

                    <p>

                      Continue increasing
                      content performance to
                      improve future monetization.

                    </p>

                  </div>

                </div>


              </div>

            </section>


          </>

        )}

      </main>

    </div>

  );

}


export default Earnings;