import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

export default function App() {
 const API=(import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/,"");


  const [targetFile, setTargetFile] = useState(null);
  const [inputFiles, setInputFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // ✅ SETTINGS
  const [mode, setMode] = useState("hybrid"); // hybrid | similarity
  const [detector, setDetector] = useState("mtcnn"); // mtcnn | retinaface
  const [similarityThreshold, setSimilarityThreshold] = useState(0.42);

  // ✅ Preview tabs
  const [activeTab, setActiveTab] = useState("matched"); // matched | not

  const canSubmit = useMemo(() => {
    return Boolean(targetFile) && inputFiles.length > 0 && !loading;
  }, [targetFile, inputFiles, loading]);

  const targetPreview = useMemo(() => {
    return targetFile ? URL.createObjectURL(targetFile) : null;
  }, [targetFile]);

  const inputPreviews = useMemo(() => {
    return inputFiles.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
  }, [inputFiles]);

  useEffect(() => {
    return () => {
      if (targetPreview) URL.revokeObjectURL(targetPreview);
      inputPreviews.forEach((x) => URL.revokeObjectURL(x.url));
    };
  }, [targetPreview, inputPreviews]);

  const showToast = (type, text) => {
    setToast({ type, text });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleTargetChange = (e) => {
    const file = e.target.files?.[0] || null;
    setTargetFile(file);
    setResults(null);
    setProgress(0);
    setActiveTab("matched");

    if (file) {
      showToast("success", "✅ Target face selected");
    }
  };

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    setInputFiles(files);
    setResults(null);
    setProgress(0);
    setActiveTab("matched");

    if (files.length > 0) {
      showToast("success", `✅ ${files.length} image(s) added`);
    }
  };

  const handleClear = () => {
    setTargetFile(null);
    setInputFiles([]);
    setResults(null);
    setProgress(0);
    setActiveTab("matched");
    showToast("info", "Cleared selection");
  };

  const startFakeProgress = () => {
    setProgress(5);

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const jump = Math.random() * 4 + 1;
        return Math.min(prev + jump, 92);
      });
    }, 350);
  };

  const stopFakeProgress = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopFakeProgress();
    };
  }, []);

  const handleSort = async () => {
    if (!targetFile || inputFiles.length === 0) return;

    if (!API) {
      showToast("error", "❌ VITE_API_URL missing in Vercel env");
      return;
    }

    setLoading(true);
    setResults(null);
    setActiveTab("matched");

    showToast("info", "Uploading + sorting started...");
    startFakeProgress();

    try {
      const formData = new FormData();
      formData.append("target", targetFile);

      inputFiles.forEach((file) => {
        formData.append("images", file);
      });

      formData.append("mode", mode);
      formData.append("detector", detector);
      formData.append("similarity_threshold", String(similarityThreshold));

      const res = await axios.post(`${API}/sort`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000
      });

      setProgress(100);
      setResults(res.data);

      showToast("success", `✅ Done! Matched ${res.data.matched_count} images`);
    } catch (err) {
      setProgress(0);

      console.log("API ERROR FULL:", err);

      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Network error";

      showToast("error", "❌ " + msg);
    } finally {
      stopFakeProgress();
      setLoading(false);

      setTimeout(() => {
        setProgress(0);
      }, 1200);
    }
  };


  const matchedPreviewList = useMemo(() => {
    return results?.matched_preview_urls || [];
  }, [results]);

  const notMatchedPreviewList = useMemo(() => {
    return results?.not_matched_preview_urls || [];
  }, [results]);

  const activePreviewList = useMemo(() => {
    return activeTab === "matched" ? matchedPreviewList : notMatchedPreviewList;
  }, [activeTab, matchedPreviewList, notMatchedPreviewList]);

  const activePreviewTitle = useMemo(() => {
    return activeTab === "matched" ? "Matched Preview" : "Not Matched Preview";
  }, [activeTab]);

  return (
    <div className="page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.text}</span>
          <button className="toastClose" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      <div className="card">
        <div className="header">
          <h1>Face Recognition Photo Sorter</h1>
          <p className="sub">
            Upload a target face + multiple images. It will sort matched photos automatically.
          </p>
        </div>

        <div className="settings">
          <div className="settingsHeader">
            <h3>Settings</h3>
            <p>Adjust settings according to you for best results</p>
            <p > This website is fast for pre-trained images of celebrities, and may be slow for other images <b>So, If website is too slow, use <u>RetinaFace</u> for faster results ! but remenber RetinaFace can give wrong matches sometimes </b>  </p>
          </div>

          <div className="settingsGrid">
            <div className="settingItem">
              <label>Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={loading}>
                <option value="hybrid">Hybrid (SVM + Cosine Similarity)</option>
                <option value="similarity">Cosine Similarity Only</option>
              </select>
            </div>

            <div className="settingItem">
              <label>Detector</label>
              <select value={detector} onChange={(e) => setDetector(e.target.value)} disabled={loading}>
                <option value="mtcnn">MTCNN (Recommended)</option>
                <option value="retinaface">RetinaFace</option>
              </select>
            </div>

            <div className="settingItem settingWide">
              <label>
                Similarity Threshold: <b>{similarityThreshold.toFixed(2)}</b>
              </label>

              <input
                type="range"
                min="0.25"
                max="0.55"
                step="0.01"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                disabled={loading}
              />

              <p className="settingHint">
                Lower = strict matching | Higher = more matches (can include false positives). <b>Use 0.42 for best results.</b>
              </p>
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="box">
            <p className="boxTitle">1) Target Face</p>

            <div className="fileRow">
              <input type="file" accept="image/*" onChange={handleTargetChange} />
              {targetFile && <p className="hint">Selected: {targetFile.name}</p>}
            </div>

            {targetPreview && (
              <div className="previewCard">
                <img className="previewImg" src={targetPreview} alt="target preview" />
              </div>
            )}
          </div>

          <div className="box">
            <p className="boxTitle">2) Images to Scan</p>

            <div className="fileRow">
              <input type="file" accept="image/*" multiple onChange={handleInputChange} />
              <p className="hint">{inputFiles.length} image(s) selected</p>
            </div>

            {inputPreviews.length > 0 && (
              <div>
                <div className="thumbGrid">
                  {inputPreviews.slice(0, 12).map((x) => (
                    <div className="thumb" key={x.name}>
                      <img src={x.url} alt={x.name} />
                    </div>
                  ))}
                </div>

                {inputPreviews.length > 12 && (
                  <p className="moreText">+{inputPreviews.length - 12} more</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="actions">
          <button className="btn" disabled={!canSubmit} onClick={handleSort}>
            {loading ? "Sorting... Please wait" : "Sort Images"}
          </button>

          <button className="secondaryBtn" onClick={handleClear} disabled={loading}>
            Clear
          </button>
        </div>

        {loading && (
          <div className="progressWrap">
            <div className="progressTop">
              <span>Processing</span>
              <span>{progress}%</span>
            </div>

            <div className="progressBar">
              <div className="progressFill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {results && (
          <div className="results">
            <h3>Results</h3>

            <div className="resultBadgeRow">
              <span className="badge">Target predicted: <b>{results.target_label}</b></span>
              <span className="badge">SVM score: <b>{Number(results.target_score).toFixed(2)}</b></span>
            </div>

            <p className="svmNote">
              Note: This SVM classifier is trained only on celebrity identities. If the target face is not in the dataset,
              it may still predict the closest celebrity match. Final matching uses cosine similarity for verification.
            </p>

            <div className="resultRow">
              <span>Total Scanned:</span>
              <b>{results.total_scanned}</b>
            </div>

            <div className="resultRow">
              <span>Matched:</span>
              <b>{results.matched_count}</b>
            </div>

            <div className="resultRow">
              <span>Not Matched:</span>
              <b>{results.not_matched_count}</b>
            </div>

            <div className="zipActions">
              {results.matched_zip_url && (
                <a
                  className="linkBtn"
                  href={`${API}/download/${results.run_id}/matched`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download Matched ZIP
                </a>
              )}

              {results.not_matched_zip_url && (
                <a
                  className="linkBtn linkBtnAlt"
                  href={`${API}/download/${results.run_id}/not_matched`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download Not Matched ZIP
                </a>
              )}
            </div>

            <div className="galleryWrap">
              <div className="note112">
                Note :- Preview of some of the images might be blocked by Ad Blocker Extension in your Browser
              </div>

              <div className="galleryHeaderRow">
                <h4 className="galleryTitle">{activePreviewTitle}</h4>

                <div className="galleryTabs">
                  <button
                    className={`tabBtn ${activeTab === "matched" ? "active" : ""}`}
                    onClick={() => setActiveTab("matched")}
                  >
                    Matched
                  </button>

                  <button
                    className={`tabBtn ${activeTab === "not" ? "active" : ""}`}
                    onClick={() => setActiveTab("not")}
                  >
                    Not Matched
                  </button>
                </div>
              </div>

              {activePreviewList.length === 0 ? (
                <p className="galleryEmpty">No preview images available.</p>
              ) : (
                <div className="previewGrid">
                  {activePreviewList.map((url) => (
                    <button
                      className="previewThumbBtn"
                      key={url}
                     onClick={()=>window.open(encodeURI(url),"_blank")}

                      title="Open image"
                    >
                      <img
                        src={encodeURI(url)}

                        alt="preview"
                        onError={(e) => {
                          e.currentTarget.src = "/fallback.png";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              <p className="galleryHint">
                Showing up to 24 preview images. Download ZIP for full output.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="howItWorks">
        <h2>How it works</h2>

        <div className="steps">
          <div className="stepCard">
            <p className="stepNum">1</p>
            <p className="stepTitle">Upload Target Face</p>
            <p className="stepDesc">
              You upload the face you want to search for and other multiple images that you want to sort.
            </p>
          </div>

          <div className="stepCard">
            <p className="stepNum">2</p>
            <p className="stepTitle">Detect Faces</p>
            <p className="stepDesc">
              The backend detects faces in every image using <b>MTCNN</b> / <b>RetinaFace</b>.
            </p>
          </div>

          <div className="stepCard">
            <p className="stepNum">3</p>
            <p className="stepTitle">Create Face Embeddings</p>
            <p className="stepDesc">
              Each detected face is converted into a 512-D embedding using <b>FaceNet512</b>.
            </p>
          </div>

          <div className="stepCard">
            <p className="stepNum">4</p>
            <p className="stepTitle">Match Faces</p>
            <p className="stepDesc">
              Matches are found using <b>SVM prediction (Pretrained ML model)</b> + <b>Cosine similarity</b> fallback.
            </p>
          </div>

          <div className="stepCard">
            <p className="stepNum">5</p>
            <p className="stepTitle">Export Result</p>
            <p className="stepDesc">
              Matched / Not matched images are sorted and packed into ZIP files for download.
            </p>
          </div>
        </div>
      </div>

      <div className="videoSection">
        <h2>Demo Video</h2>

        <div className="videoWrap">
          <iframe
            src="https://www.youtube.com/embed/NIYn7HLk6Gc"
            title="Face Sorter Demo"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>

      <footer className="siteFooter">
        <div className="footerInner">
          <p className="footerLeft">
            © {new Date().getFullYear()} Face Recognition Photo Sorter • Made by Daksh Pokhriyal • itisdakshpokhriyal@gmail.com
          </p>

          <div className="footerLinks">
            <a href="https://github.com/dakshpokh" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/daksh-pokhriyal-14582830a/" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
