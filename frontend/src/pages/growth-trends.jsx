import "./growth-trends.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function GrowthTrends() {
  const navigate = useNavigate();

  const [channel, setChannel] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [videos, setVideos] = useState([]);

  // =====================================================
  // LOAD SAME SELECTED CREATOR
  // =====================================================

  useEffect(() => {
    const loadCreatorData = () => {
      try {
        const savedChannel = localStorage.getItem(
          "selectedYoutubeChannel"
        );

        const savedAnalytics = localStorage.getItem(
          "selectedYoutubeAnalytics"
        );

        const savedVideos = localStorage.getItem(
          "selectedYoutubeVideos"
        );

        setChannel(
          savedChannel
            ? JSON.parse(savedChannel)
            : null
        );

        setAnalytics(
          savedAnalytics
            ? JSON.parse(savedAnalytics)
            : null
        );

        setVideos(
          savedVideos
            ? JSON.parse(savedVideos)
            : []
        );
      } catch (error) {
        console.error(
          "Error loading creator data:",
          error
        );

        setChannel(null);
        setAnalytics(null);
        setVideos([]);
      }
    };

    loadCreatorData();

    window.addEventListener(
      "selectedYoutubeChannelChanged",
      loadCreatorData
    );

    window.addEventListener(
      "storage",
      loadCreatorData
    );

    return () => {
      window.removeEventListener(
        "selectedYoutubeChannelChanged",
        loadCreatorData
      );

      window.removeEventListener(
        "storage",
        loadCreatorData
      );
    };
  }, []);

  // =====================================================
  // CHANNEL DATA
  // =====================================================

  const channelName =
    channel?.channel_name ||
    channel?.title ||
    "No channel selected";

  const subscribers = Number(
    channel?.subscribers ??
      channel?.subscriber_count ??
      channel?.subscriberCount ??
      0
  );

  const totalViews = Number(
    channel?.total_views ??
      channel?.views ??
      channel?.view_count ??
      channel?.viewCount ??
      0
  );

  const totalVideos = Number(
    channel?.video_count ??
      channel?.videos ??
      channel?.videoCount ??
      0
  );

  const thumbnail =
    channel?.thumbnail ||
    channel?.thumbnail_url ||
    channel?.thumbnailUrl ||
    "";

  // =====================================================
  // SAFE NUMBER
  // =====================================================

  const getNumber = (...values) => {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        Number.isFinite(Number(value))
      ) {
        return Number(value);
      }
    }

    return 0;
  };

  // =====================================================
  // FORMAT NUMBER
  // =====================================================

  const formatNumber = (number) => {
    const value = Number(number) || 0;

    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }

    return value.toLocaleString();
  };

  // =====================================================
  // FORMAT PERCENTAGE
  // =====================================================

  const formatPercentage = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0.00%";
    }

    if (number > 0) {
      return `+${number.toFixed(2)}%`;
    }

    return `${number.toFixed(2)}%`;
  };

  // =====================================================
  // SORT VIDEOS BY DATE
  // =====================================================

  const sortedVideos = useMemo(() => {
    if (!Array.isArray(videos)) {
      return [];
    }

    return videos
      .slice()
      .sort((a, b) => {
        const dateA = a?.published_at
          ? new Date(a.published_at).getTime()
          : 0;

        const dateB = b?.published_at
          ? new Date(b.published_at).getTime()
          : 0;

        return dateB - dateA;
      });
  }, [videos]);

  // =====================================================
  // VIDEO METRICS
  // =====================================================

  const videoMetrics = useMemo(() => {
    if (sortedVideos.length === 0) {
      return {
        totalVideoViews: 0,
        totalLikes: 0,
        totalComments: 0,
        averageViews: 0,
        averageLikes: 0,
        averageComments: 0,
        engagementRate: 0,
        recentAverageViews: 0,
        olderAverageViews: 0,
        contentViewGrowth: 0,
        recentVideoCount: 0,
        olderVideoCount: 0,
      };
    }

    // ---------------------------------------------------
    // TOTAL VIEWS
    // ---------------------------------------------------

    const totalVideoViews = sortedVideos.reduce(
      (sum, video) =>
        sum +
        getNumber(
          video?.views,
          video?.view_count,
          video?.viewCount
        ),
      0
    );

    // ---------------------------------------------------
    // TOTAL LIKES
    // ---------------------------------------------------

    const totalLikes = sortedVideos.reduce(
      (sum, video) =>
        sum +
        getNumber(
          video?.likes,
          video?.like_count,
          video?.likeCount
        ),
      0
    );

    // ---------------------------------------------------
    // TOTAL COMMENTS
    // ---------------------------------------------------

    const totalComments = sortedVideos.reduce(
      (sum, video) =>
        sum +
        getNumber(
          video?.comments,
          video?.comment_count,
          video?.commentCount
        ),
      0
    );

    const count = sortedVideos.length;

    // ---------------------------------------------------
    // AVERAGES
    // ---------------------------------------------------

    const averageViews =
      count > 0
        ? totalVideoViews / count
        : 0;

    const averageLikes =
      count > 0
        ? totalLikes / count
        : 0;

    const averageComments =
      count > 0
        ? totalComments / count
        : 0;

    // ---------------------------------------------------
    // ENGAGEMENT RATE
    // ---------------------------------------------------

    const engagementRate =
      totalVideoViews > 0
        ? ((totalLikes + totalComments) /
            totalVideoViews) *
          100
        : 0;

    // ---------------------------------------------------
    // RECENT VIDEOS
    // Latest 3 videos
    // ---------------------------------------------------

    const recentVideos =
      sortedVideos.slice(0, 3);

    // ---------------------------------------------------
    // OLDER VIDEOS
    // Previous 3 videos
    // ---------------------------------------------------

    const olderVideos =
      sortedVideos.slice(3, 6);

    // ---------------------------------------------------
    // RECENT AVERAGE
    // ---------------------------------------------------

    let recentAverageViews = 0;

    if (recentVideos.length > 0) {
      const recentTotal =
        recentVideos.reduce(
          (sum, video) =>
            sum +
            getNumber(
              video?.views,
              video?.view_count,
              video?.viewCount
            ),
          0
        );

      recentAverageViews =
        recentTotal / recentVideos.length;
    }

    // ---------------------------------------------------
    // OLDER AVERAGE
    // ---------------------------------------------------

    let olderAverageViews = 0;

    if (olderVideos.length > 0) {
      const olderTotal =
        olderVideos.reduce(
          (sum, video) =>
            sum +
            getNumber(
              video?.views,
              video?.view_count,
              video?.viewCount
            ),
          0
        );

      olderAverageViews =
        olderTotal / olderVideos.length;
    }

    // ---------------------------------------------------
    // CONTENT VIEW GROWTH
    // ---------------------------------------------------

    let contentViewGrowth = 0;

    if (
      recentAverageViews > 0 &&
      olderAverageViews > 0
    ) {
      contentViewGrowth =
        ((recentAverageViews -
          olderAverageViews) /
          olderAverageViews) *
        100;
    }

    return {
      totalVideoViews,
      totalLikes,
      totalComments,
      averageViews,
      averageLikes,
      averageComments,
      engagementRate,
      recentAverageViews,
      olderAverageViews,
      contentViewGrowth,
      recentVideoCount: recentVideos.length,
      olderVideoCount: olderVideos.length,
    };
  }, [sortedVideos]);

  // =====================================================
  // ENGAGEMENT RATE
  // =====================================================

  const realEngagementRate = useMemo(() => {
    const apiRate = getNumber(
      analytics?.engagement_rate,
      analytics?.engagementRate,
      channel?.engagement_rate,
      channel?.engagementRate
    );

    if (apiRate > 0) {
      return apiRate;
    }

    return videoMetrics.engagementRate;
  }, [
    analytics,
    channel,
    videoMetrics.engagementRate,
  ]);

  // =====================================================
  // METRICS
  // =====================================================

  const averageViews =
    videoMetrics.averageViews;

  const contentViewGrowth =
    videoMetrics.contentViewGrowth;

  // =====================================================
  // MONTHLY VIDEO VIEWS
  // =====================================================

  const monthlyViewData = useMemo(() => {
    if (
      !Array.isArray(sortedVideos) ||
      sortedVideos.length === 0
    ) {
      return [];
    }

    const months = {};

    sortedVideos.forEach((video) => {
      if (!video?.published_at) {
        return;
      }

      const date = new Date(
        video.published_at
      );

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const monthKey =
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

      const monthName =
        date.toLocaleString(
          "en-US",
          {
            month: "short",
          }
        );

      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthName,
          views: 0,
          videos: 0,
        };
      }

      months[monthKey].views +=
        getNumber(
          video?.views,
          video?.view_count,
          video?.viewCount
        );

      months[monthKey].videos += 1;
    });

    return Object.keys(months)
      .sort()
      .slice(-6)
      .map((key) => months[key]);
  }, [sortedVideos]);

  // =====================================================
  // TREND STATUS
  // =====================================================

  const getTrendStatus = (
    value,
    positiveText,
    negativeText
  ) => {
    if (value > 0) {
      return positiveText;
    }

    if (value < 0) {
      return negativeText;
    }

    return "Stable performance";
  };

  // =====================================================
  // CONTENT TREND
  // =====================================================

  const contentStatus =
    getTrendStatus(
      contentViewGrowth,
      "Recent content is getting more views",
      "Recent content is getting fewer views"
    );

  // =====================================================
  // ENGAGEMENT TREND
  // =====================================================

  const engagementStatus =
    realEngagementRate > 0
      ? "Engagement data is available"
      : "Engagement data is unavailable";

  // =====================================================
  // VIEW TREND
  // =====================================================

  const viewTrendStatus =
    monthlyViewData.length >= 2
      ? (() => {
          const latest =
            monthlyViewData[
              monthlyViewData.length - 1
            ]?.views || 0;

          const previous =
            monthlyViewData[
              monthlyViewData.length - 2
            ]?.views || 0;

          if (latest > previous) {
            return "Increasing ↗";
          }

          if (latest < previous) {
            return "Decreasing ↘";
          }

          return "Stable →";
        })()
      : "Stable →";

  // =====================================================
  // CREATOR ACTIVITY
  // =====================================================

  const creatorActivityStatus =
    sortedVideos.length >= 3
      ? "Creator has recent video activity"
      : "Limited recent video data";

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="growth-page">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="growth-sidebar">

        <div
          className="growth-logo"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <span>✦</span>
          CreatorIQ
        </div>

        <nav className="growth-navigation">

          <div
            className="growth-nav-item"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <span>▦</span>
            Dashboard
          </div>

          <div
            className="growth-nav-item"
            onClick={() =>
              navigate("/content")
            }
          >
            <span>▤</span>
            Content
          </div>

          <div
            className="growth-nav-item"
            onClick={() =>
              navigate("/audience")
            }
          >
            <span>◉</span>
            Audience
          </div>

          <div className="growth-nav-item active">
            <span>↗</span>
            Growth & Trends
          </div>

          <div
            className="growth-nav-item"
            onClick={() =>
              navigate("/earnings")
            }
          >
            <span>₹</span>
            Earnings
          </div>

          <div
            className="growth-nav-item"
            onClick={() =>
              navigate("/social-media")
            }
          >
            <span>🔗</span>
            Social Media
          </div>

          <div
            className="growth-nav-item"
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

      <main className="growth-main">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="growth-header">

          <div>

            <div className="growth-label">
              CREATOR INSIGHTS
            </div>

            <h1>
              Growth & Trends
            </h1>

            <p>
              Track{" "}
              <strong>
                {channelName}
              </strong>{" "}
              content performance, engagement,
              and available YouTube trends.
            </p>

          </div>

          <div className="growth-live">
            <span></span>
            Live data
          </div>

        </header>

        {/* =================================================
            SELECTED CREATOR
        ================================================= */}

        <section className="growth-card growth-creator-card">

          <div className="growth-section-label">
            SELECTED CREATOR
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              marginTop: "16px",
            }}
          >

            {thumbnail ? (
              <img
                src={thumbnail}
                alt={channelName}
                referrerPolicy="no-referrer"
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border:
                    "3px solid #e6eef6",
                }}
                onError={(e) => {
                  e.currentTarget.style.display =
                    "none";
                }}
              />
            ) : (
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  minWidth: "72px",
                  borderRadius: "50%",
                  background: "#173f6f",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: "700",
                }}
              >
                {channelName !==
                "No channel selected"
                  ? channelName
                      .charAt(0)
                      .toUpperCase()
                  : "C"}
              </div>
            )}

            <div>

              <h2
                style={{
                  margin: 0,
                  marginBottom: "6px",
                }}
              >
                {channelName}
              </h2>

              <p
                className="growth-description"
                style={{
                  margin: 0,
                }}
              >
                Growth insights use available
                YouTube channel and video data.
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            GROWTH / PERFORMANCE KPI CARDS
        ================================================= */}

        <section className="growth-kpi-grid">

          {/* CONTENT VIEW GROWTH */}

          <div className="growth-kpi-card">

            <span>
              CONTENT VIEW GROWTH
            </span>

            <h2>
              {formatPercentage(
                contentViewGrowth
              )}
            </h2>

            <p>
              Recent 3 videos vs previous 3
              videos
            </p>

          </div>

          {/* ENGAGEMENT RATE */}

          <div className="growth-kpi-card">

            <span>
              ENGAGEMENT RATE
            </span>

            <h2>
              {formatPercentage(
                realEngagementRate
              )}
            </h2>

            <p>
              Based on actual views, likes and
              comments
            </p>

          </div>

          {/* AVERAGE VIEWS */}

          <div className="growth-kpi-card">

            <span>
              AVERAGE VIEWS
            </span>

            <h2>
              {formatNumber(
                averageViews
              )}
            </h2>

            <p>
              Average views per analyzed video
            </p>

          </div>

          {/* VIEW TREND */}

          <div className="growth-kpi-card">

            <span>
              VIEW TREND
            </span>

            <h2>
              {viewTrendStatus}
            </h2>

            <p>
              Based on recent monthly content views
            </p>

          </div>

        </section>

        {/* =================================================
            YOUTUBE STATISTICS
        ================================================= */}

        <section className="growth-kpi-grid">

          <div className="growth-kpi-card">

            <span>
              SUBSCRIBERS
            </span>

            <h2>
              {formatNumber(
                subscribers
              )}
            </h2>

            <p>
              Current YouTube subscriber count
            </p>

          </div>

          <div className="growth-kpi-card">

            <span>
              TOTAL VIEWS
            </span>

            <h2>
              {formatNumber(
                totalViews
              )}
            </h2>

            <p>
              Current channel view count
            </p>

          </div>

          <div className="growth-kpi-card">

            <span>
              TOTAL VIDEOS
            </span>

            <h2>
              {formatNumber(
                totalVideos
              )}
            </h2>

            <p>
              Published videos on the channel
            </p>

          </div>

          <div className="growth-kpi-card">

            <span>
              ANALYZED VIDEOS
            </span>

            <h2>
              {formatNumber(
                sortedVideos.length
              )}
            </h2>

            <p>
              Videos available for performance
              analysis
            </p>

          </div>

        </section>

        {/* =================================================
            CONTENT PERFORMANCE CHART
        ================================================= */}

        <section className="growth-card growth-chart-card">

          <div className="growth-card-header">

            <div>

              <div className="growth-section-label">
                CONTENT PERFORMANCE
              </div>

              <h2>
                Monthly Content Views
              </h2>

              <p>
                Actual video views grouped by
                publishing month.
              </p>

            </div>

            <div className="growth-filter">
              Last 6 Months
            </div>

          </div>

          <div className="growth-chart-wrapper">

            {monthlyViewData.length > 0 ? (

              <ResponsiveContainer
                width="100%"
                height={350}
              >

                <LineChart
                  data={monthlyViewData}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 10,
                    bottom: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#dce7f1"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#6d849b",
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#6d849b",
                      fontSize: 12,
                    }}
                    tickFormatter={(value) =>
                      formatNumber(value)
                    }
                  />

                  <Tooltip
                    cursor={{
                      stroke: "#b8c9d9",
                      strokeDasharray:
                        "4 4",
                    }}
                    contentStyle={{
                      background: "#102a47",
                      border: "none",
                      borderRadius: "10px",
                      color: "#ffffff",
                      boxShadow:
                        "0 8px 20px rgba(16,42,71,0.18)",
                    }}
                    labelStyle={{
                      color: "#ffffff",
                      fontWeight: 700,
                      marginBottom: "4px",
                    }}
                    formatter={(value) => [
                      `${Number(
                        value
                      ).toLocaleString()} views`,
                      "Views",
                    ]}
                  />

                  <Line
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke="#173f6f"
                    strokeWidth={4}
                    dot={{
                      r: 5,
                      fill: "#ffffff",
                      stroke: "#173f6f",
                      strokeWidth: 3,
                    }}
                    activeDot={{
                      r: 7,
                      fill: "#173f6f",
                      stroke: "#ffffff",
                      strokeWidth: 3,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            ) : (

              <div
                style={{
                  height: "350px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  color: "#6d849b",
                }}
              >

                <h3>
                  No video data available
                </h3>

                <p>
                  Analyze a YouTube channel
                  first to load real video data.
                </p>

                <button
                  onClick={() =>
                    navigate("/content")
                  }
                  style={{
                    marginTop: "10px",
                    padding: "10px 18px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#173f6f",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Analyze Channel
                </button>

              </div>

            )}

          </div>

        </section>

        {/* =================================================
            LOWER CARDS
        ================================================= */}

        <section className="growth-lower-grid">

          {/* =================================================
              PERFORMANCE
          ================================================= */}

          <div className="growth-card">

            <div className="growth-section-label">
              PERFORMANCE
            </div>

            <h2>
              Creator Performance
            </h2>

            <p className="growth-description">
              Available performance metrics for{" "}
              <strong>
                {channelName}
              </strong>.
            </p>

            <div className="performance-list">

              <div>

                <span>
                  Content View Growth
                </span>

                <strong>
                  {formatPercentage(
                    contentViewGrowth
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Engagement Rate
                </span>

                <strong>
                  {formatPercentage(
                    realEngagementRate
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Average Views
                </span>

                <strong>
                  {formatNumber(
                    averageViews
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Subscribers
                </span>

                <strong>
                  {formatNumber(
                    subscribers
                  )}
                </strong>

              </div>

            </div>

          </div>

          {/* =================================================
              TREND INSIGHTS
          ================================================= */}

          <div className="growth-card">

            <div className="growth-section-label">
              TREND INSIGHTS
            </div>

            <h2>
              What's Growing
            </h2>

            <p className="growth-description">
              Insights generated only from
              available YouTube channel and
              video data.
            </p>

            <div className="trend-list">

              {/* CONTENT */}

              <div className="trend-item">

                <div className="trend-icon">
                  ↗
                </div>

                <div>

                  <strong>
                    {contentStatus}
                  </strong>

                  <p>
                    Recent videos are compared
                    with the previous videos using
                    their actual view counts.
                  </p>

                </div>

              </div>

              {/* ENGAGEMENT */}

              <div className="trend-item">

                <div className="trend-icon">
                  ◉
                </div>

                <div>

                  <strong>
                    {engagementStatus}
                  </strong>

                  <p>
                    Engagement rate uses actual
                    video views, likes and comments.
                  </p>

                </div>

              </div>

              {/* MONTHLY VIEWS */}

              <div className="trend-item">

                <div className="trend-icon">
                  ◎
                </div>

                <div>

                  <strong>
                    {viewTrendStatus}
                  </strong>

                  <p>
                    Monthly content views are
                    calculated from the publishing
                    dates and actual video views.
                  </p>

                </div>

              </div>

              {/* CREATOR ACTIVITY */}

              <div className="trend-item">

                <div className="trend-icon">
                  ★
                </div>

                <div>

                  <strong>
                    {creatorActivityStatus}
                  </strong>

                  <p>
                    Creator activity is based on the
                    number of videos available for
                    analysis.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default GrowthTrends;