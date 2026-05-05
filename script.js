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

function setStatus(node, message, type = "") {
  node.textContent = message;
  node.classList.remove("is-success", "is-error");

  if (type) {
    node.classList.add(`is-${type}`);
  }
}

let stripeClientPromise;

async function getStripeClient() {
  if (stripeClientPromise) {
    return stripeClientPromise;
  }

  stripeClientPromise = (async () => {
    if (typeof window.Stripe === "undefined") {
      throw new Error("Stripe.js no se ha cargado correctamente.");
    }

    let response;

    try {
      response = await fetch("/api/config");
    } catch (_error) {
      throw new Error(
        "No se ha podido conectar con el servidor. Arranca npm start antes de abrir la landing.",
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.publishableKey) {
      throw new Error(
        data.error ||
          "Falta configurar STRIPE_PUBLISHABLE_KEY en el servidor para abrir la pasarela.",
      );
    }

    return window.Stripe(data.publishableKey);
  })();

  return stripeClientPromise;
}

function initCheckout() {
  const planCards = document.querySelectorAll("[data-plan-id]");
  const selectButtons = document.querySelectorAll("[data-select-plan]");
  const checkoutSection = document.getElementById("checkout");
  const planSelect = document.getElementById("checkout-plan-select");
  const planName = document.getElementById("checkout-plan-name");
  const planPrice = document.getElementById("checkout-plan-price");
  const planNote = document.getElementById("checkout-plan-note");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutStatus = document.getElementById("checkout-status");
  const submitButton = document.getElementById("checkout-submit");
  const nameInput = checkoutForm?.elements.namedItem("name");
  const emailInput = checkoutForm?.elements.namedItem("email");

  if (
    !planCards.length ||
    !checkoutSection ||
    !planSelect ||
    !planName ||
    !planPrice ||
    !planNote ||
    !checkoutForm ||
    !checkoutStatus ||
    !submitButton ||
    !(nameInput instanceof HTMLInputElement) ||
    !(emailInput instanceof HTMLInputElement)
  ) {
    return;
  }

  const plans = new Map();

  planCards.forEach((card) => {
    const id = card.getAttribute("data-plan-id");
    const name = card.getAttribute("data-plan-name");
    const price = card.getAttribute("data-plan-price");
    const note = card.getAttribute("data-plan-note");

    if (!id || !name || !price || !note) {
      return;
    }

    plans.set(id, { name, price, note });
  });

  function updateCheckout(planId) {
    const plan = plans.get(planId);

    if (!plan) {
      return;
    }

    planSelect.value = planId;
    planName.textContent = plan.name;
    planPrice.textContent = plan.price;
    planNote.textContent = plan.note;

    planCards.forEach((card) => {
      card.classList.toggle(
        "price-card--selected",
        card.getAttribute("data-plan-id") === planId,
      );
    });

    setStatus(checkoutStatus, "");
  }

  function scrollToCheckout() {
    checkoutSection.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  planSelect.addEventListener("change", () => {
    updateCheckout(planSelect.value);
  });

  selectButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const planId = button.getAttribute("data-select-plan");

      if (!planId) {
        return;
      }

      updateCheckout(planId);
      scrollToCheckout();
    });
  });

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!checkoutForm.reportValidity()) {
      return;
    }

    submitButton.disabled = true;
    setStatus(checkoutStatus, "Preparando la pasarela segura de Stripe...");

    try {
      const stripe = await getStripeClient();
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: planSelect.value,
          customerName: nameInput.value.trim(),
          customerEmail: emailInput.value.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.sessionId) {
        throw new Error(
          data.error ||
            "No se ha podido crear la sesion de suscripcion. Revisa la configuracion de Stripe.",
        );
      }

      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (result.error) {
        throw result.error;
      }
    } catch (error) {
      setStatus(
        checkoutStatus,
        error instanceof Error
          ? error.message
          : "No se ha podido abrir Stripe Checkout.",
        "error",
      );
      submitButton.disabled = false;
      return;
    }
  });

  updateCheckout(planSelect.value);
}

async function initResultPage() {
  const page = document.querySelector("[data-result-page]");

  if (!page) {
    return;
  }

  const type = page.getAttribute("data-result-page");

  if (type !== "success") {
    return;
  }

  const statusNode = document.getElementById("result-status");
  const planNode = document.getElementById("result-plan");
  const amountNode = document.getElementById("result-amount");
  const emailNode = document.getElementById("result-email");
  const subscriptionNode = document.getElementById("result-subscription");
  const subscriptionStatusNode = document.getElementById(
    "result-subscription-status",
  );
  const renewalNode = document.getElementById("result-renewal");

  if (
    !statusNode ||
    !planNode ||
    !amountNode ||
    !emailNode ||
    !subscriptionNode ||
    !subscriptionStatusNode ||
    !renewalNode
  ) {
    return;
  }

  function getSubscriptionStatusLabel(status) {
    switch (status) {
      case "active":
        return "Activa";
      case "trialing":
        return "En prueba";
      case "past_due":
        return "Pago pendiente";
      case "canceled":
        return "Cancelada";
      case "incomplete":
        return "Incompleta";
      case "incomplete_expired":
        return "Expirada";
      case "unpaid":
        return "Impagada";
      case "paused":
        return "Pausada";
      default:
        return status || "Pendiente de confirmacion";
    }
  }

  const sessionId = new URLSearchParams(window.location.search).get("session_id");

  if (!sessionId) {
    statusNode.textContent =
      "Suscripcion confirmada, pero falta el identificador de la sesion para cargar el detalle.";
    return;
  }

  statusNode.textContent = "Verificando la suscripcion con Stripe...";

  try {
    const response = await fetch(
      `/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`,
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || "No se ha podido recuperar la informacion de la sesion.",
      );
    }

    planNode.textContent = data.planName || "Plan reservado";
    amountNode.textContent = data.amountTotal || "Importe confirmado";
    emailNode.textContent = data.customerEmail || "Pendiente de confirmacion";
    subscriptionNode.textContent =
      data.subscriptionId || "Pendiente de asignacion en Stripe";
    subscriptionStatusNode.textContent = getSubscriptionStatusLabel(
      data.subscriptionStatus,
    );
    renewalNode.textContent =
      data.subscriptionCurrentPeriodEnd || "Pendiente de confirmacion";
    statusNode.textContent =
      data.subscriptionStatus === "active" || data.subscriptionStatus === "trialing"
        ? "Suscripcion activada correctamente. Ya puedes continuar con el acceso al curso."
        : "El checkout se ha completado, pero Stripe sigue confirmando el estado final de la suscripcion.";
  } catch (error) {
    statusNode.textContent =
      error instanceof Error
        ? error.message
        : "No se ha podido verificar la sesion de suscripcion.";
  }
}

initMonitorZoom();
initCheckout();
initResultPage();
