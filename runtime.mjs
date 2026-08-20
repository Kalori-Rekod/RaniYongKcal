import { jsx, jsxs } from 'https://widgetlibs.static.usercontent.goog/react/jsx-runtime-Dc9ViRTo.js';
import React, { useState, useEffect, useRef } from 'https://widgetlibs.static.usercontent.goog/react-Dd1pKoqe.js';
import ReactDOM from 'https://widgetlibs.static.usercontent.goog/react-dom/client-BTuQ-l8_.js';
import { ErrorBoundary } from 'https://widgetlibs.static.usercontent.goog/react-error-boundary-BY2GTZrN.js';
import { Download, Trash2 } from 'https://widgetlibs.static.usercontent.goog/lucide-react-5WMLBm_f.js';

true              &&(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
}());

const ErrorFallback = ({ error }) => /* @__PURE__ */ jsxs("div", { className: "p-5 text-error bg-card rounded-xl", children: [
  /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Sistem ralat ditemui:" }),
  /* @__PURE__ */ jsx("pre", { className: "text-xs mt-1", children: error.message })
] });
function App() {
  return /* @__PURE__ */ jsx(ErrorBoundary, { FallbackComponent: ErrorFallback, children: /* @__PURE__ */ jsx(CalorieTrackerWidget, {}) });
}
function CalorieTrackerWidget() {
  const TODAY_DATE = (() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1e3);
    return localDate.toISOString().split("T")[0];
  })();

  // PASTE URL WEB APP GAS ANDA DI SINI.
  // Contoh: https://script.google.com/macros/s/XXXXXXXX/exec
  const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwtJWh9oAxMqSr_Fs32n64puyFbhfhvuVecjO85eyzpNX4xRVTJBEZ39iR3zWOrVHqfKg/exec";
  const LOGIN_PAGE = "login.html";
  const AUTH_TOKEN_KEY = "kalori_auth_token";
  const AUTH_USER_KEY = "calorie_current_user";
  const AUTH_USER_ID_KEY = "calorie_current_user_id";

  const [profiles, setProfiles] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [logs, setLogs] = useState([]);
  const [inputDate, setInputDate] = useState(TODAY_DATE);
  const [inputMeal, setInputMeal] = useState("Sarapan");
  const [inputCalories, setInputCalories] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [editingLog, setEditingLog] = useState(null);
  const [visualizationStyle, setVisualizationStyle] = useState("bar");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [containerWidth, setContainerWidth] = useState(500);
  const containerRef = useRef(null);
  const [authReady, setAuthReady] = useState(false);

  const redirectToLogin = () => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_USER_ID_KEY);
    } catch (_) {}
    window.location.replace(LOGIN_PAGE);
  };

  const getAuthUserId = () => {
    try { return localStorage.getItem(AUTH_USER_ID_KEY) || ""; }
    catch (_) { return ""; }
  };

  const getAuthToken = () => {
    try { return localStorage.getItem(AUTH_TOKEN_KEY) || ""; }
    catch (_) { return ""; }
  };

  const apiPost = async (payload) => {
    if (!GAS_API_URL || GAS_API_URL.includes("PASTE_WEB_APP_URL_HERE")) {
      throw new Error("Sila masukkan URL Web App Google Apps Script pada GAS_API_URL.");
    }

    const token = getAuthToken();
    const userId = getAuthUserId();
    if (!token || !userId) {
      redirectToLogin();
      throw new Error("Sesi login diperlukan.");
    }

    const response = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...payload, token, userId })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.status === "unauthorized") {
      redirectToLogin();
      throw new Error(data.message || "Sesi login telah tamat.");
    }
    if (data.status !== "success" && data.status !== "denied") {
      throw new Error(data.message || "Ralat daripada GAS.");
    }
    return data;
  };

  const normaliseLog = (log) => ({
    id: String(log.id),
    user: currentUser,
    userId: String(log.userId || currentUserId),
    foodName: log.foodName || "Lain-lain",
    mealType: log.foodName || "Lain-lain",
    calories: Number(log.calories) || 0,
    date: String(log.recordDate || TODAY_DATE),
    time: log.time || "—"
  });

  const loadData = async (username) => {
    if (!username) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiPost({ action: "fetchData" });
      setProfiles(Array.isArray(data.allUsers) ? data.allUsers : [data.username || username]);
      setDailyGoal(Number(data.dailyGoal) || 2000);
      if (data.userId) {
        setCurrentUserId(String(data.userId));
        try { localStorage.setItem(AUTH_USER_ID_KEY, String(data.userId)); } catch (_) {}
      }
      if (data.username) {
        setCurrentUser(String(data.username));
        try { localStorage.setItem(AUTH_USER_KEY, String(data.username)); } catch (_) {}
      }
      setLogs((Array.isArray(data.logs) ? data.logs : []).map(normaliseLog));
    } catch (e) {
      setError(e.message || "Gagal mengambil data daripada GAS.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    const savedUser = typeof localStorage !== "undefined"
      ? localStorage.getItem(AUTH_USER_KEY)
      : "";
    const savedUserId = typeof localStorage !== "undefined"
      ? localStorage.getItem(AUTH_USER_ID_KEY)
      : "";

    if (!token || !savedUser || !savedUserId) {
      redirectToLogin();
      return;
    }

    setCurrentUser(savedUser);
    setCurrentUserId(savedUserId);
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!authReady || !currentUser) return;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(AUTH_USER_KEY, currentUser);
    }
    loadData(currentUser);
  }, [authReady, currentUser, currentUserId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  };

  const resetForm = () => {
    setEditingLog(null);
    setInputDate(TODAY_DATE);
    setInputMeal("Sarapan");
    setInputCalories("");
  };

  // Setiap login kini terikat kepada satu User ID.
  // Tiada lagi pertukaran profil daripada browser.

  const handleSubmitLog = async (e) => {
    e.preventDefault();
    const cals = parseInt(inputCalories, 10);
    if (!inputDate || !inputMeal.trim() || isNaN(cals) || cals <= 0) {
      setError("Sila lengkapkan tarikh, jenis makanan dan kalori.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingLog) {
        await apiPost({
          action: "updateLog",
          logId: editingLog.id,
          foodName: inputMeal.trim(),
          calories: cals,
          recordDate: inputDate
        });
      } else {
        await apiPost({
          action: "addLog",
          foodName: inputMeal.trim(),
          calories: cals,
          recordDate: inputDate
        });
      }

      resetForm();
      await loadData(currentUser);
      showMessage(editingLog ? "Rekod berjaya diedit." : "Rekod berjaya ditambah.");
    } catch (e) {
      setError(e.message || "Gagal menyimpan rekod.");
    } finally {
      setSaving(false);
    }
  };

  const startEditLog = (log) => {
    setEditingLog(log);
    setInputDate(log.date);
    setInputMeal(log.foodName || log.mealType || "Lain-lain");
    setInputCalories(String(log.calories));
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Padam rekod ini?")) return;
    setSaving(true);
    setError("");
    try {
      await apiPost({
        action: "deleteLog",
        logId: id
      });
      await loadData(currentUser);
      showMessage("Rekod berjaya dipadam.");
    } catch (e) {
      setError(e.message || "Gagal memadam rekod.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!userLogs.length) return;
    if (!window.confirm(`Padam semua ${userLogs.length} rekod untuk ${currentUser}?`)) return;
    setSaving(true);
    setError("");
    try {
      for (const log of userLogs) {
        await apiPost({ action: "deleteLog", logId: log.id });
      }
      await loadData(currentUser);
      showMessage("Semua rekod berjaya dipadam.");
    } catch (e) {
      setError(e.message || "Gagal memadam semua rekod.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPDF = () => {
    const oneMonthLogs = logs.filter((l) => {
      const d = new Date(l.date);
      const cutoff = new Date(TODAY_DATE);
      cutoff.setDate(cutoff.getDate() - 30);
      return !isNaN(d.getTime()) && d >= cutoff;
    });
    const totalCals = oneMonthLogs.reduce((sum, l) => sum + l.calories, 0);
    const htmlContent = `
      <html><head><title>Laporan_Kalori_${currentUser}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:40px;color:#0a0a0a}
        h2{color:#336ef3}.header{border-bottom:2px solid #336ef3;padding-bottom:15px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #dcdfe5;padding:10px;text-align:left}
        th{background:#f0f2f5}.total{font-weight:bold}
      </style></head>
      <body>
        <div class="header"><h2>Laporan Kalori 30 Hari Terkini</h2>
        <p><b>Pengguna:</b> ${currentUser} &nbsp; <b>User ID:</b> ${currentUserId} &nbsp; <b>Tarikh:</b> ${TODAY_DATE}</p></div>
        <table><thead><tr><th>Tarikh</th><th>Jenis Makanan</th><th>Kalori</th></tr></thead>
        <tbody>${oneMonthLogs.length ? oneMonthLogs.map(l => `<tr><td>${l.date}</td><td>${l.foodName}</td><td>${l.calories} kcal</td></tr>`).join("") : `<tr><td colspan="3">Tiada rekod.</td></tr>`}
        <tr class="total"><td colspan="2">Jumlah</td><td>${totalCals} kcal</td></tr></tbody></table>
        <script>window.onload=function(){window.print();};<\/script>
      </body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Kalori_${currentUser}_${TODAY_DATE}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const userLogs = logs.filter((l) => l.userId === currentUserId);
  const filteredLogs = logs;

  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(async () => {
      try {
        if (!searchText.trim()) {
          await loadData(currentUser);
          return;
        }
        const data = await apiPost({
          action: "searchLog",
          query: searchText.trim()
        });
        setLogs((Array.isArray(data.logs) ? data.logs : []).map(normaliseLog));
      } catch (e) {
        setError(e.message || "Carian gagal.");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, currentUser]);

  const todayTotalCalories = userLogs
    .filter((l) => l.date === inputDate)
    .reduce((sum, l) => sum + l.calories, 0);

  const last5Days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(inputDate);
    d.setDate(d.getDate() - (4 - i));
    return d.toISOString().split("T")[0];
  });

  const dailyTrendData = last5Days.map((dateStr) => ({
    date: dateStr.substring(5),
    calories: userLogs.filter((l) => l.date === dateStr).reduce((sum, l) => sum + l.calories, 0),
    fullDate: dateStr
  }));

  const mealTypesList = ["Sarapan", "Makan Tengahari", "Makan Malam", "Snek / Lain-lain"];
  const pieBreakdown = mealTypesList.map((type) => ({
    type,
    calories: userLogs.filter((l) => l.foodName === type).reduce((sum, l) => sum + l.calories, 0)
  }));
  const totalPieCalories = pieBreakdown.reduce((sum, item) => sum + item.calories, 0) || 1;
  const progressPercent = Math.min(100, (todayTotalCalories / (dailyGoal || 1)) * 100);

  return /* @__PURE__ */ jsx("div", {
    ref: containerRef,
    className: "w-full min-h-screen bg-background text-foreground font-sans flex flex-col p-3 sm:p-6",
    children: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl w-full mx-auto flex flex-col gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "w-full bg-card rounded-2xl p-4 border border-border flex flex-col gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("h3", { className: "text-sm font-medium flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx("span", { className: "material-icons text-primary text-sm", children: "analytics" }),
              "Visualisasi Analisis Kalori (", currentUser || "—", ")"
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground", children: loading ? "Sedang mengambil data dari Google Sheets..." : "Data dibaca terus daripada GAS / Google Sheets" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex p-0.5 bg-muted rounded-full border border-border/40", children: [
            null
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex p-0.5 bg-muted rounded-full border border-border/40 w-fit ml-auto", children: [
          /* @__PURE__ */ jsx("button", { type:"button", onClick:()=>setVisualizationStyle("bar"), className:`px-3 py-1 text-xs font-medium rounded-full ${visualizationStyle==="bar"?"bg-primary text-white":"text-muted-foreground"}`, children:"Graf Bar" }),
          /* @__PURE__ */ jsx("button", { type:"button", onClick:()=>setVisualizationStyle("line"), className:`px-3 py-1 text-xs font-medium rounded-full ${visualizationStyle==="line"?"bg-primary text-white":"text-muted-foreground"}`, children:"Graf Garisan" }),
          /* @__PURE__ */ jsx("button", { type:"button", onClick:()=>setVisualizationStyle("pie"), className:`px-3 py-1 text-xs font-medium rounded-full ${visualizationStyle==="pie"?"bg-primary text-white":"text-muted-foreground"}`, children:"Carta Pai" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-full bg-background rounded-xl p-3 border border-border/40 min-h-[160px] flex items-center justify-center", children:
          userLogs.length === 0 ? /* @__PURE__ */ jsx("p", { className:"text-xs text-muted-foreground", children:"Tiada rekod untuk dipaparkan." }) :
          visualizationStyle === "pie" ?
          /* @__PURE__ */ jsxs("div", { className:"grid grid-cols-1 sm:grid-cols-2 gap-4 items-center w-full max-w-md mx-auto", children:[
            /* @__PURE__ */ jsx("div", { className:"flex justify-center", children:
              /* @__PURE__ */ jsxs("svg", { width:"120",height:"120",viewBox:"0 0 120 120",className:"transform -rotate-90",children:[
                (() => {
                  let accumulatedAngle=0;
                  const colors=["#336ef3","#34a853","#fbbc04","#ea4335"];
                  return pieBreakdown.map((item,index)=>{
                    if(item.calories===0)return null;
                    const percentage=item.calories/totalPieCalories;
                    const angle=percentage*360;
                    const r=40,cx=60,cy=60;
                    const radStart=accumulatedAngle*Math.PI/180;
                    accumulatedAngle+=angle;
                    const radEnd=accumulatedAngle*Math.PI/180;
                    const x1=cx+r*Math.cos(radStart),y1=cy+r*Math.sin(radStart);
                    const x2=cx+r*Math.cos(radEnd),y2=cy+r*Math.sin(radEnd);
                    const largeArcFlag=angle>180?1:0;
                    const pathData=`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                    return /* @__PURE__ */ jsx("path",{d:pathData,fill:colors[index%colors.length],className:"stroke-background stroke-2"},item.type);
                  });
                })(),
                /* @__PURE__ */ jsx("circle",{cx:"60",cy:"60",r:"20",fill:"var(--color-background)"})
              ]})
            }),
            /* @__PURE__ */ jsx("div",{className:"flex flex-col gap-1.5",children:pieBreakdown.map((item,index)=>/* @__PURE__ */ jsxs("div",{className:"flex justify-between text-xs",children:[
              /* @__PURE__ */ jsx("span",{className:"text-muted-foreground",children:item.type}),
              /* @__PURE__ */ jsxs("span",{className:"font-medium",children:[item.calories," kcal"]})
            ]},item.type))})
          ]}) :
          /* @__PURE__ */ jsxs("div",{className:"w-full flex flex-col gap-1",children:[
            /* @__PURE__ */ jsxs("div",{className:"h-28 w-full flex items-end justify-between px-4 pt-4 border-b border-border/60 relative",children:[
              (()=> {
                const maxVal=Math.max(...dailyTrendData.map(d=>d.calories),dailyGoal,1);
                return dailyTrendData.map(d=>{
                  const barHeightPercent=d.calories/maxVal*100;
                  return /* @__PURE__ */ jsxs("div",{className:"flex flex-col items-center flex-1 group relative h-full justify-end",children:[
                    /* @__PURE__ */ jsxs("div",{className:"absolute bottom-full mb-1 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap z-10",children:[d.calories," kcal"]}),
                    visualizationStyle==="bar" ?
                    /* @__PURE__ */ jsx("div",{style:{height:`${Math.max(4,barHeightPercent)}%`},className:`w-8 sm:w-12 rounded-t-sm ${d.fullDate===inputDate?"bg-primary":"bg-primary/50"}`}) :
                    /* @__PURE__ */ jsxs("div",{className:"w-full flex flex-col items-center justify-end h-full relative",children:[
                      /* @__PURE__ */ jsx("div",{style:{bottom:`${barHeightPercent}%`},className:`absolute w-3 h-3 rounded-full z-5 border-2 border-background ${d.fullDate===inputDate?"bg-primary":"bg-primary/70"}`}),
                      /* @__PURE__ */ jsx("div",{style:{height:`${barHeightPercent}%`},className:"w-[2px] bg-primary/30"})
                    ]})
                  ]},d.fullDate);
                });
              })()
            ]}),
            /* @__PURE__ */ jsx("div",{className:"flex justify-between px-4 text-[10px] text-muted-foreground font-medium pt-1",children:dailyTrendData.map(d=>/* @__PURE__ */ jsxs("span",{className:d.fullDate===inputDate?"text-primary font-bold":"",children:[d.date,d.fullDate===inputDate?" (Kini)":"" ]},d.fullDate))})
          ]})
        })
      ]}),

      /* @__PURE__ */ jsxs("div", { className:"grid grid-cols-1 lg:grid-cols-12 gap-4 items-start", children:[
        /* @__PURE__ */ jsxs("div",{className:"lg:col-span-7 bg-card rounded-2xl p-4 sm:p-5 border border-border flex flex-col gap-4",children:[
          /* @__PURE__ */ jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3 items-center",children:[
            /* @__PURE__ */ jsxs("div",{className:"flex flex-col gap-1",children:[
              /* @__PURE__ */ jsx("span",{className:"text-[11px] font-medium text-muted-foreground uppercase tracking-wider",children:"Pengguna Aktif"}),
              /* @__PURE__ */ jsxs("div",{className:"h-9 rounded-lg bg-muted text-xs font-medium px-3 grow flex items-center justify-between gap-2",children:[
                /* @__PURE__ */ jsx("span",{children:currentUser || "—"}),
                /* @__PURE__ */ jsxs("span",{className:"text-[10px] text-muted-foreground",children:["User ID: ",currentUserId || "—"]})
              ]})
            ]}),
            /* @__PURE__ */ jsxs("div",{className:"flex flex-col gap-1",children:[
              /* @__PURE__ */ jsx("span",{className:"text-[11px] font-medium text-muted-foreground uppercase tracking-wider",children:"Sasaran Kalori (kcal)"}),
              /* @__PURE__ */ jsx("input",{type:"number",value:dailyGoal,readOnly:true,className:"h-9 rounded-lg bg-muted text-xs font-medium px-3 w-full opacity-80",min:"500",max:"10000",title:"Sasaran dibaca daripada sheet users melalui GAS."})
            ]})
          ]}),
          error && /* @__PURE__ */ jsx("div",{className:"p-2.5 bg-error/10 text-error rounded-lg text-xs font-medium border border-error/20",children:error}),
          message && /* @__PURE__ */ jsx("div",{className:"p-2.5 bg-success/10 text-success rounded-lg text-xs font-medium border border-success/20",children:message}),
          /* @__PURE__ */ jsxs("div",{className:"bg-background rounded-xl p-4 border border-border flex flex-col gap-2",children:[
            /* @__PURE__ */ jsxs("div",{className:"flex justify-between items-end gap-2",children:[
              /* @__PURE__ */ jsxs("div",{children:[
                /* @__PURE__ */ jsxs("span",{className:"text-[11px] text-muted-foreground block font-medium",children:["Jumlah Kalori (",inputDate,")"]}),
                /* @__PURE__ */ jsxs("span",{className:"text-xl font-bold tabular-nums text-primary",children:[todayTotalCalories," ",/* @__PURE__ */ jsxs("span",{className:"text-xs font-normal text-muted-foreground",children:["/ ",dailyGoal," kcal"]})]})
              ]}),
              /* @__PURE__ */ jsxs("span",{className:"text-xs font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground",children:[progressPercent.toFixed(0),"% Selesai"]})
            ]}),
            /* @__PURE__ */ jsx("div",{className:"w-full bg-muted h-2.5 rounded-full overflow-hidden",children:/* @__PURE__ */ jsx("div",{className:`h-full rounded-full ${progressPercent>100?"bg-error":"bg-success"}`,style:{width:`${progressPercent}%`}})})
          ]}),
          /* @__PURE__ */ jsxs("div",{className:"pt-2 border-t border-border/60",children:[
            /* @__PURE__ */ jsxs("div",{className:"flex justify-between items-center mb-2 gap-2",children:[
              /* @__PURE__ */ jsx("span",{className:"text-xs font-medium",children:editingLog?"Edit Rekod":"Tambah Rekod Baru"}),
              editingLog && /* @__PURE__ */ jsx("button",{type:"button",onClick:resetForm,className:"text-[11px] text-muted-foreground hover:underline",children:"Batal Edit"})
            ]}),
            /* @__PURE__ */ jsxs("form",{onSubmit:handleSubmitLog,className:"grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end",children:[
              /* @__PURE__ */ jsxs("div",{className:"flex flex-col gap-1",children:[/* @__PURE__ */ jsx("label",{className:"text-[11px] font-medium text-muted-foreground",children:"Tarikh Rekod"}),/* @__PURE__ */ jsx("input",{type:"date",value:inputDate,onChange:e=>setInputDate(e.target.value),className:"h-9 w-full rounded-lg bg-muted text-xs font-medium px-2"})]}),
              /* @__PURE__ */ jsxs("div",{className:"flex flex-col gap-1",children:[/* @__PURE__ */ jsx("label",{className:"text-[11px] font-medium text-muted-foreground",children:"Jenis Makanan"}),/* @__PURE__ */ jsxs("select",{value:mealTypesList.includes(inputMeal)?inputMeal:"Snek / Lain-lain",onChange:e=>setInputMeal(e.target.value),className:"h-9 w-full rounded-lg bg-muted text-xs font-medium px-2",children:[/* @__PURE__ */ jsx("option",{value:"Sarapan",children:"Sarapan"}),/* @__PURE__ */ jsx("option",{value:"Makan Tengahari",children:"Makan Tengahari"}),/* @__PURE__ */ jsx("option",{value:"Makan Malam",children:"Makan Malam"}),/* @__PURE__ */ jsx("option",{value:"Snek / Lain-lain",children:"Snek / Lain-lain"})]})]}),
              /* @__PURE__ */ jsxs("div",{className:"flex flex-col gap-1",children:[/* @__PURE__ */ jsx("label",{className:"text-[11px] font-medium text-muted-foreground",children:"Kalori (kcal)"}),/* @__PURE__ */ jsx("input",{type:"number",min:"1",max:"5000",value:inputCalories,onChange:e=>setInputCalories(e.target.value),placeholder:"Cth: 350",className:"h-9 w-full rounded-lg bg-muted text-xs font-medium px-3",required:true})]}),
              /* @__PURE__ */ jsx("button",{type:"submit",disabled:saving,className:"w-full rounded-full bg-primary text-white text-xs font-medium h-9 disabled:opacity-50",children:saving?"Menyimpan...":editingLog?"Simpan Edit":"Simpan Rekod"})
            ]})
          ]})
        ]}),
        /* @__PURE__ */ jsxs("div",{className:"lg:col-span-5 bg-card rounded-2xl border border-border overflow-hidden flex flex-col",children:[
          /* @__PURE__ */ jsxs("div",{className:"px-4 py-3 flex items-center justify-between bg-muted/60 border-b border-border/60 gap-2",children:[
            /* @__PURE__ */ jsxs("span",{className:"text-xs font-medium text-muted-foreground",children:["Log Kalori (",filteredLogs.length," / ",userLogs.length,")"]}),
            /* @__PURE__ */ jsxs("div",{className:"flex items-center gap-3",children:[
              /* @__PURE__ */ jsx("button",{onClick:handlePrintPDF,className:"text-[11px] text-primary font-medium hover:underline",children:"Muat Turun Laporan"}),
              userLogs.length>0 && /* @__PURE__ */ jsx("button",{onClick:handleClearHistory,disabled:saving,className:"text-[11px] text-error font-medium hover:underline disabled:opacity-50",children:"Semua"})
            ]})
          ]}),
          /* @__PURE__ */ jsx("div",{className:"p-2 border-b border-border/60",children:/* @__PURE__ */ jsx("input",{type:"search",value:searchText,onChange:e=>setSearchText(e.target.value),placeholder:"Cari makanan, tarikh atau kalori...",className:"h-9 w-full rounded-lg bg-muted text-xs px-3 focus:outline-none"})}),
          /* @__PURE__ */ jsx("div",{className:"divide-y divide-border/60 p-1 overflow-y-auto max-h-[360px]",children:
            filteredLogs.length===0 ? /* @__PURE__ */ jsx("p",{className:"text-xs text-muted-foreground text-center py-8",children:searchText?"Tiada hasil carian.":"Tiada rekod kalori."}) :
            filteredLogs.map(log=>/* @__PURE__ */ jsxs("div",{className:"p-3 flex justify-between items-center text-xs hover:bg-muted/30 rounded-lg group",children:[
              /* @__PURE__ */ jsxs("div",{className:"min-w-0 flex-1 pr-2",children:[
                /* @__PURE__ */ jsx("span",{className:"font-medium block truncate",children:log.foodName}),
                /* @__PURE__ */ jsxs("span",{className:"text-[10px] text-muted-foreground block",children:[log.date," • ",log.time]})
              ]}),
              /* @__PURE__ */ jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[
                /* @__PURE__ */ jsxs("span",{className:"font-bold tabular-nums whitespace-nowrap",children:[log.calories," kcal"]}),
                /* @__PURE__ */ jsx("button",{onClick:()=>startEditLog(log),disabled:saving,className:"h-7 w-7 rounded-full bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center disabled:opacity-50",title:"Edit rekod",children:/* @__PURE__ */ jsx("span",{className:"material-icons !text-xs",children:"edit"})}),
                /* @__PURE__ */ jsx("button",{onClick:()=>handleDeleteLog(log.id),disabled:saving,className:"h-7 w-7 rounded-full bg-muted hover:bg-error/10 hover:text-error flex items-center justify-center disabled:opacity-50",title:"Padam rekod",children:/* @__PURE__ */ jsx("span",{className:"material-icons !text-xs",children:"delete"})})
              ]})
            ]},log.id))
          })
        ]})
      ]}),
      /* @__PURE__ */ jsx("div",{className:"w-full text-center py-4 border-t border-border/40 mt-auto",children:/* @__PURE__ */ jsx("p",{className:"text-xs text-muted-foreground",children:"Daily Calorie & Macronutrient Calculator by Rani Yong • GAS Backend"})})
    ]})
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsx(React.StrictMode, { children: /* @__PURE__ */ jsx(App, {}) })
);

