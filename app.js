(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  const toast = $("#toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 1800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      area.remove();
      return copied;
    }
  }

  $$("[data-copy], [data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = button.dataset.copyTarget;
      const text = target
        ? $(`#${target}`)?.textContent.trim() ?? ""
        : button.dataset.copy ?? "";
      if (!text) return;
      const ok = await copyText(text);
      if (!ok) {
        showToast("Copy failed — select manually");
        return;
      }
      button.classList.add("copied");
      setTimeout(() => button.classList.remove("copied"), 1400);
      showToast("Copied to clipboard");
    });
  });

  const navToggle = $(".nav-toggle");
  const siteNav = $("#site-nav");

  if (navToggle && siteNav) {
    const closeNav = () => {
      siteNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    };

    navToggle.addEventListener("click", () => {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      siteNav.classList.toggle("open", !open);
    });

    $$("a", siteNav).forEach((link) => link.addEventListener("click", closeNav));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav();
    });
  }

  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    reveals.forEach((element) => observer.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add("visible"));
  }

  const tabContent = {
    termux: `<span class="code-dim"># install and initialize</span>
pkg install pockethash
pockethash init --worker pocket-01

<span class="code-dim"># point at a pool and run</span>
pockethash run`,
    linux: `<span class="code-dim"># clone, build, initialize</span>
git clone https://github.com/pockethash/miner
cd miner && make release
./pockethash init --worker pocket-01

<span class="code-dim"># start mining</span>
./pockethash run`,
    docker: `<span class="code-dim"># build the image locally</span>
docker build -t pockethash .

<span class="code-dim"># run with a worker name</span>
docker run --rm -it \\
  -e WORKER=pocket-01 \\
  pockethash run`
  };

  const tabs = $$("[data-tab]");
  const codeText = $("#code-text");

  function selectTab(tab) {
    tabs.forEach((button) => {
      button.setAttribute("aria-selected", String(button === tab));
    });
    if (codeText) {
      codeText.innerHTML = tabContent[tab.dataset.tab] ?? "";
      codeText.setAttribute("aria-labelledby", tab.id);
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(index + direction + tabs.length) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  const consoleShell = $("#demo");
  const demoButton = $("#demo-toggle");
  const threadsOutput = $("#thread-count");
  const hashrateOutput = $("#hashrate");
  const deltaOutput = $("#hash-delta");
  const temperatureOutput = $("#temperature");
  const thermalRing = $("#thermal-ring");
  const thermalStatus = $("#thermal-status");
  const acceptedOutput = $("#accepted");
  const rejectedOutput = $("#rejected");
  const uptimeOutput = $("#uptime");
  const balanceOutput = $("#balance");
  const logFeed = $("#log-feed");
  const clearLog = $("#clear-log");
  const canvas = $("#hash-chart");

  const state = {
    running: true,
    threads: 4,
    hashrate: 1.84,
    accepted: 128,
    rejected: 1,
    balance: 12842,
    temperature: 47.2,
    uptime: 2 * 3600 + 14 * 60 + 9,
    history: [],
    lastLogShare: 129,
    tick: 0
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return [hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":");
  }

  function timeStamp() {
    return new Date().toLocaleTimeString("en-GB", { hour12: false });
  }

  function baseHashrate() {
    return state.threads * 0.46;
  }

  for (let i = 0; i < 54; i += 1) {
    state.history.push(1.84 + (Math.random() - 0.5) * 0.14);
  }

  function appendLog(message, className = "") {
    if (!logFeed) return;
    const line = document.createElement("div");
    line.className = "log-line";
    const time = document.createElement("span");
    time.className = "log-time";
    time.textContent = `[${timeStamp()}]`;
    const text = document.createElement("span");
    text.className = className;
    text.innerHTML = message;
    line.append(time, text);
    logFeed.appendChild(line);
    while (logFeed.children.length > 42) {
      logFeed.firstElementChild?.remove();
    }
    logFeed.scrollTop = logFeed.scrollHeight;
  }

  function syncThermal() {
    if (temperatureOutput) temperatureOutput.textContent = state.temperature.toFixed(1);
    if (thermalRing) {
      const pct = clamp(((state.temperature - 24) / 36) * 100, 0, 100);
      thermalRing.style.strokeDasharray = `${pct.toFixed(1)} 100`;
      thermalRing.style.stroke = state.temperature > 54 ? "#ff7a35" : "#f7931a";
    }
    if (thermalStatus) {
      const label = state.temperature > 54 ? "warm" : state.temperature > 50 ? "elevated" : "nominal";
      thermalStatus.textContent = label;
      thermalStatus.style.color = state.temperature > 54 ? "#ff9a5c" : "";
    }
  }

  function syncStats() {
    if (hashrateOutput) hashrateOutput.textContent = state.hashrate.toFixed(2);
    if (threadsOutput) threadsOutput.textContent = String(state.threads);
    if (acceptedOutput) acceptedOutput.textContent = state.accepted.toLocaleString("en-US");
    if (rejectedOutput) rejectedOutput.textContent = state.rejected.toLocaleString("en-US");
    if (uptimeOutput) uptimeOutput.textContent = formatUptime(state.uptime);
    if (balanceOutput) balanceOutput.innerHTML = `${state.balance.toLocaleString("en-US")} <small>sats</small>`;

    if (deltaOutput && state.history.length > 12) {
      const previous = state.history[state.history.length - 12];
      const delta = ((state.hashrate - previous) / previous) * 100;
      const sign = delta >= 0 ? "+" : "";
      deltaOutput.textContent = `${sign}${delta.toFixed(1)}%`;
      deltaOutput.style.color = delta >= 0 ? "" : "#ff9a5c";
    }
  }

  let chartWidth = 0;
  let chartHeight = 0;
  let chartDpr = 1;

  function sizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    chartWidth = rect.width;
    chartHeight = rect.height;
    chartDpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(chartWidth * chartDpr);
    canvas.height = Math.round(chartHeight * chartDpr);
    const context = canvas.getContext("2d");
    context.setTransform(chartDpr, 0, 0, chartDpr, 0, 0);
    drawChart();
  }

  function drawChart() {
    if (!canvas || !chartWidth || !chartHeight) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, chartWidth, chartHeight);

    const values = state.history;
    if (values.length < 2) return;

    const min = Math.min(...values) - 0.08;
    const max = Math.max(...values) + 0.08;
    const range = Math.max(max - min, 0.1);
    const padX = 2;
    const padTop = 8;
    const padBottom = 8;
    const plotWidth = chartWidth - padX * 2;
    const plotHeight = chartHeight - padTop - padBottom;

    const point = (value, index) => ({
      x: padX + (index / (values.length - 1)) * plotWidth,
      y: padTop + (1 - (value - min) / range) * plotHeight
    });

    context.strokeStyle = "rgba(236, 241, 229, 0.055)";
    context.lineWidth = 1;
    context.setLineDash([2, 5]);
    for (let i = 0; i <= 3; i += 1) {
      const y = padTop + (i / 3) * plotHeight;
      context.beginPath();
      context.moveTo(padX, y);
      context.lineTo(chartWidth - padX, y);
      context.stroke();
    }
    context.setLineDash([]);

    const gradient = context.createLinearGradient(0, padTop, 0, chartHeight);
    gradient.addColorStop(0, "rgba(247, 147, 26, 0.24)");
    gradient.addColorStop(1, "rgba(247, 147, 26, 0)");

    context.beginPath();
    values.forEach((value, index) => {
      const { x, y } = point(value, index);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });

    const last = point(values[values.length - 1], values.length - 1);
    context.lineTo(last.x, chartHeight);
    context.lineTo(padX, chartHeight);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();

    context.beginPath();
    values.forEach((value, index) => {
      const { x, y } = point(value, index);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = "#f7931a";
    context.lineWidth = 1.6;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    context.beginPath();
    context.arc(last.x, last.y, 3, 0, Math.PI * 2);
    context.fillStyle = "#ffb04a";
    context.shadowColor = "rgba(247, 147, 26, 0.9)";
    context.shadowBlur = 12;
    context.fill();
    context.shadowBlur = 0;
  }

  function updateDemo() {
    state.tick += 1;

    if (state.running) {
      const target = baseHashrate();
      const jitter = (Math.random() - 0.5) * 0.11;
      state.hashrate += (target + jitter - state.hashrate) * 0.24;
      state.hashrate = Math.max(0.05, state.hashrate);

      const tempTarget = 37.5 + state.threads * 2.55 + (Math.random() - 0.5) * 0.9;
      state.temperature += (tempTarget - state.temperature) * 0.18;
      state.temperature = clamp(state.temperature, 34, 59.4);

      state.uptime += 1;
      state.history.push(state.hashrate);
      if (state.history.length > 60) state.history.shift();

      if (Math.random() < 0.13 + state.threads * 0.018) {
        state.accepted += 1;
        state.lastLogShare += 1;
        state.balance += Math.floor(3 + Math.random() * 9);
        appendLog(`accepted share #${state.lastLogShare} <span class="log-ok">·</span> diff 4.2k`, "log-ok");
      } else if (Math.random() < 0.012) {
        state.rejected += 1;
        appendLog("share rejected <span class=\"log-warn\">·</span> stale job, retrying", "log-warn");
      }

      if (state.tick % 13 === 0) {
        appendLog(`new job <span class="log-job">·</span> height ${(874201 + Math.floor(state.uptime / 600)).toLocaleString("en-US")}`);
      }

      if (state.tick % 31 === 0) {
        appendLog("stratum ping 38ms <span class=\"log-ok\">·</span> link healthy");
      }

      if (state.temperature > 54 && state.tick % 17 === 0) {
        appendLog("thermal guard <span class=\"log-warn\">·</span> reducing worker priority", "log-warn");
      }
    }

    syncStats();
    syncThermal();
    drawChart();
  }

  function setRunning(running) {
    state.running = running;
    if (demoButton) {
      demoButton.setAttribute("aria-pressed", String(running));
      $(".toggle-text", demoButton).textContent = running ? "Pause demo" : "Resume demo";
    }
    consoleShell?.classList.toggle("paused", !running);
    appendLog(running ? "simulation resumed" : "simulation paused <span class=\"log-warn\">·</span> workers idle");
  }

  if (demoButton) {
    demoButton.addEventListener("click", () => setRunning(!state.running));
  }

  $$("[data-threads-up], [data-threads-down]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.hasAttribute("data-threads-up") ? 1 : -1;
      const next = clamp(state.threads + direction, 1, 8);
      if (next === state.threads) return;
      state.threads = next;
      syncStats();
      appendLog(`workers restarted <span class="log-job">·</span> threads=${state.threads}`);
    });
  });

  if (clearLog) {
    clearLog.addEventListener("click", () => {
      if (!logFeed) return;
      logFeed.innerHTML = "";
      appendLog("log cleared <span class=\"log-dim\">·</span> simulation continues");
    });
  }

  const launch = $("[data-launch-demo]");
  if (launch) {
    launch.addEventListener("click", () => {
      if (!state.running) setRunning(true);
      consoleShell?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  appendLog("stratum connected <span class=\"log-ok\">·</span> pool.example.com:3333");
  appendLog("4 threads pinned <span class=\"log-ok\">·</span> arm64");
  appendLog("accepted share #128 <span class=\"log-ok\">·</span> diff 4.2k");
  syncStats();
  syncThermal();

  if (canvas) {
    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(sizeCanvas);
      resizeObserver.observe(canvas);
    }
    window.addEventListener("resize", sizeCanvas);
    sizeCanvas();
    requestAnimationFrame(sizeCanvas);
  }

  setInterval(updateDemo, 1000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      drawChart();
    }
  });
})();
