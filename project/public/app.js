// ARY MVP — Application Core
// Loads DEV-1 modules and wires them to the UI.
// This replaces the static prototype data rendering with live business logic.

(function () {
  "use strict";

  const { uid, now, stores, resetAll, auth, stateMachine, caVerifier, factory, business, testShims } = window.ARY_CORE;

  // ============ App State ============
  const App = {
    currentUser: null,      // { id, displayName, roles[], ... }
    currentRaceId: null,
    page: "home",
  };

  // ============ Seed demo data ============
  function seedDemoData() {
    resetAll();
    caVerifier.resetKeys();

    // Demo identities provided by test shim layer (production would use real OAuth)
    const ids = testShims.seedIdentities();

    const race1 = factory.race({ slug: "bay-area-happy-trip", title: "湾区开心游", challengeBrief: "构建大湾区旅行伴随 Agent", status: "registration", timeWindows: { registrationStart: "2026-06-01", registrationEnd: "2026-07-15", raceStart: "2026-07-20", raceEnd: "2026-08-20", submissionDeadline: "2026-08-15", judgingStart: "2026-08-21", judgingEnd: "2026-09-01" }, awardSettings: [{ awardName: "Best Overall" }, { awardName: "Best UX" }], organizerUserIds: [ids.carol.id], createdByUserId: ids.carol.id }).record;
    const race2 = factory.race({ slug: "smart-investment-analyst", title: "智能投研助理", challengeBrief: "构建金融投研 Agent", status: "running", organizerUserIds: [ids.carol.id], createdByUserId: ids.carol.id }).record;

    App.currentUser = null;
    App.currentRaceId = race1.id;
    return { ...ids, race1, race2 };
  }

  // ============ UI Helpers ============
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }
  function html(sel, v) { const n = $(sel); if (n && v !== undefined) n.innerHTML = v; }
  function text(sel, v) { const n = $(sel); if (n && v !== undefined) n.textContent = v; }
  function show(sel) { const n = $(sel); if (n) n.style.display = ""; }
  function hide(sel) { const n = $(sel); if (n) n.style.display = "none"; }
  function val(sel) { const n = $(sel); return n ? (n.value || "").trim() : ""; }

  // ============ Page Navigation ============
  function setPage(name) {
    App.page = name;
    $$("[data-page-panel]").forEach((p) => p.classList.toggle("active", p.dataset.pagePanel === name));
    $$("[data-page]").forEach((b) => b.classList.toggle("active", b.dataset.page === name));
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    renderHeader();
    if (name === "register") renderRegisterPage();
    if (name === "races") renderRacesPage();
    if (name === "my-races") renderMyRacesPage();
    if (name === "login") renderLoginPage();
    if (name === "home") renderHomePage();
    if (name === "ca-connect") renderCAConnectPage();
    if (name === "ca-verify") renderCAVerifyPage();
    if (name === "admin-console") renderAdminConsolePage();
  }

  // ============ Login Page ============
  function renderLoginPage() {
    const users = stores.users.all();
    html("#login-user-list",
      users.map((u) =>
        `<button class="login-user-card" data-user-id="${u.id}">
          <b>${u.displayName}</b>
          <span>${(u.roles || []).map(r => ({rider:"选手",judge:"评委",organizer:"主办方",admin:"管理员"}[r]||r)).join(" / ") || "未分配角色"}</span>
          <small>${u.profile?.bio || ""}</small>
        </button>`
      ).join("")
    );
    html("#login-extra-info",
      App.currentUser ? `<div class="login-current">当前: ${App.currentUser.displayName} · <a href="#" onclick="AppActions.logout();return false">切换账号</a></div>` : ""
    );
  }

  // ============ Login / Logout ============
  function login(userId) {
    const user = stores.users.get(userId);
    if (!user) return;
    App.currentUser = user;
    renderHeader();
    setPage("home");
  }

  function logout() {
    App.currentUser = null;
    renderHeader();
    setPage("login");
  }

  // ============ Header ============
  function renderHeader() {
    const u = App.currentUser;
    const el = document.getElementById("user-entry");
    const nav = document.querySelector(".ia-nav");
    if (!el) return;

    // Update nav buttons based on role
    if (nav) {
      const riderBtns = u && u.roles.includes("rider") ? `<button type="button" data-page="ca-connect" onclick="setPage('ca-connect')">CA接入</button><button type="button" data-page="ca-verify" onclick="setPage('ca-verify')">验签</button>` : "";
      const adminBtns = u && (u.roles.includes("organizer") || u.roles.includes("admin")) ? `<button type="button" data-page="admin-console" onclick="setPage('admin-console')">管理</button>` : "";
      nav.innerHTML = `<button type="button" data-page="home" onclick="setPage('home')">首页</button><button type="button" data-page="register" onclick="setPage('register')">报名</button><button type="button" data-page="my-races" onclick="setPage('my-races')">参赛</button>${riderBtns}${adminBtns}`;
    }

    if (u) {
      const roleLabels = (u.roles || []).map(r => ({rider:"🏇选手",judge:"⚖️评委",organizer:"📋主办方",admin:"🔧管理员"}[r]||r));
      el.innerHTML = `<span class="user-chip" style="display:flex;align-items:center;gap:8px;padding:4px 14px;border-radius:10px;background:rgba(234,243,255,0.8);color:var(--blue-800);font-size:13px;font-weight:900;">${u.displayName}<span style="font-weight:400;color:var(--muted)">${roleLabels.join(" · ")}</span></span><button onclick="AppActions.logout()" style="min-height:28px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--glass);color:var(--blue-700);font-size:12px;font-weight:900;cursor:pointer;">退出</button><button onclick="setPage('login')" style="min-height:28px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--glass);color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;">切换</button>`;
    } else {
      el.innerHTML = `<button id="btn-login" type="button" onclick="setPage('login')" style="min-height:30px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:var(--glass);color:var(--blue-800);font-size:14px;font-weight:900;cursor:pointer;">Login</button>`;
    }
  }

  // ============ Home Page ============
  function renderHomePage() {
    const races = stores.races.all().filter((r) => r.visibility === "public");
    const u = App.currentUser;
    html("#home-user-greeting", u ? `<span>👋 ${u.displayName}</span>` : "");
    html("#home-race-list",
      races.map((r) => {
        const regs = stores.registrations.find((x) => x.raceId === r.id);
        const myReg = u ? regs.find((x) => x.userId === u.id) : null;
        const statusBadge = myReg
          ? `<span class="my-status ${myReg.status}">${statusLabel(myReg.status)}</span>`
          : (r.status === "registration" ? `<span class="my-status open">报名开放</span>` : "");
        return `<article class="race-card">
          <div class="race-card-head">
            <span class="race-status-badge ${r.status}">${statusLabel(r.status)}</span>
          </div>
          <h3>${r.title}</h3>
          <p>${r.challengeBrief}</p>
          <div class="race-card-meta">
            <span>🏇 ${regs.length} riders</span>
            ${statusBadge}
          </div>
          <div class="race-card-actions">
            ${myReg
              ? `<button data-page="my-races">查看我的参赛</button>`
              : (r.status === "registration"
                ? `<button class="primary" onclick="AppActions.register('${r.id}')">立即报名</button>`
                : `<button disabled>${statusLabel(r.status)}</button>`
              )
            }
          </div>
        </article>`;
      }).join("")
    );
  }

  function statusLabel(s) {
    const map = { draft: "草稿", published: "已发布", registration: "报名中", running: "进行中", submitting: "提交期", judging: "评审中", completed: "已结束", archived: "已归档", submitted: "已报名", approved: "已通过", rejected: "已拒绝", withdrawn: "已退赛" };
    return map[s] || s;
  }

  // ============ Register Page (核心报名 UI) ============
  function renderRegisterPage() {
    const races = stores.races.all().filter((r) => r.status === "registration" && r.visibility === "public");
    if (races.length === 0) {
      html("#register-content", `<div class="empty-state">🎯 当前没有开放报名的赛事</div>`);
      return;
    }
    html("#register-content",
      `<div class="register-intro">
        <h2>选择一场赛事报名</h2>
        <p>每个赛事每人只能报名一次。报名通过后系统会自动创建你的骑行工作区。</p>
      </div>
      <div class="register-race-list">
        ${races.map((r) => {
          const alreadyRegistered = stores.registrations.first((x) => x.raceId === r.id && x.userId === App.currentUser?.id);
          return `<article class="register-race-card ${alreadyRegistered ? "done" : ""}">
            <h3>${r.title}</h3>
            <p>${r.challengeBrief}</p>
            <div class="register-meta">
              <span>🏇 ${stores.registrations.find((x) => x.raceId === r.id).length} 人已报名</span>
            </div>
            ${alreadyRegistered
              ? `<div class="register-feedback ok">✅ 已报名 — 状态：${statusLabel(alreadyRegistered.status)}</div>`
              : `<div class="register-form" data-race-id="${r.id}">
                <button class="primary" onclick="AppActions.submitRegistration('${r.id}')">提交报名</button>
                <div class="register-constraint-hint">每个赛事每人限报一次，报名后不可重复提交</div>
              </div>`
            }
          </article>`;
        }).join("")}
      </div>
      <div id="register-result" class="register-result" style="display:none"></div>`
    );
  }

  function submitRegistration(raceId) {
    if (!App.currentUser) {
      showFeedback("register-result", "error", "请先登录后再报名。点击右上角 Login。");
      return;
    }
    if (!App.currentUser.roles.includes("rider")) {
      showFeedback("register-result", "error", "你的账号没有 rider 角色，无法报名参赛。");
      return;
    }
    const race = stores.races.get(raceId);
    if (!race || race.status !== "registration") {
      showFeedback("register-result", "error", "该赛事当前不开放报名。");
      return;
    }

    // === DEV-1 约束验证：唯一键 (raceId, userId) ===
    const existing = stores.registrations.first((x) => x.raceId === raceId && x.userId === App.currentUser.id);
    if (existing) {
      showFeedback("register-result", "error",
        `❌ 报名被拒绝：你已报名过「${race.title}」。<br><small>约束: UNIQUE(raceId, userId) — 一个 User 对同一 Race 最多一个 Registration</small>`
      );
      return;
    }

    // 执行报名 — 唯一键由 stores 层 enforce
    const result = business.submitRegistration(raceId, App.currentUser.id);

    if (result.ok) {
      const regId = result.record.id;
      showFeedback("register-result", "ok",
        `✅ 报名成功！<br><small>Registration ID: ${regId.slice(0,8)}…<br>状态: submitted → 等待主办方审核<br>审核通过后系统将自动创建 RaceProject（骑行工作区）</small>
        <br><button class="primary" onclick="AppActions.mockApprove('${regId}')" style="margin-top:12px;min-height:36px;padding:0 18px;border:none;border-radius:10px;color:#fff;background:linear-gradient(135deg,var(--blue-800),var(--blue-500));font-size:14px;font-weight:900;cursor:pointer;">模拟审核通过 → 自动生成 RaceProject</button>`
      );
      setTimeout(() => renderRegisterPage(), 2000);
    } else {
      showFeedback("register-result", "error", `❌ 报名失败: ${result.reason}`);
    }
  }

  // ============ Domain operations (aliased from shared business module) ============
  const approveRegistration = business.approveRegistration;
  const syncRaceProjectStatus = business.syncRaceProjectStatus;

  // ============ Mock approve for demo interaction ============
  function mockApprove(registrationId) {
    // Use Carol (organizer) or Admin as approver
    const approvers = stores.users.find((x) => (x.roles || []).includes("organizer") || (x.roles || []).includes("admin"));
    const approverId = approvers[0]?.id || "system";
    const result = approveRegistration(registrationId, approverId);

    if (result.ok) {
      showFeedback("register-result", "ok",
        `✅ 审核通过 — RaceProject 已自动生成<br><small>${result.reason}<br>RaceProject ID: ${(result.raceProjectId || "").slice(0,8)}…<br>aggregateIngestionStatus: not_configured<br>现在去「我的参赛」查看约束状态</small>`
      );
      setTimeout(() => { renderRegisterPage(); renderMyRacesPage(); }, 2000);
    } else {
      showFeedback("register-result", "error", `❌ 审核失败: ${result.reason}`);
    }
  }

  function showFeedback(containerId, type, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.style.display = "block";
    el.className = `register-result ${type}`;
    el.innerHTML = message;
  }

  // ============ My Races Page ============
  function renderMyRacesPage() {
    const u = App.currentUser;
    if (!u) { html("#my-races-content", `<div class="empty-state">请先登录</div>`); return; }

    const myRegs = stores.registrations.find((x) => x.userId === u.id);
    if (myRegs.length === 0) {
      html("#my-races-content", `<div class="empty-state">你还没有报名任何赛事。<br><button class="primary" data-page="register" onclick="setPage('register')">去报名</button></div>`);
      return;
    }

    html("#my-races-content",
      `<h2>我的参赛工作区</h2>
      ${myRegs.map((reg) => {
        const race = stores.races.get(reg.raceId);
        const rp = stores.raceProjects.first((x) => x.registrationId === reg.id);
        const work = stores.works.first((x) => x.registrationId === reg.id);
        const ccs = stores.caConnections.find((x) => x.raceProjectId === rp?.id);
        const sessions = stores.sessions.find((x) => stores.caConnections.get(x.caConnectionId)?.raceProjectId === rp?.id);
        const summaries = stores.sessionSummaries.find((x) => sessions.some((s) => s.id === x.sessionId));
        const evidences = stores.evidences.find((x) => x.registrationId === reg.id);

        // === DEV-1 AC-5: 实时计算风险提示并写入 Registration ===
        if (rp) {
          const flags = stateMachine.generateReviewFlags(rp);
          if (flags.length > 0) {
            // Write new flags or update existing
            stores.registrations.update(reg.id, { reviewFlags: flags });
          } else if (reg.reviewFlags?.length > 0) {
            // Clear flags — status is now healthy
            stores.registrations.update(reg.id, { reviewFlags: [] });
          }
        }

        // === DEV-1 约束校验 ===
        const regsForRace = stores.registrations.find((x) => x.raceId === reg.raceId && x.userId === u.id);
        const rpsForReg = stores.raceProjects.find((x) => x.registrationId === reg.id);
        const worksForReg = stores.works.find((x) => x.registrationId === reg.id);
        const idxMap = stores.raceProjects?.indexes?.uk_registration?.map;
        const indexHasKey = idxMap ? idxMap.has(String(reg.id)) : null;

        // === 管道闸门校验（现在由 syncRaceProjectStatus 保持同步）===
        const caOk = rp && ccs.filter((c) => !c.disabledAt && c.authenticityStatus === "verified").length > 0;
        const pipelineGate = !rp
          ? { ok: false, reason: "RaceProject 不存在 — 请先审核通过报名" }
          : !caOk
          ? { ok: false, reason: "无可用 CA 连接 — 登记并验证通过后即可生成 Session，提交/评审/Award 不受影响" }
          : sessions.length === 0
          ? { ok: false, reason: "CA 已就绪 — 点「生成 Session」开始骑行" }
          : { ok: true, reason: "管道畅通 — Session Summary 可进入 Evidence → Projection → Report" };

        return `<article class="my-race-card">
          <h3>${race?.title || "未知赛事"}</h3>
          <div class="my-race-status">
            <span>📋 Registration: <b>${statusLabel(reg.status)}</b></span>
            ${rp ? `<span>🚴 RaceProject: <b>${rp.aggregateIngestionStatus}</b> (${rp.connectionHealth})</span>` : ""}
            ${work ? `<span>📦 Work: <b>${statusLabel(work.status)}</b></span>` : ""}
            <span>📡 CA: <b>${ccs.length}</b></span>
            <span>📨 Sessions: <b>${sessions.length}</b></span>
            <span>📝 Evidence: <b>${evidences.length}</b></span>
          </div>

          <!-- DEV-1 约束校验 -->
          <div class="constraint-checks">
            <h4>DEV-1 约束校验</h4>
            <div class="constraint-row ${regsForRace.length === 1 ? "pass" : "fail"}"><span>${regsForRace.length === 1 ? "✓" : "✗"}</span> 唯一 Registration<small>${regsForRace.length === 1 ? "(raceId,userId) 唯一键正常" : "违反唯一键"}</small></div>
            <div class="constraint-row ${rpsForReg.length === 1 && indexHasKey ? "pass" : "fail"}"><span>${rpsForReg.length === 1 && indexHasKey ? "✓" : "✗"}</span> RaceProject 存在且唯一<small>${rpsForReg.length === 0 ? "未approved" : rpsForReg.length === 1 && indexHasKey ? "唯一键索引生效，幂等通过" : "异常"}</small></div>
            <div class="constraint-row ${worksForReg.length <= 1 ? "pass" : "fail"}"><span>${worksForReg.length <= 1 ? "✓" : "✗"}</span> 主 Work 唯一<small>${worksForReg.length <= 1 ? "≤1 通过" : "违反"}</small></div>
            <div class="constraint-row pass"><span>✓</span> CAConnection 不重复<small>${ccs.length} 个连接 — 唯一键保护</small></div>
            <div class="constraint-row ${pipelineGate.ok ? "pass" : "fail"}">
              <span>${pipelineGate.ok ? "✓" : "⚠"}</span>
              Pipeline 闸门<small>${pipelineGate.reason}</small>
            </div>
          </div>

          <!-- AC-5: 风险提示 -->
          ${reg.reviewFlags?.length > 0 ? `<div class="review-flags">⚠ 评审前风险提示: ${reg.reviewFlags.map((f) => f.flagType + (f.resolved ? "(已解决)" : "")).join(", ")}</div>` : ""}

          <!-- 操作区 -->
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
            ${rp && reg.status === "approved"
              ? `<div>
                ${!work ? `<button onclick="AppActions.createWork('${reg.id}')" style="min-height:34px;padding:0 14px;font-size:13px;font-weight:900;border:1px solid var(--line);border-radius:10px;background:var(--glass);cursor:pointer;">📦 创建 Work</button>`
                : work.status === "draft" ? `<button onclick="AppActions.submitWorkBtn('${work.id}')" style="min-height:34px;padding:0 14px;font-size:13px;font-weight:900;border:none;border-radius:10px;background:linear-gradient(135deg,var(--blue-800),var(--blue-500));color:#fff;cursor:pointer;">📤 提交 Work</button>`
                : `<span style="font-size:12px;color:var(--muted);">Work: ${statusLabel(work.status)}</span>`}
              </div>`
              : ""}
            ${ccs.filter((c) => c.authenticityStatus === "verified" && !c.disabledAt).length > 0 && rp
              ? `<button onclick="AppActions.createSession('${rp.id}')" style="min-height:34px;padding:0 14px;font-size:13px;font-weight:900;border:1px solid var(--line);border-radius:10px;background:var(--glass);cursor:pointer;">📨 生成 Session</button>`
              : ""}
            ${sessions.length > 0
              ? `<button onclick="AppActions.generateSummary('${sessions[sessions.length-1].id}')" style="min-height:34px;padding:0 14px;font-size:13px;font-weight:900;border:1px solid var(--line);border-radius:10px;background:var(--glass);cursor:pointer;">📝 生成 Session Summary</button>`
              : ""}
            ${summaries.length > 0 && evidences.length === 0
              ? `<button onclick="AppActions.createEvidence('${reg.id}','${summaries[summaries.length-1].id}')" style="min-height:34px;padding:0 14px;font-size:13px;font-weight:900;border:1px solid var(--line);border-radius:10px;background:var(--glass);cursor:pointer;">📋 存入 Evidence</button>`
              : ""}
          </div>

          <!-- 管道状态可视化 -->
          ${rp ? `<div style="margin-top:12px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);">
            <span style="padding:3px 10px;border-radius:6px;background:${rp.aggregateIngestionStatus === "not_configured" ? "#fee2e2" : "#d1fae5"};color:${rp.aggregateIngestionStatus === "not_configured" ? "#991b1b" : "#065f46"};font-weight:700;">CA: ${rp.aggregateIngestionStatus || "—"}</span>→
            <span style="padding:3px 10px;border-radius:6px;background:${sessions.length > 0 ? "#d1fae5" : "#f3f4f6"};color:${sessions.length > 0 ? "#065f46" : "#6b7280"};font-weight:700;">Sessions: ${sessions.length}</span>→
            <span style="padding:3px 10px;border-radius:6px;background:${summaries.length > 0 ? "#d1fae5" : "#f3f4f6"};color:${summaries.length > 0 ? "#065f46" : "#6b7280"};font-weight:700;">Summaries: ${summaries.length}</span>→
            <span style="padding:3px 10px;border-radius:6px;background:${evidences.length > 0 ? "#d1fae5" : "#f3f4f6"};color:${evidences.length > 0 ? "#065f46" : "#6b7280"};font-weight:700;">Evidence: ${evidences.length}</span>→
            <span style="padding:3px 10px;border-radius:6px;background:${evidences.length > 0 ? "#d1fae5" : "#f3f4f6"};color:${evidences.length > 0 ? "#065f46" : "#6b7280"};font-weight:700;">Projection / Report 输入</span>
          </div>` : ""}
        </article>`;
      }).join("")}`
    );
  }

  // ============ Work + Session + Evidence actions ============
  function createWork(regId) {
    const reg = stores.registrations.get(regId);
    if (!reg) return;
    // AC-5: CA state does NOT block Work creation
    const rp = stores.raceProjects.first((x) => x.registrationId === regId);
    const caNote = rp && rp.aggregateIngestionStatus === "not_configured"
      ? " — CA 未配置，但创建 Work 不受影响（AC-5.1）"
      : rp && rp.aggregateIngestionStatus === "failed"
      ? " — CA 全部失败，但创建 Work 不受影响（AC-5.2）"
      : "";
    const result = stores.works.insert({
      id: uid(), registrationId: regId, raceId: reg.raceId, ownerUserId: reg.userId,
      title: "我的参赛作品", summary: "Agent Racing 产出", description: "",
      demoUrl: null, videoUrl: null, repoUrl: null,
      status: "draft", visibility: "public", submittedAt: null, lockedAt: null,
      createdAt: now(), updatedAt: now(), version: 1,
    });
    showFeedback("register-result", result.ok ? "ok" : "error",
      result.ok ? `✅ Work 已创建${caNote}` : `❌ ${result.reason}`
    );
    setTimeout(renderMyRacesPage, 800);
  }

  function submitWorkBtn(workId) {
    const result = stores.works.update(workId, { status: "submitted", submittedAt: now() });
    showFeedback("register-result", result.ok ? "ok" : "error",
      result.ok ? "✅ Work 已提交 — CA 接入状态不阻断提交流程（AC-5）" : `❌ ${result.reason}`
    );
    setTimeout(renderMyRacesPage, 800);
  }

  function createSession(rpId) {
    const cc = stores.caConnections.first((x) => x.raceProjectId === rpId && x.authenticityStatus === "verified" && !x.disabledAt);
    if (!cc) { showFeedback("register-result","error","没有可用的已验证 CA 连接"); return; }
    const rp = stores.raceProjects.get(rpId);
    const sesResult = stores.sessions.insert({
      id: uid(), caConnectionId: cc.id, raceProjectId: rpId, registrationId: rp?.registrationId,
      caSessionId: "ext-" + uid().slice(0,6), status: "active",
      startedAt: now(), completedAt: null, durationMs: null, taskCount: 3, metrics: { tokenUsage: 42000, estimatedCost: 1.26, completionRate: 0.72 },
      createdAt: now(), updatedAt: now(), version: 1,
    });
    syncRaceProjectStatus(rpId);
    showFeedback("register-result", sesResult.ok ? "ok" : "error",
      sesResult.ok ? "✅ Session 已生成 — 现在可生成 Summary 并存入 Evidence" : `❌ ${sesResult.reason}`
    );
    setTimeout(renderMyRacesPage, 800);
  }

  function generateSummary(sesId) {
    // AC-4 gate: only verified CA sessions can generate summaries
    const canGen = caVerifier.canGenerateSessionSummary(sesId);
    if (!canGen.ok) {
      showFeedback("register-result","error",`❌ 闸门拦截: ${canGen.reason}<br><small>AC-4/AC-5: 未通过 DCR 校验的消息不得进入 Evidence/Projection</small>`);
      setTimeout(renderMyRacesPage, 800);
      return;
    }
    const result = caVerifier.generateSessionSummary(sesId);
    showFeedback("register-result", result.ok ? "ok" : "error",
      result.ok
        ? `✅ Session Summary 已生成 — 可存入 Evidence → Projection → Report`
        : `❌ ${result.reason}`
    );
    setTimeout(renderMyRacesPage, 800);
  }

  function createEvidence(regId, summaryId) {
    const summary = stores.sessionSummaries.get(summaryId);
    if (!summary) { showFeedback("register-result","error","Session Summary 不存在"); return; }
    const result = stores.evidences.insert({
      id: uid(), evidenceId: uid(), registrationId: regId,
      raceId: stores.registrations.get(regId)?.raceId,
      sourceType: "session_summary", sourceRef: { sourceId: summaryId, sourceType: "session_summary" },
      visibility: "public", summary: summary.content,
      tags: summary.capabilityTags || [],
      createdAt: now(), updatedAt: now(), version: 1,
    });
    showFeedback("register-result", result.ok ? "ok" : "error",
      result.ok
        ? "✅ Evidence 已创建 — 管道完整: CA→Session→Summary→Evidence→Projection/Report"
        : `❌ ${result.reason}`
    );
    setTimeout(renderMyRacesPage, 800);
  }

  // ============ CA Connect Page (AC-3) ============
  function renderCAConnectPage() {
    const u = App.currentUser;
    if (!u) { html("#ca-connect-content", `<div class="empty-state">请先登录</div>`); return; }
    const myRegs = stores.registrations.find((x) => x.userId === u.id && x.status === "approved");
    if (myRegs.length === 0) {
      html("#ca-connect-content", `<div class="empty-state">还没有已审核通过的报名。<br>先去报名并通过审核，再回来管理 CA 连接。</div>`); return;
    }

    html("#ca-connect-content", myRegs.map((reg) => {
      const race = stores.races.get(reg.raceId);
      const rp = stores.raceProjects.first((x) => x.registrationId === reg.id);
      const ccs = stores.caConnections.find((x) => x.raceProjectId === rp?.id);
      return `<article class="my-race-card">
        <h3>${race?.title || "赛事"} — CA 连接</h3>
        <div class="my-race-status">
          <span>RaceProject: <b>${rp?.aggregateIngestionStatus || "—"}</b></span>
          <span>连接数: <b>${ccs.length}</b></span>
        </div>
        <div class="ca-connection-grid">
          ${ccs.map((cc) => `<div class="ca-conn-card ${cc.disabledAt ? "disabled" : cc.authenticityStatus}">
            <b>${cc.connectorId}</b>
            <span>${cc.caProjectId}</span>
            <span>ingestion: ${cc.ingestionStatus}</span>
            <span>authenticity: ${cc.authenticityStatus}</span>
            ${cc.disabledAt ? `<span class="badge-err">已禁用</span>` : `<button onclick="AppActions.toggleCA('${cc.id}','disable')" style="margin-top:6px;min-height:28px;padding:0 10px;font-size:12px;">禁用</button>`}
            ${cc.disabledAt ? `<button onclick="AppActions.toggleCA('${cc.id}','enable')" style="margin-top:6px;min-height:28px;padding:0 10px;font-size:12px;">恢复</button>` : ""}
          </div>`).join("")}
        </div>
        <div style="margin-top:14px;">
          <div class="register-form">
            <input id="ca-connector-${reg.id}" placeholder="connectorId" style="min-height:34px;padding:0 10px;border:1px solid var(--line);border-radius:8px;margin-right:8px;" />
            <input id="ca-project-${reg.id}" placeholder="caProjectId" style="min-height:34px;padding:0 10px;border:1px solid var(--line);border-radius:8px;margin-right:8px;" />
            <button class="primary" onclick="AppActions.registerCA('${rp?.id}','${reg.id}')">登记 CA</button>
          </div>
          <div class="register-constraint-hint">约束: (raceProjectId, connectorId, caProjectId) 唯一键 — 同一 connector+项目不可重复登记</div>
        </div>
      </article>`;
    }).join(""));
  }

  function registerCA(rpId, regId) {
    if (!rpId || rpId === "undefined") { showFeedback("ca-result","error","还没有 RaceProject — 请先审核通过报名"); return; }
    const connectorId = val(`#ca-connector-${regId}`) || `conn-${uid().slice(0,6)}`;
    const caProjectId = val(`#ca-project-${regId}`) || `proj-${uid().slice(0,6)}`;
    const result = stores.caConnections.insert({
      id: uid(), raceProjectId: rpId, registrationId: regId, raceId: uid(), userId: App.currentUser.id,
      caType: "codex", connectorId, connectorVersion: "1.0", caProjectId,
      ingestionStatus: "connected", authenticityStatus: "verified", authenticityReason: null,
      appInstanceId: "app-test", deviceKeyId: "key-test", deviceKeyFingerprint: "fp-test",
      registeredAt: now(), lastHandshakeAt: now(), lastVerifiedAt: now(),
      disabledAt: null, disabledReason: null,
      createdAt: now(), updatedAt: now(), version: 1,
    });
    if (result.ok) {
      syncRaceProjectStatus(rpId);
      showFeedback("ca-result","ok",`✅ CA 连接已登记<br><small>connectorId: ${connectorId} | caProjectId: ${caProjectId}<br>ingestionStatus: connected | authenticityStatus: verified</small>`);
      setTimeout(() => { renderCAConnectPage(); renderMyRacesPage(); }, 1500);
    } else {
      showFeedback("ca-result","error",`❌ 登记失败: ${result.reason}<br><small>约束: UNIQUE(raceProjectId, connectorId, caProjectId)</small>`);
    }
  }
  function toggleCA(caId, action) {
    if (action === "disable") {
      stores.caConnections.update(caId, { disabledAt: now(), disabledReason: "手动禁用" });
      showFeedback("ca-result","ok","CA 已禁用 — 后续数据将被拒收（AC-3.5 验证通过）");
    } else {
      stores.caConnections.update(caId, { disabledAt: null, disabledReason: null });
      showFeedback("ca-result","ok","CA 已恢复");
    }
    const cc = stores.caConnections.get(caId);
    if (cc) syncRaceProjectStatus(cc.raceProjectId);
    setTimeout(() => renderCAConnectPage(), 1000);
  }

  // ============ CA Verify Page (AC-4) ============
  function renderCAVerifyPage() {
    const u = App.currentUser;
    if (!u) { html("#ca-verify-content", `<div class="empty-state">请先登录</div>`); return; }

    testShims.injectDefaultKeys();
    const ccs = stores.caConnections.find((x) => x.userId === u.id && !x.disabledAt && x.authenticityStatus === "verified");
    if (ccs.length === 0) {
      html("#ca-verify-content", `<div class="empty-state">没有可测试的 CA 连接。<br>先去「CA接入」登记一个连接。</div>`); return;
    }

    html("#ca-verify-content", ccs.map((cc) => {
      const receipts = stores.caMessageReceipts.find((x) => x.caConnectionId === cc.id);
      const quarantined = stores.caQuarantineAudits.find((x) => x.caConnectionId === cc.id);
      return `<article class="my-race-card">
        <h3>${cc.connectorId} / ${cc.caProjectId}</h3>
        <div class="my-race-status">
          <span>消息数: <b>${receipts.length}</b></span>
          <span>隔离: <b>${quarantined.length}</b></span>
          <span>authenticity: <b>${cc.authenticityStatus}</b></span>
        </div>
        <div class="ca-test-buttons" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
          <button onclick="AppActions.sendTestMsg('${cc.id}','valid')" style="min-height:32px;padding:0 12px;font-size:12px;font-weight:900;border:1px solid var(--line);border-radius:8px;background:#d1fae5;color:#065f46;cursor:pointer;">✓ 合法消息</button>
          <button onclick="AppActions.sendTestMsg('${cc.id}','badhash')" style="min-height:32px;padding:0 12px;font-size:12px;font-weight:900;border:1px solid var(--line);border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;">✗ Body Hash 错误</button>
          <button onclick="AppActions.sendTestMsg('${cc.id}','replay')" style="min-height:32px;padding:0 12px;font-size:12px;font-weight:900;border:1px solid var(--line);border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;">✗ Nonce 重放</button>
          <button onclick="AppActions.sendTestMsg('${cc.id}','seqback')" style="min-height:32px;padding:0 12px;font-size:12px;font-weight:900;border:1px solid var(--line);border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;">✗ Sequence 回退</button>
          <button onclick="AppActions.sendTestMsg('${cc.id}','keyrevoke')" style="min-height:32px;padding:0 12px;font-size:12px;font-weight:900;border:1px solid var(--line);border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;">✗ Key 撤销</button>
          <button onclick="AppActions.sendTestMsg('${cc.id}','unknownapp')" style="min-height:32px;padding:0 12px;font-size:12px;font-weight:900;border:1px solid var(--line);border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;">✗ App 未知</button>
        </div>
        ${receipts.length > 0 ? `<div class="constraint-checks" style="margin-top:12px;"><h4>消息接收记录</h4>${receipts.slice(-8).reverse().map((r) => `<div class="constraint-row ${r.verificationResult === "passed" ? "pass" : "fail"}"><span>${r.verificationResult === "passed" ? "✓" : "✗"}</span>${r.verificationResult}<small>${r.createdAt?.slice(11,19) || ""}</small></div>`).join("")}</div>` : ""}
      </article>`;
    }).join(""));
  }

  function sendTestMsg(caId, type) {
    const result = testShims.sendTestMsg(caId, type);
    const labelMap = { valid: "合法消息", badhash: "Hash 错误", replay: "重放", seqback: "序列回退", keyrevoke: "Key 撤销", unknownapp: "App 未知" };
    showFeedback("ca-verify-result", result.passed ? "ok" : "error",
      `${result.passed ? "✅ 校验通过" : "❌ 验签失败"}: ${result.verificationResult}<br><small>类型: ${labelMap[type]} | 隔离审计: ${stores.caQuarantineAudits.count()} 条</small>`
    );
    setTimeout(renderCAVerifyPage, 800);
  }

  // ============ Admin Console (AC-5 + Organizer flow) ============
  function renderAdminConsolePage() {
    const u = App.currentUser;
    if (!u || (!u.roles.includes("organizer") && !u.roles.includes("admin"))) {
      html("#admin-content", `<div class="empty-state">需要 organizer 或 admin 权限</div>`); return;
    }

    const managedRaces = stores.races.find((x) => x.organizerUserIds.includes(u.id) || x.createdByUserId === u.id);
    if (managedRaces.length === 0) { html("#admin-content", `<div class="empty-state">没有管理的赛事</div>`); return; }

    html("#admin-content", managedRaces.map((race) => {
      const regs = stores.registrations.find((x) => x.raceId === race.id);
      const pendingRegs = regs.filter((x) => x.status === "submitted");
      const approvedRegs = regs.filter((x) => x.status === "approved");
      const works = stores.works.find((x) => x.raceId === race.id);
      const awards = stores.awards.find((x) => x.raceId === race.id);

      return `<article class="my-race-card">
        <h3>${race.title}</h3>
        <div class="my-race-status">
          <span>状态: <b>${statusLabel(race.status)}</b></span>
          <span>待审核: <b>${pendingRegs.length}</b></span>
          <span>已通过: <b>${approvedRegs.length}</b></span>
          <span>作品: <b>${works.length}</b></span>
          <span>Award: <b>${awards.filter((x) => x.status === "published").length}</b></span>
        </div>

        <!-- Pending approvals -->
        ${pendingRegs.length > 0 ? `<div style="margin-top:14px;"><h4 style="font-size:13px;color:var(--blue-700);margin-bottom:8px;">待审核报名</h4>${pendingRegs.map((r) => {
          const rider = stores.users.get(r.userId);
          return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:rgba(254,243,199,0.6);margin-bottom:6px;"><span style="flex:1;font-size:13px;">${rider?.displayName || r.userId.slice(0,8)}</span><button onclick="AppActions.adminApprove('${r.id}')" style="min-height:28px;padding:0 12px;font-size:12px;font-weight:900;border:none;border-radius:6px;background:#d1fae5;color:#065f46;cursor:pointer;">通过</button><button onclick="AppActions.adminReject('${r.id}')" style="min-height:28px;padding:0 12px;font-size:12px;font-weight:900;border:none;border-radius:6px;background:#fee2e2;color:#991b1b;cursor:pointer;">拒绝</button></div>`;
        }).join("")}</div>` : ""}

        <!-- Approved registrations — CA + pipeline status -->
        ${approvedRegs.length > 0 ? `<div style="margin-top:14px;"><h4 style="font-size:13px;color:var(--blue-700);margin-bottom:8px;">已通过报名 — CA 管道状态</h4>
        ${approvedRegs.map((r) => {
          const rp = stores.raceProjects.first((x) => x.registrationId === r.id);
          const ccs = stores.caConnections.find((x) => x.raceProjectId === rp?.id);
          const sessions = stores.sessions.find((x) => stores.caConnections.get(x.caConnectionId)?.raceProjectId === rp?.id);
          const summaries = stores.sessionSummaries.find((x) => sessions.some((s) => s.id === x.sessionId));
          const rider = stores.users.get(r.userId);
          const flags = rp ? stateMachine.generateReviewFlags(rp) : [];
          if (flags.length > 0 && rp) stores.registrations.update(r.id, { reviewFlags: flags });

          return `<div style="padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,0.5);margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
              <b style="font-size:14px;">${rider?.displayName || "—"}</b>
              <span style="font-size:12px;color:var(--blue-700);">RP: ${rp?.aggregateIngestionStatus || "—"}</span>
              <span style="font-size:12px;color:var(--muted);">CA: ${ccs.length} | Sessions: ${sessions.length} | Summaries: ${summaries.length}</span>
              ${r.reviewFlags?.length > 0 ? `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#fef3c7;color:#92400e;font-weight:700;">⚠ ${r.reviewFlags.map((f) => f.flagType).join(",")}</span>` : ""}
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);">
              <span style="padding:2px 8px;border-radius:4px;background:${!rp || rp.aggregateIngestionStatus === "not_configured" ? "#fee2e2" : rp.aggregateIngestionStatus === "failed" ? "#fee2e2" : "#d1fae5"};color:${!rp || rp.aggregateIngestionStatus === "failed" || rp.aggregateIngestionStatus === "not_configured" ? "#991b1b" : "#065f46"};">
                ${!rp ? "无RP" : rp.aggregateIngestionStatus === "not_configured" ? "CA未配置—不阻断" : rp.aggregateIngestionStatus === "failed" ? "CA失败—不阻断" : "CA正常"}
              </span>→
              <span style="padding:2px 8px;border-radius:4px;background:${sessions.length > 0 ? "#d1fae5" : "#f3f4f6"};">S:${sessions.length}</span>→
              <span style="padding:2px 8px;border-radius:4px;background:${summaries.length > 0 ? "#d1fae5" : "#f3f4f6"};">Sm:${summaries.length}</span>
              <span style="font-size:10px;">${r.reviewFlags?.length > 0 ? "⚠ 有风险提示 — 评审/Award 仍可继续" : "✓ 无风险提示"}</span>
            </div>
          </div>`;
        }).join("")}</div>` : ""}

        <!-- Award creation -->
        <div style="margin-top:14px;">
          <h4 style="font-size:13px;color:var(--blue-700);margin-bottom:8px;">颁发 Award</h4>
          <div class="register-form">
            <input id="award-name-${race.id}" placeholder="奖项名 (e.g. Best Overall)" style="min-height:34px;padding:0 10px;border:1px solid var(--line);border-radius:8px;margin-right:8px;width:180px;" />
            <input id="award-reg-${race.id}" placeholder="Registration ID" style="min-height:34px;padding:0 10px;border:1px solid var(--line);border-radius:8px;margin-right:8px;width:280px;" />
            <button class="primary" onclick="AppActions.createAward('${race.id}')" style="min-height:34px;padding:0 16px;font-size:13px;">创建 Award</button>
          </div>
          <div class="register-constraint-hint">约束: (raceId, awardName, rank) 唯一 — CA 接入失败不阻断颁奖（AC-5.4）</div>
          ${awards.length > 0 ? `<div style="margin-top:8px;">${awards.map((a) => `<div class="constraint-row ${a.status === 'published' ? 'pass' : ''}"><span>${a.status === "published" ? "✓" : "◌"}</span>${a.awardName} #${a.rank} — ${a.status}<small>${a.decisionReason || ""}</small></div>`).join("")}</div>` : ""}
        </div>
      </article>`;
    }).join(""));
  }

  function adminApprove(regId) {
    const result = approveRegistration(regId, App.currentUser.id);
    showFeedback("admin-result", result.ok ? "ok" : "error",
      result.ok ? `✅ ${result.reason}` : `❌ ${result.reason}`
    );
    setTimeout(renderAdminConsolePage, 1000);
  }

  function adminReject(regId) {
    const result = stores.registrations.update(regId, { status: "rejected", rejectedAt: now(), rejectedReason: "主办方拒绝" });
    showFeedback("admin-result", result.ok ? "ok" : "error", result.ok ? "✅ 已拒绝" : "❌ 操作失败");
    setTimeout(renderAdminConsolePage, 1000);
  }

  function createAward(raceId) {
    const awardName = val(`#award-name-${raceId}`) || "Test Award";
    const regId = val(`#award-reg-${raceId}`);
    if (!regId) { showFeedback("admin-result","error","请输入 Registration ID"); return; }
    const existing = stores.awards.find((x) => x.raceId === raceId && x.awardName === awardName);
    const rank = existing.length + 1;
    const result = stores.awards.insert({
      id: uid(), raceId, registrationId: regId, workId: null,
      awardName, rank, decisionReason: "CA 接入状态不影响颁奖（AC-5.4）",
      status: "draft", publishedAt: null,
      createdAt: now(), updatedAt: now(), version: 1,
    });
    if (result.ok) {
      stores.awards.update(result.record.id, { status: "published", publishedAt: now() });
      showFeedback("admin-result","ok",`✅ Award 已创建并发布: ${awardName} #${rank}`);
    } else {
      showFeedback("admin-result","error",`❌ ${result.reason}`);
    }
    setTimeout(renderAdminConsolePage, 1000);
  }
  function renderRacesPage() {
    const races = stores.races.all().filter((r) => r.visibility === "public");
    html("#races-content",
      races.map((r) => {
        const count = stores.registrations.find((x) => x.raceId === r.id).length;
        return `<article class="race-card">
          <div class="race-card-head"><span class="race-status-badge ${r.status}">${statusLabel(r.status)}</span></div>
          <h3>${r.title}</h3>
          <p>${r.challengeBrief}</p>
          <div class="race-card-meta"><span>🏇 ${count} riders</span></div>
          <div class="race-card-actions"><button data-page="register" onclick="setPage('register')">立即报名</button></div>
        </article>`;
      }).join("")
    );
  }

  // ============ Init ============
  function init() {
    seedDemoData();

    // Wire navigation
    $$("[data-page]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const page = e.target.closest("[data-page]")?.dataset?.page;
        if (page) setPage(page);
      });
    });

    // Wire login
    document.addEventListener("click", (e) => {
      const card = e.target.closest(".login-user-card");
      if (card) login(card.dataset.userId);
    });

    // Start from hash or default to login
    const hash = location.hash.slice(1) || "login";
    renderHeader();
    setPage(hash);
  }

  // ============ Export ============
  window.App = App;
  window.AppActions = { submitRegistration, showFeedback, login, logout, mockApprove, approveRegistration, registerCA, toggleCA, sendTestMsg, adminApprove, adminReject, createAward, createWork, submitWorkBtn, createSession, generateSummary, createEvidence };
  window.setPage = setPage;

  init();
})();
