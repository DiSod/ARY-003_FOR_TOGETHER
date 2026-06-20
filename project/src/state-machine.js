// State machine validators for 6 core chains.
// Mirrors dev-1-state-transitions.md.

// --- Race ---
const RACE_TRANSITIONS = {
  draft: ["published", "archived"],
  published: ["registration"],
  registration: ["running"],
  running: ["submitting"],
  submitting: ["judging"],
  judging: ["completed"],
  completed: ["archived"],
  archived: [],
};

const RACE_BANNED = [
  { from: "completed", to: "judging", reason: "赛后结果不可回退重评" },
  { from: "archived", to: "*", reason: "归档态是终态" },
  { from: "draft", to: "registration", reason: "必须先发布才能报名", bypass: "published" },
  { from: "running", to: "judging", reason: "必须给选手提交窗口", bypass: "submitting" },
];

function raceCanTransition(from, to) {
  const allowed = RACE_TRANSITIONS[from] ?? [];
  if (allowed.includes(to)) return { ok: true };

  // Check banned reasons
  for (const ban of RACE_BANNED) {
    if (ban.from === from && (ban.to === to || ban.to === "*")) {
      return { ok: false, reason: ban.reason };
    }
  }
  return { ok: false, reason: `不允许 ${from} → ${to}` };
}

// --- Registration ---
const REGISTRATION_TRANSITIONS = {
  submitted: ["approved", "rejected"],
  approved: ["withdrawn"],
  rejected: [],
  withdrawn: [],
};

function registrationCanTransition(from, to) {
  const allowed = REGISTRATION_TRANSITIONS[from] ?? [];
  if (allowed.includes(to)) return { ok: true };

  // Hard block: CA status cannot drive withdrawn
  if (to === "withdrawn" && from !== "approved") {
    return { ok: false, reason: "CA 接入状态不驱动 Registration 进入 withdrawn" };
  }
  return { ok: false, reason: `不允许 ${from} → ${to}` };
}

// --- Work ---
const WORK_TRANSITIONS = {
  draft: ["submitted", "hidden"],
  submitted: ["locked"],
  locked: ["hidden"],
  hidden: [],
};

function workCanTransition(from, to) {
  const allowed = WORK_TRANSITIONS[from] ?? [];
  if (allowed.includes(to)) return { ok: true };

  if (from === "locked" && to === "draft") return { ok: false, reason: "locked 不可回退到 draft" };
  if (from === "submitted" && to === "draft") return { ok: false, reason: "submitted 不可回退到 draft" };
  return { ok: false, reason: `Work 不允许 ${from} → ${to}` };
}

// --- JudgingRecord ---
const JUDGING_TRANSITIONS = {
  draft: ["submitted"],
  submitted: [],
};

function judgingCanTransition(from, to) {
  const allowed = JUDGING_TRANSITIONS[from] ?? [];
  if (allowed.includes(to)) return { ok: true };
  return { ok: false, reason: `JudgingRecord 不允许 ${from} → ${to}` };
}

// --- Award ---
const AWARD_TRANSITIONS = {
  draft: ["published"],
  published: ["withdrawn"],
  withdrawn: [],
};

function awardCanTransition(from, to) {
  const allowed = AWARD_TRANSITIONS[from] ?? [];
  if (allowed.includes(to)) return { ok: true };
  if (from === "published" && to === "draft") return { ok: false, reason: "已发布赛果不可撤回草稿" };
  return { ok: false, reason: `Award 不允许 ${from} → ${to}` };
}

// --- RaceProject aggregateIngestionStatus ---
const RP_INGESTION_TRANSITIONS = {
  not_configured: ["connected"],
  connected: ["active", "failed"],
  active: ["connected", "failed"],
  failed: ["connected"],
};

function rpIngestionCanTransition(from, to) {
  const allowed = RP_INGESTION_TRANSITIONS[from] ?? [];
  if (allowed.includes(to)) return { ok: true };
  return { ok: false, reason: `RaceProject.aggregateIngestionStatus 不允许 ${from} → ${to}` };
}

// --- Compute connectionHealth ---
function computeConnectionHealth(caConnectionStatuses) {
  const total = caConnectionStatuses.length;
  if (total === 0) return "no_signal";
  const active = caConnectionStatuses.filter((s) => s === "active").length;
  const connected = caConnectionStatuses.filter((s) => s === "connected").length;
  const failed = caConnectionStatuses.filter((s) => s === "failed").length;
  const disabled = caConnectionStatuses.filter((s) => s === "disabled").length;

  const usable = active + connected;
  if (usable === 0) return "all_failed";
  if (failed > 0 || disabled > 0) return "partial_failed";
  if (usable === total) return "ok";
  return "ok";
}

// --- Review Flag generation ---
function generateReviewFlags(raceProject) {
  const flags = [];
  if (raceProject.aggregateIngestionStatus === "not_configured") {
    flags.push({
      flagType: "ca_unconfigured",
      reason: "RaceProject 下无已登记 CAConnection",
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  }
  if (raceProject.aggregateIngestionStatus === "failed") {
    flags.push({
      flagType: "ca_failed",
      reason: "全部 CAConnection 接入失败",
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  }
  if (raceProject.connectionHealth === "partial_failed") {
    flags.push({
      flagType: "ca_failed",
      reason: "部分 CAConnection 接入异常",
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  }
  return flags;
}

export {
  raceCanTransition,
  registrationCanTransition,
  workCanTransition,
  judgingCanTransition,
  awardCanTransition,
  rpIngestionCanTransition,
  computeConnectionHealth,
  generateReviewFlags,
  RACE_TRANSITIONS,
  REGISTRATION_TRANSITIONS,
  WORK_TRANSITIONS,
  JUDGING_TRANSITIONS,
  AWARD_TRANSITIONS,
  RP_INGESTION_TRANSITIONS,
};
