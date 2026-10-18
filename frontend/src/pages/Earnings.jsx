
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

// Parse YYYY-MM-DD as a local date to avoid timezone shifts.
const parseLocalDate = (dateString) => {
  if (!dateString) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateString));
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

const getToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

// Normalize currency codes.
const normalizeCurrency = (currency, fallback = "USD") => {
  const value = String(currency ?? "").trim().toUpperCase();
  return value || fallback;
};

// Convert date strings to a consistent local date.
const getLocalDate = (dateString) => {
  if (!dateString) return null;

  const localDate = parseLocalDate(dateString);
  if (localDate) return localDate;

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

// Group amounts by currency so different currencies are never added together.
const groupAmountsByCurrency = (items, amountField = "amount") => {
  const totals = {};

  items.forEach((item) => {
    const currency = normalizeCurrency(item?.currency, "INR");
    const amount = Number(item?.[amountField] ?? 0);

    if (!Number.isFinite(amount)) return;

    totals[currency] = (totals[currency] || 0) + amount;
  });

  return Object.entries(totals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => ({
      currency,
      amount: Number(amount.toFixed(2)),
    }));
};

const groupEarningsByCurrency = (items, amountField) =>
  groupAmountsByCurrency(
    items.map((item) => ({
      currency: normalizeCurrency(item?.currency, "USD"),
      amount: Number(item?.[amountField] ?? 0),
    }))
  );

function Earnings() {
  const navigate = useNavigate();
  const creatorId = 1;

  // EARNINGS STATES
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // REVENUE ANALYTICS STATES
  const [revenueAnalytics, setRevenueAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  // SPONSORSHIP STATES
  const [sponsorships, setSponsorships] = useState([]);
  const [sponsorshipLoading, setSponsorshipLoading] = useState(true);
  const [sponsorshipError, setSponsorshipError] = useState("");
  const [sponsorshipMessage, setSponsorshipMessage] = useState("");
  const [savingSponsorship, setSavingSponsorship] = useState(false);

  // PAYMENT NOTIFICATION STATE
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [form, setForm] = useState({
    brand_name: "",
    campaign_name: "",
    amount: "",
    currency: "INR",
    payment_status: "pending",
    start_date: "",
    due_date: "",
  });

  // LOAD EARNINGS
  const loadEarnings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/earnings/${creatorId}`);
      const result = response?.data;

      if (Array.isArray(result)) {
        setEarnings(result);
      } else if (Array.isArray(result?.earnings)) {
        setEarnings(result.earnings);
      } else if (Array.isArray(result?.data)) {
        setEarnings(result.data);
      } else {
        setEarnings([]);
      }
    } catch (err) {
      console.error("Earnings API error:", err);

      if (err?.response?.status === 404) {
        setEarnings([]);
        setError("");
      } else {
        setError(
          err?.response?.data?.detail || "Unable to load earnings data."
        );
        setEarnings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // LOAD REVENUE ANALYTICS
  const loadRevenueAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      const response = await api.get(
        `/earnings/${creatorId}/revenue-analytics`
      );

      setRevenueAnalytics(response?.data || null);
    } catch (err) {
      console.error("Revenue Analytics API error:", err);

      setRevenueAnalytics(null);
      setAnalyticsError(
        err?.response?.data?.detail || "Unable to load revenue analytics."
      );
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // LOAD SPONSORSHIPS
  const loadSponsorships = async () => {
    try {
      setSponsorshipLoading(true);
      setSponsorshipError("");

      const response = await api.get(`/sponsorships/${creatorId}`);

      setSponsorships(
        Array.isArray(response?.data) ? response.data : []
      );
    } catch (err) {
      console.error("Sponsorship API error:", err);

      setSponsorshipError(
        err?.response?.data?.detail || "Unable to load sponsorships."
      );
    } finally {
      setSponsorshipLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
    loadSponsorships();
    loadRevenueAnalytics();
  }, []);

  // FORM INPUTS
  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // CREATE SPONSORSHIP
  const handleCreateSponsorship = async (event) => {
    event.preventDefault();

    setSponsorshipError("");
    setSponsorshipMessage("");

    if (
      !form.brand_name.trim() ||
      !form.campaign_name.trim() ||
      form.amount === ""
    ) {
      setSponsorshipError(
        "Please enter brand name, campaign name, and amount."
      );
      return;
    }

    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) < 0) {
      setSponsorshipError("Enter a valid non-negative amount.");
      return;
    }

    if (
      form.start_date &&
      form.due_date &&
      form.due_date < form.start_date
    ) {
      setSponsorshipError(
        "Payment due date cannot be before the start date."
      );
      return;
    }

    try {
      setSavingSponsorship(true);

      const params = {
        brand_name: form.brand_name.trim(),
        campaign_name: form.campaign_name.trim(),
        amount: Number(form.amount),
        currency: normalizeCurrency(form.currency, "INR"),
        payment_status: form.payment_status,
      };

      if (form.start_date) params.start_date = form.start_date;
      if (form.due_date) params.due_date = form.due_date;

      await api.post(`/sponsorships/${creatorId}`, null, { params });

      setSponsorshipMessage("Sponsorship added successfully!");

      setForm({
        brand_name: "",
        campaign_name: "",
        amount: "",
        currency: "INR",
        payment_status: "pending",
        start_date: "",
        due_date: "",
      });

      await Promise.all([loadSponsorships(), loadRevenueAnalytics()]);
    } catch (err) {
      console.error("Create sponsorship error:", err);

      setSponsorshipError(
        err?.response?.data?.detail || "Unable to create sponsorship."
      );
    } finally {
      setSavingSponsorship(false);
    }
  };

  // UPDATE PAYMENT STATUS
  const handleStatusChange = async (sponsorshipId, paymentStatus) => {
    setSponsorshipError("");
    setSponsorshipMessage("");

    try {
      await api.patch(
        `/sponsorships/${sponsorshipId}/status`,
        null,
        {
          params: { payment_status: paymentStatus },
        }
      );

      setSponsorshipMessage("Payment status updated successfully!");

      await Promise.all([loadSponsorships(), loadRevenueAnalytics()]);
    } catch (err) {
      console.error("Update sponsorship status error:", err);

      setSponsorshipError(
        err?.response?.data?.detail || "Unable to update payment status."
      );
    }
  };

  // FORMAT NUMBERS
  const formatNumber = (number) => {
    const value = Number(number);

    if (!Number.isFinite(value)) return "0";
    if (Math.abs(value) >= 1000000000)
      return (value / 1000000000).toFixed(1) + "B";
    if (Math.abs(value) >= 1000000)
      return (value / 1000000).toFixed(1) + "M";
    if (Math.abs(value) >= 1000)
      return (value / 1000).toFixed(1) + "K";

    return value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  };

  // GET CURRENCY SYMBOL
  const getCurrencySymbol = (currency) => {
    const symbols = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };

    const code = normalizeCurrency(currency, "USD");
    return symbols[code] || `${code} `;
  };

  // FORMAT CURRENCY: SHOW SYMBOL INSTEAD OF CURRENCY CODE
  const formatCurrency = (amount, currency = "USD") => {
    const value = Number(amount);
    const currencyCode = normalizeCurrency(currency, "USD");
    const symbol = getCurrencySymbol(currencyCode);

    const formattedValue = (
      Number.isFinite(value) ? value : 0
    ).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return `${symbol}${formattedValue}`;
  };

  const formatDueDate = (dateString) => {
    const date = parseLocalDate(dateString);

    if (!date) return "Date unavailable";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatRecordDate = (dateString) => {
    const date = getLocalDate(dateString);

    if (!date) return "-";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // EARNINGS CURRENCY TOTALS
  const earningsRevenueByCurrency = useMemo(
    () => groupEarningsByCurrency(earnings, "estimated_revenue"),
    [earnings]
  );

  const earningsAdRevenueByCurrency = useMemo(
    () => groupEarningsByCurrency(earnings, "ad_revenue"),
    [earnings]
  );

  // Use one currency consistently in single-currency charts.
  const primaryEarningsCurrency = useMemo(() => {
    const currencyTotals = groupEarningsByCurrency(
      earnings,
      "estimated_revenue"
    );

    if (currencyTotals.length === 0) return "USD";

    return currencyTotals
      .slice()
      .sort(
        (a, b) =>
          b.amount - a.amount || a.currency.localeCompare(b.currency)
      )[0].currency;
  }, [earnings]);

  const earningsInPrimaryCurrency = useMemo(
    () =>
      earnings.filter(
        (item) =>
          normalizeCurrency(item?.currency, "USD") ===
          primaryEarningsCurrency
      ),
    [earnings, primaryEarningsCurrency]
  );

  // TOTAL MONETIZED VIEWS
  const totalMonetizedViews = useMemo(
    () =>
      earnings.reduce(
        (sum, item) => sum + (Number(item?.monetized_views) || 0),
        0
      ),
    [earnings]
  );

  // LATEST AVAILABLE MONTH REVENUE
  // Shows the newest month present in the real earnings records.
  const latestEarningsMonth = useMemo(() => {
    const validEarnings = earnings
      .map((item) => ({ item, date: getLocalDate(item?.date) }))
      .filter(({ date }) => date && !Number.isNaN(date.getTime()));

    if (validEarnings.length === 0) return null;

    return validEarnings.reduce(
      (latest, current) =>
        current.date.getTime() > latest.getTime() ? current.date : latest,
      validEarnings[0].date
    );
  }, [earnings]);

  const latestEarningsMonthLabel = useMemo(() => {
    if (!latestEarningsMonth) return "LATEST MONTH";

    return latestEarningsMonth.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    }).toUpperCase();
  }, [latestEarningsMonth]);

  const thisMonthRevenueByCurrency = useMemo(() => {
    if (!latestEarningsMonth) return [];

    const latestMonthEarnings = earnings.filter((item) => {
      const date = getLocalDate(item?.date);

      return (
        date &&
        date.getMonth() === latestEarningsMonth.getMonth() &&
        date.getFullYear() === latestEarningsMonth.getFullYear()
      );
    });

    return groupEarningsByCurrency(
      latestMonthEarnings,
      "estimated_revenue"
    );
  }, [earnings, latestEarningsMonth]);

  // REVENUE TREND
  const revenueData = useMemo(
    () =>
      earningsInPrimaryCurrency
        .slice()
        .sort((a, b) => {
          const dateA = getLocalDate(a?.date);
          const dateB = getLocalDate(b?.date);

          return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
        })
        .map((item, index) => {
          const date = getLocalDate(item?.date);

          return {
            date: date
              ? date.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })
              : `Period ${index + 1}`,
            revenue: Number(item?.estimated_revenue) || 0,
            adRevenue: Number(item?.ad_revenue) || 0,
          };
        }),
    [earningsInPrimaryCurrency]
  );

  // MONTHLY REVENUE
  const monthlyRevenue = useMemo(() => {
    const monthly = {};

    earningsInPrimaryCurrency.forEach((item) => {
      const date = getLocalDate(item?.date);
      if (!date) return;

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const label = date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });

      if (!monthly[key]) {
        monthly[key] = { month: label, revenue: 0 };
      }

      monthly[key].revenue += Number(item?.estimated_revenue) || 0;
    });

    return Object.keys(monthly)
      .sort()
      .map((key) => ({
        month: monthly[key].month,
        revenue: Number(monthly[key].revenue.toFixed(2)),
      }));
  }, [earningsInPrimaryCurrency]);

  // REVENUE SOURCES
  const revenueSources = useMemo(() => {
    const youtubeAds = earningsInPrimaryCurrency.reduce(
      (sum, item) => sum + (Number(item?.ad_revenue) || 0),
      0
    );

    const totalRevenue = earningsInPrimaryCurrency.reduce(
      (sum, item) => sum + (Number(item?.estimated_revenue) || 0),
      0
    );

    const otherRevenue = Math.max(totalRevenue - youtubeAds, 0);
    const total = youtubeAds + otherRevenue;

    if (total <= 0) {
      return [
        { name: "YouTube Ads", value: 0 },
        { name: "Other Revenue", value: 0 },
      ];
    }

    return [
      {
        name: "YouTube Ads",
        value: Number(((youtubeAds / total) * 100).toFixed(1)),
      },
      {
        name: "Other Revenue",
        value: Number(((otherRevenue / total) * 100).toFixed(1)),
      },
    ];
  }, [earningsInPrimaryCurrency]);

  const sourceColors = ["#173f6f", "#4e82b8"];

  // PAYMENT STATUS SUMMARY AND ALERT CALCULATIONS
  const today = useMemo(() => getToday(), []);

  const sevenDaysFromNow = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + 7);
    return date;
  }, [today]);

  const activeSponsorships = useMemo(
    () =>
      sponsorships.filter(
        (item) =>
          String(item?.payment_status || "").toLowerCase().trim() !== "paid"
      ),
    [sponsorships]
  );

  const overdueSponsorships = useMemo(
    () =>
      activeSponsorships.filter((item) => {
        const status = String(item?.payment_status || "")
          .toLowerCase()
          .trim();

        const dueDate = parseLocalDate(item?.due_date);

        return status === "overdue" || (dueDate && dueDate < today);
      }),
    [activeSponsorships, today]
  );

  const dueSoonSponsorships = useMemo(
    () =>
      activeSponsorships.filter((item) => {
        const status = String(item?.payment_status || "")
          .toLowerCase()
          .trim();

        if (status === "overdue") return false;

        const dueDate = parseLocalDate(item?.due_date);

        if (!dueDate) return false;

        return dueDate >= today && dueDate <= sevenDaysFromNow;
      }),
    [activeSponsorships, today, sevenDaysFromNow]
  );

  const paidSponsorships = useMemo(
    () =>
      sponsorships.filter(
        (item) =>
          String(item?.payment_status || "").toLowerCase().trim() === "paid"
      ),
    [sponsorships]
  );

  // Pending means not paid, not overdue, and not past the due date.
  const pendingSponsorships = useMemo(
    () =>
      sponsorships.filter((item) => {
        const status = String(item?.payment_status || "")
          .toLowerCase()
          .trim();

        if (status !== "pending") return false;

        const dueDate = parseLocalDate(item?.due_date);

        return !dueDate || dueDate >= today;
      }),
    [sponsorships, today]
  );

  // PAYMENT NOTIFICATIONS
  const paymentNotifications = useMemo(() => {
    const overdueNotifications = overdueSponsorships.map((item) => ({
      id: `overdue-${item.id}`,
      type: "overdue",
      title: "Payment overdue",
      brand: item.brand_name || "Unknown brand",
      campaign: item.campaign_name || "Unnamed campaign",
      amount: formatCurrency(item.amount, item.currency || "INR"),
      dueDate: formatDueDate(item.due_date),
      message: item.due_date
        ? `Payment was due on ${formatDueDate(item.due_date)}.`
        : "This payment is marked as overdue.",
    }));

    const dueSoonNotifications = dueSoonSponsorships.map((item) => ({
      id: `due-soon-${item.id}`,
      type: "due-soon",
      title: "Payment due soon",
      brand: item.brand_name || "Unknown brand",
      campaign: item.campaign_name || "Unnamed campaign",
      amount: formatCurrency(item.amount, item.currency || "INR"),
      dueDate: formatDueDate(item.due_date),
      message:
        parseLocalDate(item.due_date)?.getTime() === today.getTime()
          ? "Payment is due today."
          : `Payment is due on ${formatDueDate(item.due_date)}.`,
    }));

    return [...overdueNotifications, ...dueSoonNotifications];
  }, [overdueSponsorships, dueSoonSponsorships, today]);

  const notificationCount = paymentNotifications.length;

  const totalDealValueByCurrency = useMemo(
    () => groupAmountsByCurrency(sponsorships),
    [sponsorships]
  );

  const paidAmountByCurrency = useMemo(
    () => groupAmountsByCurrency(paidSponsorships),
    [paidSponsorships]
  );

  const pendingAmountByCurrency = useMemo(
    () => groupAmountsByCurrency(pendingSponsorships),
    [pendingSponsorships]
  );

  const overdueAmountByCurrency = useMemo(
    () => groupAmountsByCurrency(overdueSponsorships),
    [overdueSponsorships]
  );

  // CSV EXPORT
  const handleExportCSV = () => {
    const headers = [
      "Record Type",
      "Date",
      "Brand",
      "Campaign",
      "Estimated Revenue",
      "Ad Revenue",
      "Monetized Views",
      "Sponsorship Amount",
      "Currency",
      "Payment Status",
      "Due Date",
    ];

    const escapeCSV = (value) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const earningsRows = earnings.map((item) => [
      "Earning",
      item.date || "",
      "",
      "",
      item.estimated_revenue ?? 0,
      item.ad_revenue ?? 0,
      item.monetized_views ?? 0,
      "",
      normalizeCurrency(item.currency, "USD"),
      "",
      "",
    ]);

    const sponsorshipRows = sponsorships.map((item) => [
      "Sponsorship",
      item.start_date || "",
      item.brand_name || "",
      item.campaign_name || "",
      "",
      "",
      "",
      item.amount ?? 0,
      normalizeCurrency(item.currency, "INR"),
      item.payment_status || "",
      item.due_date || "",
    ]);

    const csvContent = [headers, ...earningsRows, ...sponsorshipRows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `CreatorIQ_Report_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // PDF / PRINT
  const handleDownloadPDF = () => {
    window.print();
  };

  const goTo = (path) => navigate(path);

  // REUSABLE PAYMENT SUMMARY CARD
  const renderPaymentSummaryCard = ({
    title,
    icon,
    items,
    count,
    description,
    accent,
  }) => (
    <div
      className="earnings-kpi-card"
      style={{ minWidth: 0, borderTop: `4px solid ${accent}` }}
    >
      <div className="earnings-kpi-top">
        <span>{title}</span>
        <div className="earnings-kpi-icon">{icon}</div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 7 }}>
        {items.length === 0 ? (
          <h2 style={{ margin: "4px 0" }}>—</h2>
        ) : (
          items.map((item) => (
            <h2
              key={item.currency}
              style={{
                fontSize: 22,
                margin: 0,
                overflowWrap: "anywhere",
              }}
            >
              {formatCurrency(item.amount, item.currency)}
            </h2>
          ))
        )}
      </div>

      <p style={{ marginTop: 10 }}>
        {count} {count === 1 ? "sponsorship" : "sponsorships"}
      </p>

      <p style={{ fontSize: 12, marginTop: 4 }}>{description}</p>
    </div>
  );

  // REUSABLE CURRENCY TOTALS
  const renderCurrencyTotals = (items, emptyLabel = "—") => (
    <div style={{ marginTop: 12, display: "grid", gap: 7 }}>
      {items.length === 0 ? (
        <h2 style={{ fontSize: 22, margin: 0 }}>{emptyLabel}</h2>
      ) : (
        items.map((item) => (
          <h2
            key={item.currency}
            style={{
              fontSize: 22,
              margin: 0,
              overflowWrap: "anywhere",
            }}
          >
            {formatCurrency(item.amount, item.currency)}
          </h2>
        ))
      )}
    </div>
  );

  return (
    <div className="earnings-page">
      {/* SIDEBAR */}
      <aside className="earnings-sidebar">
        <div className="earnings-logo" onClick={() => goTo("/dashboard")}>
          <span className="logo-mark">✦</span>
          CreatorIQ
        </div>

        <nav className="earnings-navigation">
          <div className="earnings-nav-item" onClick={() => goTo("/dashboard")}>
            <span>▦</span> Dashboard
          </div>
          <div className="earnings-nav-item" onClick={() => goTo("/content")}>
            <span>▤</span> Content
          </div>
          <div className="earnings-nav-item" onClick={() => goTo("/audience")}>
            <span>◉</span> Audience
          </div>
          <div
            className="earnings-nav-item"
            onClick={() => goTo("/growth-trends")}
          >
            <span>↗</span> Growth &amp; Trends
          </div>
          <div className="earnings-nav-item active">
            <span>₹</span> Earnings
          </div>
          <div
            className="earnings-nav-item"
            onClick={() => goTo("/social-media")}
          >
            <span>◎</span> Social Media
          </div>
          <div className="earnings-nav-item" onClick={() => goTo("/settings")}>
            <span>⚙</span> Settings
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="earnings-main">
        <header className="earnings-header">
          <div>
            <div className="page-label">MONETIZATION</div>
            <h1>Earnings Analytics</h1>
            <p>Track your revenue and monetization performance.</p>
          </div>

          <div
            className="earnings-export-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* PAYMENT NOTIFICATION BELL */}
            <div
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label={`Payment notifications: ${notificationCount}`}
                aria-expanded={notificationsOpen}
                title="Payment notifications"
                style={{
                  position: "relative",
                  width: 44,
                  height: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #d8e3f0",
                  borderRadius: 10,
                  background: notificationsOpen ? "#eef4fa" : "#ffffff",
                  color: "#173f6f",
                  fontSize: 22,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <span aria-hidden="true">♧</span>

                {notificationCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      minWidth: 20,
                      height: 20,
                      padding: "0 5px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 20,
                      background: "#dc2626",
                      color: "#ffffff",
                      border: "2px solid #ffffff",
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  role="dialog"
                  aria-label="Payment notifications"
                  style={{
                    position: "absolute",
                    top: 52,
                    right: 0,
                    width: "min(360px, calc(100vw - 32px))",
                    maxHeight: 440,
                    overflowY: "auto",
                    background: "#ffffff",
                    border: "1px solid #d8e3f0",
                    borderRadius: 12,
                    boxShadow: "0 12px 32px rgba(11, 32, 57, 0.18)",
                    zIndex: 1000,
                    color: "#173f6f",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "16px",
                      borderBottom: "1px solid #e6edf5",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>
                        Payment Notifications
                      </h3>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 12,
                          color: "#7890a6",
                        }}
                      >
                        {notificationCount === 0
                          ? "You're all caught up."
                          : `${notificationCount} payment ${
                              notificationCount === 1
                                ? "needs"
                                : "items need"
                            } your attention.`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close notifications"
                      style={{
                        width: 30,
                        height: 30,
                        border: "none",
                        borderRadius: 6,
                        background: "#eef4fa",
                        color: "#173f6f",
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {sponsorshipLoading ? (
                    <p style={{ padding: 16, margin: 0, fontSize: 13 }}>
                      Checking payment notifications...
                    </p>
                  ) : notificationCount === 0 ? (
                    <div
                      style={{
                        padding: "28px 18px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 30, marginBottom: 8 }}>✓</div>
                      <strong style={{ fontSize: 14 }}>
                        No payment alerts
                      </strong>
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 12,
                          color: "#7890a6",
                        }}
                      >
                        No overdue or upcoming payments found.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "grid" }}>
                      {paymentNotifications.map((notification) => {
                        const overdue = notification.type === "overdue";

                        return (
                          <div
                            key={notification.id}
                            style={{
                              padding: 14,
                              borderBottom: "1px solid #e6edf5",
                              borderLeft: `4px solid ${
                                overdue ? "#dc2626" : "#d99b19"
                              }`,
                              background: overdue ? "#fff7f7" : "#fffcf2",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 10,
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{
                                  width: 28,
                                  height: 28,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  borderRadius: 8,
                                  background: overdue ? "#fee2e2" : "#fef3c7",
                                  color: overdue ? "#991b1b" : "#92400e",
                                  fontWeight: 700,
                                }}
                              >
                                {overdue ? "!" : "◷"}
                              </span>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <strong
                                  style={{
                                    display: "block",
                                    fontSize: 13,
                                    color: overdue ? "#991b1b" : "#92400e",
                                  }}
                                >
                                  {notification.title}
                                </strong>

                                <div
                                  style={{
                                    marginTop: 5,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {notification.brand}
                                </div>

                                <div
                                  style={{
                                    marginTop: 3,
                                    fontSize: 12,
                                    color: "#526b84",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {notification.campaign}
                                </div>

                                <p
                                  style={{
                                    margin: "7px 0",
                                    fontSize: 12,
                                    color: "#526b84",
                                  }}
                                >
                                  {notification.message}
                                </p>

                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    fontSize: 12,
                                  }}
                                >
                                  <strong>{notification.amount}</strong>
                                  <span>Due: {notification.dueDate}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div
                    style={{
                      padding: 12,
                      borderTop: "1px solid #e6edf5",
                      background: "#f8fafc",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        document
                          .getElementById("sponsorship-tracking")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "none",
                        borderRadius: 8,
                        background: "#173f6f",
                        color: "#ffffff",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      View Sponsorships
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="earnings-export-button"
              onClick={handleExportCSV}
              disabled={loading || sponsorshipLoading}
            >
              Export CSV
            </button>

            <button
              type="button"
              className="earnings-export-button earnings-export-button-primary"
              onClick={handleDownloadPDF}
              disabled={loading || sponsorshipLoading}
            >
              Download PDF
            </button>
          </div>
        </header>

        {error && <div className="earnings-error">{error}</div>}

        {loading ? (
          <section className="earnings-loading">
            <div className="loading-spinner"></div>
            <h2>Loading earnings...</h2>
            <p>Fetching your monetization data.</p>
          </section>
        ) : (
          <>
            {/* EARNINGS KPI CARDS */}
            <section className="earnings-kpi-grid">
              <div className="earnings-kpi-card">
                <div className="earnings-kpi-top">
                  <span>TOTAL REVENUE</span>
                  <div className="earnings-kpi-icon">$</div>
                </div>
                {renderCurrencyTotals(earningsRevenueByCurrency)}
                <p>Total estimated revenue by currency</p>
              </div>

              <div className="earnings-kpi-card">
                <div className="earnings-kpi-top">
                  <span>AD REVENUE</span>
                  <div className="earnings-kpi-icon">◉</div>
                </div>
                {renderCurrencyTotals(earningsAdRevenueByCurrency)}
                <p>Estimated advertising revenue by currency</p>
              </div>

              <div className="earnings-kpi-card">
                <div className="earnings-kpi-top">
                  <span>MONETIZED VIEWS</span>
                  <div className="earnings-kpi-icon">◉</div>
                </div>
                <h2>{formatNumber(totalMonetizedViews)}</h2>
                <p>Views generating revenue</p>
              </div>

              <div className="earnings-kpi-card">
                <div className="earnings-kpi-top">
                  <span>REVENUE OVERVIEW</span>
                  <div className="earnings-kpi-icon">↗</div>
                </div>
                {renderCurrencyTotals(
                  thisMonthRevenueByCurrency.filter(
                    (item) => item.amount !== 0
                  ),
                  formatCurrency(0, primaryEarningsCurrency)
                )}
                <p>Estimated revenue for the latest month available in your records</p>
              </div>
            </section>

            {/* BACKEND REVENUE ANALYTICS */}
            <section
              className="earnings-card"
              style={{ marginTop: 24, padding: 24 }}
            >
              <div className="earnings-card-header">
                <div>
                  <div className="section-label">BACKEND ANALYTICS</div>
                  <h2>Revenue Analytics Summary</h2>
                  <p>
                    Revenue and sponsorship payment totals grouped by currency.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadRevenueAnalytics}
                  disabled={analyticsLoading}
                  style={{
                    padding: "10px 16px",
                    border: "1px solid #d8e3f0",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#173f6f",
                    fontWeight: 600,
                    cursor: analyticsLoading ? "wait" : "pointer",
                  }}
                >
                  {analyticsLoading ? "Refreshing..." : "Refresh Analytics"}
                </button>
              </div>

              {analyticsLoading ? (
                <div className="empty-content" style={{ padding: 24 }}>
                  Loading revenue analytics...
                </div>
              ) : analyticsError ? (
                <div className="earnings-error" style={{ marginTop: 16 }}>
                  {analyticsError}
                </div>
              ) : !revenueAnalytics ||
                !Array.isArray(revenueAnalytics.revenue_by_currency) ||
                revenueAnalytics.revenue_by_currency.length === 0 ? (
                <div className="empty-content" style={{ padding: 24 }}>
                  No revenue analytics records are available yet.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      margin: "20px 0",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "#eef4fa",
                        color: "#173f6f",
                      }}
                    >
                      <strong>
                        {revenueAnalytics.total_earnings_records ?? 0}
                      </strong>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Earnings records
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "#eef4fa",
                        color: "#173f6f",
                      }}
                    >
                      <strong>
                        {revenueAnalytics.total_sponsorship_records ?? 0}
                      </strong>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Sponsorship records
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {revenueAnalytics.revenue_by_currency.map((item) => {
                      const currency = normalizeCurrency(item.currency, "USD");

                      return (
                        <div
                          className="earnings-kpi-card"
                          key={currency}
                          style={{ minWidth: 0 }}
                        >
                          <div className="earnings-kpi-top">
                            <span>{currency} REVENUE SUMMARY</span>
                            <div className="earnings-kpi-icon">
                              {getCurrencySymbol(currency)}
                            </div>
                          </div>

                          <h2 style={{ overflowWrap: "anywhere" }}>
                            {formatCurrency(
                              item.total_realized_revenue,
                              currency
                            )}
                          </h2>

                          <p>Estimated revenue plus paid sponsorships</p>

                          <div
                            style={{
                              borderTop: "1px solid #e6edf5",
                              marginTop: 16,
                              paddingTop: 12,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div style={analyticsRowStyle}>
                              <span>Estimated revenue</span>
                              <strong>
                                {formatCurrency(item.estimated_revenue, currency)}
                              </strong>
                            </div>

                            <div style={analyticsRowStyle}>
                              <span>Ad revenue</span>
                              <strong>
                                {formatCurrency(item.ad_revenue, currency)}
                              </strong>
                            </div>

                            <div style={analyticsRowStyle}>
                              <span>Monetized views</span>
                              <strong>{formatNumber(item.monetized_views)}</strong>
                            </div>

                            <div style={analyticsRowStyle}>
                              <span>Sponsorship deal value</span>
                              <strong>
                                {formatCurrency(item.sponsorship_value, currency)}
                              </strong>
                            </div>

                            <div style={analyticsRowStyle}>
                              <span>Paid sponsorships</span>
                              <strong>
                                {formatCurrency(item.paid_sponsorships, currency)}
                              </strong>
                            </div>

                            <div style={analyticsRowStyle}>
                              <span>Pending payments</span>
                              <strong>
                                {formatCurrency(
                                  item.pending_sponsorships,
                                  currency
                                )}
                              </strong>
                            </div>

                            <div style={analyticsRowStyle}>
                              <span>Overdue payments</span>
                              <strong>
                                {formatCurrency(
                                  item.overdue_sponsorships,
                                  currency
                                )}
                              </strong>
                            </div>

                            <div style={analyticsRowStyle}>
                              <span>Sponsorship count</span>
                              <strong>{item.sponsorship_count ?? 0}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p
                    style={{
                      marginTop: 16,
                      color: "#7890a6",
                      fontSize: 12,
                    }}
                  >
                    Revenue totals are displayed separately for each currency.
                    Realized revenue is calculated by the backend as estimated
                    revenue plus paid sponsorships. Ad revenue is displayed
                    separately to avoid potentially counting it twice.
                  </p>
                </>
              )}
            </section>

            {earnings.length === 0 && (
              <section className="earnings-empty-state">
                <div className="earnings-empty-icon">$</div>
                <h2>No earnings data yet</h2>
                <p>
                  Creator {creatorId} does not have any earnings records in
                  the database yet.
                </p>
                <p>
                  Add earnings data through the backend API to display revenue
                  analytics here.
                </p>
              </section>
            )}

            {/* REVENUE TREND */}
            <section className="earnings-chart-card">
              <div className="earnings-section-header">
                <div>
                  <div className="section-label">REVENUE PERFORMANCE</div>
                  <h2>Revenue Trend</h2>
                  <p>
                    Estimated earnings over time ({primaryEarningsCurrency}).
                  </p>
                </div>
                <div className="revenue-period">
                  {earningsInPrimaryCurrency.length} records
                </div>
              </div>

              <div className="earnings-chart">
                {revenueData.length === 0 ? (
                  <div className="empty-content">No revenue data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart
                      data={revenueData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d8e3f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#7890a6", fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: "#7890a6", fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) =>
                          formatCurrency(value, primaryEarningsCurrency)
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Estimated Revenue"
                        stroke="#173f6f"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#173f6f" }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="adRevenue"
                        name="Ad Revenue"
                        stroke="#4e82b8"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#4e82b8" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* REVENUE SOURCES AND MONTHLY REVENUE */}
            <section className="earnings-two-column">
              <div className="earnings-card">
                <div className="earnings-card-header">
                  <div>
                    <div className="section-label">REVENUE BREAKDOWN</div>
                    <h2>Revenue Sources</h2>
                    <p>
                      Breakdown of revenue ({primaryEarningsCurrency}).
                    </p>
                  </div>
                </div>

                <div className="revenue-source-chart">
                  <ResponsiveContainer width="100%" height={270}>
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
                        {revenueSources.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={sourceColors[index % sourceColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="revenue-source-list">
                  {revenueSources.map((item, index) => (
                    <div className="revenue-source-row" key={item.name}>
                      <div>
                        <span
                          className="legend-dot"
                          style={{
                            background: sourceColors[index % sourceColors.length],
                          }}
                        />
                        {item.name}
                      </div>
                      <strong>{item.value}%</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="earnings-card">
                <div className="earnings-card-header">
                  <div>
                    <div className="section-label">MONTHLY PERFORMANCE</div>
                    <h2>Monthly Revenue</h2>
                    <p>
                      Monthly revenue ({primaryEarningsCurrency}).
                    </p>
                  </div>
                </div>

                <div className="monthly-chart">
                  {monthlyRevenue.length === 0 ? (
                    <div className="empty-content">
                      No monthly earnings data.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={monthlyRevenue}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#d8e3f0" />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "#7890a6", fontSize: 12 }}
                        />
                        <YAxis tick={{ fill: "#7890a6", fontSize: 12 }} />
                        <Tooltip
                          formatter={(value) =>
                            formatCurrency(value, primaryEarningsCurrency)
                          }
                        />
                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          fill="#173f6f"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>

            {/* EARNINGS RECORDS */}
            <section className="sponsorship-section">
              <div className="earnings-section-header">
                <div>
                  <div className="section-label">EARNINGS DATA</div>
                  <h2>Earnings Records</h2>
                  <p>Revenue data received from the backend.</p>
                </div>
              </div>

              <div className="sponsorship-table">
                <div className="sponsorship-table-header">
                  <span>DATE</span>
                  <span>ESTIMATED REVENUE</span>
                  <span>AD REVENUE</span>
                  <span>MONETIZED VIEWS</span>
                </div>

                {earnings.length === 0 ? (
                  <div className="empty-content">No earnings records found.</div>
                ) : (
                  earnings
                    .slice()
                    .sort((a, b) => {
                      const dateA = getLocalDate(a?.date);
                      const dateB = getLocalDate(b?.date);
                      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
                    })
                    .map((item, index) => {
                      const currency = normalizeCurrency(item?.currency, "USD");

                      return (
                        <div
                          className="sponsorship-row"
                          key={item.id || `${item.date}-${index}`}
                        >
                          <strong>{formatRecordDate(item.date)}</strong>
                          <span>
                            {formatCurrency(item.estimated_revenue, currency)}
                          </span>
                          <strong>
                            {formatCurrency(item.ad_revenue, currency)}
                          </strong>
                          <span>{formatNumber(item.monetized_views)}</span>
                        </div>
                      );
                    })
                )}
              </div>
            </section>

            {/* SPONSORSHIP TRACKING */}
            <section
              id="sponsorship-tracking"
              className="earnings-card"
              style={{ marginTop: 24, padding: 24 }}
            >
              <div className="earnings-card-header">
                <div>
                  <div className="section-label">BRAND COLLABORATIONS</div>
                  <h2>Sponsorship Tracking</h2>
                  <p>Manage sponsorship campaigns and payment status.</p>
                </div>
              </div>

              {/* OVERDUE AND DUE SOON ALERTS */}
              <section
                aria-label="Sponsorship payment alerts"
                style={{
                  marginTop: 20,
                  marginBottom: 24,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {/* OVERDUE ALERTS */}
                <div
                  style={{
                    padding: 18,
                    borderRadius: 12,
                    border: "1px solid #fecaca",
                    background: "#fff5f5",
                    color: "#991b1b",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 16 }}>
                      ⚠ Overdue Payments
                    </h3>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 20,
                        background: "#fee2e2",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {overdueSponsorships.length}
                    </span>
                  </div>

                  <p style={{ margin: "0 0 14px", fontSize: 13 }}>
                    These sponsorship payments need your attention.
                  </p>

                  {sponsorshipLoading ? (
                    <p>Checking payments...</p>
                  ) : overdueSponsorships.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13 }}>
                      No overdue payments. You are all caught up!
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {overdueSponsorships.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            paddingTop: 10,
                            borderTop: "1px solid #fecaca",
                          }}
                        >
                          <strong style={{ display: "block", fontSize: 14 }}>
                            {item.brand_name || "Unknown brand"}
                          </strong>
                          <span
                            style={{
                              display: "block",
                              marginTop: 3,
                              fontSize: 12,
                            }}
                          >
                            {item.campaign_name || "Unnamed campaign"}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 6,
                              marginTop: 7,
                              fontSize: 12,
                            }}
                          >
                            <strong>
                              {formatCurrency(item.amount, item.currency || "INR")}
                            </strong>
                            <span>Due: {formatDueDate(item.due_date)}</span>
                          </div>
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 7,
                              padding: "3px 8px",
                              borderRadius: 5,
                              background: "#fee2e2",
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            {item.payment_status || "pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DUE SOON ALERTS */}
                <div
                  style={{
                    padding: 18,
                    borderRadius: 12,
                    border: "1px solid #fde68a",
                    background: "#fffbeb",
                    color: "#92400e",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 16 }}>◷ Due Soon</h3>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 20,
                        background: "#fef3c7",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {dueSoonSponsorships.length}
                    </span>
                  </div>

                  <p style={{ margin: "0 0 14px", fontSize: 13 }}>
                    Payments due today or within the next 7 days.
                  </p>

                  {sponsorshipLoading ? (
                    <p>Checking payment dates...</p>
                  ) : dueSoonSponsorships.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13 }}>
                      No payments due in the next 7 days.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {dueSoonSponsorships.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            paddingTop: 10,
                            borderTop: "1px solid #fde68a",
                          }}
                        >
                          <strong style={{ display: "block", fontSize: 14 }}>
                            {item.brand_name || "Unknown brand"}
                          </strong>
                          <span
                            style={{
                              display: "block",
                              marginTop: 3,
                              fontSize: 12,
                            }}
                          >
                            {item.campaign_name || "Unnamed campaign"}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 6,
                              marginTop: 7,
                              fontSize: 12,
                            }}
                          >
                            <strong>
                              {formatCurrency(item.amount, item.currency || "INR")}
                            </strong>
                            <span>Due: {formatDueDate(item.due_date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* PAYMENT STATUS SUMMARY */}
              <section
                aria-label="Payment status summary"
                style={{ marginTop: 24, marginBottom: 28 }}
              >
                <div className="earnings-card-header">
                  <div>
                    <div className="section-label">PAYMENT OVERVIEW</div>
                    <h2>Payment Status Summary</h2>
                    <p>
                      View sponsorship values by payment status. Amounts are
                      grouped by currency to avoid adding different currencies
                      together.
                    </p>
                  </div>
                </div>

                {sponsorshipLoading ? (
                  <div className="empty-content" style={{ padding: 24 }}>
                    Loading payment summary...
                  </div>
                ) : (
                  <div className="earnings-kpi-grid" style={{ marginTop: 18 }}>
                    {renderPaymentSummaryCard({
                      title: "TOTAL DEAL VALUE",
                      icon: "◎",
                      items: totalDealValueByCurrency,
                      count: sponsorships.length,
                      description: "All sponsorship deals",
                      accent: "#173f6f",
                    })}
                    {renderPaymentSummaryCard({
                      title: "PAID AMOUNT",
                      icon: "✓",
                      items: paidAmountByCurrency,
                      count: paidSponsorships.length,
                      description: "Payments marked paid",
                      accent: "#16805d",
                    })}
                    {renderPaymentSummaryCard({
                      title: "PENDING AMOUNT",
                      icon: "◷",
                      items: pendingAmountByCurrency,
                      count: pendingSponsorships.length,
                      description: "Unpaid payments not yet overdue",
                      accent: "#d99b19",
                    })}
                    {renderPaymentSummaryCard({
                      title: "OVERDUE AMOUNT",
                      icon: "⚠",
                      items: overdueAmountByCurrency,
                      count: overdueSponsorships.length,
                      description:
                        "Unpaid payments past their due date or explicitly marked overdue",
                      accent: "#c43d3d",
                    })}
                  </div>
                )}
              </section>

              {/* SPONSORSHIP KPI CARDS */}
              <div
                className="earnings-kpi-grid"
                style={{ marginTop: 20, marginBottom: 24 }}
              >
                <div className="earnings-kpi-card">
                  <div className="earnings-kpi-top">
                    <span>TOTAL SPONSORSHIPS</span>
                    <div className="earnings-kpi-icon">◎</div>
                  </div>
                  <h2>{sponsorships.length}</h2>
                  <p>Campaigns recorded</p>
                </div>

                <div className="earnings-kpi-card">
                  <div className="earnings-kpi-top">
                    <span>TOTAL DEAL VALUE</span>
                    <div className="earnings-kpi-icon">₹</div>
                  </div>
                  {renderCurrencyTotals(totalDealValueByCurrency)}
                  <p>Total deal value by currency</p>
                </div>

                <div className="earnings-kpi-card">
                  <div className="earnings-kpi-top">
                    <span>PENDING PAYMENTS</span>
                    <div className="earnings-kpi-icon">◷</div>
                  </div>
                  {renderCurrencyTotals(pendingAmountByCurrency)}
                  <p>Pending amounts by currency, excluding overdue payments</p>
                </div>
              </div>

              {/* ADD SPONSORSHIP FORM */}
              <h3 style={{ marginBottom: 16 }}>Add Sponsorship</h3>

              <form
                onSubmit={handleCreateSponsorship}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                <input
                  name="brand_name"
                  value={form.brand_name}
                  onChange={handleFormChange}
                  placeholder="Brand name"
                  aria-label="Brand name"
                  required
                  style={sponsorshipInputStyle}
                />
                <input
                  name="campaign_name"
                  value={form.campaign_name}
                  onChange={handleFormChange}
                  placeholder="Campaign name"
                  aria-label="Campaign name"
                  required
                  style={sponsorshipInputStyle}
                />
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={handleFormChange}
                  placeholder="Amount"
                  aria-label="Amount"
                  required
                  style={sponsorshipInputStyle}
                />
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleFormChange}
                  aria-label="Currency"
                  style={sponsorshipInputStyle}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
                <select
                  name="payment_status"
                  value={form.payment_status}
                  onChange={handleFormChange}
                  aria-label="Initial payment status"
                  style={sponsorshipInputStyle}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                <label style={sponsorshipLabelStyle}>
                  Start date
                  <input
                    name="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={handleFormChange}
                    style={sponsorshipInputStyle}
                  />
                </label>
                <label style={sponsorshipLabelStyle}>
                  Payment due date
                  <input
                    name="due_date"
                    type="date"
                    value={form.due_date}
                    onChange={handleFormChange}
                    style={sponsorshipInputStyle}
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingSponsorship}
                  style={sponsorshipButtonStyle}
                >
                  {savingSponsorship ? "Saving..." : "Add Sponsorship"}
                </button>
              </form>

              {sponsorshipError && (
                <div className="earnings-error" style={{ marginBottom: 16 }}>
                  {sponsorshipError}
                </div>
              )}

              {sponsorshipMessage && (
                <p style={{ color: "#18794e", marginBottom: 16 }}>
                  {sponsorshipMessage}
                </p>
              )}

              {/* SPONSORSHIP RECORDS TABLE */}
              <h3 style={{ marginBottom: 16 }}>Sponsorship Records</h3>

              {sponsorshipLoading ? (
                <div className="empty-content">Loading sponsorships...</div>
              ) : sponsorships.length === 0 ? (
                <div className="empty-content">No sponsorship records found.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 780,
                      textAlign: "left",
                    }}
                  >
                    <thead>
                      <tr>
                        {[
                          "BRAND",
                          "CAMPAIGN",
                          "AMOUNT",
                          "START DATE",
                          "DUE DATE",
                          "PAYMENT STATUS",
                        ].map((heading) => (
                          <th key={heading} style={sponsorshipThStyle}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sponsorships.map((item, index) => (
                        <tr key={item.id ?? `${item.brand_name}-${index}`}>
                          <td style={sponsorshipTdStyle}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <span
                                aria-label={`${String(item.payment_status || "pending").toLowerCase().trim()} payment status`}
                                title={`${String(item.payment_status || "pending").toLowerCase().trim()} payment status`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 22,
                                  height: 22,
                                  minWidth: 22,
                                  borderRadius: "50%",
                                  fontSize: 13,
                                  fontWeight: 800,
                                  lineHeight: 1,
                                  background:
                                    String(item.payment_status || "pending").toLowerCase().trim() === "paid"
                                      ? "#DCFCE7"
                                      : String(item.payment_status || "pending").toLowerCase().trim() === "overdue"
                                      ? "#FEE2E2"
                                      : "#FEF3C7",
                                  color:
                                    String(item.payment_status || "pending").toLowerCase().trim() === "paid"
                                      ? "#15803D"
                                      : String(item.payment_status || "pending").toLowerCase().trim() === "overdue"
                                      ? "#B91C1C"
                                      : "#B45309",
                                }}
                              >
                                {String(item.payment_status || "pending").toLowerCase().trim() === "paid"
                                  ? "✓"
                                  : String(item.payment_status || "pending").toLowerCase().trim() === "overdue"
                                  ? "!"
                                  : "◷"}
                              </span>
                              <span>{item.brand_name || "-"}</span>
                            </span>
                          </td>
                          <td style={sponsorshipTdStyle}>
                            {item.campaign_name || "-"}
                          </td>
                          <td style={sponsorshipTdStyle}>
                            {formatCurrency(item.amount, item.currency || "INR")}
                          </td>
                          <td style={sponsorshipTdStyle}>
                            {formatRecordDate(item.start_date)}
                          </td>
                          <td style={sponsorshipTdStyle}>
                            {formatRecordDate(item.due_date)}
                          </td>
                          <td style={sponsorshipTdStyle}>
                            <select
                              value={String(item.payment_status || "pending")
                                .toLowerCase()
                                .trim()}
                              onChange={(event) =>
                                handleStatusChange(item.id, event.target.value)
                              }
                              aria-label={`Payment status for ${item.brand_name}`}
                              style={{
                                ...sponsorshipInputStyle,
                                minWidth: 120,
                                padding: "8px",
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* FINANCIAL INSIGHTS */}
            <section className="financial-insights">
              <div className="section-label">FINANCIAL INSIGHTS</div>
              <h2>Monetization Overview</h2>

              <div className="financial-insight-grid">
                <div className="financial-insight-item">
                  <div className="financial-icon">$</div>
                  <div>
                    <strong>Revenue Tracking</strong>
                    <p>
                      CreatorIQ is reading earnings directly from the backend
                      earnings table.
                    </p>
                  </div>
                </div>
                <div className="financial-insight-item">
                  <div className="financial-icon">◉</div>
                  <div>
                    <strong>Monetized Views</strong>
                    <p>
                      Monetized views measure how much content is contributing
                      to revenue.
                    </p>
                  </div>
                </div>
                <div className="financial-insight-item">
                  <div className="financial-icon">↗</div>
                  <div>
                    <strong>Revenue Growth</strong>
                    <p>
                      Continue increasing content performance to improve
                      future monetization.
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

const analyticsRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const sponsorshipInputStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #d8e3f0",
  borderRadius: 8,
  background: "#fff",
  color: "#173f6f",
  font: "inherit",
};

const sponsorshipLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "#526b84",
};

const sponsorshipButtonStyle = {
  padding: "12px 16px",
  border: "none",
  borderRadius: 8,
  background: "#173f6f",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  alignSelf: "end",
};

const sponsorshipThStyle = {
  padding: "13px 12px",
  borderBottom: "1px solid #d8e3f0",
  color: "#7890a6",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const sponsorshipTdStyle = {
  padding: "13px 12px",
  borderBottom: "1px solid #e6edf5",
  color: "#173f6f",
  fontSize: 14,
};

export default Earnings;
