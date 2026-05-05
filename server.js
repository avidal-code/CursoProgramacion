const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const Stripe = require("stripe");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

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

app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  (request, response) => {
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

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Checkout de suscripcion completado:", {
          sessionId: session.id,
          customerEmail: session.customer_details?.email || session.customer_email,
          planId: session.metadata?.planId,
          subscriptionId: session.subscription || null,
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

  const { planId, customerName, customerEmail } = request.body || {};
  const plan = typeof planId === "string" ? PLAN_CATALOG[planId] : null;

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
    !customerEmail.trim()
  ) {
    response.status(400).json({
      error: "Nombre y correo son obligatorios para crear la sesion de suscripcion.",
    });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: customerEmail.trim(),
      client_reference_id: customerEmail.trim(),
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel.html`,
      metadata: {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        planId,
      },
      subscription_data: {
        metadata: {
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
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

app.get("/", (_request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor listo en ${BASE_URL}`);
});
