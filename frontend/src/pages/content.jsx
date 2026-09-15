import "./Content.css";
import { useState } from "react";

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

import api from "../services/api";

function Content() {
  const navigate = useNavigate();

  // =====================================================
  // STATES
  // =====================================================

  const [channelName, setChannelName] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // ANALYZE YOUTUBE CHANNEL
  // =====================================================

  const analyzeChannel = async () => {
    // ===================================================
    // PREVENT DUPLICATE API REQUEST WHILE LOADING
    // ===================================================

    if (loading) {
      return;
    }

    const searchName = channelName.trim();

    if (!searchName) {
      setError("Please enter a YouTube channel name.");
      return;
    }

    // ===================================================
    // CHECK IF SAME CHANNEL WAS ALREADY SEARCHED
    // ===================================================

    const savedSearchName =
      localStorage.getItem(
        "selectedYoutubeSearchName"
      );

    const savedYoutubeData =
      localStorage.getItem(
        "selectedYoutubeData"
      );

    if (
      savedSearchName &&
      savedYoutubeData &&
      savedSearchName.toLowerCase() ===
        searchName.toLowerCase()
    ) {
      try {
        const cachedResult =
          JSON.parse(savedYoutubeData);

        if (cachedResult) {
          setData(cachedResult);
          setError("");

          console.log(
            "Using cached YouTube channel data:",
            cachedResult?.channel
          );

          return;
        }
      } catch (cacheError) {
        console.error(
          "Cached YouTube data error:",
          cacheError
        );

        localStorage.removeItem(
          "selectedYoutubeData"
        );

        localStorage.removeItem(
          "selectedYoutubeSearchName"
        );
      }
    }

    // ===================================================
    // START LOADING
    // ===================================================

    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await api.get(
        "/social/youtube/analyze",
        {
          params: {
            channel_name: searchName,
          },
        }
      );

      const result = response.data;

      // =================================================
      // SHOW RESULT
      // =================================================

      setData(result);

      // =================================================
      // SAVE SEARCH NAME
      // =================================================

      localStorage.setItem(
        "selectedYoutubeSearchName",
        searchName
      );

      // =================================================
      // SAVE SELECTED YOUTUBE CHANNEL
      // =================================================

      if (result?.channel) {
        localStorage.setItem(
          "selectedYoutubeChannel",
          JSON.stringify(result.channel)
        );

        if (result.channel.channel_id) {
          localStorage.setItem(
            "selectedYoutubeChannelId",
            String(
              result.channel.channel_id
            )
          );
        }

        if (result.channel.channel_name) {
          localStorage.setItem(
            "selectedYoutubeChannelName",
            result.channel.channel_name
          );
        }
      }

      // =================================================
      // SAVE CHANNEL ANALYTICS
      // =================================================

      if (result?.analytics) {
        localStorage.setItem(
          "selectedYoutubeAnalytics",
          JSON.stringify(result.analytics)
        );
      } else {
        localStorage.removeItem(
          "selectedYoutubeAnalytics"
        );
      }

      // =================================================
      // SAVE RECENT VIDEOS
      // =================================================

      if (result?.recent_videos) {
        localStorage.setItem(
          "selectedYoutubeVideos",
          JSON.stringify(
            result.recent_videos
          )
        );
      } else {
        localStorage.removeItem(
          "selectedYoutubeVideos"
        );
      }

      // =================================================
      // SAVE COMPLETE RESULT
      // =================================================

      localStorage.setItem(
        "selectedYoutubeData",
        JSON.stringify(result)
      );

      // =================================================
      // NOTIFY OTHER PAGES
      // =================================================

      window.dispatchEvent(
        new Event(
          "selectedYoutubeChannelChanged"
        )
      );

      // =================================================
      // CONSOLE LOGS
      // =================================================

      console.log(
        "Selected YouTube channel:",
        result?.channel
      );

      console.log(
        "Selected YouTube analytics:",
        result?.analytics
      );

      console.log(
        "Selected YouTube videos:",
        result?.recent_videos
      );
    } catch (err) {
      console.error(
        "YouTube analytics error:",
        err
      );

      if (err.response?.data?.detail) {
        setError(
          err.response.data.detail
        );
      } else if (
        err.response?.data?.error?.message
      ) {
        setError(
          err.response.data.error.message
        );
      } else {
        setError(
          "Unable to fetch YouTube channel data."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FORMAT NUMBERS
  // =====================================================

  const formatNumber = (number) => {
    if (
      number === undefined ||
      number === null
    ) {
      return "0";
    }

    if (number >= 1000000000) {
      return (
        (number / 1000000000).toFixed(1) +
        "B"
      );
    }

    if (number >= 1000000) {
      return (
        (number / 1000000).toFixed(1) +
        "M"
      );
    }

    if (number >= 1000) {
      return (
        (number / 1000).toFixed(1) +
        "K"
      );
    }

    return Number(number).toLocaleString();
  };

  // =====================================================
  // DATA
  // =====================================================

  const channel = data?.channel;

  const displayChannelName =
    channel?.channel_name ||
    channel?.name ||
    channel?.title ||
    channel?.channelName ||
    data?.channel_name ||
    data?.name ||
    channelName ||
    "YouTube Channel";

  const analytics = data?.analytics;

  const videos =
    data?.recent_videos || [];

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
    data?.channel?.thumbnail ||
    "";

  // =====================================================
  // YOUTUBE THUMBNAIL
  // =====================================================

  const getThumbnail = (video) => {
    if (video?.thumbnail) {
      return video.thumbnail;
    }

    if (video?.video_id) {
      return `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
    }

    return null;
  };

  // =====================================================
  // CHART DATA
  // =====================================================

  const chartData = videos
    .slice()
    .reverse()
    .map((video) => ({
      date: video.published_at
        ? new Date(
            video.published_at
          ).toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
            }
          )
        : "",

      views: video.views || 0,

      engagement:
        (video.likes || 0) +
        (video.comments || 0),
    }));

  // =====================================================
  // TOP VIDEOS
  // =====================================================

  const topVideos = videos
    .slice()
    .sort(
      (a, b) =>
        (b.views || 0) -
        (a.views || 0)
    )
    .slice(0, 3);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="content-page">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="content-sidebar">

        {/* LOGO */}

        <div
          className="content-logo"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <span className="logo-mark">
            ✦
          </span>

          CreatorIQ
        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="content-navigation">

          {/* DASHBOARD */}

          <div
            className="content-nav-item"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <span>▦</span>
            Dashboard
          </div>

          {/* CONTENT */}

          <div className="content-nav-item active">
            <span>▤</span>
            Content
          </div>

          {/* AUDIENCE */}

          <div
            className="content-nav-item"
            onClick={() =>
              navigate("/audience")
            }
          >
            <span>◉</span>
            Audience
          </div>

          {/* GROWTH */}

          <div
            className="content-nav-item"
            onClick={() =>
              navigate("/growth-trends")
            }
          >
            <span>↗</span>
            Growth & Trends
          </div>

          {/* EARNINGS */}

          <div
            className="content-nav-item"
            onClick={() =>
              navigate("/earnings")
            }
          >
            <span>₹</span>
            Earnings
          </div>

          {/* SOCIAL MEDIA */}

          <div
            className="content-nav-item"
            onClick={() =>
              navigate("/social-media")
            }
          >
            <span>◎</span>
            Social Media
          </div>

          {/* SETTINGS */}

          <div
            className="content-nav-item"
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
          MAIN AREA
      ================================================= */}

      <main className="content-main">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="content-header">

          <div>

            <div className="page-label">
              CREATOR ANALYTICS
            </div>

            <h1>
              Content Analytics
            </h1>

            <p>
              Search any YouTube channel and
              explore its public content
              performance.
            </p>

          </div>

          <div className="header-status">

            <span className="status-dot"></span>

            Live data

          </div>

        </header>

        {/* =================================================
            SEARCH
        ================================================= */}

        <section className="youtube-search-card">

          <div className="youtube-search-box">

            <div className="search-input-wrapper">

              {/* CSS SEARCH ICON */}

              <span
                className="search-symbol"
                aria-hidden="true"
              ></span>

              <input
                type="text"
                value={channelName}
                onChange={(e) => {
                  setChannelName(
                    e.target.value
                  );

                  if (error) {
                    setError("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    analyzeChannel();
                  }
                }}
                placeholder="Search YouTube channel..."
                aria-label="Search YouTube channel"
              />

            </div>

            <button
              className="analyze-button"
              onClick={analyzeChannel}
              disabled={loading}
            >
              {loading
                ? "Analyzing..."
                : "Analyze Channel →"}
            </button>

          </div>

          {error && (
            <div className="content-error">
              {error}
            </div>
          )}

        </section>

        {/* =================================================
            CHANNEL PROFILE
        ================================================= */}

        {channel && (
          <section className="channel-profile-card">

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
              }}
            >

              {channelImage ? (
                <img
                  src={channelImage}
                  alt={displayChannelName}
                  referrerPolicy="no-referrer"
                  style={{
                    width: "70px",
                    height: "70px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display =
                      "none";
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
                    flexShrink: 0,
                  }}
                >
                  {displayChannelName
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <h2
                style={{
                  margin: 0,
                  color: "#182b3d",
                }}
              >
                {displayChannelName}
              </h2>

            </div>

          </section>
        )}

        {/* =================================================
            KPI CARDS
        ================================================= */}

        {data && (
          <section className="content-kpi-grid">

            {/* TOTAL VIEWS */}

            <div className="content-kpi-card">

              <div className="kpi-top">

                <span>
                  TOTAL VIEWS
                </span>

                <div className="blue-kpi-icon">
                  ◉
                </div>

              </div>

              <h2>
                {formatNumber(
                  channel?.total_views
                )}
              </h2>

              <p>
                Channel lifetime views
              </p>

            </div>

            {/* LIKES */}

            <div className="content-kpi-card">

              <div className="kpi-top">

                <span>
                  LIKES
                </span>

                <div className="blue-kpi-icon">
                  ♡
                </div>

              </div>

              <h2>
                {formatNumber(
                  analytics?.recent_video_likes
                )}
              </h2>

              <p>
                Recent video likes
              </p>

            </div>

            {/* COMMENTS */}

            <div className="content-kpi-card">

              <div className="kpi-top">

                <span>
                  COMMENTS
                </span>

                <div className="blue-kpi-icon">
                  ◌
                </div>

              </div>

              <h2>
                {formatNumber(
                  analytics?.recent_video_comments
                )}
              </h2>

              <p>
                Recent video comments
              </p>

            </div>

            {/* ENGAGEMENT */}

            <div className="content-kpi-card">

              <div className="kpi-top">

                <span>
                  ENGAGEMENT RATE
                </span>

                <div className="blue-kpi-icon">
                  %
                </div>

              </div>

              <h2>
                {analytics?.engagement_rate ?? 0}%
              </h2>

              <p>
                Average engagement
              </p>

            </div>

            {/* SUBSCRIBERS */}

            <div className="content-kpi-card">

              <div className="kpi-top">

                <span>
                  SUBSCRIBERS
                </span>

                <div className="blue-kpi-icon">
                  ◎
                </div>

              </div>

              <h2>
                {formatNumber(
                  channel?.subscribers
                )}
              </h2>

              <p>
                Channel subscribers
              </p>

            </div>

            {/* VIDEOS */}

            <div className="content-kpi-card">

              <div className="kpi-top">

                <span>
                  VIDEOS
                </span>

                <div className="blue-kpi-icon">
                  ▤
                </div>

              </div>

              <h2>
                {formatNumber(
                  channel?.video_count
                )}
              </h2>

              <p>
                Total published videos
              </p>

            </div>

          </section>
        )}

        {/* =================================================
            CONTENT PERFORMANCE
        ================================================= */}

        {data && (
          <section className="blue-chart-card">

            <div className="section-heading-row">

              <div>

                <div className="section-label">
                  PERFORMANCE
                </div>

                <h2>
                  Content Performance Trend
                </h2>

                <p>
                  Views and engagement from recent
                  videos
                </p>

              </div>

              <div className="chart-legend-custom">

                <span>
                  <i className="legend-blue"></i>
                  Views
                </span>

                <span>
                  <i className="legend-light-blue"></i>
                  Engagement
                </span>

              </div>

            </div>

            <div className="content-chart">

              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <LineChart
                  data={chartData}
                  margin={{
                    top: 15,
                    right: 20,
                    left: 5,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#d8e3f0"
                  />

                  <XAxis
                    dataKey="date"
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
                    axisLine={{
                      stroke: "#cbd8e8",
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#10243f",
                      border:
                        "1px solid #294d78",
                      borderRadius: "10px",
                      color: "#ffffff",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="views"
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

                  <Line
                    type="monotone"
                    dataKey="engagement"
                    name="Likes + Comments"
                    stroke="#4e82b8"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#4e82b8",
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </section>
        )}

        {/* =================================================
            TOP PERFORMING CONTENT
        ================================================= */}

        {data && (
          <section className="top-content-section">

            <div className="section-heading-row">

              <div>

                <div className="section-label">
                  CONTENT RANKING
                </div>

                <h2>
                  Top Performing Content
                </h2>

                <p>
                  Your most viewed recent videos
                </p>

              </div>

              <div className="video-count-badge">
                {topVideos.length} videos
              </div>

            </div>

            {topVideos.length === 0 ? (
              <div className="empty-content">
                No videos found.
              </div>
            ) : (
              <div className="top-video-grid">

                {topVideos.map(
                  (video, index) => {

                    const thumbnail =
                      getThumbnail(video);

                    return (
                      <div
                        className="top-video-card"
                        key={
                          video.video_id ||
                          index
                        }
                      >

                        <div className="top-video-thumbnail">

                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={video.title}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display =
                                  "none";

                                e.currentTarget.parentElement.classList.add(
                                  "thumbnail-fallback"
                                );
                              }}
                            />
                          ) : (
                            <div className="thumbnail-fallback">
                              ▶
                            </div>
                          )}

                          <div className="ranking-number">
                            #{index + 1}
                          </div>

                          <div className="play-overlay">
                            ▶
                          </div>

                        </div>

                        <div className="top-video-details">

                          <h3>
                            {video.title}
                          </h3>

                          <div className="video-stats">

                            <span>
                              ◉{" "}
                              {formatNumber(
                                video.views
                              )}{" "}
                              views
                            </span>

                            <span>
                              ♡{" "}
                              {formatNumber(
                                video.likes
                              )}
                            </span>

                            <span>
                              ◌{" "}
                              {formatNumber(
                                video.comments
                              )}
                            </span>

                          </div>

                          {video.published_at && (
                            <div className="published-date">

                              Published{" "}

                              {new Date(
                                video.published_at
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}

                            </div>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </section>
        )}

        {/* =================================================
            LATEST VIDEOS
        ================================================= */}

        {data && (
          <section className="latest-content-section">

            <div className="section-label">
              RECENT CONTENT
            </div>

            <h2>
              Latest Videos
            </h2>

            <p className="latest-subtitle">
              Recent videos published by this
              channel.
            </p>

            {videos.length === 0 ? (
              <div className="empty-content">
                No recent videos found.
              </div>
            ) : (
              <div className="latest-video-list">

                {videos.map(
                  (video, index) => {

                    const thumbnail =
                      getThumbnail(video);

                    return (
                      <div
                        className="latest-video-row"
                        key={
                          video.video_id ||
                          index
                        }
                      >

                        <div className="latest-video-info">

                          <div className="latest-thumbnail">

                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={video.title}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display =
                                    "none";

                                  e.currentTarget.parentElement.classList.add(
                                    "thumbnail-fallback"
                                  );
                                }}
                              />
                            ) : (
                              <div className="thumbnail-fallback">
                                ▶
                              </div>
                            )}

                            <span className="small-play">
                              ▶
                            </span>

                          </div>

                          <div className="latest-title">
                            {video.title}
                          </div>

                        </div>

                        <div className="latest-stat">

                          <span>
                            VIEWS
                          </span>

                          <strong>
                            {formatNumber(
                              video.views
                            )}
                          </strong>

                        </div>

                        <div className="latest-stat">

                          <span>
                            LIKES
                          </span>

                          <strong>
                            {formatNumber(
                              video.likes
                            )}
                          </strong>

                        </div>

                        <div className="latest-stat">

                          <span>
                            COMMENTS
                          </span>

                          <strong>
                            {formatNumber(
                              video.comments
                            )}
                          </strong>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </section>
        )}

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {!data &&
          !loading &&
          !error && (
            <section className="content-empty-state">

              <div className="empty-icon">
                ▶
              </div>

              <h2>
                Analyze a YouTube Channel
              </h2>

              <p>
                Search for any YouTube channel
                above to see real public
                content analytics.
              </p>

            </section>
          )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <section className="content-empty-state">

            <div className="loading-spinner"></div>

            <h2>
              Analyzing channel...
            </h2>

            <p>
              Fetching public YouTube analytics.
            </p>

          </section>
        )}

      </main>

    </div>
  );
}

export default Content;