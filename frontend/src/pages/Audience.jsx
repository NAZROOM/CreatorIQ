import "./audience.css";

import { useEffect, useMemo, useState } from "react";

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

import { useNavigate } from "react-router-dom";

function Audience() {
  const navigate = useNavigate();

  // =====================================================
  // STATES
  // =====================================================

  const [channel, setChannel] = useState(null);
  const [youtubeData, setYoutubeData] = useState(null);

  // =====================================================
  // LOAD SELECTED YOUTUBE CHANNEL
  // =====================================================

  useEffect(() => {
    try {
      const savedChannel = localStorage.getItem(
        "selectedYoutubeChannel"
      );

      const savedYoutubeData = localStorage.getItem(
        "selectedYoutubeData"
      );

      if (savedChannel) {
        const parsedChannel = JSON.parse(savedChannel);
        setChannel(parsedChannel);
      }

      if (savedYoutubeData) {
        const parsedData = JSON.parse(savedYoutubeData);

        setYoutubeData(parsedData);

        if (!savedChannel && parsedData?.channel) {
          setChannel(parsedData.channel);
        }
      }
    } catch (error) {
      console.error(
        "Error loading YouTube audience data:",
        error
      );
    }
  }, []);

  // =====================================================
  // CHANNEL NAME
  // =====================================================

  const channelName =
    channel?.channel_name ||
    channel?.name ||
    channel?.title ||
    channel?.channelName ||
    youtubeData?.channel?.channel_name ||
    "Selected Creator";

  // =====================================================
  // CHANNEL IMAGE
  // =====================================================

  const channelImage =
    channel?.thumbnail ||
    channel?.thumbnailUrl ||
    channel?.image ||
    channel?.imageUrl ||
    channel?.profileImage ||
    channel?.profilePicture ||
    youtubeData?.channel?.thumbnail ||
    "";

  // =====================================================
  // SUBSCRIBERS
  // =====================================================

  const subscribers = Number(
    channel?.subscribers ||
      channel?.subscriber_count ||
      channel?.subscriberCount ||
      channel?.statistics?.subscriberCount ||
      youtubeData?.channel?.subscribers ||
      0
  );

  // =====================================================
  // TOTAL VIEWS
  // =====================================================

  const totalViews = Number(
    channel?.total_views ||
      channel?.totalViews ||
      channel?.views ||
      channel?.view_count ||
      channel?.viewCount ||
      channel?.statistics?.viewCount ||
      youtubeData?.channel?.total_views ||
      0
  );

  // =====================================================
  // TOTAL VIDEOS
  // =====================================================

  const videoCount = Number(
    channel?.video_count ||
      channel?.videoCount ||
      channel?.videos ||
      channel?.statistics?.videoCount ||
      youtubeData?.channel?.video_count ||
      0
  );

  // =====================================================
  // RECENT VIDEOS
  // Used only for audience calculations and graph
  // =====================================================

  const recentVideos =
    youtubeData?.recent_videos ||
    youtubeData?.recentVideos ||
    [];

  // =====================================================
  // FORMAT NUMBER
  // =====================================================

  const formatNumber = (number) => {
    const value = Number(number);

    if (!Number.isFinite(value)) {
      return "0";
    }

    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + "B";
    }

    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + "M";
    }

    if (value >= 1000) {
      return (value / 1000).toFixed(1) + "K";
    }

    return value.toLocaleString();
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  // =====================================================
  // TOTAL RECENT VIEWS
  // =====================================================

  const totalRecentViews = recentVideos.reduce(
    (sum, video) =>
      sum + Number(video.views || 0),
    0
  );

  // =====================================================
  // TOTAL RECENT LIKES
  // =====================================================

  const totalRecentLikes = recentVideos.reduce(
    (sum, video) =>
      sum + Number(video.likes || 0),
    0
  );

  // =====================================================
  // TOTAL RECENT COMMENTS
  // =====================================================

  const totalRecentComments = recentVideos.reduce(
    (sum, video) =>
      sum + Number(video.comments || 0),
    0
  );

  // =====================================================
  // AVERAGE VIEWS
  // =====================================================

  const averageViews =
    recentVideos.length > 0
      ? Math.round(
          totalRecentViews /
            recentVideos.length
        )
      : 0;

  // =====================================================
  // AVERAGE LIKES
  // =====================================================

  const averageLikes =
    recentVideos.length > 0
      ? Math.round(
          totalRecentLikes /
            recentVideos.length
        )
      : 0;

  // =====================================================
  // AVERAGE COMMENTS
  // =====================================================

  const averageComments =
    recentVideos.length > 0
      ? Math.round(
          totalRecentComments /
            recentVideos.length
        )
      : 0;

  // =====================================================
  // ENGAGEMENT RATE
  // =====================================================

  const engagementRate =
    totalRecentViews > 0
      ? (
          ((totalRecentLikes +
            totalRecentComments) /
            totalRecentViews) *
          100
        ).toFixed(2)
      : "0.00";

  // =====================================================
  // AUDIENCE BEHAVIOR DATA
  // =====================================================

  const behaviorData = useMemo(() => {
    return recentVideos
      .slice(0, 8)
      .map((video, index) => {
        const fullTitle =
          video.title ||
          `Video ${index + 1}`;

        let shortTitle = fullTitle;

        if (shortTitle.length > 18) {
          shortTitle =
            shortTitle.substring(0, 18) +
            "...";
        }

        return {
          name: shortTitle,
          fullTitle: fullTitle,
          views: Number(video.views || 0),
          likes: Number(video.likes || 0),
          comments: Number(video.comments || 0),
        };
      });
  }, [recentVideos]);

  // =====================================================
  // ENGAGEMENT DISTRIBUTION DATA
  // =====================================================

  const engagementDistribution = useMemo(() => {
    return [
      {
        name: "Views",
        value: totalRecentViews,
      },
      {
        name: "Likes",
        value: totalRecentLikes,
      },
      {
        name: "Comments",
        value: totalRecentComments,
      },
    ].filter((item) => item.value > 0);
  }, [
    totalRecentViews,
    totalRecentLikes,
    totalRecentComments,
  ]);

  // =====================================================
  // NO CHANNEL
  // =====================================================

  const noChannel =
    !channel && !youtubeData;

  // =====================================================
  // CUSTOM TOOLTIP FOR GRAPH
  // Shows FULL video title
  // =====================================================

  const CustomGraphTooltip = ({
    active,
    payload,
  }) => {
    if (
      !active ||
      !payload ||
      payload.length === 0
    ) {
      return null;
    }

    const data = payload[0]?.payload;

    if (!data) {
      return null;
    }

    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5ebf1",
          borderRadius: "10px",
          padding: "14px 16px",
          boxShadow:
            "0 8px 25px rgba(23,63,111,0.12)",
          maxWidth: "320px",
        }}
      >
        <div
          style={{
            fontWeight: "700",
            color: "#182b3d",
            fontSize: "14px",
            lineHeight: "1.4",
            marginBottom: "10px",
          }}
        >
          {data.fullTitle}
        </div>

        {payload.map((item) => (
          <div
            key={item.dataKey}
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: "25px",
              fontSize: "13px",
              marginTop: "5px",
            }}
          >
            <span
              style={{
                color: "#60758c",
              }}
            >
              {item.name}
            </span>

            <strong
              style={{
                color: "#173F6F",
              }}
            >
              {formatNumber(item.value)}
            </strong>
          </div>
        ))}
      </div>
    );
  };

  // =====================================================
  // PIE COLORS
  // =====================================================

  const pieColors = [
    "#173F6F",
    "#4E82B8",
    "#8EACC9",
  ];

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="audience-page">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="audience-sidebar">

        {/* LOGO */}

        <div
          className="audience-logo"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <span className="audience-logo-mark">
            ✦
          </span>

          CreatorIQ
        </div>

        {/* NAVIGATION */}

        <nav className="audience-navigation">

          <div
            className="audience-nav-item"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <span>▦</span>
            Dashboard
          </div>

          <div
            className="audience-nav-item"
            onClick={() =>
              navigate("/content")
            }
          >
            <span>▤</span>
            Content
          </div>

          <div className="audience-nav-item active">
            <span>◉</span>
            Audience
          </div>

          <div
            className="audience-nav-item"
            onClick={() =>
              navigate("/growth-trends")
            }
          >
            <span>↗</span>
            Growth & Trends
          </div>

          <div
            className="audience-nav-item"
            onClick={() =>
              navigate("/earnings")
            }
          >
            <span>₹</span>
            Earnings
          </div>

          <div
            className="audience-nav-item"
            onClick={() =>
              navigate("/social-media")
            }
          >
            <span>◎</span>
            Social Media
          </div>

          <div
            className="audience-nav-item"
            onClick={() =>
              navigate("/settings")
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

      <main className="audience-main">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="audience-header">

          <div>

            <div className="audience-page-label">
              CREATOR INSIGHTS
            </div>

            <h1>
              Audience Analytics
            </h1>

            <p>
              Understand audience size,
              engagement and content
              performance.
            </p>

            {channel && (
              <div
                style={{
                  marginTop: "14px",
                  fontWeight: "600",
                  color: "#173F6F",
                }}
              >
                Analyzing: {channelName}
              </div>
            )}

          </div>

          <div className="audience-live">

            <span className="audience-live-dot"></span>

            YouTube data

          </div>

        </header>

        {/* =================================================
            NO CHANNEL
        ================================================= */}

        {noChannel ? (

          <section className="audience-loading">

            <h2>
              No YouTube channel selected
            </h2>

            <p>
              Please analyze a YouTube channel
              from the Content page first.
            </p>

            <button
              onClick={() =>
                navigate("/content")
              }
              style={{
                marginTop: "20px",
                padding: "12px 22px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                background: "#173F6F",
                color: "#ffffff",
                fontWeight: "600",
              }}
            >
              Go to Content
            </button>

          </section>

        ) : (

          <>

            {/* =================================================
                SECTION 1
                CHANNEL PROFILE
            ================================================= */}

            <section className="audience-card">

              <div className="audience-section-label">
                SELECTED CREATOR
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                  marginTop: "15px",
                }}
              >

                {channelImage ? (

                  <img
                    src={channelImage}
                    alt={channelName}
                    referrerPolicy="no-referrer"
                    style={{
                      width: "70px",
                      height: "70px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />

                ) : (

                  <div
                    style={{
                      width: "70px",
                      height: "70px",
                      borderRadius: "50%",
                      background: "#173F6F",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "26px",
                      fontWeight: "700",
                    }}
                  >
                    {channelName
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                )}

                <div>

                  <h2 style={{ margin: 0 }}>
                    {channelName}
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0",
                    }}
                  >
                    YouTube audience overview
                  </p>

                </div>

              </div>

            </section>

            {/* =================================================
                SECTION 2
                KPI CARDS
            ================================================= */}

            <section className="audience-kpi-grid">

              {/* TOTAL FOLLOWERS */}

              <div className="audience-kpi-card">

                <div className="audience-kpi-top">

                  <span>
                    TOTAL FOLLOWERS
                  </span>

                  <div className="audience-kpi-icon">
                    ◎
                  </div>

                </div>

                <h2>
                  {formatNumber(
                    subscribers
                  )}
                </h2>

                <p>
                  YouTube subscribers
                </p>

              </div>

              {/* TOTAL VIEWS */}

              <div className="audience-kpi-card">

                <div className="audience-kpi-top">

                  <span>
                    TOTAL VIEWS
                  </span>

                  <div className="audience-kpi-icon">
                    ◉
                  </div>

                </div>

                <h2>
                  {formatNumber(
                    totalViews
                  )}
                </h2>

                <p>
                  Channel lifetime views
                </p>

              </div>

              {/* TOTAL VIDEOS */}

              <div className="audience-kpi-card">

                <div className="audience-kpi-top">

                  <span>
                    TOTAL VIDEOS
                  </span>

                  <div className="audience-kpi-icon">
                    ▤
                  </div>

                </div>

                <h2>
                  {formatNumber(
                    videoCount
                  )}
                </h2>

                <p>
                  Published videos
                </p>

              </div>

              {/* AVG VIEWS */}

              <div className="audience-kpi-card">

                <div className="audience-kpi-top">

                  <span>
                    AVG. VIEWS
                  </span>

                  <div className="audience-kpi-icon">
                    ◉
                  </div>

                </div>

                <h2>
                  {formatNumber(
                    averageViews
                  )}
                </h2>

                <p>
                  Per recent video
                </p>

              </div>

            </section>

            {/* =================================================
                SECTION 3
                AUDIENCE INSIGHTS
            ================================================= */}

            <section className="audience-card">

              <div className="audience-section-label">
                AUDIENCE INSIGHTS
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "flex-start",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >

                <div>

                  <h2>
                    Audience Engagement
                  </h2>

                  <p>
                    Public engagement signals
                    based on {channelName}'s
                    recent videos.
                  </p>

                </div>

                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: "20px",
                    background: "#eef5fb",
                    color: "#173F6F",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {recentVideos.length} videos analyzed
                </div>

              </div>

              <div
                className="audience-kpi-grid"
                style={{
                  marginTop: "25px",
                }}
              >

                {/* AVG LIKES */}

                <div className="audience-kpi-card">

                  <div className="audience-kpi-top">

                    <span>
                      AVG. LIKES
                    </span>

                    <div className="audience-kpi-icon">
                      ♥
                    </div>

                  </div>

                  <h2>
                    {formatNumber(
                      averageLikes
                    )}
                  </h2>

                  <p>
                    Per recent video
                  </p>

                </div>

                {/* AVG COMMENTS */}

                <div className="audience-kpi-card">

                  <div className="audience-kpi-top">

                    <span>
                      AVG. COMMENTS
                    </span>

                    <div className="audience-kpi-icon">
                      ◌
                    </div>

                  </div>

                  <h2>
                    {formatNumber(
                      averageComments
                    )}
                  </h2>

                  <p>
                    Per recent video
                  </p>

                </div>

                {/* ENGAGEMENT RATE */}

                <div className="audience-kpi-card">

                  <div className="audience-kpi-top">

                    <span>
                      ENGAGEMENT RATE
                    </span>

                    <div className="audience-kpi-icon">
                      ↗
                    </div>

                  </div>

                  <h2>
                    {engagementRate}%
                  </h2>

                  <p>
                    Likes + comments / views
                  </p>

                </div>

                {/* AUDIENCE INTERACTIONS */}

                <div className="audience-kpi-card">

                  <div className="audience-kpi-top">

                    <span>
                      TOTAL INTERACTIONS
                    </span>

                    <div className="audience-kpi-icon">
                      ♥
                    </div>

                  </div>

                  <h2>
                    {formatNumber(
                      totalRecentLikes +
                        totalRecentComments
                    )}
                  </h2>

                  <p>
                    Likes + comments
                  </p>

                </div>

              </div>

            </section>

            {/* =================================================
                SECTION 4
                AUDIENCE BEHAVIOR
            ================================================= */}

            <section className="audience-card">

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "flex-start",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >

                <div>

                  <div className="audience-section-label">
                    AUDIENCE BEHAVIOR
                  </div>

                  <h2>
                    Audience Engagement
                  </h2>

                  <p>
                    Compare views, likes and
                    comments across recent videos.
                  </p>

                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "18px",
                    alignItems: "center",
                    fontSize: "13px",
                    color: "#60758c",
                  }}
                >

                  <span>
                    <span
                      style={{
                        display:
                          "inline-block",
                        width: "9px",
                        height: "9px",
                        borderRadius:
                          "50%",
                        background:
                          "#173F6F",
                        marginRight: "6px",
                      }}
                    ></span>

                    Views
                  </span>

                  <span>
                    <span
                      style={{
                        display:
                          "inline-block",
                        width: "9px",
                        height: "9px",
                        borderRadius:
                          "50%",
                        background:
                          "#4E82B8",
                        marginRight: "6px",
                      }}
                    ></span>

                    Likes
                  </span>

                  <span>
                    <span
                      style={{
                        display:
                          "inline-block",
                        width: "9px",
                        height: "9px",
                        borderRadius:
                          "50%",
                        background:
                          "#8EACC9",
                        marginRight: "6px",
                      }}
                    ></span>

                    Comments
                  </span>

                </div>

              </div>

              <div
                style={{
                  width: "100%",
                  height: "380px",
                  marginTop: "30px",
                }}
              >

                {behaviorData.length > 0 ? (

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <LineChart
                      data={behaviorData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 10,
                        bottom: 20,
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 11,
                        }}
                        interval={0}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={
                          formatNumber
                        }
                        width={60}
                      />

                      <Tooltip
                        content={
                          <CustomGraphTooltip />
                        }
                      />

                      <Line
                        type="monotone"
                        dataKey="views"
                        name="Views"
                        stroke="#173F6F"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                        }}
                        activeDot={{
                          r: 7,
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="likes"
                        name="Likes"
                        stroke="#4E82B8"
                        strokeWidth={2}
                        dot={{
                          r: 3,
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="comments"
                        name="Comments"
                        stroke="#8EACC9"
                        strokeWidth={2}
                        dot={{
                          r: 3,
                        }}
                      />

                    </LineChart>

                  </ResponsiveContainer>

                ) : (

                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      background:
                        "#f7f9fc",
                      borderRadius: "12px",
                      color: "#66788a",
                    }}
                  >
                    No recent video
                    performance data
                    available.
                  </div>

                )}

              </div>

            </section>

            {/* =================================================
                SECTION 5
                ENGAGEMENT DISTRIBUTION
            ================================================= */}

            <section className="audience-card">

              <div className="audience-section-label">
                ENGAGEMENT DISTRIBUTION
              </div>

              <h2>
                Audience Interaction Distribution
              </h2>

              <p>
                Overview of how views, likes and
                comments are distributed across
                {channelName}'s recent content.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0, 1fr) minmax(260px, 360px)",
                  gap: "35px",
                  alignItems: "center",
                  marginTop: "25px",
                }}
              >

                {/* PIE CHART */}

                <div
                  style={{
                    width: "100%",
                    height: "330px",
                  }}
                >

                  {engagementDistribution.length >
                  0 ? (

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >

                      <PieChart>

                        <Pie
                          data={
                            engagementDistribution
                          }
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={75}
                          outerRadius={115}
                          paddingAngle={3}
                          label={({ name }) =>
                            name
                          }
                        >

                          {engagementDistribution.map(
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

                        <Tooltip
                          formatter={(
                            value,
                            name
                          ) => [
                            formatNumber(value),
                            name,
                          ]}
                        />

                        <Legend />

                      </PieChart>

                    </ResponsiveContainer>

                  ) : (

                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        background:
                          "#f7f9fc",
                        borderRadius:
                          "12px",
                        color:
                          "#66788a",
                      }}
                    >
                      No engagement
                      distribution data
                      available.
                    </div>

                  )}

                </div>

                {/* ENGAGEMENT SUMMARY */}

                <div
                  style={{
                    display: "flex",
                    flexDirection:
                      "column",
                    gap: "14px",
                  }}
                >

                  <div
                    style={{
                      padding: "18px",
                      borderRadius: "12px",
                      background:
                        "#f7f9fc",
                      border:
                        "1px solid #edf1f5",
                    }}
                  >

                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color:
                          "#708297",
                        textTransform:
                          "uppercase",
                      }}
                    >
                      Recent Views
                    </div>

                    <div
                      style={{
                        marginTop: "7px",
                        fontSize: "24px",
                        fontWeight: "700",
                        color:
                          "#173F6F",
                      }}
                    >
                      {formatNumber(
                        totalRecentViews
                      )}
                    </div>

                  </div>

                  <div
                    style={{
                      padding: "18px",
                      borderRadius: "12px",
                      background:
                        "#f7f9fc",
                      border:
                        "1px solid #edf1f5",
                    }}
                  >

                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color:
                          "#708297",
                        textTransform:
                          "uppercase",
                      }}
                    >
                      Recent Likes
                    </div>

                    <div
                      style={{
                        marginTop: "7px",
                        fontSize: "24px",
                        fontWeight: "700",
                        color:
                          "#173F6F",
                      }}
                    >
                      {formatNumber(
                        totalRecentLikes
                      )}
                    </div>

                  </div>

                  <div
                    style={{
                      padding: "18px",
                      borderRadius: "12px",
                      background:
                        "#f7f9fc",
                      border:
                        "1px solid #edf1f5",
                    }}
                  >

                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color:
                          "#708297",
                        textTransform:
                          "uppercase",
                      }}
                    >
                      Recent Comments
                    </div>

                    <div
                      style={{
                        marginTop: "7px",
                        fontSize: "24px",
                        fontWeight: "700",
                        color:
                          "#173F6F",
                      }}
                    >
                      {formatNumber(
                        totalRecentComments
                      )}
                    </div>

                  </div>

                </div>

              </div>

            </section>

            {/* =================================================
                SECTION 6
                QUICK AUDIENCE SUMMARY
            ================================================= */}

            <section className="audience-card">

              <div className="audience-section-label">
                AUDIENCE SUMMARY
              </div>

              <h2>
                {channelName}
              </h2>

              <p>
                Key publicly available audience
                signals for this YouTube creator.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: "18px",
                  marginTop: "25px",
                }}
              >

                {/* SUBSCRIBERS */}

                <div
                  style={{
                    padding: "22px",
                    background:
                      "#f7f9fc",
                    borderRadius:
                      "12px",
                    border:
                      "1px solid #edf1f5",
                  }}
                >

                  <span
                    style={{
                      fontSize: "12px",
                      color:
                        "#708297",
                      fontWeight:
                        "600",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Subscribers
                  </span>

                  <h3
                    style={{
                      margin:
                        "8px 0 0",
                      fontSize:
                        "24px",
                      color:
                        "#173F6F",
                    }}
                  >
                    {formatNumber(
                      subscribers
                    )}
                  </h3>

                </div>

                {/* VIEWS */}

                <div
                  style={{
                    padding: "22px",
                    background:
                      "#f7f9fc",
                    borderRadius:
                      "12px",
                    border:
                      "1px solid #edf1f5",
                  }}
                >

                  <span
                    style={{
                      fontSize: "12px",
                      color:
                        "#708297",
                      fontWeight:
                        "600",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Total Views
                  </span>

                  <h3
                    style={{
                      margin:
                        "8px 0 0",
                      fontSize:
                        "24px",
                      color:
                        "#173F6F",
                    }}
                  >
                    {formatNumber(
                      totalViews
                    )}
                  </h3>

                </div>

                {/* VIDEOS */}

                <div
                  style={{
                    padding: "22px",
                    background:
                      "#f7f9fc",
                    borderRadius:
                      "12px",
                    border:
                      "1px solid #edf1f5",
                  }}
                >

                  <span
                    style={{
                      fontSize: "12px",
                      color:
                        "#708297",
                      fontWeight:
                        "600",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Published Videos
                  </span>

                  <h3
                    style={{
                      margin:
                        "8px 0 0",
                      fontSize:
                        "24px",
                      color:
                        "#173F6F",
                    }}
                  >
                    {formatNumber(
                      videoCount
                    )}
                  </h3>

                </div>

              </div>

            </section>

          </>

        )}

      </main>

    </div>
  );
}

export default Audience;