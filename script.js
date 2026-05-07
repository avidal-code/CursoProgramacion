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

const AUTH_TOKEN_KEY = "cursoProgramacionAuthToken";
const PLAN_NAMES = {
  base: "Plan Base",
  pro: "Plan Pro",
  mentoria: "Plan Mentoria",
};
const PLAN_RESERVATION_RULES = {
  base: {
    allowedClassTypes: [],
    weeklyLimit: 0,
  },
  pro: {
    allowedClassTypes: ["Clase en directo", "Revision de proyecto"],
    weeklyLimit: 2,
  },
  mentoria: {
    allowedClassTypes: [
      "Clase en directo",
      "Revision de proyecto",
      "Mentoria individual",
    ],
    weeklyLimit: 3,
  },
};

function refreshHeaderAuthActions() {
  const isLoggedIn = Boolean(getAuthToken());

  document.querySelectorAll("[data-auth-action]").forEach((authAction) => {
    authAction.textContent = isLoggedIn ? "Cerrar sesion" : "Iniciar sesion";
    authAction.setAttribute("href", "/login.html");
  });

  document.querySelectorAll("[data-auth-hide]").forEach((link) => {
    link.hidden = isLoggedIn;
  });

  document.querySelectorAll("[data-auth-reservation]").forEach((link) => {
    link.hidden = !isLoggedIn;
  });
}

function saveAuthToken(token) {
  if (typeof token === "string" && token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    refreshHeaderAuthActions();
    window.dispatchEvent(new CustomEvent("auth-token-change"));
  }
}

function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  refreshHeaderAuthActions();
  window.dispatchEvent(new CustomEvent("auth-token-change"));
}

function renderReservations(node, reservations = []) {
  if (!node) {
    return;
  }

  if (!reservations.length) {
    node.innerHTML = "";
    return;
  }

  node.innerHTML = reservations
    .map(
      (reservation) => `
        <div class="reservation-list__item">
          <div>
            <strong>${reservation.classType}</strong>
            <span>${reservation.classDate}</span>
            <span>${reservation.status}</span>
          </div>
          ${
            reservation.status === "anulada"
              ? ""
              : `<button class="reservation-list__cancel" type="button" data-cancel-reservation="${reservation.id}">Anular clase</button>`
          }
        </div>
      `,
    )
    .join("");
}

function configureClassTypeSelect(select, planId) {
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const rules = PLAN_RESERVATION_RULES[planId] || PLAN_RESERVATION_RULES.base;

  Array.from(select.options).forEach((option) => {
    option.hidden = !rules.allowedClassTypes.includes(option.value);
    option.disabled = !rules.allowedClassTypes.includes(option.value);
  });

  const firstAllowedOption = Array.from(select.options).find(
    (option) => !option.disabled,
  );

  if (firstAllowedOption) {
    select.value = firstAllowedOption.value;
    select.disabled = false;
    return;
  }

  select.value = "";
  select.disabled = true;
}

function getWeekStart(date) {
  const start = new Date(date);
  const day = start.getDay() || 7;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1);

  return start;
}

function countReservationsInSameWeek(reservations, classDate) {
  const targetDate = new Date(classDate);

  if (Number.isNaN(targetDate.getTime())) {
    return 0;
  }

  const weekStart = getWeekStart(targetDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return reservations.filter((reservation) => {
    if (reservation.status === "anulada") {
      return false;
    }

    const reservationDate = new Date(reservation.classDate);

    return (
      !Number.isNaN(reservationDate.getTime()) &&
      reservationDate >= weekStart &&
      reservationDate < weekEnd
    );
  }).length;
}

function getReservationValidationError(planId, reservations, classType, classDate) {
  const rules = PLAN_RESERVATION_RULES[planId] || PLAN_RESERVATION_RULES.base;

  if (!rules.allowedClassTypes.length) {
    return "Tu plan actual no incluye reservas de clases. Cambia de plan para reservar.";
  }

  if (!rules.allowedClassTypes.includes(classType)) {
    return `Tu plan no permite reservar "${classType}".`;
  }

  if (countReservationsInSameWeek(reservations, classDate) >= rules.weeklyLimit) {
    return `Has alcanzado el limite de ${rules.weeklyLimit} reservas por semana de tu plan.`;
  }

  return "";
}

function initHeaderAuthAction() {
  const authActions = document.querySelectorAll("[data-auth-action]");

  if (!authActions.length) {
    return;
  }

  authActions.forEach((authAction) => {
    authAction.addEventListener("click", (event) => {
      if (!getAuthToken()) {
        return;
      }

      event.preventDefault();
      clearAuthToken();
      window.location.href = "/login.html";
    });
  });

  refreshHeaderAuthActions();
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
  const checkoutEyebrow = checkoutSection?.querySelector("[data-checkout-eyebrow]");
  const checkoutTitle = checkoutSection?.querySelector("[data-checkout-title]");
  const checkoutCopy = checkoutSection?.querySelector("[data-checkout-copy]");
  const checkoutFeatures = checkoutSection?.querySelector("[data-checkout-features]");
  const checkoutMethods = checkoutSection?.querySelector("[data-checkout-methods]");
  const planSelect = document.getElementById("checkout-plan-select");
  const planName = document.getElementById("checkout-plan-name");
  const planPrice = document.getElementById("checkout-plan-price");
  const planNote = document.getElementById("checkout-plan-note");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutStatus = document.getElementById("checkout-status");
  const submitButton = document.getElementById("checkout-submit");
  const paymentFields = checkoutForm?.querySelector("[data-payment-fields]");
  const paymentFooter = checkoutForm?.querySelector("[data-payment-footer]");
  const reservationCta = checkoutForm?.querySelector("[data-reservation-cta]");
  const nameInput = checkoutForm?.elements.namedItem("name");
  const emailInput = checkoutForm?.elements.namedItem("email");
  const passwordInput = checkoutForm?.elements.namedItem("password");

  if (
    !planCards.length ||
    !checkoutSection ||
    !checkoutEyebrow ||
    !checkoutTitle ||
    !checkoutCopy ||
    !checkoutFeatures ||
    !checkoutMethods ||
    !planSelect ||
    !planName ||
    !planPrice ||
    !planNote ||
    !checkoutForm ||
    !checkoutStatus ||
    !submitButton ||
    !(paymentFields instanceof HTMLElement) ||
    !(paymentFooter instanceof HTMLElement) ||
    !(reservationCta instanceof HTMLElement) ||
    !(nameInput instanceof HTMLInputElement) ||
    !(emailInput instanceof HTMLInputElement) ||
    !(passwordInput instanceof HTMLInputElement)
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

  function setPaymentFieldsDisabled(disabled) {
    paymentFields.querySelectorAll("input, select, textarea").forEach((field) => {
      field.disabled = disabled;
    });
  }

  function refreshHomeCheckoutMode() {
    const isLoggedIn = Boolean(getAuthToken());

    paymentFields.hidden = isLoggedIn;
    paymentFooter.hidden = isLoggedIn;
    reservationCta.hidden = !isLoggedIn;
    setPaymentFieldsDisabled(isLoggedIn);

    if (isLoggedIn) {
      checkoutSection.setAttribute("aria-label", "Reserva de curso");
      checkoutEyebrow.textContent = "Reserva De Curso";
      checkoutTitle.textContent = "Realiza tu proxima reserva.";
      checkoutCopy.textContent =
        "Tu cuenta esta activa. Accede a tu area de usuario para elegir fecha, clase y notas.";
      checkoutFeatures.innerHTML =
        "<span>Reserva directa</span><span>Confirmacion por correo</span><span>Gestion desde tu area</span>";
      checkoutMethods.setAttribute("aria-label", "Reserva de curso");
      checkoutMethods.innerHTML =
        "<span>Curso online</span><span>Sesion programada</span><span>Sin Stripe</span>";
      setStatus(checkoutStatus, "");
      return;
    }

    checkoutSection.setAttribute("aria-label", "Pasarela de pago");
    checkoutEyebrow.textContent = "Pasarela De Pago";
    checkoutTitle.textContent = "Completa tu inscripcion en menos de un minuto.";
    checkoutCopy.textContent =
      "Selecciona tu plan, revisa el resumen y activa la suscripcion desde este checkout visual preparado para cada modalidad del curso.";
    checkoutFeatures.innerHTML =
      "<span>Pago seguro</span><span>Confirmacion inmediata</span><span>Acceso al curso tras el pago</span>";
    checkoutMethods.setAttribute("aria-label", "Metodos de pago");
    checkoutMethods.innerHTML =
      "<span>Visa</span><span>Mastercard</span><span>Stripe Checkout</span>";
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

  window.addEventListener("auth-token-change", refreshHomeCheckoutMode);

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

    const authToken = getAuthToken();

    if (authToken) {
      setStatus(
        checkoutStatus,
        "Ya tienes la sesion iniciada. Cierra sesion primero para ir a Stripe.",
        "error",
      );
      return;
    }

    if (!checkoutForm.reportValidity()) {
      return;
    }

    submitButton.disabled = true;

    try {
      const stripe = await getStripeClient();
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          planId: planSelect.value,
          customerName: nameInput.value.trim(),
          customerEmail: emailInput.value.trim(),
          accountPassword: passwordInput.value,
          authToken,
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
  refreshHomeCheckoutMode();
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
  const bookingPanel = document.getElementById("booking-panel");
  const bookingUser = document.getElementById("booking-user");
  const bookingForm = document.getElementById("booking-form");
  const bookingStatus = document.getElementById("booking-status");

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
  let checkoutUser = null;
  let checkoutReservations = [];

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
        ? "Suscripcion activada correctamente. Tu usuario ya esta listo."
        : "El checkout se ha completado, pero Stripe sigue confirmando el estado final de la suscripcion.";

    if (data.authToken) {
      saveAuthToken(data.authToken);
    }

    if (data.userCreated && bookingPanel && bookingUser) {
      checkoutUser = data.user;
      const rules =
        PLAN_RESERVATION_RULES[data.user?.planId] || PLAN_RESERVATION_RULES.base;
      const bookingSubmit = bookingForm?.querySelector(".checkout-form__submit");

      bookingPanel.hidden = false;
      bookingUser.textContent = `Sesion iniciada como ${data.user?.email || data.customerEmail}.`;
      configureClassTypeSelect(
        bookingForm?.elements.namedItem("classType"),
        data.user?.planId,
      );
      if (bookingSubmit instanceof HTMLButtonElement) {
        bookingSubmit.disabled = !rules.allowedClassTypes.length;
      }
      setStatus(
        bookingStatus,
        rules.weeklyLimit
          ? `Tu plan permite ${rules.weeklyLimit} reservas por semana.`
          : "Tu plan actual no incluye reservas de clases.",
        rules.weeklyLimit ? "" : "error",
      );
    }
  } catch (error) {
    statusNode.textContent =
      error instanceof Error
        ? error.message
        : "No se ha podido verificar la sesion de suscripcion.";
  }

  if (bookingForm && bookingStatus) {
    bookingForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!bookingForm.reportValidity()) {
        return;
      }

      const formData = new FormData(bookingForm);
      const validationError = getReservationValidationError(
        checkoutUser?.planId,
        checkoutReservations,
        String(formData.get("classType") || ""),
        String(formData.get("classDate") || ""),
      );

      if (validationError) {
        setStatus(bookingStatus, validationError, "error");
        return;
      }

      setStatus(bookingStatus, "Guardando la reserva...");

      try {
        const response = await fetch("/api/reservations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            authToken: getAuthToken(),
            classType: formData.get("classType"),
            classDate: formData.get("classDate"),
            notes: formData.get("notes"),
          }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "No se ha podido guardar la reserva.");
        }

        setStatus(
          bookingStatus,
          data.email?.sent
            ? `Reserva confirmada para ${data.reservation.classDate}. Te hemos enviado un correo.`
            : `Reserva confirmada para ${data.reservation.classDate}. No se pudo enviar el correo: ${data.email?.reason || "revisa la configuracion de EmailJS"}.`,
          "success",
        );
        bookingForm.reset();
        checkoutReservations = [...checkoutReservations, data.reservation];
      } catch (error) {
        setStatus(
          bookingStatus,
          error instanceof Error ? error.message : "No se ha podido reservar.",
          "error",
        );
      }
    });
  }
}

async function initLoginPage() {
  const loginCard = document.getElementById("login-card");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const accountPanel = document.getElementById("account-panel");
  const accountUser = document.getElementById("account-user");
  const bookingForm = document.getElementById("account-booking-form");
  const bookingStatus = document.getElementById("account-booking-status");
  const reservationList = document.getElementById("reservation-list");
  const logoutButton = document.getElementById("logout-button");
  const planPanel = document.getElementById("plan-panel");
  const currentPlan = document.getElementById("current-plan");
  const changePlanForm = document.getElementById("change-plan-form");
  const changePlanStatus = document.getElementById("change-plan-status");

  if (
    !loginCard ||
    !loginForm ||
    !loginStatus ||
    !accountPanel ||
    !accountUser ||
    !bookingForm ||
    !bookingStatus ||
    !planPanel ||
    !currentPlan ||
    !changePlanForm ||
    !changePlanStatus
  ) {
    return;
  }

  let activeUser = null;
  let accountReservations = [];

  function updateChangePlanOptions(planId) {
    const planSelect = changePlanForm.elements.namedItem("planId");

    if (!(planSelect instanceof HTMLSelectElement)) {
      return;
    }

    Array.from(planSelect.options).forEach((option) => {
      option.disabled = option.value === planId;
    });

    const nextPlan = Array.from(planSelect.options).find(
      (option) => option.value !== planId,
    );

    if (nextPlan) {
      planSelect.value = nextPlan.value;
    }
  }

  function showAccount(user, reservations = []) {
    const rules = PLAN_RESERVATION_RULES[user.planId] || PLAN_RESERVATION_RULES.base;
    const classTypeSelect = bookingForm.elements.namedItem("classType");
    const submitButton = bookingForm.querySelector(".checkout-form__submit");

    activeUser = user;
    accountReservations = reservations;
    loginCard.hidden = true;
    accountPanel.hidden = false;
    planPanel.hidden = false;
    accountUser.textContent = `Sesion iniciada como ${user.email}.`;
    currentPlan.textContent = `Plan actual: ${PLAN_NAMES[user.planId] || user.planId || "Pendiente"}.`;
    configureClassTypeSelect(classTypeSelect, user.planId);
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = !rules.allowedClassTypes.length;
    }
    setStatus(
      bookingStatus,
      rules.weeklyLimit
        ? `Tu plan permite ${rules.weeklyLimit} reservas por semana.`
        : "Tu plan actual no incluye reservas de clases.",
      rules.weeklyLimit ? "" : "error",
    );
    updateChangePlanOptions(user.planId);
    renderReservations(reservationList, reservations);
  }

  function showLogin(message = "") {
    activeUser = null;
    accountReservations = [];
    loginCard.hidden = false;
    accountPanel.hidden = true;
    planPanel.hidden = true;
    setStatus(loginStatus, message);
    setStatus(changePlanStatus, "");
  }

  async function loadCurrentSession() {
    const token = getAuthToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch("/api/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        clearAuthToken();
        return;
      }

      showAccount(data.user, data.reservations);
    } catch (_error) {
      clearAuthToken();
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!loginForm.reportValidity()) {
      return;
    }

    const formData = new FormData(loginForm);
    setStatus(loginStatus, "Comprobando cuenta...");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.token) {
        throw new Error(data.error || "No se ha podido iniciar sesion.");
      }

      saveAuthToken(data.token);
      loginForm.reset();
      showAccount(data.user, data.reservations);
    } catch (error) {
      setStatus(
        loginStatus,
        error instanceof Error ? error.message : "No se ha podido iniciar sesion.",
        "error",
      );
    }
  });

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) {
      return;
    }

    const rules =
      PLAN_RESERVATION_RULES[activeUser?.planId] || PLAN_RESERVATION_RULES.base;

    if (!rules.allowedClassTypes.length) {
      setStatus(
        bookingStatus,
        "Tu plan actual no incluye reservas de clases. Cambia de plan para reservar.",
        "error",
      );
      return;
    }

    const token = getAuthToken();
    const formData = new FormData(bookingForm);
    const validationError = getReservationValidationError(
      activeUser?.planId,
      accountReservations,
      String(formData.get("classType") || ""),
      String(formData.get("classDate") || ""),
    );

    if (validationError) {
      setStatus(bookingStatus, validationError, "error");
      return;
    }

    setStatus(bookingStatus, "Guardando la reserva...");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classType: formData.get("classType"),
          classDate: formData.get("classDate"),
          notes: formData.get("notes"),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "No se ha podido guardar la reserva.");
      }

      setStatus(
        bookingStatus,
        data.email?.sent
          ? `Reserva confirmada para ${data.reservation.classDate}. Te hemos enviado un correo.`
          : `Reserva confirmada para ${data.reservation.classDate}. No se pudo enviar el correo: ${data.email?.reason || "revisa la configuracion de EmailJS"}.`,
        "success",
      );
      bookingForm.reset();
      accountReservations = data.reservations;
      renderReservations(reservationList, data.reservations);
    } catch (error) {
      setStatus(
        bookingStatus,
        error instanceof Error ? error.message : "No se ha podido reservar.",
        "error",
      );
    }
  });

  changePlanForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!changePlanForm.reportValidity()) {
      return;
    }

    const token = getAuthToken();
    const formData = new FormData(changePlanForm);
    const planId = formData.get("planId");

    if (!token || typeof planId !== "string") {
      setStatus(changePlanStatus, "Inicia sesion para cambiar de plan.", "error");
      return;
    }

    if (activeUser?.planId === planId) {
      setStatus(changePlanStatus, "Ya tienes ese plan activo.", "error");
      return;
    }

    setStatus(changePlanStatus, "Cancelando el plan actual y preparando Stripe...");

    try {
      const stripe = await getStripeClient();
      const response = await fetch("/api/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.sessionId) {
        throw new Error(data.error || "No se ha podido preparar el cambio de plan.");
      }

      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (result.error) {
        throw result.error;
      }
    } catch (error) {
      setStatus(
        changePlanStatus,
        error instanceof Error
          ? error.message
          : "No se ha podido cambiar de plan.",
        "error",
      );
    }
  });

  reservationList?.addEventListener("click", async (event) => {
    const cancelButton = event.target.closest("[data-cancel-reservation]");

    if (!(cancelButton instanceof HTMLButtonElement)) {
      return;
    }

    const reservationId = cancelButton.getAttribute("data-cancel-reservation");
    const token = getAuthToken();

    if (!reservationId || !token) {
      return;
    }

    cancelButton.disabled = true;
    cancelButton.textContent = "Anulando...";
    setStatus(bookingStatus, "Anulando la clase...");

    try {
      const response = await fetch(
        `/api/reservations/${encodeURIComponent(reservationId)}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "No se ha podido anular la clase.");
      }

      setStatus(
        bookingStatus,
        data.email?.sent
          ? "Clase anulada correctamente. Te hemos enviado un correo de anulación."
          : `Clase anulada correctamente. No se pudo enviar el correo: ${
              data.email?.reason || "revisa la configuración de EmailJS"
            }.`,
        "success",
      );
      renderReservations(reservationList, data.reservations);
      accountReservations = data.reservations;
    } catch (error) {
      setStatus(
        bookingStatus,
        error instanceof Error ? error.message : "No se ha podido anular.",
        "error",
      );
      cancelButton.disabled = false;
      cancelButton.textContent = "Anular clase";
    }
  });

  logoutButton?.addEventListener("click", () => {
    clearAuthToken();
    showLogin("Sesion cerrada.");
  });

  await loadCurrentSession();
}

initMonitorZoom();
initHeaderAuthAction();
initCheckout();
initResultPage();
initLoginPage();
