
import { useState } from "react";
import {
  LayoutDashboard,
  ScanSearch,
  History,
  Settings,
  Factory,
  Upload,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowRight,
  Clock3,
  FileCheck2,
  Target,
  TrendingUp,
  Cpu,
  RefreshCw
} from "lucide-react";

import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("inspectionHistory") || "[]"
      );
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -------------------------------
  // STATISTICS
  // -------------------------------

  const normalCount = history.filter(
    (item) => item.classification === "Normal"
  ).length;

  const defectiveCount = history.filter(
    (item) => item.classification === "Defective"
  ).length;

  const totalInspections = history.length;

  const defectRate =
    totalInspections > 0
      ? ((defectiveCount / totalInspections) * 100).toFixed(1)
      : "0.0";

  const latestInspection = history[0] || null;

  const recentHistory = history.slice(0, 5);

  const score = result
    ? Number(result.anomaly_score)
    : null;

  const validScores = history
    .map((item) => Number(item.anomaly_score))
    .filter((value) => Number.isFinite(value));

  const maxScore = Math.max(...validScores, 0.000001);

  // -------------------------------
  // IMAGE UPLOAD
  // -------------------------------

  const handleFile = (selectedFile) => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setError("");
  };

  // -------------------------------
  // IMAGE INSPECTION
  // -------------------------------

  const inspectImage = async () => {
    if (!file) {
      setError("Please upload an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/predict",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Prediction failed");
      }

      setResult(data);

      const newInspection = {
        ...data,
        id: Date.now(),
        date: new Date().toLocaleString()
      };

      const updatedHistory = [
        newInspection,
        ...history
      ];

      setHistory(updatedHistory);

      localStorage.setItem(
        "inspectionHistory",
        JSON.stringify(updatedHistory)
      );

    } catch (err) {
      setError(err.message || "Cannot connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // NAVIGATION HELPERS
  // -------------------------------

  const openInspection = () => {
    setActivePage("inspection");
    setError("");
  };

  const clearCurrentImage = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  const getStatusClass = (classification) => {
    if (classification === "Normal") return "normal";
    if (classification === "Defective") return "defective";
    return "unknown";
  };

  // -------------------------------
  // DASHBOARD
  // -------------------------------

  const renderDashboard = () => (
    <>
      <header className="dashboard-header">
        <div className="welcome-copy">
          <p className="eyebrow">
            <span className="eyebrow-line"></span>
            INDUSTRIAL INTELLIGENCE PLATFORM
          </p>

          <h1>
            Quality Control <span>Dashboard</span>
          </h1>

          <p className="header-description">
            Monitor product quality, detect surface anomalies,
            and keep your production standards under control.
          </p>
        </div>

        <div className="header-actions">
          <div className="system-pill">
            <span className="status-dot"></span>
            All systems operational
          </div>

          <button className="primary-button" onClick={openInspection}>
            <ScanSearch size={18} />
            New Inspection
            <ArrowUpRight size={17} />
          </button>
        </div>
      </header>

      {/* KPI CARDS */}

      <section className="stats-grid">

        <div className="stat-card accent-blue">
          <div className="stat-card-heading">
            <div className="stat-icon">
              <ScanSearch size={21} />
            </div>
            <span className="stat-label">TOTAL INSPECTIONS</span>
          </div>

          <div className="stat-value">
            {totalInspections}
          </div>

          <div className="stat-bottom">
            <span>All recorded inspections</span>
            <span className="stat-mini-icon">
              <Activity size={16} />
            </span>
          </div>
        </div>

        <div className="stat-card accent-green">
          <div className="stat-card-heading">
            <div className="stat-icon">
              <ShieldCheck size={21} />
            </div>
            <span className="stat-label">NORMAL PRODUCTS</span>
          </div>

          <div className="stat-value">
            {normalCount}
          </div>

          <div className="stat-bottom">
            <span>Passed quality inspection</span>
            <span className="stat-mini-icon">
              <CheckCircle2 size={16} />
            </span>
          </div>
        </div>

        <div className="stat-card accent-red">
          <div className="stat-card-heading">
            <div className="stat-icon">
              <AlertTriangle size={21} />
            </div>
            <span className="stat-label">DEFECTIVE PRODUCTS</span>
          </div>

          <div className="stat-value">
            {defectiveCount}
          </div>

          <div className="stat-bottom">
            <span>Flagged for quality review</span>
            <span className="stat-mini-icon">
              <XCircle size={16} />
            </span>
          </div>
        </div>

        <div className="stat-card accent-orange">
          <div className="stat-card-heading">
            <div className="stat-icon">
              <Target size={21} />
            </div>
            <span className="stat-label">DEFECT RATE</span>
          </div>

          <div className="stat-value">
            {defectRate}<small>%</small>
          </div>

          <div className="stat-bottom">
            <span>Based on recorded inspections</span>
            <span className="stat-mini-icon">
              <TrendingUp size={16} />
            </span>
          </div>
        </div>

      </section>

      {/* MAIN DASHBOARD GRID */}

      <section className="dashboard-grid">

        {/* INSPECTION DISTRIBUTION */}

        <div className="panel distribution-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">QUALITY OVERVIEW</span>
              <h2>Inspection Distribution</h2>
              <p>Normal and defective product breakdown</p>
            </div>

            <div className="panel-icon">
              <Activity size={20} />
            </div>
          </div>

          <div className="distribution-content">

            <div
              className="donut-chart"
              style={{
                background:
                  totalInspections === 0
                    ? "conic-gradient(#283341 0deg 360deg)"
                    : `conic-gradient(
                        #22c58b 0deg ${normalCount / totalInspections * 360}deg,
                        #f05b63 ${normalCount / totalInspections * 360}deg 360deg
                      )`
              }}
            >
              <div className="donut-inner">
                <strong>{totalInspections}</strong>
                <span>INSPECTED</span>
              </div>
            </div>

            <div className="distribution-legend">
              <div className="legend-item">
                <span className="legend-dot green-dot"></span>
                <div>
                  <strong>{normalCount}</strong>
                  <span>Normal products</span>
                </div>
                <b>
                  {totalInspections
                    ? ((normalCount / totalInspections) * 100).toFixed(1)
                    : "0.0"}%
                </b>
              </div>

              <div className="legend-item">
                <span className="legend-dot red-dot"></span>
                <div>
                  <strong>{defectiveCount}</strong>
                  <span>Defective products</span>
                </div>
                <b>
                  {totalInspections
                    ? ((defectiveCount / totalInspections) * 100).toFixed(1)
                    : "0.0"}%
                </b>
              </div>
            </div>

          </div>
        </div>

        {/* ANOMALY SCORE TREND */}

        <div className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">MODEL PERFORMANCE</span>
              <h2>Anomaly Score Trend</h2>
              <p>Latest recorded reconstruction errors</p>
            </div>

            <div className="panel-icon">
              <TrendingUp size={20} />
            </div>
          </div>

          {validScores.length === 0 ? (

            <div className="chart-empty">
              <Activity size={30} />
              <p>Complete inspections to view score trends.</p>
            </div>

          ) : (

            <div className="score-chart">
              {history.slice(0, 7).reverse().map((item) => {
                const itemScore = Number(item.anomaly_score);
                const barHeight = Number.isFinite(itemScore)
                  ? Math.max((itemScore / maxScore) * 100, 5)
                  : 5;

                return (
                  <div className="score-bar-column" key={item.id}>
                    <span className="bar-value">
                      {Number.isFinite(itemScore)
                        ? itemScore.toFixed(4)
                        : "--"}
                    </span>

                    <div className="bar-track">
                      <div
                        className={`score-bar ${
                          item.classification === "Defective"
                            ? "bar-defective"
                            : "bar-normal"
                        }`}
                        style={{ height: `${barHeight}%` }}
                      ></div>
                    </div>

                    <span className="bar-label">
                      #{String(item.id).slice(-4)}
                    </span>
                  </div>
                );
              })}
            </div>

          )}

          <div className="chart-caption">
            <span><i className="legend-dot green-dot"></i> Normal</span>
            <span><i className="legend-dot red-dot"></i> Defective</span>
          </div>
        </div>

      </section>

      {/* LOWER DASHBOARD GRID */}

      <section className="dashboard-grid lower-grid">

        {/* RECENT INSPECTIONS */}

        <div className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">ACTIVITY LOG</span>
              <h2>Recent Inspections</h2>
              <p>Your latest product quality checks</p>
            </div>

            <button
              className="text-button"
              onClick={() => setActivePage("history")}
            >
              View all <ArrowRight size={16} />
            </button>
          </div>

          {recentHistory.length === 0 ? (

            <div className="recent-empty">
              <div className="empty-icon">
                <FileCheck2 size={27} />
              </div>
              <h3>No inspections yet</h3>
              <p>Your inspection activity will appear here.</p>
              <button className="secondary-button" onClick={openInspection}>
                Start first inspection
              </button>
            </div>

          ) : (

            <div className="table-wrapper">
              <table className="inspection-table">
                <thead>
                  <tr>
                    <th>PRODUCT / FILE</th>
                    <th>DATE</th>
                    <th>ANOMALY SCORE</th>
                    <th>RESULT</th>
                  </tr>
                </thead>

                <tbody>
                  {recentHistory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="product-cell">
                          <div className="file-icon">
                            <ImageIcon size={17} />
                          </div>
                          <span>{item.filename || "Product image"}</span>
                        </div>
                      </td>

                      <td className="date-cell">
                        {item.date || "Date unavailable"}
                      </td>

                      <td className="score-cell">
                        {Number.isFinite(Number(item.anomaly_score))
                          ? Number(item.anomaly_score).toFixed(5)
                          : "--"}
                      </td>

                      <td>
                        <span className={`result-badge ${getStatusClass(item.classification)}`}>
                          {item.classification || "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          )}
        </div>

        {/* QUICK ACTIONS */}

        <div className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">WORKSPACE</span>
              <h2>Quick Actions</h2>
              <p>Jump into your workflow</p>
            </div>
          </div>

          <button className="quick-action" onClick={openInspection}>
            <div className="quick-action-icon orange-action">
              <ScanSearch size={21} />
            </div>
            <div>
              <strong>New Inspection</strong>
              <span>Analyze a product image</span>
            </div>
            <ArrowUpRight size={18} />
          </button>

          <button
            className="quick-action"
            onClick={() => setActivePage("history")}
          >
            <div className="quick-action-icon blue-action">
              <History size={21} />
            </div>
            <div>
              <strong>Inspection History</strong>
              <span>Review previous results</span>
            </div>
            <ArrowUpRight size={18} />
          </button>

          <button
            className="quick-action"
            onClick={() => setActivePage("analytics")}
          >
            <div className="quick-action-icon green-action">
              <Activity size={21} />
            </div>
            <div>
              <strong>View Analytics</strong>
              <span>Explore quality statistics</span>
            </div>
            <ArrowUpRight size={18} />
          </button>

          <div className="model-status-card">
            <div className="model-status-top">
              <Cpu size={19} />
              <span>AI MODEL STATUS</span>
              <span className="status-dot"></span>
            </div>
            <strong>PyTorch Autoencoder</strong>
            <p>Model interface configured</p>
          </div>
        </div>

      </section>
    </>
  );

  // -------------------------------
  // INSPECTION PAGE
  // -------------------------------

  const renderInspection = () => (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">WORKSPACE / INSPECTION</p>
          <h1>Surface Defect Inspection</h1>
          <p>Upload a product image and run AI-powered quality analysis.</p>
        </div>

        <span className="model-tag">
          <Cpu size={15} /> AUTOENCODER MODEL
        </span>
      </header>

      <section className="inspection-grid">

        <div className="panel inspection-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">INPUT</span>
              <h2>Product Image</h2>
              <p>Select an image to inspect</p>
            </div>
            <div className="panel-icon">
              <ImageIcon size={20} />
            </div>
          </div>

          <label className="upload-area">
            {preview ? (
              <img
                src={preview}
                alt="Selected product"
                className="preview-image"
              />
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">
                  <Upload size={29} />
                </div>
                <h3>Drop your product image here</h3>
                <p>or click to browse files</p>
                <span>PNG, JPG or JPEG</span>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </label>

          {file && (
            <div className="selected-file">
              <ImageIcon size={17} />
              <span>{file.name}</span>
              <button onClick={clearCurrentImage} title="Remove image">
                <XCircle size={18} />
              </button>
            </div>
          )}

          <button
            className="primary-button analyze-button"
            onClick={inspectImage}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <Loader2 className="spin" size={19} />
                Analyzing product...
              </>
            ) : (
              <>
                <ScanSearch size={19} />
                Analyze Product
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="panel result-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">AI ANALYSIS</span>
              <h2>Inspection Results</h2>
              <p>Classification and anomaly information</p>
            </div>
            <div className="panel-icon">
              <Activity size={20} />
            </div>
          </div>

          {!result ? (
            <div className="empty-state">
              <div className="empty-icon">
                <ScanSearch size={32} />
              </div>
              <h3>Awaiting Inspection</h3>
              <p>Upload a product image and start the analysis.</p>
            </div>
          ) : (
            <div className="result-content">
              <div className={`result-banner ${getStatusClass(result.classification)}`}>
                {result.classification === "Normal" ? (
                  <CheckCircle2 size={29} />
                ) : result.classification === "Defective" ? (
                  <XCircle size={29} />
                ) : (
                  <AlertTriangle size={29} />
                )}

                <div>
                  <span>CLASSIFICATION</span>
                  <h2>{result.classification}</h2>
                </div>
              </div>

              <div className="score-display">
                <span>Anomaly Score</span>
                <strong>
                  {score !== null && Number.isFinite(score)
                    ? score.toFixed(6)
                    : "--"}
                </strong>
              </div>

              <div className="result-detail">
                <span>File name</span>
                <strong>{result.filename}</strong>
              </div>

              <div className="result-detail">
                <span>Inspection time</span>
                <strong>{new Date().toLocaleString()}</strong>
              </div>
            </div>
          )}
        </div>

      </section>

      <section className="panel heatmap-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">VISUAL ANALYSIS</span>
            <h2>Anomaly Visualization</h2>
            <p>Pixel-level reconstruction difference heatmap</p>
          </div>
          <div className="panel-icon">
            <Target size={20} />
          </div>
        </div>

        {result?.heatmap ? (
          <div className="heatmap-container">
            <img
              src={`data:image/png;base64,${result.heatmap}`}
              alt="Anomaly heatmap"
              className="heatmap-image"
            />
            <p>Generated reconstruction difference heatmap</p>
          </div>
        ) : (
          <div className="empty-heatmap">
            <ImageIcon size={34} />
            <p>Heatmap will appear after image inspection.</p>
          </div>
        )}
      </section>
    </>
  );

  // -------------------------------
  // HISTORY PAGE
  // -------------------------------

  const renderHistory = () => (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">WORKSPACE / RECORDS</p>
          <h1>Inspection History</h1>
          <p>Review all previously analyzed product images.</p>
        </div>
        <button className="primary-button" onClick={openInspection}>
          <ScanSearch size={18} /> New Inspection
        </button>
      </header>

      <section className="panel navigation-page">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">INSPECTION LOG</span>
            <h2>All Records</h2>
            <p>{history.length} inspections recorded in this browser</p>
          </div>
          <div className="panel-icon"><History size={20} /></div>
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            <History size={40} />
            <h3>No Inspection History</h3>
            <p>Your completed inspections will appear here.</p>
            <button className="secondary-button" onClick={openInspection}>
              Start an inspection
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="inspection-table">
              <thead>
                <tr>
                  <th>PRODUCT / FILE</th>
                  <th>DATE</th>
                  <th>ANOMALY SCORE</th>
                  <th>RESULT</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="product-cell">
                        <div className="file-icon">
                          <ImageIcon size={17} />
                        </div>
                        <span>{item.filename || "Product image"}</span>
                      </div>
                    </td>
                    <td className="date-cell">{item.date}</td>
                    <td className="score-cell">
                      {Number.isFinite(Number(item.anomaly_score))
                        ? Number(item.anomaly_score).toFixed(6)
                        : "--"}
                    </td>
                    <td>
                      <span className={`result-badge ${getStatusClass(item.classification)}`}>
                        {item.classification || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );

  // -------------------------------
  // ANALYTICS PAGE
  // -------------------------------

  
const renderAnalytics = () => (
  <>
    <header className="page-header">
      <div>
        <p className="eyebrow">WORKSPACE / ANALYTICS</p>
        <h1>Quality Analytics</h1>
        <p>
          Understand inspection results and evaluate model performance.
        </p>
      </div>
    </header>

    <section className="stats-grid">
      <div className="stat-card accent-blue">
        <div className="stat-card-heading">
          <div className="stat-icon"><ScanSearch size={21} /></div>
          <span className="stat-label">TOTAL INSPECTIONS</span>
        </div>
        <div className="stat-value">{totalInspections}</div>
        <div className="stat-bottom">All recorded inspections</div>
      </div>

      <div className="stat-card accent-green">
        <div className="stat-card-heading">
          <div className="stat-icon"><CheckCircle2 size={21} /></div>
          <span className="stat-label">NORMAL PRODUCTS</span>
        </div>
        <div className="stat-value">{normalCount}</div>
        <div className="stat-bottom">Passed inspection</div>
      </div>

      <div className="stat-card accent-red">
        <div className="stat-card-heading">
          <div className="stat-icon"><AlertTriangle size={21} /></div>
          <span className="stat-label">DEFECTIVE PRODUCTS</span>
        </div>
        <div className="stat-value">{defectiveCount}</div>
        <div className="stat-bottom">Flagged for review</div>
      </div>

      <div className="stat-card accent-orange">
        <div className="stat-card-heading">
          <div className="stat-icon"><Target size={21} /></div>
          <span className="stat-label">DEFECT RATE</span>
        </div>
        <div className="stat-value">{defectRate}<small>%</small></div>
        <div className="stat-bottom">Of recorded inspections</div>
      </div>
    </section>

    {/* MODEL EVALUATION */}
    <section className="panel model-evaluation-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">MODEL PERFORMANCE</span>
          <h2>Model Evaluation</h2>
          <p>Performance measured using the MVTec AD Bottle test data.</p>
        </div>
        <div className="panel-icon">
          <Target size={20} />
        </div>
      </div>

      <div className="auc-card">
        <span>ROC-AUC SCORE</span>
        <strong>0.6101</strong>
        <p>Area Under the Receiver Operating Characteristic Curve</p>
      </div>

      <div className="roc-section">
        <div className="roc-heading">
          <div>
            <h3>ROC Curve</h3>
            <p>True Positive Rate vs False Positive Rate</p>
          </div>
          <span className="roc-tag">MVTec AD · Bottle</span>
        </div>

        <img
          src="/roc_curve.png"
          alt="ROC Curve for INDUSTRIA industrial defect detection model"
          className="roc-image"
        />

        <p className="roc-note">
          The diagonal dashed line represents random classification.
          The blue curve represents the evaluated model.
        </p>
      </div>
    </section>

    {/* EXISTING ANALYTICS CHARTS */}
    <section className="dashboard-grid">
      <div className="panel distribution-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">QUALITY BREAKDOWN</span>
            <h2>Product Classification</h2>
            <p>Distribution across recorded inspections</p>
          </div>
        </div>

        <div className="distribution-content">
          <div
            className="donut-chart"
            style={{
              background: totalInspections === 0
                ? "conic-gradient(#283341 0deg 360deg)"
                : `conic-gradient(#22c58b 0deg ${
                    normalCount / totalInspections * 360
                  }deg, #f05b63 ${
                    normalCount / totalInspections * 360
                  }deg 360deg)`
            }}
          >
            <div className="donut-inner">
              <strong>{totalInspections}</strong>
              <span>INSPECTED</span>
            </div>
          </div>

          <div className="distribution-legend">
            <div className="legend-item">
              <span className="legend-dot green-dot"></span>
              <div>
                <strong>{normalCount}</strong>
                <span>Normal products</span>
              </div>
            </div>
            <div className="legend-item">
              <span className="legend-dot red-dot"></span>
              <div>
                <strong>{defectiveCount}</strong>
                <span>Defective products</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel trend-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">INSPECTION METRICS</span>
            <h2>Anomaly Score Trend</h2>
            <p>Latest seven recorded scores</p>
          </div>
        </div>

        {validScores.length === 0 ? (
          <div className="chart-empty">
            <Activity size={30} />
            <p>No score data available yet.</p>
          </div>
        ) : (
          <div className="score-chart">
            {history.slice(0, 7).reverse().map((item) => {
              const value = Number(item.anomaly_score);
              const height = Number.isFinite(value)
                ? Math.max((value / maxScore) * 100, 5)
                : 5;

              return (
                <div className="score-bar-column" key={item.id}>
                  <span className="bar-value">
                    {Number.isFinite(value) ? value.toFixed(4) : "--"}
                  </span>
                  <div className="bar-track">
                    <div
                      className={`score-bar ${
                        item.classification === "Defective"
                          ? "bar-defective"
                          : "bar-normal"
                      }`}
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <span className="bar-label">
                    #{String(item.id).slice(-4)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  </>
);

  // -------------------------------
  // SETTINGS PAGE
  // -------------------------------

  const renderSettings = () => (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">WORKSPACE / CONFIGURATION</p>
          <h1>System Settings</h1>
          <p>Application information and system configuration.</p>
        </div>
      </header>

      <section className="panel navigation-page">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">SYSTEM INFORMATION</span>
            <h2>Application Details</h2>
            <p>Current INDUSTRIA application setup</p>
          </div>
          <div className="panel-icon"><Settings size={20} /></div>
        </div>

        <div className="settings-list">
          <div className="settings-row">
            <span>Application</span>
            <strong>INDUSTRIA AI</strong>
          </div>
          <div className="settings-row">
            <span>Version</span>
            <strong>1.0.0</strong>
          </div>
          <div className="settings-row">
            <span>AI Model</span>
            <strong>PyTorch Autoencoder</strong>
          </div>
          <div className="settings-row">
            <span>Backend</span>
            <strong>FastAPI</strong>
          </div>
          <div className="settings-row">
            <span>Frontend</span>
            <strong>React + Vite</strong>
          </div>
          <div className="settings-row">
            <span>Inspection records</span>
            <strong>{history.length}</strong>
          </div>
          <div className="settings-row">
            <span>Storage</span>
            <strong>Browser local storage</strong>
          </div>
        </div>
      </section>
    </>
  );

  // -------------------------------
  // MAIN LAYOUT
  // -------------------------------

  const pageTitles = {
    dashboard: "Dashboard",
    inspection: "Inspection",
    history: "History",
    analytics: "Analytics",
    settings: "Settings"
  };

  return (
    <div className="app-shell">

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Factory size={25} />
          </div>
          <div>
            <h2>INDUSTRIA</h2>
            <span>AI INSPECTION SYSTEM</span>
          </div>
        </div>

        <div className="sidebar-divider"></div>

        <p className="menu-label">WORKSPACE</p>

        <nav className="navigation">
          <button
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
            {activePage === "dashboard" && <i></i>}
          </button>

          <button
            className={`nav-item ${activePage === "inspection" ? "active" : ""}`}
            onClick={() => setActivePage("inspection")}
          >
            <ScanSearch size={19} />
            <span>Inspection</span>
            {activePage === "inspection" && <i></i>}
          </button>

          <button
            className={`nav-item ${activePage === "history" ? "active" : ""}`}
            onClick={() => setActivePage("history")}
          >
            <History size={19} />
            <span>History</span>
            {activePage === "history" && <i></i>}
          </button>

          <button
            className={`nav-item ${activePage === "analytics" ? "active" : ""}`}
            onClick={() => setActivePage("analytics")}
          >
            <Activity size={19} />
            <span>Analytics</span>
            {activePage === "analytics" && <i></i>}
          </button>

          <button
            className={`nav-item ${activePage === "settings" ? "active" : ""}`}
            onClick={() => setActivePage("settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
            {activePage === "settings" && <i></i>}
          </button>
        </nav>

        <div className="sidebar-spacer"></div>

        <div className="sidebar-system-card">
          <div className="system-card-icon">
            <Cpu size={19} />
          </div>
          <div>
            <strong>AI ENGINE</strong>
            <span><i className="status-dot"></i> System online</span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot"></span>
            ALL SYSTEMS OPERATIONAL
          </div>
          <div className="version">INDUSTRIA v1.0.0</div>
        </div>
      </aside>

      <main className="main-content">

        <div className="mobile-topbar">
          <div className="mobile-brand">
            <Factory size={21} />
            <strong>INDUSTRIA</strong>
          </div>
          <span className="system-pill">
            <span className="status-dot"></span> Online
          </span>
        </div>

        <div className="content-topline">
          <span>{pageTitles[activePage]}</span>
          <div>
            <span className="status-dot"></span>
            AI ENGINE CONNECTED
          </div>
        </div>

        {activePage === "dashboard" && renderDashboard()}
        {activePage === "inspection" && renderInspection()}
        {activePage === "history" && renderHistory()}
        {activePage === "analytics" && renderAnalytics()}
        {activePage === "settings" && renderSettings()}

        <footer className="app-footer">
          <span>INDUSTRIA AI <i>·</i> Industrial Surface Defect Detection</span>
          <span>Powered by PyTorch & FastAPI</span>
        </footer>

      </main>
    </div>
  );
}

export default App;
