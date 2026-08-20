// ============================================================
// KALORI CALCULATOR - GOOGLE APPS SCRIPT BACKEND
// Authentication + User ID based data isolation
//
// SHEET: login
// A = User ID
// B = Username
// C = Password
// D = Date Start Active
// E = Date End Active
//
// SHEET: users
// A = ID
// B = Username
// C = DailyGoal
// D = User ID
//
// SHEET: calorie_logs
// A = LogID
// B = Username
// C = FoodName
// D = Calories
// E = RecordDate
// F = User ID
// ============================================================

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    var requestData = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var action = String(requestData.action || "").trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Login tidak memerlukan session token.
    if (action === "login") {
      return handleLogin_(ss, requestData.username, requestData.password);
    }

    // Semua fungsi aplikasi mesti melalui session yang sah.
    var auth = requireAuth_(requestData.token);
    if (!auth.valid) {
      return jsonOutput_({ status: "unauthorized", message: auth.message });
    }

    // User ID / Username DIAMBIL DARIPADA SESSION.
    // Jangan percaya username/userId yang dihantar oleh browser.
    var userId = auth.userId;
    var username = auth.username;

    // Pastikan struktur kolum baru wujud.
    ensureSheetHeaders_(ss);

    // Auto padam log lebih 30 hari.
    autoClearOldLogs(ss);

    switch (action) {
      case "fetchData":
        return handleFetchData(ss, userId, username);

      case "addLog":
        return handleAddLog(
          ss,
          userId,
          username,
          requestData.foodName,
          requestData.calories,
          requestData.recordDate
        );

      case "updateLog":
        return handleUpdateLog(
          ss,
          userId,
          username,
          requestData.logId,
          requestData.foodName,
          requestData.calories,
          requestData.recordDate
        );

      case "deleteLog":
        return handleDeleteLog(ss, userId, requestData.logId);

      case "searchLog":
        return handleSearchLog(ss, userId, requestData.query);

      // Fungsi profile lama tidak lagi digunakan kerana setiap login
      // sekarang terikat kepada User ID masing-masing.
      case "addUser":
      case "deleteUser":
        return jsonOutput_({
          status: "denied",
          message: "Pengurusan profil dibuat melalui sheet users/login."
        });

      default:
        return jsonOutput_({
          status: "error",
          message: "Aksi tidak sah"
        });
    }

  } catch (error) {
    return jsonOutput_({
      status: "error",
      message: error && error.message ? error.message : String(error)
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

// ============================================================
// SHEET STRUCTURE / MIGRATION
// ============================================================
function ensureSheetHeaders_(ss) {
  var userSheet = ss.getSheetByName("users");
  var logSheet = ss.getSheetByName("calorie_logs");
  var loginSheet = ss.getSheetByName("login");

  if (!loginSheet) {
    throw new Error('Sheet "login" tidak ditemui.');
  }
  if (!userSheet) {
    throw new Error('Sheet "users" tidak ditemui.');
  }
  if (!logSheet) {
    throw new Error('Sheet "calorie_logs" tidak ditemui.');
  }

  // Header baru: users D = User ID
  if (String(userSheet.getRange(1, 4).getValue()).trim() !== "User ID") {
    userSheet.getRange(1, 4).setValue("User ID");
  }

  // Header baru: calorie_logs F = User ID
  if (String(logSheet.getRange(1, 6).getValue()).trim() !== "User ID") {
    logSheet.getRange(1, 6).setValue("User ID");
  }

  // Login header standard.
  var loginHeaders = ["User ID", "Username", "Password", "Date Start Active", "Date End Active"];
  loginSheet.getRange(1, 1, 1, 5).setValues([loginHeaders]);
}

// ============================================================
// LOGIN
// ============================================================
function handleLogin_(ss, username, password) {
  username = String(username || "").trim();
  password = String(password || "").trim();

  if (!username || !password) {
    return jsonOutput_({
      status: "error",
      message: "Username dan password diperlukan."
    });
  }

  var sheet = ss.getSheetByName("login");
  if (!sheet) {
    return jsonOutput_({
      status: "error",
      message: 'Sheet "login" tidak ditemui.'
    });
  }

  var data = sheet.getDataRange().getValues();
  var now = new Date();
  var found = null;

  for (var i = 1; i < data.length; i++) {
    var rowUsername = String(data[i][1] || "").trim();
    if (rowUsername.toLowerCase() === username.toLowerCase()) {
      found = data[i];
      break;
    }
  }

  if (!found) {
    return jsonOutput_({
      status: "denied",
      message: "Username atau password salah."
    });
  }

  var userId = String(found[0] || "").trim();
  var storedPassword = String(found[2] || "").trim();

  if (!userId) {
    return jsonOutput_({
      status: "denied",
      message: "User ID untuk akaun ini belum diisi dalam sheet login."
    });
  }

  if (storedPassword !== password) {
    return jsonOutput_({
      status: "denied",
      message: "Username atau password salah."
    });
  }

  var start = parseActiveDate_(found[3], false);
  var end = parseActiveDate_(found[4], true);

  if (!start || !end) {
    return jsonOutput_({
      status: "denied",
      message: "Tarikh aktif untuk akaun ini tidak lengkap atau tidak sah."
    });
  }

  if (now < start) {
    return jsonOutput_({
      status: "denied",
      message: "Akaun belum aktif. Tarikh mula: " + formatLoginDate_(start)
    });
  }

  if (now > end) {
    return jsonOutput_({
      status: "denied",
      message: "Akaun telah tamat tempoh pada " + formatLoginDate_(end) + "."
    });
  }

  // Pastikan User ID tersebut memang wujud dalam users.
  var linkedUser = findUserByUserId_(ss, userId);
  if (!linkedUser) {
    return jsonOutput_({
      status: "denied",
      message: 'User ID "' + userId + '" tidak ditemui dalam sheet users. Sila semak column D.'
    });
  }

  // Session maksimum 12 jam atau tarikh akhir akaun, mana lebih awal.
  var sessionExpiry = Math.min(
    now.getTime() + (12 * 60 * 60 * 1000),
    end.getTime()
  );

  var token = createSessionToken_(userId, username, sessionExpiry);

  return jsonOutput_({
    status: "success",
    message: "Login berjaya",
    userId: userId,
    username: username,
    token: token,
    expiresAt: sessionExpiry
  });
}

function parseActiveDate_(value, endOfDay) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    var d = new Date(value.getTime());
    if (endOfDay) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d;
  }

  var text = String(value || "").trim();
  if (!text) return null;

  // Sokong dd/MM/yyyy, dd-MM-yyyy dan yyyy-MM-dd.
  var m = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  var d;

  if (m) {
    d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  } else {
    d = new Date(text);
  }

  if (isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================================
// USER LOOKUP
// users: A ID | B Username | C DailyGoal | D User ID
// ============================================================
function findUserByUserId_(ss, userId) {
  var sheet = ss.getSheetByName("users");
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  var target = String(userId || "").trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    var rowUserId = String(data[i][3] || "").trim().toLowerCase();
    if (rowUserId === target) {
      return {
        row: i + 1,
        id: data[i][0],
        username: String(data[i][1] || "").trim(),
        dailyGoal: Number(data[i][2]) || 2020,
        userId: String(data[i][3] || "").trim()
      };
    }
  }

  return null;
}

// ============================================================
// ADD LOG
// calorie_logs: A LogID | B Username | C FoodName | D Calories |
//                E RecordDate | F User ID
// ============================================================
function handleAddLog(ss, userId, username, foodName, calories, recordDate) {
  var sheet = ss.getSheetByName("calorie_logs");
  if (!sheet) throw new Error('Sheet "calorie_logs" tidak ditemui.');

  foodName = String(foodName || "").trim();
  calories = Number(calories);

  if (!foodName || !calories || calories <= 0 || !recordDate) {
    return jsonOutput_({
      status: "error",
      message: "Data log tidak lengkap."
    });
  }

  var logId = String(new Date().getTime()) + String(Math.floor(Math.random() * 1000));

  sheet.appendRow([
    logId,
    username,
    foodName,
    calories,
    recordDate,
    userId
  ]);

  return jsonOutput_({
    status: "success",
    message: "Log makanan ditambah",
    logId: logId,
    userId: userId
  });
}

// ============================================================
// UPDATE LOG
// ============================================================
function handleUpdateLog(ss, userId, username, logId, foodName, calories, recordDate) {
  var sheet = ss.getSheetByName("calorie_logs");
  if (!sheet) throw new Error('Sheet "calorie_logs" tidak ditemui.');

  var data = sheet.getDataRange().getValues();
  var targetId = String(logId || "");

  for (var i = 1; i < data.length; i++) {
    var rowLogId = String(data[i][0] || "");
    var rowUserId = String(data[i][5] || "").trim();

    if (rowLogId === targetId && rowUserId === String(userId).trim()) {
      sheet.getRange(i + 1, 2, 1, 5).setValues([[
        username,
        String(foodName || "").trim(),
        Number(calories),
        recordDate,
        userId
      ]]);

      return jsonOutput_({
        status: "success",
        message: "Rekod berjaya diedit"
      });
    }
  }

  return jsonOutput_({
    status: "error",
    message: "Rekod tidak ditemui untuk User ID ini."
  });
}

// ============================================================
// DELETE LOG
// ============================================================
function handleDeleteLog(ss, userId, logId) {
  var sheet = ss.getSheetByName("calorie_logs");
  if (!sheet) throw new Error('Sheet "calorie_logs" tidak ditemui.');

  var data = sheet.getDataRange().getValues();
  var targetId = String(logId || "");

  for (var i = data.length - 1; i >= 1; i--) {
    var rowLogId = String(data[i][0] || "");
    var rowUserId = String(data[i][5] || "").trim();

    if (rowLogId === targetId && rowUserId === String(userId).trim()) {
      sheet.deleteRow(i + 1);

      return jsonOutput_({
        status: "success",
        message: "Rekod dipadam"
      });
    }
  }

  return jsonOutput_({
    status: "error",
    message: "Rekod tidak ditemui untuk User ID ini."
  });
}

// ============================================================
// SEARCH LOG
// ============================================================
function handleSearchLog(ss, userId, query) {
  var sheet = ss.getSheetByName("calorie_logs");
  if (!sheet) throw new Error('Sheet "calorie_logs" tidak ditemui.');

  var data = sheet.getDataRange().getValues();
  var targetUserId = String(userId || "").trim().toLowerCase();
  var q = String(query || "").trim().toLowerCase();
  var logs = [];

  for (var i = 1; i < data.length; i++) {
    var rowUserId = String(data[i][5] || "").trim().toLowerCase();
    if (rowUserId !== targetUserId) continue;

    var foodName = String(data[i][2] || "");
    var calories = String(data[i][3] || "");
    var recordDate = formatRecordDate_(data[i][4]);

    var haystack = [foodName, calories, recordDate].join(" ").toLowerCase();

    if (!q || haystack.indexOf(q) !== -1) {
      logs.push({
        id: data[i][0],
        foodName: foodName,
        calories: Number(data[i][3]) || 0,
        recordDate: recordDate,
        userId: data[i][5]
      });
    }
  }

  return jsonOutput_({
    status: "success",
    logs: logs,
    userId: userId
  });
}

// ============================================================
// FETCH DATA
// ============================================================
function handleFetchData(ss, userId, username) {
  var userSheet = ss.getSheetByName("users");
  var logSheet = ss.getSheetByName("calorie_logs");

  if (!userSheet || !logSheet) {
    throw new Error("Sheet users atau calorie_logs tidak ditemui.");
  }

  var user = findUserByUserId_(ss, userId);
  if (!user) {
    return jsonOutput_({
      status: "error",
      message: 'User ID "' + userId + '" tidak ditemui dalam sheet users.'
    });
  }

  var logData = logSheet.getDataRange().getValues();
  var logs = [];

  for (var j = 1; j < logData.length; j++) {
    var rowUserId = String(logData[j][5] || "").trim();

    // Migrasi ringan: jika log lama belum ada User ID tetapi username sama,
    // isi column F dengan User ID yang sedang login.
    if (!rowUserId && String(logData[j][1] || "").trim().toLowerCase() === String(username).trim().toLowerCase()) {
      logSheet.getRange(j + 1, 6).setValue(userId);
      rowUserId = userId;
    }

    if (rowUserId !== String(userId).trim()) continue;

    logs.push({
      id: logData[j][0],
      foodName: logData[j][2],
      calories: Number(logData[j][3]) || 0,
      recordDate: formatRecordDate_(logData[j][4]),
      userId: rowUserId
    });
  }

  return jsonOutput_({
    status: "success",
    username: user.username || username,
    userId: user.userId,
    dailyGoal: user.dailyGoal,
    // UI lama menjangka array profiles. Sekarang hanya user login.
    allUsers: [user.username || username],
    logs: logs
  });
}

// ============================================================
// AUTO CLEAR LOGS > 30 DAYS
// ============================================================
function autoClearOldLogs(ss) {
  var sheet = ss.getSheetByName("calorie_logs");
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (var i = data.length - 1; i >= 1; i--) {
    var recordDate = new Date(data[i][4]);

    if (!isNaN(recordDate.getTime()) && recordDate < thirtyDaysAgo) {
      sheet.deleteRow(i + 1);
    }
  }
}

function formatRecordDate_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }

  var text = String(value || "");
  var date = new Date(text);

  if (!isNaN(date.getTime())) {
    return Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }

  return text;
}

// ============================================================
// SESSION TOKEN
// ============================================================
function getAuthSecret_() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("AUTH_SECRET");

  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("AUTH_SECRET", secret);
  }

  return secret;
}

function createSessionToken_(userId, username, expiryMs) {
  var payload = [userId, username, String(expiryMs)].join("|");
  var signature = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, getAuthSecret_())
  );

  return Utilities.base64EncodeWebSafe(payload) + "." + signature;
}

function verifySessionToken_(token) {
  try {
    token = String(token || "");
    var parts = token.split(".");
    if (parts.length !== 2) return null;

    var payload = Utilities.newBlob(
      Utilities.base64DecodeWebSafe(parts[0])
    ).getDataAsString();

    var bits = payload.split("|");
    if (bits.length !== 3) return null;

    var userId = bits[0];
    var username = bits[1];
    var expiryMs = Number(bits[2]);

    if (!userId || !username || !expiryMs || Date.now() > expiryMs) {
      return null;
    }

    var expected = Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(payload, getAuthSecret_())
    );

    if (expected !== parts[1]) return null;

    return {
      userId: userId,
      username: username,
      expiryMs: expiryMs
    };
  } catch (err) {
    return null;
  }
}

function requireAuth_(token) {
  var session = verifySessionToken_(token);

  if (!session) {
    return {
      valid: false,
      message: "Sesi login tidak sah atau telah tamat. Sila login semula."
    };
  }

  // Semak semula bahawa User ID masih wujud.
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var user = findUserByUserId_(ss, session.userId);
  if (!user) {
    return {
      valid: false,
      message: "Akaun User ID tidak lagi wujud. Sila hubungi admin."
    };
  }

  return {
    valid: true,
    userId: session.userId,
    username: user.username || session.username,
    expiryMs: session.expiryMs
  };
}

function formatLoginDate_(date) {
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "dd/MM/yyyy"
  );
}

function doGet(e) {
  return jsonOutput_({
    status: "alive",
    message: "GAS backend aktif"
  });
}

// A. Letakkan ini di luar komponen CalorieTrackerWidget (paling atas fail)
let debounceTimer;

function hantarKeGAS(nilaiBaru) {
  // Ambil token sesi aktif anda (sesuaikan mengikut cara sistem anda menyimpan token login)
  const token = localStorage.getItem("session_token") || (window.appState && window.appState.token);
  const gasUrl = "URL_WEB_APP_GAS_ANDA"; // Ganti dengan URL deployment GAS anda

  if (!token) {
    console.error("Autosave gagal: Tiada token sesi dikesan.");
    return;
  }

  fetch(gasUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8" // Elakkan sekatan CORS pre-flight browser pada GAS
    },
    body: JSON.stringify({
      action: "updateDailyGoal",
      token: token,
      dailyGoal: nilaiBaru
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.status === "success") {
      console.log("GAS Autosave Berjaya:", data.message);
    } else {
      console.error("GAS Autosave Gagal:", data.message);
    }
  })
  .catch(err => console.error("Ralat Rangkaian GAS:", err));
}

// B. Gantikan kod kotak nilai angka lama anda dengan input JSX ini:
/* @__PURE__ */ jsx("input", {
  type: "number",
  className: "w-full bg-[#1e2230] text-white text-base px-3 py-2 rounded-md outline-none border border-transparent focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:appearance-auto",
  value: data.dailyGoal, // Pastikan ia membaca 'data.dailyGoal' atau variable state sasaran anda yang sedia ada
  min: "0",
  step: "1",
  onChange: (e) => {
    const nilaiBaru = parseInt(e.target.value) || 0;
    
    // 1. Kemaskini UI dengan serta-merta pada skrin browser anda
    setData(prev => ({ ...prev, dailyGoal: nilaiBaru })); // Selesaikan nama fungsi state asal anda

    // 2. Logik Debounce: Tunggu 1 saat selepas selesai klik baru hantar ke Google Sheet
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      hantarKeGAS(nilaiBaru);
    }, 1000); 
  }
})
