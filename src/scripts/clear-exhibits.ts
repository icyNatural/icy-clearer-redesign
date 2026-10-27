import {
  ambiguousLoop,
  clamp,
  LIGHT_SOURCES,
  ORBIT,
  orbit,
  pathFrom,
  predictionError,
  scaleTrace,
  TAU,
  WINDOW_NAMES,
} from "../data/clear-instruments";

const root = document.querySelector<HTMLElement>(".clear-vault");
const $ = <T extends Element = HTMLElement>(selector: string) =>
  root!.querySelector<T>(selector)!;
const $$ = <T extends Element = HTMLElement>(selector: string) => [
  ...root!.querySelectorAll<T>(selector),
];
const svgNS = "http://www.w3.org/2000/svg";
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
// Resolve author intent before Studio's asynchronous startup. A slow editor
// must never allow a selection gesture to become a visitor experiment.
const authoring =
  root?.dataset.clearAuthor === "true" &&
  new URLSearchParams(location.search).get("edit") === "1";
if (authoring) {
  root!.classList.add("clear-author-session");
  for (const field of $$<HTMLElement>(".phenomenon")) {
    field.removeAttribute("tabindex");
    field.setAttribute("aria-disabled", "true");
  }
  root!.addEventListener(
    "click",
    (event) => {
      if (
        (event.target as Element).closest(
          "#vault a, #vault button, #vault summary, #index a, #index summary, .vault-header a, .instrument-index a, .vault-footer a",
        )
      )
        event.preventDefault();
    },
    true,
  );
  for (const input of $$<HTMLInputElement>("#vault input, #vault button"))
    input.disabled = true;
}
const signal = (
  instrument: string,
  state: string,
  law: string,
  line: string,
  detail: string,
) => {
  $(`[data-${instrument}-state]`).textContent = state;
  $(`[data-${instrument}-signal]`).textContent = law;
  $(`[data-${instrument}-reveal]`).textContent = line;
  $(`[data-${instrument}-detail]`).textContent = detail;
};
const pointOn = (
  element: Element,
  event: PointerEvent,
  width: number,
  height: number,
) => {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1) * width,
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1) * height,
  };
};
const svgNode = (tag: string, attributes: Record<string, string | number>) => {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes))
    element.setAttribute(key, String(value));
  return element;
};

function observerInstrument() {
  const field = $("[data-observer-field]");
  const form = $<HTMLFormElement>("[data-label-form]");
  const eventPath = $("[data-event-form]");
  const attentionSamples = Array.from({ length: 60 }, () =>
    svgNode("circle", { r: 1.7 }),
  );
  $("[data-attention-samples]").replaceChildren(...attentionSamples);
  const started = performance.now();
  let phase = 0,
    view = 0.22,
    frozen = false,
    named = false,
    recalled = false,
    observedAt = 0;
  let active = false,
    raf = 0,
    previous = 0,
    pointer: number | null = null,
    downX = 0,
    initialView = view,
    dragged = false;
  const render = () => {
    const samples = ambiguousLoop(phase, view);
    const full = pathFrom(samples, true);
    eventPath.setAttribute(
      "d",
      pathFrom(ambiguousLoop(phase, view, recalled ? 16 : 240), true),
    );
    $("[data-event-retained]").setAttribute("d", full);
    attentionSamples.forEach((node, i) => {
      node.setAttribute("cx", String(samples[i * 4].x));
      node.setAttribute("cy", String(samples[i * 4].y));
    });
    for (const contour of $$<SVGPathElement>("[data-contour]"))
      contour.setAttribute(
        "d",
        pathFrom(
          ambiguousLoop(phase, view, 160, Number(contour.dataset.contour)),
          true,
        ),
      );
    field.classList.toggle("is-named", named);
    field.classList.toggle("is-recalled", recalled);
    field.classList.toggle("is-held", frozen);
    field.setAttribute("aria-pressed", String(frozen));
    field.setAttribute(
      "aria-label",
      frozen
        ? "Event held. Tap to reopen, or drag sideways to change viewpoint."
        : "Hold the ambiguous event. Drag sideways to change viewpoint.",
    );
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    previous = 0;
  };
  const tick = (now: number) => {
    raf = 0;
    if (!active || frozen || reduced.matches || document.hidden || authoring)
      return;
    const dt = previous ? Math.min(64, now - previous) : 0;
    if (dt >= 32 || !previous) {
      phase += dt * 0.00032;
      previous = now;
      render();
    }
    raf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (
      !raf &&
      active &&
      !frozen &&
      !reduced.matches &&
      !document.hidden &&
      !authoring
    )
      raf = requestAnimationFrame(tick);
  };
  const revealForm = () => {
    form.hidden = false;
    $("[data-observer-actions]").hidden = false;
  };
  const hold = () => {
    frozen = true;
    observedAt = (performance.now() - started) / 1000;
    stop();
    revealForm();
    render();
    $("[data-observer-time]").textContent =
      `EVENT HELD / +${observedAt.toFixed(1)} s`;
    signal(
      "observer",
      "OBSERVED",
      "KEEP IT UNRESOLVED",
      "You held an event. It still has no name.",
      "The alternatives remain available. Naming is your next intervention.",
    );
  };
  const reopen = () => {
    frozen = false;
    named = false;
    recalled = false;
    form.hidden = true;
    $("[data-observer-actions]").hidden = true;
    $("[data-event-word]").textContent = "EVENT / NO NAME APPLIED";
    $("[data-observer-time]").textContent = "EVENT REOPENED";
    $("[data-recall]").setAttribute("aria-pressed", "false");
    $("[data-recall]").textContent = "RECONSTRUCT FROM MEMORY ↗";
    signal(
      "observer",
      "REOPENED",
      "THE FIRST THOUGHT IS A DRAFT",
      "The name can go. The event remains.",
      "Discovery > certainty. A useful interpretation can be revised.",
    );
    render();
    start();
  };
  const applyName = (value: string) => {
    const label = value.trim();
    if (!label || authoring) return;
    if (!frozen) hold();
    named = true;
    recalled = false;
    render();
    $("[data-event-word]").textContent = label.toUpperCase();
    $("[data-observer-time]").textContent =
      `OBSERVED +${observedAt.toFixed(1)} s / NAMED +${((performance.now() - started) / 1000).toFixed(1)} s`;
    signal(
      "observer",
      "INTERPRETATION APPLIED",
      "OBSERVE BEFORE NAMING",
      "The label was added after the event.",
      `“${label}” is one interpretation. Four alternative words have left the field; the held geometry is unchanged.`,
    );
    $("[data-recall]").setAttribute("aria-pressed", "false");
    $("[data-recall]").textContent = "RECONSTRUCT FROM MEMORY ↗";
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    applyName($<HTMLInputElement>("#event-label").value);
  });
  for (const button of $$<HTMLButtonElement>("[data-name]"))
    button.addEventListener("click", () => {
      if (authoring) return;
      $<HTMLInputElement>("#event-label").value = button.dataset.name!;
      applyName(button.dataset.name!);
    });
  $("[data-reopen]").addEventListener("click", () => {
    if (!authoring) reopen();
  });
  $("[data-recall]").addEventListener("click", () => {
    if (authoring) return;
    recalled = !recalled;
    render();
    $("[data-recall]").setAttribute("aria-pressed", String(recalled));
    $("[data-recall]").textContent = recalled
      ? "RETURN TO THE HELD RECORD ↗"
      : "RECONSTRUCT FROM MEMORY ↗";
    signal(
      "observer",
      recalled ? "PARTIAL" : named ? "INTERPRETATION APPLIED" : "OBSERVED",
      "MEMORY IS RECONSTRUCTION",
      recalled
        ? "Some of the event did not survive."
        : "The held record is available again.",
      recalled
        ? "16 of 240 contour samples retained. The white trace preserves what this illustrative reconstruction discarded."
        : "Returning to a record is different from rebuilding it from a compressed representation.",
    );
  });
  field.addEventListener("pointerdown", (event) => {
    if (authoring || event.button !== 0) return;
    pointer = event.pointerId;
    downX = event.clientX;
    initialView = view;
    dragged = false;
    field.setPointerCapture(pointer);
  });
  field.addEventListener("pointermove", (event) => {
    if (authoring) return;
    const { x, y } = pointOn(field, event, 600, 490);
    $("[data-attention]").setAttribute("cx", String(x));
    $("[data-attention]").setAttribute("cy", String(y));
    $("[data-attention-cross]").setAttribute(
      "transform",
      `translate(${x} ${y})`,
    );
    $("[data-attention-mask]").setAttribute("cx", String(x));
    $("[data-attention-mask]").setAttribute("cy", String(y));
    field.style.setProperty("--attention-x", `${x / 6}%`);
    if (pointer === event.pointerId && Math.abs(event.clientX - downX) > 7) {
      dragged = true;
      view = clamp(
        initialView + ((event.clientX - downX) / field.clientWidth) * 2.4,
        -1.1,
        1.1,
      );
      render();
      signal(
        "observer",
        "FRAME SHIFTED",
        "THE OBSERVER IS INSIDE",
        "Your position changes what appears.",
        "Interaction produces experience. This is another projection of the same parametric loop.",
      );
    }
  });
  field.addEventListener("pointerup", (event) => {
    if (pointer !== event.pointerId) return;
    pointer = null;
    if (!dragged) {
      if (frozen) reopen();
      else hold();
    }
  });
  const cancel = () => {
    pointer = null;
    dragged = false;
  };
  field.addEventListener("pointercancel", cancel);
  field.addEventListener("lostpointercapture", cancel);
  field.addEventListener("pointerenter", () => {
    if (!authoring && !frozen) {
      $("[data-observer-signal]").textContent = "ATTENTION CREATES SIGNAL";
      $("[data-observer-detail]").textContent =
        "Your attention changes which contours stand out. It does not create the underlying form.";
    }
  });
  field.addEventListener("keydown", (event) => {
    if (authoring) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      frozen ? reopen() : hold();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      view = clamp(view + (event.key === "ArrowRight" ? 0.1 : -0.1), -1.1, 1.1);
      render();
      signal(
        "observer",
        "FRAME SHIFTED",
        "THE FRAME CHANGES THE EVENT",
        "Another position. Another appearance.",
        "The underlying loop and its naming history remain.",
      );
    }
  });
  const visibility = new IntersectionObserver(
    (entries) => {
      active = entries[0].isIntersecting;
      active ? start() : stop();
    },
    { threshold: 0.01 },
  );
  visibility.observe(field);
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
    cancel();
  });
  window.addEventListener("blur", cancel);
  reduced.addEventListener("change", () => {
    stop();
    render();
    start();
  });
  render();
}

function lightInstrument() {
  const field = $("[data-delay-field]");
  let selected = 0;
  const choose = (index: number) => {
    selected = clamp(index, 0, 2);
    const source = LIGHT_SOURCES[selected];
    $("[data-light-marker]").setAttribute(
      "transform",
      `translate(${source.x} 82)`,
    );
    $("[data-light-path]").setAttribute("d", `M${source.x} 82H568`);
    $("[data-light-name]").textContent = source.name;
    $("[data-light-delay]").textContent = source.delay;
    field.setAttribute("aria-valuenow", String(selected));
    field.setAttribute(
      "aria-valuetext",
      `${source.name}, ${source.label} before arrival`,
    );
  };
  const locate = (event: PointerEvent) => {
    const { x } = pointOn(field, event, 600, 190);
    choose(
      LIGHT_SOURCES.reduce(
        (nearest, source, i) =>
          Math.abs(source.x - x) < Math.abs(LIGHT_SOURCES[nearest].x - x)
            ? i
            : nearest,
        0,
      ),
    );
  };
  let pointer: number | null = null;
  field.addEventListener("pointerdown", (event) => {
    if (authoring || event.button !== 0) return;
    pointer = event.pointerId;
    field.setPointerCapture(pointer);
    locate(event);
  });
  field.addEventListener("pointermove", (event) => {
    if (!authoring && event.pointerId === pointer) locate(event);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    field.addEventListener(type, () => {
      pointer = null;
    });
  field.addEventListener("keydown", (event) => {
    if (authoring) return;
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      choose(
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 2
            : selected + (event.key === "ArrowLeft" ? 1 : -1),
      );
    }
  });
  choose(0);
}

function modelInstrument() {
  const field = $("[data-orbit-field]");
  let day = 0,
    frame = "earth",
    complete = true,
    pointer: number | null = null,
    previousAngle = 0,
    initialX = 0,
    moved = false;
  const centre = { x: 300, y: 240 },
    scale = 88;
  const screen = (p: { x: number; y: number }) => ({
    x: centre.x + p.x * scale,
    y: centre.y - p.y * scale,
  });
  const move = (selector: string, p: { x: number; y: number }) => {
    const s = screen(p);
    $(selector).setAttribute("transform", `translate(${s.x} ${s.y})`);
    return s;
  };
  const label = (
    selector: string,
    p: { x: number; y: number },
    dx: number,
    dy: number,
  ) => {
    const s = screen(p);
    $(selector).setAttribute("x", String(s.x + dx));
    $(selector).setAttribute("y", String(s.y + dy));
  };
  const paint = () => {
    const { earth, mars, relative } = orbit(day);
    $("[data-orbit-time-marker]").setAttribute(
      "cx",
      String(300 + Math.cos((day / 780) * TAU) * 230),
    );
    $("[data-orbit-time-marker]").setAttribute(
      "cy",
      String(240 + Math.sin((day / 780) * TAU) * 230),
    );
    $("[data-earth-orbit]").classList.toggle("is-erased", frame === "earth");
    const observer = frame === "earth" ? { x: 0, y: 0 } : earth;
    const sun =
      frame === "earth" ? { x: -earth.x, y: -earth.y } : { x: 0, y: 0 };
    const planet =
      frame === "earth"
        ? complete
          ? relative
          : mars
        : complete
          ? mars
          : { x: mars.x + earth.x, y: mars.y + earth.y };
    const deference = frame === "earth" ? mars : { x: 0, y: 0 };
    const observerScreen = move("[data-model-earth]", observer);
    move("[data-model-sun]", sun);
    const planetScreen = move("[data-model-planet]", planet);
    move("[data-deferent-centre]", deference);
    label("[data-earth-label]", observer, -52, 34);
    label("[data-sun-label]", sun, -12, -23);
    label("[data-planet-label]", planet, 15, -17);
    const d = screen(deference);
    $("[data-epicycle]").setAttribute("cx", String(d.x));
    $("[data-epicycle]").setAttribute("cy", String(d.y));
    $("[data-epicycle]").setAttribute("r", String(scale));
    $("[data-epicycle]").classList.toggle(
      "is-erased",
      !complete || frame === "sun",
    );
    $("[data-deferent-centre]").classList.toggle("is-erased", frame === "sun");
    $("[data-epicycle-label]").textContent =
      frame === "earth" ? "EPICYCLE" : "EARTH ORBIT";
    label(
      "[data-epicycle-label]",
      frame === "earth" ? mars : { x: 0, y: 1 },
      -28,
      -96,
    );
    $("[data-construction-arm]").setAttribute(
      "d",
      frame === "earth"
        ? `M300 240L${d.x} ${d.y}L${planetScreen.x} ${planetScreen.y}`
        : `M300 240L${planetScreen.x} ${planetScreen.y}M300 240L${observerScreen.x} ${observerScreen.y}`,
    );
    $("[data-line-of-sight]").setAttribute(
      "d",
      `M${observerScreen.x} ${observerScreen.y}L${planetScreen.x} ${planetScreen.y}`,
    );
    const trace = Array.from({ length: 260 }, (_, i) => {
      const o = orbit((i * ORBIT.recordDays) / 259);
      return screen(
        frame === "earth"
          ? complete
            ? o.relative
            : o.mars
          : complete
            ? o.mars
            : { x: o.mars.x + o.earth.x, y: o.mars.y + o.earth.y },
      );
    });
    $("[data-orbital-trace]").setAttribute("d", pathFrom(trace));
    $("[data-model-day]").textContent = String(Math.round(day));
    $("[data-model-error]").textContent =
      `${predictionError(complete).toFixed(2)}°`;
    field.setAttribute("aria-valuenow", String(Math.round(day)));
    field.setAttribute(
      "aria-valuetext",
      `${Math.round(day)} elapsed days, ${frame}-centred frame, ${complete ? "complete" : "simplified"} construction`,
    );
    $("[data-model-simplify]").setAttribute("aria-pressed", String(!complete));
    $("[data-model-simplify]").textContent = complete
      ? "ERASE THE EPICYCLE TERM ↗"
      : "RESTORE THE EARTH-MOTION TERM ↗";
    $("[data-model-equation]").textContent = complete
      ? frame === "earth"
        ? "deferent − epicycle = apparent position"
        : "Mars position − Earth position = apparent position"
      : "deferent alone ≠ the retained sky record";
    for (const button of $$<HTMLButtonElement>("[data-model-frame]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.modelFrame === frame),
      );
    const observations: Element[] = [],
      predictions: Element[] = [];
    for (let i = 0; i < 48; i++) {
      const o = orbit((i * ORBIT.recordDays) / 47);
      const observed = Math.atan2(o.relative.y, o.relative.x);
      const predicted = Math.atan2(
        o.mars.y - (complete ? o.earth.y : 0),
        o.mars.x - (complete ? o.earth.x : 0),
      );
      const p = (a: number) => ({
        x: 110 + Math.cos(a) * 68,
        y: 88 - Math.sin(a) * 60,
      });
      const a = p(observed),
        b = p(predicted);
      observations.push(svgNode("circle", { cx: a.x, cy: a.y, r: 2.5 }));
      predictions.push(
        svgNode("path", { d: `M${b.x - 3} ${b.y}h6M${b.x} ${b.y - 3}v6` }),
      );
    }
    $("[data-sky-observations]").replaceChildren(...observations);
    $("[data-sky-predictions]").replaceChildren(...predictions);
    $(".model").setAttribute("data-frame", frame);
    $(".model").classList.toggle("is-simplified", !complete);
  };
  const changeFrame = (next: string) => {
    if (authoring) return;
    frame = next;
    paint();
    signal(
      "model",
      "REFERENCE FRAME CHANGED",
      "WHAT SURVIVES THE MODEL?",
      "The machinery changes. The sky record stays.",
      complete
        ? "Both constructions retain the same directions. The match alone cannot establish their physical assumptions."
        : "The reference frame changed; the missing Earth-motion term still produces the same nonzero error.",
    );
  };
  for (const button of $$<HTMLButtonElement>("[data-model-frame]"))
    button.addEventListener("click", () =>
      changeFrame(button.dataset.modelFrame!),
    );
  $("[data-model-simplify]").addEventListener("click", () => {
    if (authoring) return;
    complete = !complete;
    paint();
    signal(
      "model",
      complete ? "OBSERVATION RETAINED" : "POSSIBILITIES DISCARDED",
      complete ? "COHERENCE CAN LIE" : "SIMPLICITY CAN HIDE MECHANISM",
      complete
        ? "A perfect fit is still a question."
        : "Less machinery. More error.",
      complete
        ? "Zero error here means agreement with the same synthetic directions, not proof that a model is physical reality."
        : `Removing Earth’s motion yields ${predictionError(false).toFixed(2)}° RMS error against the retained record. The observations did not move.`,
    );
  });
  field.addEventListener("pointerdown", (event) => {
    if (authoring || event.button !== 0) return;
    if ((event.target as Element).closest("[data-model-earth]")) {
      changeFrame("earth");
      return;
    }
    if ((event.target as Element).closest("[data-model-sun]")) {
      changeFrame("sun");
      return;
    }
    pointer = event.pointerId;
    initialX = event.clientX;
    moved = false;
    const p = pointOn(field, event, 600, 500);
    previousAngle = Math.atan2(p.y - 240, p.x - 300);
    field.setPointerCapture(pointer);
  });
  field.addEventListener("pointermove", (event) => {
    if (authoring || pointer !== event.pointerId) return;
    const p = pointOn(field, event, 600, 500);
    const a = Math.atan2(p.y - 240, p.x - 300);
    let delta = Math.atan2(
      Math.sin(a - previousAngle),
      Math.cos(a - previousAngle),
    );
    previousAngle = a;
    day = clamp(day + (delta / TAU) * ORBIT.recordDays, 0, ORBIT.recordDays);
    moved ||= Math.abs(event.clientX - initialX) > 6;
    paint();
  });
  field.addEventListener("pointerup", (event) => {
    if (pointer !== event.pointerId) return;
    pointer = null;
    if (!moved) {
      day = clamp(day + 30, 0, 780);
      paint();
    }
    signal(
      "model",
      "OBSERVATION RETAINED",
      "MODEL SUCCESS ≠ MODEL REALITY",
      "Prediction has a scope.",
      `Day ${Math.round(day)} of the illustrative record. Test an assumption by changing the construction.`,
    );
  });
  for (const type of ["pointercancel", "lostpointercapture"])
    field.addEventListener(type, () => {
      pointer = null;
    });
  field.addEventListener("keydown", (event) => {
    if (authoring) return;
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      day =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 780
            : clamp(day + (event.key === "ArrowRight" ? 10 : -10), 0, 780);
      paint();
      signal(
        "model",
        "OBSERVATION RETAINED",
        "THE MODEL IS NOT THE THING",
        "A prediction inside its assumptions.",
        `Day ${Math.round(day)} of the illustrative record.`,
      );
    }
  });
  const graduations = Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * TAU;
    const r = i % 2 === 0 ? 218 : 224;
    return svgNode("path", {
      d: `M${300 + Math.cos(a) * r} ${240 + Math.sin(a) * r}L${300 + Math.cos(a) * 230} ${240 + Math.sin(a) * 230}`,
    });
  });
  $("[data-orbit-graduations]").replaceChildren(...graduations);
  paint();
}

function scaleInstrument() {
  const field = $("[data-scale-field]");
  let level = 0,
    pointer: number | null = null;
  const history: number[] = [];
  const descriptions = [
    [
      "PARTIAL",
      "CHANGE THE SCALE",
      "A fragment. Not the whole pattern.",
      "Fast variation is visible. Longer cycles lie outside this one-second window.",
    ],
    [
      "RECURRING",
      "PATTERN ≠ CAUSE",
      "The disturbance returns.",
      "A 12-second oscillation appears. Recurrence describes the record; it does not explain a mechanism.",
    ],
    [
      "FRAME SHIFTED",
      "THE FRAME CHANGES THE EVENT",
      "A rhythm enters the frame.",
      "A daily oscillation appears while fast variations average away. Same record; another window.",
    ],
    [
      "PARTIAL",
      "SIMPLICITY CAN HIDE MECHANISM",
      "What disappeared in the average?",
      "A 28-day oscillation comes into view. Sub-second detail is now compressed into bin averages.",
    ],
    [
      "RECURRING",
      "BECOMING IS THE STATE",
      "The cycle is not the whole system.",
      "A year contains nested cycles and a small drift. Repetition and ongoing change coexist in this constructed record.",
    ],
  ];
  const durationName = (seconds: number) =>
    seconds < 60
      ? `${seconds.toFixed(1)} SECONDS`
      : seconds < 3600
        ? `${(seconds / 60).toFixed(1)} MINUTES`
        : seconds < 86400
          ? `${(seconds / 3600).toFixed(1)} HOURS`
          : `${(seconds / 86400).toFixed(1)} DAYS`;
  const paint = () => {
    const { duration, values, binSeconds } = scaleTrace(level);
    const points = values.map((v, i) => ({
      x: 35 + (i / (values.length - 1)) * 930,
      y: 290 - v * 220,
    }));
    const d = pathFrom(points);
    $("[data-scale-trace]").setAttribute("d", d);
    $("[data-scale-area]").setAttribute("d", `${d}L965 290L35 290Z`);
    $("[data-scale-handle]").setAttribute("cx", String(35 + (level / 4) * 930));
    $("[data-scale-cursor]").setAttribute("x1", String(35 + (level / 4) * 930));
    $("[data-scale-cursor]").setAttribute("x2", String(35 + (level / 4) * 930));
    const nearest = Math.round(level),
      atStop = Math.abs(level - nearest) < 0.025;
    const name = atStop ? WINDOW_NAMES[nearest] : durationName(duration);
    $("[data-scale-window]").textContent = name;
    $("[data-scale-axis]").textContent = name;
    $("[data-scale-bin]").textContent =
      `BIN WIDTH / ${binSeconds < 1 ? binSeconds.toFixed(3) + " s" : durationName(binSeconds)}`;
    field.setAttribute("aria-valuenow", level.toFixed(2));
    field.setAttribute("aria-valuetext", name);
    for (const button of $$<HTMLButtonElement>("[data-scale-stop]"))
      button.setAttribute(
        "aria-pressed",
        String(atStop && Number(button.dataset.scaleStop) === nearest),
      );
    const [state, law, line, detail] = descriptions[nearest];
    signal("scale", state, law, line, detail);
  };
  const record = () => {
    history.push(level);
    if (history.length > 24) history.shift();
    const p = history.map((v, i) => ({
      x: history.length === 1 ? 10 : 10 + (i / (history.length - 1)) * 580,
      y: 50 - (v / 4) * 42,
    }));
    $("[data-interaction-path]").setAttribute("d", pathFrom(p));
    $("[data-interaction-points]").replaceChildren(
      ...p.map((v) => svgNode("circle", { cx: v.x, cy: v.y, r: 3 })),
    );
    $("[data-interaction-note]").textContent =
      history.length < 4
        ? `${history.length} window choice${history.length === 1 ? "" : "s"} recorded in this session.`
        : `SYSTEMS TRAIN PARTICIPANTS / ${history.length} recent choices. The offered scales shape this path; it does not measure your habits.`;
  };
  const locate = (event: PointerEvent) => {
    const p = pointOn(field, event, 1000, 390);
    level = clamp(((p.x - 35) / 930) * 4, 0, 4);
    paint();
  };
  field.addEventListener("pointerdown", (event) => {
    if (authoring || event.button !== 0) return;
    pointer = event.pointerId;
    field.setPointerCapture(pointer);
    locate(event);
  });
  field.addEventListener("pointermove", (event) => {
    if (!authoring && event.pointerId === pointer) locate(event);
  });
  field.addEventListener("pointerup", (event) => {
    if (pointer !== event.pointerId) return;
    pointer = null;
    record();
  });
  for (const type of ["pointercancel", "lostpointercapture"])
    field.addEventListener(type, () => {
      pointer = null;
    });
  field.addEventListener("keydown", (event) => {
    if (authoring) return;
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      event.preventDefault();
      level =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 4
            : clamp(
                level +
                  (["ArrowRight", "ArrowUp"].includes(event.key) ? 0.2 : -0.2),
                0,
                4,
              );
      paint();
      record();
    }
  });
  for (const button of $$<HTMLButtonElement>("[data-scale-stop]"))
    button.addEventListener("click", () => {
      if (authoring) return;
      level = Number(button.dataset.scaleStop);
      paint();
      record();
    });
  paint();
}

function edgeInstrument() {
  const field = $("[data-edge-field]");
  if (!field) return;
  const img = $<HTMLImageElement>("[data-edge-image]"),
    canvas = $<HTMLCanvasElement>("[data-edge-canvas]");
  const context = canvas.getContext("2d");
  if (!context) return;
  const sample = document.createElement("canvas"),
    sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) return;
  let threshold = 0.45,
    resolution = 48,
    measure = "light",
    pointer: number | null = null,
    ready = false;
  const paint = () => {
    if (!ready) return;
    const rows = Math.round(resolution / 1.5);
    sample.width = resolution;
    sample.height = rows;
    const imageRatio = img.naturalWidth / img.naturalHeight;
    let sx = 0,
      sy = 0,
      sw = img.naturalWidth,
      sh = img.naturalHeight;
    if (imageRatio > 1.5) {
      sw = sh * 1.5;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = sw / 1.5;
      sy = (img.naturalHeight - sh) / 2;
    }
    sampleContext.drawImage(img, sx, sy, sw, sh, 0, 0, resolution, rows);
    let pixels: Uint8ClampedArray;
    try {
      pixels = sampleContext.getImageData(0, 0, resolution, rows).data;
    } catch {
      signal(
        "edge",
        "UNKNOWN",
        "ABSENCE IS DATA",
        "The pixels are not available.",
        "This source cannot be read safely by the browser. No boundary has been inferred.",
      );
      return;
    }
    const values = Array.from({ length: resolution * rows }, (_, i) => {
      const r = pixels[i * 4] / 255,
        g = pixels[i * 4 + 1] / 255,
        b = pixels[i * 4 + 2] / 255;
      return measure === "light"
        ? 0.2126 * r + 0.7152 * g + 0.0722 * b
        : (2 * g - r - b + 2) / 4;
    });
    canvas.width = 1200;
    canvas.height = 800;
    context.clearRect(0, 0, 1200, 800);
    context.strokeStyle = "#86e1f3";
    context.lineWidth = 1.5;
    context.beginPath();
    let count = 0;
    const cw = 1200 / resolution,
      ch = 800 / rows;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < resolution; x++) {
        const i = y * resolution + x,
          a = values[i] >= threshold;
        if (x < resolution - 1 && a !== values[i + 1] >= threshold) {
          context.moveTo((x + 1) * cw, y * ch);
          context.lineTo((x + 1) * cw, (y + 1) * ch);
          count++;
        }
        if (y < rows - 1 && a !== values[i + resolution] >= threshold) {
          context.moveTo(x * cw, (y + 1) * ch);
          context.lineTo((x + 1) * cw, (y + 1) * ch);
          count++;
        }
      }
    context.stroke();
    $("[data-edge-count]").textContent =
      `${count} ADJACENT SAMPLE PAIRS CROSS THE THRESHOLD`;
    $("[data-edge-threshold]").textContent =
      `THRESHOLD / ${threshold.toFixed(2)}`;
    field.setAttribute("aria-valuenow", String(Math.round(threshold * 100)));
    field.setAttribute(
      "aria-valuetext",
      `${Math.round(threshold * 100)} percent ${measure === "light" ? "weighted sRGB brightness" : "normalised green contrast"}, ${resolution} sample columns`,
    );
    if (count === 0)
      signal(
        "edge",
        "UNKNOWN",
        "ABSENCE IS DATA",
        "Nothing crossed this threshold.",
        "No contour at this setting is a measurement result, not proof that no physical boundary exists.",
      );
    else if (
      ["UNRESOLVED", "UNKNOWN"].includes(
        $("[data-edge-state]").textContent!.trim(),
      )
    )
      $("[data-edge-state]").textContent = "BOUNDARY DETECTED";
  };
  const revise = () => {
    if (!ready) {
      signal(
        "edge",
        "UNKNOWN",
        "ABSENCE IS DATA",
        "The source has not arrived.",
        "No image boundary is inferred before its pixels are available.",
      );
      return;
    }
    signal(
      "edge",
      "BOUNDARY REVISED",
      "BOUNDARIES ARE DECISIONS",
      "The photograph stays. The boundary moves.",
      `${measure === "light" ? "Weighted image brightness" : "Green-channel contrast"}, threshold ${threshold.toFixed(2)}, ${resolution} sample columns. A measurement choice, not a discovered definition of land or water.`,
    );
    paint();
  };
  const locate = (event: PointerEvent) => {
    const p = pointOn(field, event, 100, 100);
    threshold = clamp(p.x / 100, 0, 1);
    $("[data-edge-crosshair]").style.left = `${p.x}%`;
    $("[data-edge-crosshair]").style.top = `${p.y}%`;
    revise();
  };
  field.addEventListener("pointerdown", (event) => {
    if (authoring || event.button !== 0) return;
    pointer = event.pointerId;
    field.setPointerCapture(pointer);
    locate(event);
  });
  field.addEventListener("pointermove", (event) => {
    if (!authoring && pointer === event.pointerId) locate(event);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    field.addEventListener(type, () => {
      pointer = null;
    });
  field.addEventListener("keydown", (event) => {
    if (authoring) return;
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      threshold =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 1
            : clamp(
                threshold + (event.key === "ArrowRight" ? 0.02 : -0.02),
                0,
                1,
              );
      revise();
    }
  });
  for (const button of $$<HTMLButtonElement>("[data-edge-measure]"))
    button.addEventListener("click", () => {
      if (authoring) return;
      measure = button.dataset.edgeMeasure!;
      threshold = measure === "light" ? 0.45 : 0.52;
      for (const b of $$<HTMLButtonElement>("[data-edge-measure]"))
        b.setAttribute("aria-pressed", String(b === button));
      revise();
    });
  for (const button of $$<HTMLButtonElement>("[data-edge-resolution]"))
    button.addEventListener("click", () => {
      if (authoring) return;
      resolution = Number(button.dataset.edgeResolution);
      for (const b of $$<HTMLButtonElement>("[data-edge-resolution]"))
        b.setAttribute("aria-pressed", String(b === button));
      revise();
      $("[data-edge-signal]").textContent = "SIMPLICITY CAN HIDE MECHANISM";
      $("[data-edge-detail]").textContent =
        `${resolution} sample columns compress the same photograph. The fine boundaries available to the measurement change.`;
    });
  const loaded = () => {
    ready = img.naturalWidth > 0;
    paint();
  };
  img.addEventListener("load", loaded);
  img.addEventListener("error", () => {
    signal(
      "edge",
      "UNKNOWN",
      "ABSENCE IS DATA",
      "The photograph did not arrive.",
      "No image pixels were read. The Moments collection remains available through its link.",
    );
    $("[data-edge-count]").textContent = "SOURCE IMAGE UNAVAILABLE";
  });
  if (img.complete && img.naturalWidth) loaded();
}
if (root) {
  observerInstrument();
  lightInstrument();
  modelInstrument();
  scaleInstrument();
  edgeInstrument();
}
