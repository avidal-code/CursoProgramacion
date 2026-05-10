# Documentacion tecnica - Landing Page Curso de Programacion

## 1. Datos generales del proyecto

**Nombre:** Curso de Programacion  
**Tipo de proyecto:** Landing page dinamica con front-end y back-end funcional.  
**Tecnologias principales:** HTML, CSS, JavaScript, Node.js, Express, Stripe Checkout, EmailJS y almacenamiento local en JSON.

El proyecto presenta una landing page para vender y gestionar un curso online. El usuario puede consultar planes, pagar una suscripcion, crear una cuenta, iniciar sesion, reservar clases, recibir correos de confirmacion y contactar por WhatsApp con un mensaje automatico.

## 2. Instrucciones de ejecucion

1. Instalar dependencias:

```bash
npm install
```

2. Crear el archivo `.env` a partir de `.env.example` y configurar las claves necesarias:

```env
PORT=3000
HOST=127.0.0.1
BASE_URL=http://localhost:3000
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx
EMAILJS_SERVICE_ID=service_xxxxxxxxx
EMAILJS_TEMPLATE_ID=template_xxxxxxxxx
EMAILJS_CANCEL_TEMPLATE_ID=template_cancel_xxxxxxxxx
EMAILJS_PUBLIC_KEY=xxxxxxxxx
WHATSAPP_PHONE=34610000189
```

3. Arrancar el servidor:

```bash
npm start
```

4. Abrir la web:

```text
http://localhost:3000
```

## 3. Estructura del proyecto

```text
index.html        Landing principal
login.html        Acceso de usuario y reservas
success.html      Confirmacion de Stripe
cancel.html       Cancelacion de Stripe
styles.css        Estilos, responsive, animaciones y tipografias
script.js         Logica de front-end
server.js         Back-end Express y endpoints API
data/users.json   Base de datos local en JSON, ignorada por Git
```

## 4. Tipografias

El proyecto usa tres tipografias diferenciadas mediante Google Fonts:

- **Inter:** cuerpo de texto y lectura general.
- **Space Grotesk:** titulos, marca y textos grandes.
- **IBM Plex Mono:** elementos de interfaz como botones, etiquetas, badges y formularios.

Fragmento relevante en `styles.css`:

```css
:root {
  --font-body: "Inter", "Segoe UI", sans-serif;
  --font-display: "Space Grotesk", "Arial Black", sans-serif;
  --font-ui: "IBM Plex Mono", "SFMono-Regular", monospace;
}

body {
  font-family: var(--font-body);
}

h1,
h2,
h3 {
  font-family: var(--font-display);
}
```

## 5. Responsive design

La landing esta preparada para escritorio, tablet y movil mediante CSS Grid, `clamp()`, unidades responsive y media queries.

Fragmento relevante:

```css
@media (max-width: 900px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .checkout-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .site-header__links {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .checkout-form__grid {
    grid-template-columns: 1fr;
  }
}
```

## 6. Funcionalidad 1 - Animacion front-end: efecto parallax/zoom por scroll

La primera funcionalidad evaluable es una animacion avanzada de front-end. El hero permanece fijo con `position: sticky` y JavaScript calcula el progreso del scroll para modificar variables CSS. Esas variables controlan escala, desplazamiento, opacidad y fundido.

Fragmento de `script.js`:

```js
function initMonitorZoom() {
  const section = document.querySelector(".zoom-hero");

  function updateTargets() {
    const rect = section.getBoundingClientRect();
    const scrollableDistance = rect.height - window.innerHeight;
    const progress =
      scrollableDistance > 0
        ? clamp(-rect.top / scrollableDistance, 0, 1)
        : 0.5;

    target.imageScale = lerp(
      viewportProfile.baseImageScale,
      viewportProfile.targetImageScale,
      zoomProgress,
    );
  }
}
```

Fragmento de `styles.css`:

```css
.zoom-hero__sticky {
  position: sticky;
  top: 0;
  min-height: 100vh;
}

.zoom-card__image {
  transform: translate3d(0, var(--image-shift-y), 0)
    scale(var(--image-scale));
}
```

La animacion esta optimizada con `requestAnimationFrame` y respeta `prefers-reduced-motion`, lo que mejora rendimiento y accesibilidad.

## 7. Funcionalidad 2 - Pasarela de pago con Stripe Checkout

La segunda funcionalidad es la integracion con Stripe Checkout desde el back-end. El usuario elige un plan en la landing, rellena sus datos y el servidor crea una sesion de suscripcion.

Fragmento de `script.js`:

```js
const response = await fetch("/api/create-checkout-session", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    planId: planSelect.value,
    customerName: nameInput.value.trim(),
    customerEmail: emailInput.value.trim(),
    accountPassword: passwordInput.value,
  }),
});

const result = await stripe.redirectToCheckout({
  sessionId: data.sessionId,
});
```

Fragmento de `server.js`:

```js
app.post("/api/create-checkout-session", async (request, response) => {
  const { planId, customerName, customerEmail, accountPassword } =
    request.body || {};
  const plan = typeof planId === "string" ? PLAN_CATALOG[planId] : null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: normalizedEmail,
    success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/cancel.html`,
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
        },
      },
    ],
  });
});
```

Esta funcionalidad conecta front-end y back-end de forma real: la landing no simula el pago, sino que pide al servidor una sesion valida de Stripe.

## 8. Funcionalidad 3 - Base de datos local en JSON

La tercera funcionalidad es una base de datos local en formato JSON. Guarda usuarios, reservas, sesiones y registros pendientes de alta.

Fragmento de `server.js`:

```js
const DATA_DIR = path.join(__dirname, "data");
const DATABASE_PATH = path.join(DATA_DIR, "users.json");

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
```

Ademas, las contrasenas no se guardan en texto plano. Se almacenan con hash PBKDF2:

```js
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");

  return `${salt}:${hash}`;
}
```

## 9. Funcionalidad 4 - EmailJS para confirmaciones y anulaciones

La cuarta funcionalidad es el envio automatico de correos cuando el usuario reserva o anula una clase.

Fragmento de `server.js`:

```js
async function sendReservationEmail(
  user,
  reservation,
  subject,
  message,
  emailType = "confirmation",
) {
  const emailJsConfig = getEmailJsConfig();
  const finalTemplateId = getReservationEmailTemplateId(
    emailJsConfig,
    emailType,
  );

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      service_id: emailJsConfig.serviceId,
      template_id: finalTemplateId,
      user_id: emailJsConfig.publicKey,
      template_params: {
        to_email: user.email,
        to_name: user.name,
        subject: subject,
        message: message,
        reservation_id: reservation.id,
        class_type: reservation.classType,
        class_date: formatReservationDate(reservation.classDate),
      },
    }),
  });
}
```

Uso en la reserva:

```js
emailResult = await sendReservationEmail(
  user,
  reservation,
  "Evento confirmado",
  "Tu reserva se ha realizado correctamente.",
);
```

Uso en la anulacion:

```js
emailResult = await sendReservationEmail(
  user,
  reservation,
  "Evento anulado",
  "Tu reserva ha sido anulada correctamente.",
  "cancellation",
);
```

## 10. Funcionalidad 5 - Vinculacion dinamica con WhatsApp

La quinta funcionalidad es la vinculacion directa con WhatsApp. El enlace no es estatico: JavaScript genera un mensaje personalizado con el plan seleccionado por el usuario.

Fragmento de `index.html`:

```html
<a
  class="whatsapp-panel__cta"
  href="#whatsapp"
  target="_blank"
  rel="noopener"
  data-whatsapp-link
>
  Consultar por WhatsApp
</a>
```

Fragmento de `script.js`:

```js
const DEFAULT_WHATSAPP_PHONE = "";
let whatsappPhone = DEFAULT_WHATSAPP_PHONE;

async function initWhatsAppLinks() {
  updateWhatsAppLinks();

  const response = await fetch("/api/config");
  const data = await response.json().catch(() => ({}));

  if (
    response.ok &&
    typeof data.whatsappPhone === "string" &&
    data.whatsappPhone.trim()
  ) {
    whatsappPhone = data.whatsappPhone.replace(/\D/g, "");
    updateWhatsAppLinks();
  }
}

function buildWhatsAppUrl(plan = WHATSAPP_DEFAULT_PLAN) {
  if (!whatsappPhone) {
    return "#whatsapp";
  }

  const message = [
    "Hola! Quiero informacion sobre el Curso de Programacion.",
    `Plan seleccionado: ${plan.name}.`,
    `Precio: ${plan.price}.`,
    `Detalle: ${plan.note}.`,
  ].join(" ");

  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

function updateWhatsAppLinks(plan) {
  const href = buildWhatsAppUrl(plan);
  const isConfigured = href.startsWith("https://wa.me/");

  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.setAttribute("href", href);
    link.toggleAttribute("aria-disabled", !isConfigured);
  });
}
```

El telefono se configura en `.env` y el servidor lo publica en `/api/config`:

```js
app.get("/api/config", (_request, response) => {
  response.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    whatsappPhone: process.env.WHATSAPP_PHONE || "",
  });
});
```

Integracion con la seleccion de plan:

```js
function updateCheckout(planId) {
  const plan = plans.get(planId);

  planSelect.value = planId;
  planName.textContent = plan.name;
  planPrice.textContent = plan.price;
  planNote.textContent = plan.note;
  updateWhatsAppLinks(plan);
}
```

Esta funcionalidad es util para conversion, porque permite resolver dudas justo antes de pagar o reservar.

## 11. Back-end y endpoints principales

El servidor Express expone rutas API conectadas con la landing:

```js
app.get("/api/config", (_request, response) => {
  response.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.post("/api/login", async (request, response) => {
  const { email, password } = request.body || {};
});

app.post("/api/reservations", async (request, response) => {
  const { sessionId, classDate, classType, notes } = request.body || {};
});

app.patch("/api/reservations/:reservationId/cancel", async (request, response) => {
  const database = await readDatabase();
});
```

Estos endpoints permiten que el front-end no sea solo visual, sino que tenga comunicacion real con el servidor.

## 12. Control de sesiones y reservas

El proyecto crea sesiones con tokens guardados en la base de datos JSON y en `localStorage` desde el navegador.

Fragmento de `server.js`:

```js
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
```

Fragmento de `script.js`:

```js
function saveAuthToken(token) {
  if (typeof token === "string" && token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    refreshHeaderAuthActions();
    window.dispatchEvent(new CustomEvent("auth-token-change"));
  }
}
```

Las reservas estan limitadas por plan:

```js
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
```

## 13. Repositorio y trazabilidad

El repositorio tiene mas de cinco commits, por lo que cumple el requisito minimo de trazabilidad. Los archivos sensibles y datos locales estan excluidos mediante `.gitignore`:

```gitignore
node_modules
.env
data/
```

## 14. Conclusiones

El proyecto cumple los requisitos obligatorios de la practica:

- Front-end funcional.
- Back-end funcional con Express.
- Animacion avanzada de front-end.
- Tres tipografias diferenciadas.
- Responsive design.
- Cinco funcionalidades evaluables.
- Documento tecnico en Markdown.
- Repositorio con mas de cinco commits.
