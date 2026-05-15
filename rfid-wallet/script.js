(() => {
  const $ = (id) => document.getElementById(id);

  const capability = $("capability");
  const scanBtn = $("scan-btn");
  const uidInput = $("uid-input");
  const scanStatus = $("scan-status");
  const buildStatus = $("build-status");
  const downloadPkpassBtn = $("download-pkpass");
  const downloadJsonBtn = $("download-json");

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const hasWebNFC = "NDEFReader" in window;

  if (hasWebNFC) {
    capability.textContent = "Web NFC available — tap Scan, then hold the chip to the back of your phone.";
    scanBtn.hidden = false;
  } else if (isIOS) {
    capability.innerHTML = "iOS Safari can't read NFC from a website. Enter the UID manually below, or scan it with a native iOS app and paste the value here.";
  } else {
    capability.textContent = "Web NFC isn't available in this browser. Use Chrome on Android to scan, or enter the UID manually.";
  }

  // Default datetime = now + 1 day
  const dt = new Date(Date.now() + 24 * 3600 * 1000);
  dt.setSeconds(0, 0);
  $("event-date").value = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  // ─── NFC scanning ───────────────────────────────────────────────
  scanBtn.addEventListener("click", async () => {
    if (!hasWebNFC) return;
    setStatus(scanStatus, "Requesting NFC permission…");
    try {
      const reader = new NDEFReader();
      await reader.scan();
      setStatus(scanStatus, "Hold the chip near your phone…");
      reader.onreading = (event) => {
        const uid = formatSerial(event.serialNumber);
        uidInput.value = uid;
        setStatus(scanStatus, `Read UID: ${uid}`, "good");
        refreshBuildButtons();
      };
      reader.onreadingerror = () => setStatus(scanStatus, "Read failed — try again.", "bad");
    } catch (err) {
      setStatus(scanStatus, `NFC error: ${err.message || err}`, "bad");
    }
  });

  function formatSerial(serial) {
    if (!serial) return "";
    return serial.toUpperCase().replace(/-/g, ":");
  }

  // ─── Build buttons enable/disable ───────────────────────────────
  uidInput.addEventListener("input", refreshBuildButtons);
  function refreshBuildButtons() {
    const ok = uidInput.value.trim().length > 0;
    downloadPkpassBtn.disabled = !ok;
    downloadJsonBtn.disabled = !ok;
  }

  // ─── Pass JSON construction ─────────────────────────────────────
  function buildPassJson(uid) {
    const eventName = $("event-name").value.trim() || "Event";
    const holder = $("holder-name").value.trim() || "Guest";
    const venue = $("venue").value.trim() || "Venue";
    const dateLocal = $("event-date").value;
    const dateIso = dateLocal ? new Date(dateLocal).toISOString() : new Date().toISOString();
    const org = $("org-name").value.trim() || "Your Org";
    const passTypeId = $("pass-type-id").value.trim() || "pass.com.example.eventticket";

    return {
      formatVersion: 1,
      passTypeIdentifier: passTypeId,
      serialNumber: uid,
      teamIdentifier: "TEAMID12345",
      organizationName: org,
      description: `${eventName} ticket`,
      logoText: eventName,
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(20, 20, 28)",
      labelColor: "rgb(180, 180, 200)",
      eventTicket: {
        primaryFields: [
          { key: "event", label: "EVENT", value: eventName }
        ],
        secondaryFields: [
          { key: "holder", label: "GUEST", value: holder },
          { key: "venue",  label: "VENUE", value: venue }
        ],
        auxiliaryFields: [
          {
            key: "doors",
            label: "DOORS",
            value: dateIso,
            dateStyle: "PKDateStyleMedium",
            timeStyle: "PKDateStyleShort"
          }
        ],
        backFields: [
          { key: "rfid", label: "RFID UID", value: uid },
          { key: "note", label: "NOTE",
            value: "Present this pass at the door. The encoded RFID matches your wristband." }
        ]
      },
      barcodes: [{
        format: "PKBarcodeFormatQR",
        message: uid,
        messageEncoding: "iso-8859-1",
        altText: uid
      }]
    };
  }

  // ─── Icon generation (Wallet requires icon.png + @2x) ──────────
  function generateIconPng(size, label = "T") {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#14141c";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.round(size * 0.6)}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, size / 2, size / 2 + size * 0.04);
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  }

  function generateLogoPng(w, h, text) {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.round(h * 0.7)}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 4, h / 2);
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  }

  // ─── SHA-1 (Web Crypto) ────────────────────────────────────────
  async function sha1Hex(data) {
    let buf;
    if (typeof data === "string") {
      buf = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      buf = new Uint8Array(await data.arrayBuffer());
    } else {
      buf = data;
    }
    const hash = await crypto.subtle.digest("SHA-1", buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ─── Build & download ──────────────────────────────────────────
  async function buildPkpassBlob(uid) {
    const passJson = buildPassJson(uid);
    const passJsonStr = JSON.stringify(passJson, null, 2);
    const eventLetter = (passJson.logoText || "T").charAt(0).toUpperCase();

    const [icon, icon2x, logo, logo2x] = await Promise.all([
      generateIconPng(29, eventLetter),
      generateIconPng(58, eventLetter),
      generateLogoPng(160, 50, passJson.logoText || "Event"),
      generateLogoPng(320, 100, passJson.logoText || "Event")
    ]);

    const files = {
      "pass.json": passJsonStr,
      "icon.png": icon,
      "icon@2x.png": icon2x,
      "logo.png": logo,
      "logo@2x.png": logo2x
    };

    const manifest = {};
    for (const [name, data] of Object.entries(files)) {
      manifest[name] = await sha1Hex(data);
    }
    const manifestStr = JSON.stringify(manifest);

    const zip = new JSZip();
    for (const [name, data] of Object.entries(files)) zip.file(name, data);
    zip.file("manifest.json", manifestStr);
    // NOTE: real .pkpass also requires a "signature" file:
    // CMS detached signature over manifest.json, signed with the
    // Pass Type ID cert + WWDR intermediate. Done server-side.

    return zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.apple.pkpass"
    });
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  downloadPkpassBtn.addEventListener("click", async () => {
    const uid = uidInput.value.trim();
    if (!uid) return;
    setStatus(buildStatus, "Building pass…");
    try {
      const blob = await buildPkpassBlob(uid);
      triggerDownload(blob, `${safeFile(uid)}.pkpass`);
      setStatus(buildStatus, "Downloaded. Pass is unsigned — won't install on iPhone without a CMS signature.", "good");
    } catch (err) {
      setStatus(buildStatus, `Build failed: ${err.message || err}`, "bad");
    }
  });

  downloadJsonBtn.addEventListener("click", () => {
    const uid = uidInput.value.trim();
    if (!uid) return;
    const blob = new Blob([JSON.stringify(buildPassJson(uid), null, 2)],
                          { type: "application/json" });
    triggerDownload(blob, `${safeFile(uid)}.pass.json`);
    setStatus(buildStatus, "pass.json downloaded.", "good");
  });

  function safeFile(s) {
    return s.replace(/[^A-Za-z0-9._-]/g, "_");
  }

  function setStatus(el, msg, kind) {
    el.textContent = msg;
    el.className = "status" + (kind ? " " + kind : "");
  }
})();
