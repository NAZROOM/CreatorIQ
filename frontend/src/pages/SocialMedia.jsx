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

import { useNavigate } from "react-router-dom";

import "./social-media.css";


function SocialMedia() {

  const navigate = useNavigate();

  const [channel, setChannel] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [videos, setVideos] = useState([]);


  // =====================================================
  // LOAD SELECTED CREATOR
  // =====================================================

  useEffect(() => {

    const loadCreatorData = () => {

      try {

        const savedChannel =
          localStorage.getItem(
            "selectedYoutubeChannel"
          );

        const savedAnalytics =
          localStorage.getItem(
            "selectedYoutubeAnalytics"
          );

        const savedVideos =
          localStorage.getItem(
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
  // CREATOR DATA
  // =====================================================

  const channelName =
    channel?.channel_name ||
    channel?.title ||
    channel?.name ||
    "No channel selected";


  const channelId =
    channel?.channel_id ||
    channel?.id ||
    channel?.channelId ||
    "";


  const subscribers = getNumber(
    channel?.subscribers,
    channel?.subscriber_count,
    channel?.subscriberCount,
    analytics?.subscribers,
    analytics?.subscriber_count,
    analytics?.subscriberCount
  );


  const totalViews = getNumber(
    channel?.total_views,
    channel?.views,
    channel?.view_count,
    channel?.viewCount,
    analytics?.total_views,
    analytics?.views,
    analytics?.view_count
  );


  const totalVideos = getNumber(
    channel?.video_count,
    channel?.videos,
    channel?.videoCount
  );


  const thumbnail =
    channel?.thumbnail ||
    channel?.thumbnail_url ||
    channel?.thumbnailUrl ||
    "";


  // =====================================================
  // FORMAT NUMBER
  // =====================================================

  const formatNumber = (number) => {

    const value = Number(number) || 0;


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


    return value.toLocaleString();

  };


  // =====================================================
  // SORT VIDEOS
  // =====================================================

  const sortedVideos = useMemo(() => {

    if (!Array.isArray(videos)) {

      return [];

    }


    return videos
      .slice()
      .sort((a, b) => {

        const dateA =
          a?.published_at
            ? new Date(
                a.published_at
              ).getTime()
            : 0;


        const dateB =
          b?.published_at
            ? new Date(
                b.published_at
              ).getTime()
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

        totalViews: 0,

        totalLikes: 0,

        totalComments: 0,

        engagementRate: 0,

        growthRate: 0,

      };

    }


    const totalVideoViews =
      sortedVideos.reduce(
        (sum, video) =>
          sum +
          getNumber(
            video?.views,
            video?.view_count,
            video?.viewCount
          ),
        0
      );


    const totalLikes =
      sortedVideos.reduce(
        (sum, video) =>
          sum +
          getNumber(
            video?.likes,
            video?.like_count,
            video?.likeCount
          ),
        0
      );


    const totalComments =
      sortedVideos.reduce(
        (sum, video) =>
          sum +
          getNumber(
            video?.comments,
            video?.comment_count,
            video?.commentCount
          ),
        0
      );


    const engagementRate =
      totalVideoViews > 0
        ? (
            (
              totalLikes +
              totalComments
            ) /
            totalVideoViews
          ) *
          100
        : 0;


    // ---------------------------------------------------
    // RECENT VS OLDER VIDEOS
    // ---------------------------------------------------

    const recentVideos =
      sortedVideos.slice(0, 3);


    const olderVideos =
      sortedVideos.slice(3, 6);


    const recentViews =
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


    const olderViews =
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


    const recentAverage =
      recentVideos.length > 0
        ? recentViews /
          recentVideos.length
        : 0;


    const olderAverage =
      olderVideos.length > 0
        ? olderViews /
          olderVideos.length
        : 0;


    let growthRate = 0;


    if (
      recentAverage > 0 &&
      olderAverage > 0
    ) {

      growthRate =
        (
          (
            recentAverage -
            olderAverage
          ) /
          olderAverage
        ) *
        100;

    } else if (
      recentAverage > 0 &&
      olderAverage === 0
    ) {

      growthRate = 100;

    }


    return {

      totalViews:
        totalVideoViews,

      totalLikes,

      totalComments,

      engagementRate,

      growthRate,

    };

  }, [sortedVideos]);


  // =====================================================
  // REAL ENGAGEMENT RATE
  // =====================================================

  const engagementRate = useMemo(() => {

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
  // CREATOR GROWTH
  // =====================================================

  const growthRate =
    Number.isFinite(
      videoMetrics.growthRate
    )
      ? videoMetrics.growthRate
      : 0;


  // =====================================================
  // FORMAT PERCENTAGE
  // =====================================================

  const formatPercentage = (value) => {

    const number = Number(value);


    if (!Number.isFinite(number)) {

      return "0.00%";

    }


    if (number > 0) {

      return (
        "+" +
        number.toFixed(2) +
        "%"
      );

    }


    return (
      number.toFixed(2) +
      "%"
    );

  };


  // =====================================================
  // MONTHLY VIDEO DATA
  // =====================================================

  const growthData = useMemo(() => {

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


      const date =
        new Date(
          video.published_at
        );


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

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

          followers: 0,

          views: 0,

        };

      }


      months[monthKey].views +=
        getNumber(
          video?.views,
          video?.view_count,
          video?.viewCount
        );


      months[monthKey].followers =
        months[monthKey].views;

    });


    return Object.keys(months)
      .sort()
      .slice(-6)
      .map(
        (key) => months[key]
      );

  }, [sortedVideos]);


  // =====================================================
  // FALLBACK CHART
  // =====================================================

  const chartData = useMemo(() => {

    if (
      growthData.length > 0
    ) {

      return growthData;

    }


    return [

      {
        month: "No data",
        followers: 0,
      },

    ];

  }, [growthData]);


  // =====================================================
  // PERFORMANCE
  // =====================================================

  const performanceValue =
    growthRate > 0
      ? Math.min(
          100,
          Math.max(
            0,
            50 + growthRate
          )
        )
      : 0;


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="social-page">


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="social-sidebar">


        {/* LOGO */}

        <div
          className="social-logo"
          onClick={() =>
            navigate("/dashboard")
          }
        >

          <span className="logo-mark">
            ✦
          </span>

          CreatorIQ

        </div>


        {/* =====================================================
            NAVIGATION
        ===================================================== */}

        <nav className="social-navigation">


          <div
            className="social-nav-item"
            onClick={() =>
              navigate("/dashboard")
            }
          >

            <span>
              ▦
            </span>

            Dashboard

          </div>


          <div
            className="social-nav-item"
            onClick={() =>
              navigate("/content")
            }
          >

            <span>
              ▤
            </span>

            Content

          </div>


          <div
            className="social-nav-item"
            onClick={() =>
              navigate("/audience")
            }
          >

            <span>
              ◉
            </span>

            Audience

          </div>


          <div
            className="social-nav-item"
            onClick={() =>
              navigate("/growth-trends")
            }
          >

            <span>
              ↗
            </span>

            Growth & Trends

          </div>


          <div
            className="social-nav-item"
            onClick={() =>
              navigate("/earnings")
            }
          >

            <span>
              ₹
            </span>

            Earnings

          </div>


          <div className="social-nav-item active">

            <span>
              ◎
            </span>

            Social Media

          </div>


          <div
            className="social-nav-item"
            onClick={() =>
              navigate("/settings")
            }
          >

            <span>
              ⚙
            </span>

            Settings

          </div>


        </nav>


      </aside>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="social-main">


        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="social-header">


          <div>

            <div className="page-label">
              SOCIAL MEDIA ANALYTICS
            </div>


            <h1>
              Social Media
            </h1>


            <p>

              Track{" "}

              <strong>
                {channelName}
              </strong>{" "}

              performance on YouTube.

            </p>

          </div>


          <div className="social-live-status">

            <span className="social-live-dot">
            </span>

            Live data

          </div>


        </header>


        {/* =====================================================
            YOUTUBE PLATFORM CARD
        ===================================================== */}

        <section className="social-platform-grid">


          <div className="social-platform-card">


            <div className="social-platform-top">


              <div className="social-platform-name">


                <div className="social-platform-icon">
                  ▶
                </div>


                YouTube


              </div>


              <span className="social-platform-status">

                {channel
                  ? "Connected"
                  : "Not Connected"}

              </span>


            </div>


            <h2>
              {formatNumber(
                subscribers
              )}
            </h2>


            <p>
              Subscribers
            </p>


          </div>


        </section>


        {/* =====================================================
            CHART + PERFORMANCE
        ===================================================== */}

        <section className="social-content-grid">


          {/* =====================================================
              AUDIENCE GROWTH
          ===================================================== */}

          <div className="social-card social-chart-card">


            <div className="social-card-header">


              <div>

                <div className="social-section-label">
                  AUDIENCE GROWTH
                </div>


                <h2>
                  YouTube Growth
                </h2>


                <p>

                  {channelName}'s recent
                  video performance.

                </p>

              </div>


            </div>


            <div className="social-chart">


              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 0,
                    bottom: 5,
                  }}
                >


                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#d8e3f0"
                  />


                  <XAxis
                    dataKey="month"
                    tick={{
                      fill: "#56708f",
                      fontSize: 12,
                    }}
                    axisLine={{
                      stroke: "#cbd8e8",
                    }}
                  />


                  <YAxis
                    tick={{
                      fill: "#56708f",
                      fontSize: 12,
                    }}
                    tickFormatter={(value) =>
                      formatNumber(value)
                    }
                    axisLine={{
                      stroke: "#cbd8e8",
                    }}
                  />


                  <Tooltip
                    formatter={(value) => [
                      `${formatNumber(value)} views`,
                      "Views",
                    ]}
                    contentStyle={{
                      background:
                        "#ffffff",
                      border:
                        "1px solid #d8e3f0",
                      borderRadius:
                        "10px",
                      color:
                        "#102a47",
                      boxShadow:
                        "0 6px 18px rgba(20,53,84,0.12)",
                    }}
                    labelStyle={{
                      color:
                        "#102a47",
                      fontWeight:
                        700,
                    }}
                    itemStyle={{
                      color:
                        "#173f6f",
                      fontWeight:
                        600,
                    }}
                  />


                  <Line
                    type="monotone"
                    dataKey="followers"
                    name="Views"
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


                </LineChart>

              </ResponsiveContainer>


            </div>


          </div>


          {/* =====================================================
              YOUTUBE PERFORMANCE
          ===================================================== */}

          <div className="social-card">


            <div className="social-card-header">


              <div>

                <div className="social-section-label">
                  PERFORMANCE
                </div>


                <h2>
                  YouTube Performance
                </h2>


                <p>
                  Performance of{" "}
                  <strong>
                    {channelName}
                  </strong>.
                </p>

              </div>


            </div>


            <div className="platform-performance-list">


              <div className="platform-performance-row">


                <div className="platform-performance-heading">

                  <strong>
                    Growth
                  </strong>

                  <span>
                    {formatPercentage(
                      growthRate
                    )}
                  </span>

                </div>


                <div className="platform-progress">

                  <span
                    style={{
                      width:
                        `${performanceValue}%`,
                    }}
                  />

                </div>


              </div>


              <div className="platform-performance-row">


                <div className="platform-performance-heading">

                  <strong>
                    Engagement Rate
                  </strong>

                  <span>
                    {formatPercentage(
                      engagementRate
                    )}
                  </span>

                </div>


                <div className="platform-progress">

                  <span
                    style={{
                      width:
                        `${Math.min(
                          100,
                          engagementRate * 10
                        )}%`,
                    }}
                  />

                </div>


              </div>


            </div>


          </div>


        </section>


        {/* =====================================================
            CONNECTED ACCOUNT
        ===================================================== */}

        <section className="social-card social-accounts-section">


          <div className="social-card-header">


            <div>

              <div className="social-section-label">
                CONNECTED ACCOUNT
              </div>


              <h2>
                YouTube Account
              </h2>


              <p>
                Current selected creator's
                YouTube account.
              </p>

            </div>


          </div>


          <div className="social-account-list">


            <div className="social-account-row">


              {/* =================================================
                  CREATOR ICON
              ================================================= */}

              {thumbnail ? (

                <img
                  src={thumbnail}
                  alt={channelName}
                  className="account-icon"
                  referrerPolicy="no-referrer"
                />

              ) : (

                <div className="account-icon">

                  {channelName !==
                  "No channel selected"
                    ? channelName
                        .charAt(0)
                        .toUpperCase()
                    : "C"}

                </div>

              )}


              {/* =================================================
                  ACCOUNT
              ================================================= */}

              <div className="account-info">

                <strong>
                  {channelName}
                </strong>

                <span>
                  {channelId
                    ? `YouTube Channel`
                    : "YouTube Creator"}
                </span>

              </div>


              {/* =================================================
                  SUBSCRIBERS
              ================================================= */}

              <div className="account-stat large-stat">

                <span>
                  SUBSCRIBERS
                </span>

                <strong>
                  {formatNumber(
                    subscribers
                  )}
                </strong>

              </div>


              {/* =================================================
                  ENGAGEMENT RATE
              ================================================= */}

              <div className="account-stat large-stat">

                <span>
                  ENGAGEMENT RATE
                </span>

                <strong>
                  {formatPercentage(
                    engagementRate
                  )}
                </strong>

              </div>


              {/* =================================================
                  GROWTH
              ================================================= */}

              <div className="account-growth large-growth">

                {formatPercentage(
                  growthRate
                )}

              </div>


            </div>


          </div>


        </section>


        {/* =====================================================
            INSIGHTS
        ===================================================== */}

        <section className="social-insights-section">


          <div className="social-card">


            <div className="social-section-label">
              SOCIAL INSIGHTS
            </div>


            <h2>
              What's Happening
            </h2>


            <div className="social-insights-grid">


              {/* =================================================
                  INSIGHT 1
              ================================================= */}

              <div className="social-insight-card">


                <div className="social-insight-icon">
                  ↗
                </div>


                <div>

                  <h3>

                    {growthRate > 0
                      ? "YouTube is growing"
                      : "YouTube growth is stable"}

                  </h3>


                  <p>

                    {channelName}'s recent
                    content shows a{" "}

                    {formatPercentage(
                      growthRate
                    )}{" "}

                    growth trend.

                  </p>

                </div>


              </div>


              {/* =================================================
                  INSIGHT 2
              ================================================= */}

              <div className="social-insight-card">


                <div className="social-insight-icon">
                  ◎
                </div>


                <div>

                  <h3>
                    Engagement performance
                  </h3>


                  <p>

                    {channelName} currently has
                    an engagement rate of{" "}

                    {formatPercentage(
                      engagementRate
                    )}.

                  </p>

                </div>


              </div>


              {/* =================================================
                  INSIGHT 3
              ================================================= */}

              <div className="social-insight-card">


                <div className="social-insight-icon">
                  ★
                </div>


                <div>

                  <h3>
                    YouTube connected
                  </h3>


                  <p>

                    {channelName}'s YouTube
                    account is connected and
                    available for analytics.

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


export default SocialMedia;