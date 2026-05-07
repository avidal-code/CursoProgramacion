const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");
const express = require("express");
const dotenv = require("dotenv");
const Stripe = require("stripe");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const DATA_DIR = path.join(__dirname, "data");
const DATABASE_PATH = path.join(DATA_DIR, "users.json");

const PLAN_CATALOG = {
  base: {
    name: "Plan Base",
    description: "12 clases grabadas, ejercicios guiados y proyecto final base.",
    amount: 29000,
    billingInterval: "month",
    billingIntervalCount: 6,
  },
  pro: {
    name: "Plan Pro",
    description: "Clases en directo, correccion del proyecto final y feedback semanal.",
    amount: 49000,
    billingInterval: "year",
    billingIntervalCount: 1,
  },
  mentoria: {
    name: "Plan Mentoria",
    description: "Seguimiento individual, portfolio y ayuda para publicar el proyecto final.",
    amount: 79000,
    billingInterval: "year",
    billingIntervalCount: 1,
  },
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

function formatSubscriptionDate(unixTimestamp) {
  if (typeof unixTimestamp !== "number") {
    return null;
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
  }).format(new Date(unixTimestamp * 1000));
}

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const stripe = getStripeClient();

async function readDatabase() {
  try {
    const rawDatabase = await fs.readFile(DATABASE_PATH, "utf8");
    const database = JSON.parse(rawDatabase);

    return {
      users: Array.isArray(database.users) ? database.users : [],
      pendingSignups:
        database.pendingSignups && typeof database.pendingSignups === "object"
          ? database.pendingSignups
          : {},
      reservations: Array.isArray(database.reservations)
        ? database.reservations
        : [],
      sessions:
        database.sessions && typeof database.sessions === "object"
          ? database.sessions
          : {},
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        users: [],
        pendingSignups: {},
        reservations: [],
        sessions: {},
      };
    }

    throw error;
  }
}

async function writeDatabase(database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    DATABASE_PATH,
    `${JSON.stringify(database, null, 2)}\n`,
    "utf8",
  );
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPasswordHash) {
  if (typeof storedPasswordHash !== "string" || !storedPasswordHash.includes(":")) {
    return false;
  }

  const [salt, originalHash] = storedPasswordHash.split(":");
  const candidateHash = hashPassword(password, salt).split(":")[1];

  return crypto.timingSafeEqual(
    Buffer.from(candidateHash, "hex"),
    Buffer.from(originalHash, "hex"),
  );
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    planId: user.planId,
    subscriptionStatus: user.subscriptionStatus,
  };
}

function createAuthSession(database, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  database.sessions[token] = {
    userId,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  return token;
}

function getAuthenticatedUser(database, token) {
  if (typeof token !== "string" || !token.trim()) {
    return null;
  }

  const session = database.sessions[token.trim()];

  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return database.users.find((user) => user.id === session.userId) || null;
}

function getAuthTokenFromRequest(request) {
  const authorization = request.headers.authorization;

  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return request.body?.authToken || request.query?.authToken || null;
}

function getWeekRange(date) {
  const start = new Date(date);
  const day = start.getDay() || 7;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

function countUserReservationsInWeek(reservations, userId, classDate) {
  const reservationDate = new Date(classDate);

  if (Number.isNaN(reservationDate.getTime())) {
    return 0;
  }

  const { start, end } = getWeekRange(reservationDate);

  return reservations.filter((reservation) => {
    if (reservation.userId !== userId || reservation.status === "anulada") {
      return false;
    }

    const candidateDate = new Date(reservation.classDate);

    return (
      !Number.isNaN(candidateDate.getTime()) &&
      candidateDate >= start &&
      candidateDate < end
    );
  }).length;
}

function validateReservationForPlan(user, reservations, classType, classDate) {
  const rules = PLAN_RESERVATION_RULES[user.planId] || PLAN_RESERVATION_RULES.base;

  if (!rules.allowedClassTypes.length) {
    return `Tu ${PLAN_CATALOG[user.planId]?.name || "plan"} no incluye reservas de clases. Cambia de plan para reservar.`;
  }

  if (!rules.allowedClassTypes.includes(classType)) {
    return `Tu ${PLAN_CATALOG[user.planId]?.name || "plan"} no permite reservar "${classType}".`;
  }

  const weeklyReservations = countUserReservationsInWeek(
    reservations,
    user.id,
    classDate,
  );

  if (weeklyReservations >= rules.weeklyLimit) {
    return `Has alcanzado el limite de ${rules.weeklyLimit} reservas por semana de tu plan.`;
  }

  return null;
}

function isSubscriptionReady(session, subscription) {
  return (
    session.payment_status === "paid" &&
    (subscription?.status === "active" || subscription?.status === "trialing")
  );
}

async function createOrActivateUserFromSession(session, subscription) {
  if (!isSubscriptionReady(session, subscription)) {
    return null;
  }

  const database = await readDatabase();
  const sessionId = session.id;
  const pendingSignup = database.pendingSignups[sessionId];
  const email = normalizeEmail(
    session.customer_details?.email ||
      session.customer_email ||
      pendingSignup?.email ||
      session.metadata?.customerEmail,
  );

  if (!email) {
    return null;
  }

  const existingUser = database.users.find((user) => user.email === email);
  const now = new Date().toISOString();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id || null;

  if (existingUser) {
    existingUser.name =
      pendingSignup?.name || session.metadata?.customerName || existingUser.name;
    existingUser.planId =
      pendingSignup?.planId || session.metadata?.planId || existingUser.planId;
    existingUser.stripeCustomerId =
      typeof session.customer === "string" ? session.customer : existingUser.stripeCustomerId;
    existingUser.subscriptionId = subscriptionId || existingUser.subscriptionId;
    existingUser.subscriptionStatus = subscription.status;
    existingUser.updatedAt = now;
    delete database.pendingSignups[sessionId];
    await writeDatabase(database);
    return existingUser;
  }

  if (!pendingSignup) {
    return null;
  }

  const user = {
    id: crypto.randomUUID(),
    name: pendingSignup.name,
    email,
    passwordHash: pendingSignup.passwordHash,
    planId: pendingSignup.planId,
    stripeCheckoutSessionId: sessionId,
    stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
    subscriptionId,
    subscriptionStatus: subscription.status,
    createdAt: now,
    updatedAt: now,
  };

  database.users.push(user);
  delete database.pendingSignups[sessionId];
  await writeDatabase(database);
  return user;
}

app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    if (!stripe) {
      response.status(500).json({
        error:
          "Falta STRIPE_SECRET_KEY. No se puede validar el webhook de Stripe.",
      });
      return;
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      response.status(500).json({
        error:
          "Falta STRIPE_WEBHOOK_SECRET. Configura el secreto del webhook para confirmar pagos.",
      });
      return;
    }

    const signature = request.headers["stripe-signature"];

    if (!signature) {
      response.status(400).json({
        error: "Falta la firma Stripe-Signature en la peticion.",
      });
      return;
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      response.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido validar el webhook.",
      });
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          let subscription = null;
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id || null;

          if (subscriptionId) {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
          }

          await createOrActivateUserFromSession(session, subscription);

          console.log("Checkout de suscripcion completado:", {
            sessionId: session.id,
            customerEmail:
              session.customer_details?.email || session.customer_email,
            planId: session.metadata?.planId,
            subscriptionId,
          });
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object;
          console.log("Factura de suscripcion pagada:", {
            subscriptionId: invoice.subscription || null,
            customerEmail: invoice.customer_email || null,
          });
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          console.log(`Cambio de suscripcion detectado: ${event.type}`, {
            subscriptionId: subscription.id,
            status: subscription.status,
            customerId: subscription.customer,
          });
          break;
        }
        case "checkout.session.expired":
          console.log("Sesion de checkout expirada:", event.data.object.id);
          break;
        default:
          console.log(`Webhook recibido: ${event.type}`);
      }
    } catch (error) {
      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido procesar el webhook.",
      });
      return;
    }

    response.json({ received: true });
  },
);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/api/config", (_request, response) => {
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    response.status(500).json({
      error:
        "Falta STRIPE_PUBLISHABLE_KEY. Añadela al archivo .env para abrir Stripe Checkout.",
    });
    return;
  }

  response.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.post("/api/create-checkout-session", async (request, response) => {
  if (!stripe) {
    response.status(500).json({
      error:
        "Falta STRIPE_SECRET_KEY. Añade tu clave secreta de Stripe en el archivo .env.",
    });
    return;
  }

  const { planId, customerName, customerEmail, accountPassword } =
    request.body || {};
  const plan = typeof planId === "string" ? PLAN_CATALOG[planId] : null;
  const normalizedEmail = normalizeEmail(customerEmail);

  if (!plan) {
    response.status(400).json({
      error: "El plan seleccionado no es valido.",
    });
    return;
  }

  if (
    typeof customerName !== "string" ||
    !customerName.trim() ||
    typeof customerEmail !== "string" ||
    !normalizedEmail
  ) {
    response.status(400).json({
      error: "Nombre y correo son obligatorios para crear la sesion de suscripcion.",
    });
    return;
  }

  if (typeof accountPassword !== "string" || accountPassword.length < 8) {
    response.status(400).json({
      error: "La contrasena debe tener al menos 8 caracteres.",
    });
    return;
  }

  try {
    const database = await readDatabase();
    const authenticatedUser = getAuthenticatedUser(
      database,
      getAuthTokenFromRequest(request),
    );

    if (authenticatedUser) {
      response.status(409).json({
        error:
          "Ya tienes la sesion iniciada. Cierra sesion primero para ir a Stripe.",
      });
      return;
    }

    const existingUser = database.users.find(
      (user) => user.email === normalizedEmail,
    );

    if (existingUser) {
      response.status(409).json({
        error:
          "Ya existe una cuenta con ese correo. Cierra sesion primero o usa el area de usuario para cambiar de plan.",
      });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: normalizedEmail,
      client_reference_id: normalizedEmail,
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel.html`,
      metadata: {
        customerName: customerName.trim(),
        customerEmail: normalizedEmail,
        planId,
      },
      subscription_data: {
        metadata: {
          customerName: customerName.trim(),
          customerEmail: normalizedEmail,
          planId,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: plan.amount,
            recurring: {
              interval: plan.billingInterval,
              interval_count: plan.billingIntervalCount,
            },
            product_data: {
              name: `${plan.name} · Curso de Programacion`,
              description: plan.description,
            },
          },
        },
      ],
    });

    database.pendingSignups[session.id] = {
      name: customerName.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(accountPassword),
      planId,
      createdAt: new Date().toISOString(),
    };
    await writeDatabase(database);

    response.json({
      sessionId: session.id,
    });
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "No se ha podido crear la sesion de checkout en Stripe.",
    });
  }
});

app.post("/api/change-plan", async (request, response) => {
  if (!stripe) {
    response.status(500).json({
      error:
        "Falta STRIPE_SECRET_KEY. Añade tu clave secreta de Stripe en el archivo .env.",
    });
    return;
  }

  const { planId } = request.body || {};
  const plan = typeof planId === "string" ? PLAN_CATALOG[planId] : null;

  if (!plan) {
    response.status(400).json({
      error: "El plan seleccionado no es valido.",
    });
    return;
  }

  try {
    const database = await readDatabase();
    const token = getAuthTokenFromRequest(request);
    const user = getAuthenticatedUser(database, token);

    if (!user) {
      response.status(401).json({
        error: "Inicia sesion para cambiar de plan.",
      });
      return;
    }

    if (user.planId === planId) {
      response.status(400).json({
        error: "Ya tienes ese plan activo.",
      });
      return;
    }

    if (user.subscriptionId) {
      await stripe.subscriptions.cancel(user.subscriptionId);
      user.subscriptionStatus = "canceled";
      user.updatedAt = new Date().toISOString();
      await writeDatabase(database);
    }

    const customerConfig = user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : { customer_email: user.email };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      billing_address_collection: "auto",
      ...customerConfig,
      client_reference_id: user.email,
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel.html`,
      metadata: {
        customerName: user.name,
        customerEmail: user.email,
        planId,
        changePlanFrom: user.planId || "",
      },
      subscription_data: {
        metadata: {
          customerName: user.name,
          customerEmail: user.email,
          planId,
          changePlanFrom: user.planId || "",
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: plan.amount,
            recurring: {
              interval: plan.billingInterval,
              interval_count: plan.billingIntervalCount,
            },
            product_data: {
              name: `${plan.name} · Curso de Programacion`,
              description: plan.description,
            },
          },
        },
      ],
    });

    response.json({
      sessionId: session.id,
    });
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "No se ha podido preparar el cambio de plan.",
    });
  }
});

app.get("/api/checkout-session", async (request, response) => {
  if (!stripe) {
    response.status(500).json({
      error:
        "Falta STRIPE_SECRET_KEY. No se puede consultar el estado de la sesion.",
    });
    return;
  }

  const sessionId = request.query.session_id;

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    response.status(400).json({
      error: "Falta el parametro session_id para recuperar la sesion.",
    });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const planId = session.metadata?.planId;
    const plan = planId ? PLAN_CATALOG[planId] : null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null;
    const subscription = subscriptionId
      ? await stripe.subscriptions.retrieve(subscriptionId)
      : null;
    const user = subscription
      ? await createOrActivateUserFromSession(session, subscription)
      : null;
    let authToken = null;

    if (user) {
      const database = await readDatabase();
      authToken = createAuthSession(database, user.id);
      await writeDatabase(database);
    }

    response.json({
      sessionId: session.id,
      planId: planId || null,
      planName: plan?.name || "Curso de Programacion",
      customerEmail: session.customer_details?.email || session.customer_email,
      checkoutMode: session.mode,
      paymentStatus: session.payment_status,
      subscriptionId,
      subscriptionStatus: subscription?.status || null,
      subscriptionCurrentPeriodEnd: formatSubscriptionDate(
        subscription?.current_period_end,
      ),
      userCreated: Boolean(user),
      authToken,
      user: user ? serializeUser(user) : null,
      amountTotal:
        typeof session.amount_total === "number"
          ? new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: session.currency || "eur",
            }).format(session.amount_total / 100)
          : null,
    });
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "No se ha podido recuperar la sesion de Stripe.",
    });
  }
});

app.post("/api/login", async (request, response) => {
  const { email, password } = request.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || typeof password !== "string" || !password) {
    response.status(400).json({
      error: "Correo y contrasena son obligatorios.",
    });
    return;
  }

  try {
    const database = await readDatabase();
    const user = database.users.find(
      (candidate) => candidate.email === normalizedEmail,
    );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      response.status(401).json({
        error: "Correo o contrasena incorrectos.",
      });
      return;
    }

    const token = createAuthSession(database, user.id);
    await writeDatabase(database);

    response.json({
      token,
      user: serializeUser(user),
      reservations: database.reservations.filter(
        (reservation) => reservation.userId === user.id,
      ),
    });
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "No se ha podido iniciar sesion.",
    });
  }
});

app.get("/api/me", async (request, response) => {
  try {
    const database = await readDatabase();
    const token = getAuthTokenFromRequest(request);
    const user = getAuthenticatedUser(database, token);

    if (!user) {
      response.status(401).json({
        error: "Sesion no valida o caducada.",
      });
      return;
    }

    response.json({
      user: serializeUser(user),
      reservations: database.reservations.filter(
        (reservation) => reservation.userId === user.id,
      ),
    });
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "No se ha podido recuperar la sesion.",
    });
  }
});

app.post("/api/reservations", async (request, response) => {
  const { sessionId, classDate, classType, notes } = request.body || {};

  if (typeof classDate !== "string" || !classDate.trim()) {
    response.status(400).json({
      error: "Selecciona una fecha para la clase.",
    });
    return;
  }

  if (typeof classType !== "string" || !classType.trim()) {
    response.status(400).json({
      error: "Selecciona el tipo de clase.",
    });
    return;
  }

  try {
    const database = await readDatabase();
    const authToken = getAuthTokenFromRequest(request);
    const user =
      getAuthenticatedUser(database, authToken) ||
      database.users.find(
        (candidate) =>
          typeof sessionId === "string" &&
          candidate.stripeCheckoutSessionId === sessionId,
      );

    if (!user) {
      response.status(401).json({
        error: "Inicia sesion para reservar clases.",
      });
      return;
    }

    const normalizedClassType = classType.trim();
    const normalizedClassDate = classDate.trim();
    const planValidationError = validateReservationForPlan(
      user,
      database.reservations,
      normalizedClassType,
      normalizedClassDate,
    );

    if (planValidationError) {
      response.status(403).json({
        error: planValidationError,
      });
      return;
    }

    const reservation = {
      id: crypto.randomUUID(),
      userId: user.id,
      userEmail: user.email,
      classDate: normalizedClassDate,
      classType: normalizedClassType,
      notes: typeof notes === "string" ? notes.trim() : "",
      status: "reservada",
      createdAt: new Date().toISOString(),
    };

    database.reservations.push(reservation);
    await writeDatabase(database);

    response.status(201).json({
      reservation,
      reservations: database.reservations.filter(
        (candidate) => candidate.userId === user.id,
      ),
    });
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "No se ha podido guardar la reserva.",
    });
  }
});

app.patch("/api/reservations/:reservationId/cancel", async (request, response) => {
  try {
    const database = await readDatabase();
    const authToken = getAuthTokenFromRequest(request);
    const user = getAuthenticatedUser(database, authToken);

    if (!user) {
      response.status(401).json({
        error: "Inicia sesion para anular clases.",
      });
      return;
    }

    const reservation = database.reservations.find(
      (candidate) =>
        candidate.id === request.params.reservationId &&
        candidate.userId === user.id,
    );

    if (!reservation) {
      response.status(404).json({
        error: "No se ha encontrado esa reserva.",
      });
      return;
    }

    reservation.status = "anulada";
    reservation.cancelledAt = new Date().toISOString();
    await writeDatabase(database);

    response.json({
      reservation,
      reservations: database.reservations.filter((candidate) => candidate.userId === user.id),
    });
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "No se ha podido anular la reserva.",
    });
  }
});

app.get("/", (_request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor listo en ${BASE_URL}`);
});
