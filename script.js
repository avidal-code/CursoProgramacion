const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutQuad(value) {
  return value < 0.5
    ? 2 * value * value
    : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function initMonitorZoom() {
  const section = document.querySelector(".zoom-hero");

  if (!section || prefersReducedMotion) {
    return;
  }

  function getViewportProfile() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width <= 390) {
      return {
        baseImageScale: 1.01,
        targetImageScale: height <= 760 ? 3.55 : 3.82,
        targetCardScale: 1.015,
        maxImageShiftY: 8,
        maxPromoShift: 24,
      };
    }

    if (width <= 430) {
      return {
        baseImageScale: 1.02,
        targetImageScale: 3.95,
        targetCardScale: 1.02,
        maxImageShiftY: 9,
        maxPromoShift: 28,
      };
    }

    if (width <= 640) {
      return {
        baseImageScale: 1.04,
        targetImageScale: 4.25,
        targetCardScale: 1.04,
        maxImageShiftY: 12,
        maxPromoShift: 36,
      };
    }

    if (width <= 900) {
      return {
        baseImageScale: 1.08,
        targetImageScale: 4.85,
        targetCardScale: 1.04,
        maxImageShiftY: 12,
        maxPromoShift: 36,
      };
    }

    return {
      baseImageScale: 1.08,
      targetImageScale: 5.65,
      targetCardScale: 1.1,
      maxImageShiftY: 12,
      maxPromoShift: 36,
    };
  }

  const initialProfile = getViewportProfile();
  const state = {
    imageScale: initialProfile.baseImageScale,
    cardScale: 1,
    imageShiftY: 0,
    blackoutOpacity: 0,
    edgeProgress: 0,
    promoOpacity: 1,
    promoShift: 0,
  };

  const target = { ...state };
  let rafId = 0;

  function applyStyles() {
    section.style.setProperty("--image-scale", state.imageScale.toFixed(3));
    section.style.setProperty("--card-scale", state.cardScale.toFixed(3));
    section.style.setProperty(
      "--image-shift-y",
      `${state.imageShiftY.toFixed(2)}px`,
    );
    section.style.setProperty(
      "--blackout-opacity",
      state.blackoutOpacity.toFixed(3),
    );
    section.style.setProperty("--edge-progress", state.edgeProgress.toFixed(3));
    section.style.setProperty("--promo-opacity", state.promoOpacity.toFixed(3));
    section.style.setProperty("--promo-shift", `${state.promoShift.toFixed(2)}px`);
  }

  function updateTargets() {
    const rect = section.getBoundingClientRect();
    const scrollableDistance = rect.height - window.innerHeight;
    const viewportProfile = getViewportProfile();
    const progress =
      scrollableDistance > 0
        ? clamp(-rect.top / scrollableDistance, 0, 1)
        : 0.5;

    const zoomProgress = easeOutCubic(clamp(progress / 0.82, 0, 1));
    const blackoutProgress = easeInOutQuad(
      clamp((progress - 0.72) / 0.28, 0, 1),
    );
    const promoFadeProgress = easeInOutQuad(
      clamp((progress - 0.08) / 0.26, 0, 1),
    );

    target.imageScale = lerp(
      viewportProfile.baseImageScale,
      viewportProfile.targetImageScale,
      zoomProgress,
    );
    target.cardScale = lerp(
      1,
      viewportProfile.targetCardScale,
      easeOutCubic(clamp(progress / 0.74, 0, 1)),
    );
    target.imageShiftY = lerp(
      0,
      viewportProfile.maxImageShiftY,
      clamp(progress / 0.6, 0, 1),
    );
    target.blackoutOpacity = blackoutProgress;
    target.edgeProgress = blackoutProgress;
    target.promoOpacity = 1 - promoFadeProgress;
    target.promoShift = lerp(
      0,
      -viewportProfile.maxPromoShift,
      promoFadeProgress,
    );
  }

  function render() {
    state.imageScale += (target.imageScale - state.imageScale) * 0.12;
    state.cardScale += (target.cardScale - state.cardScale) * 0.12;
    state.imageShiftY += (target.imageShiftY - state.imageShiftY) * 0.12;
    state.blackoutOpacity +=
      (target.blackoutOpacity - state.blackoutOpacity) * 0.12;
    state.edgeProgress += (target.edgeProgress - state.edgeProgress) * 0.12;
    state.promoOpacity += (target.promoOpacity - state.promoOpacity) * 0.12;
    state.promoShift += (target.promoShift - state.promoShift) * 0.12;

    applyStyles();

    if (
      Math.abs(target.imageScale - state.imageScale) > 0.002 ||
      Math.abs(target.cardScale - state.cardScale) > 0.002 ||
      Math.abs(target.imageShiftY - state.imageShiftY) > 0.1 ||
      Math.abs(target.blackoutOpacity - state.blackoutOpacity) > 0.002 ||
      Math.abs(target.edgeProgress - state.edgeProgress) > 0.002 ||
      Math.abs(target.promoOpacity - state.promoOpacity) > 0.002 ||
      Math.abs(target.promoShift - state.promoShift) > 0.1
    ) {
      rafId = window.requestAnimationFrame(render);
      return;
    }

    rafId = 0;
  }

  function requestRender() {
    updateTargets();

    if (!rafId) {
      rafId = window.requestAnimationFrame(render);
    }
  }

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender);

  requestRender();
}

initMonitorZoom();
