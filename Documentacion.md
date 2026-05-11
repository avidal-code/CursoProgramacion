# Documentacion tecnica - Landing Page Curso de Programacion

## 1. Instrucciones de inicio/ejecucion de vuestra web

El proyecto es una landing page con frontend en HTML, CSS y JavaScript, y backend en Node.js con Express. El backend se usa para crear sesiones de Stripe Checkout, gestionar usuarios, controlar suscripciones, permitir reservas de clases y guardar datos en un archivo JSON local.

### Requisitos previos

- Tener instalado Node.js.
- Tener instaladas las dependencias del proyecto.
- Tener un archivo `.env` configurado con las claves necesarias.

### Instalacion

Desde la carpeta raiz del proyecto:

```bash
npm install
```

### Variables de entorno necesarias

El archivo `.env` debe contener, como minimo:

```env
PORT=3000
HOST=127.0.0.1
BASE_URL=http://localhost:3000

STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx

EMAILJS_SERVICE_ID=service_xxxxxxxxx
EMAILJS_TEMPLATE_ID=template_xxxxxxxxx
EMAILJS_CANCEL_TEMPLATE_ID=template_xxxxxxxxx
EMAILJS_PUBLIC_KEY=xxxxxxxxx
EMAILJS_PRIVATE_KEY=xxxxxxxxx

WHATSAPP_PHONE=34600000000
```

Las claves de Stripe son necesarias para que la pasarela funcione. `STRIPE_SECRET_KEY` permite al servidor crear sesiones de pago y consultar el estado real de las suscripciones. `STRIPE_WEBHOOK_SECRET` permite validar eventos recibidos desde Stripe, por ejemplo cuando una suscripcion cambia de estado o se cancela.

### Ejecucion

Para arrancar el servidor:

```bash
npm start
```

El script anterior ejecuta:

```json
"scripts": {
  "start": "node server.js",
  "dev": "node --watch server.js"
}
```

Una vez iniciado, se accede a la web desde:

```text
http://localhost:3000
```

### Archivos principales

```text
index.html       Landing principal
login.html       Inicio de sesion, area de usuario y reservas
success.html     Confirmacion despues de Stripe Checkout
cancel.html      Pantalla de cancelacion del proceso de pago
styles.css       Estilos, animaciones y responsividad
script.js        Logica de frontend
server.js        Backend Express, Stripe, usuarios y reservas
data/users.json  Base de datos local generada en ejecucion
```

## 2. Enumeracion de al menos las 5 funcionalidades mas importantes implementadas

1. Animacion principal del hero con zoom/parallax al hacer scroll, con version especifica para movil.
2. Seccion Programa con animacion de entrada tipo reveal al hacer scroll.
3. Seleccion de planes y pasarela de pago con Stripe Checkout.
4. Sistema de usuarios con inicio de sesion y sesiones persistentes.
5. Control de suscripciones: bloqueo de acceso si la suscripcion esta cancelada y visualizacion de fecha de fin/renovacion.
6. Sistema de reservas de clases con limites por plan.
7. Enlace de WhatsApp dinamico con mensaje generado segun el plan.
8. Correos con EmailJS para confirmar o cancelar reservas.

## 3. Funcionalidad 1 - Hero animado con zoom por scroll

### 3.1. Descripcion del comportamiento de la funcionalidad 1

La primera funcionalidad consiste en una animacion visual en la parte inicial de la landing. En escritorio, el usuario ve una escena con una imagen de configuracion de ordenador. Al hacer scroll, la imagen se escala progresivamente, se desplaza de forma suave y parte del contenido promocional se desvanece. En movil se sustituye la imagen de escritorio por una imagen especifica para pantalla pequena y se mantiene el mismo concepto: la imagen se agranda hacia el usuario hasta terminar en una pantalla negra.

El objetivo es crear una primera pantalla llamativa, con sensacion de profundidad, sin cambiar de pagina ni requerir interaccion adicional.

### 3.2. Explicacion del funcionamiento de la funcionalidad 1

La seccion principal tiene `position: sticky`, por lo que permanece fija mientras el usuario hace scroll dentro de una zona alta (`min-height: 340vh` en escritorio y una altura adaptada en movil). JavaScript calcula el progreso del scroll y actualiza variables CSS como `--image-scale`, `--card-scale`, `--blackout-opacity` y `--promo-opacity`.

En escritorio se ejecuta `initMonitorZoom()`, que controla la tarjeta grande del monitor. En movil se evita ejecutar el zoom de escritorio mediante `matchMedia("(min-width: 641px)")` y se usa `initMobileHeroParallax()`, que controla `--mobile-image-scale`, `--mobile-image-shift-y`, `--mobile-copy-opacity` y `--blackout-opacity`. De este modo la experiencia movil no depende de la imagen grande de PC, sino de la imagen optimizada para movil incluida en el HTML.

El movimiento no se aplica directamente en cada evento de scroll, sino mediante `requestAnimationFrame`, lo que mejora el rendimiento porque sincroniza los cambios visuales con el repintado del navegador.

Tambien se comprueba `prefers-reduced-motion`. Si el usuario tiene reduccion de movimiento activada en el sistema, la animacion no se ejecuta.

### 3.3. Fragmentos de codigo relevantes de la funcionalidad 1

Fragmento de `script.js`:

```js
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function initMonitorZoom() {
  const section = document.querySelector(".zoom-hero");
  const desktopQuery = window.matchMedia("(min-width: 641px)");

  if (!section || prefersReducedMotion) {
    return;
  }
}
```

Este fragmento obtiene la preferencia de movimiento reducido y localiza la seccion `.zoom-hero`. Si la seccion no existe o el usuario prefiere menos animaciones, la funcion termina con `return`.

Fragmento de `script.js`:

```js
function updateTargets() {
  const rect = section.getBoundingClientRect();
  const scrollableDistance = rect.height - window.innerHeight;
  const progress =
    scrollableDistance > 0
      ? clamp(-rect.top / scrollableDistance, 0, 1)
      : 0.5;

  const zoomProgress = easeOutCubic(clamp(progress / 0.82, 0, 1));

  target.imageScale = lerp(
    viewportProfile.baseImageScale,
    viewportProfile.targetImageScale,
    zoomProgress,
  );
}
```

`getBoundingClientRect()` devuelve la posicion de la seccion respecto a la ventana. Con esa informacion se calcula `progress`, un valor entre 0 y 1. Despues se usa `lerp()` para interpolar entre una escala inicial y una escala final. La funcion `clamp()` impide que el valor salga del rango valido.

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
  transform-origin: 33.8% 51.6%;
}
```

El CSS recibe las variables que modifica JavaScript. `translate3d()` desplaza la imagen y `scale()` la agranda. `transform-origin` define desde que punto se produce el zoom.

Fragmento de `index.html` para la imagen movil:

```html
<img
  class="hero-mobile-parallax"
  src="Gemini_Generated_Image_gwl4mjgwl4mjgwl4.png"
  alt="Imagen de parallax para version movil"
/>
```

Fragmento de `script.js` para el zoom movil:

```js
function initMobileHeroParallax() {
  const section = document.querySelector(".zoom-hero");
  const image = document.querySelector(".hero-mobile-parallax");
  const mobileQuery = window.matchMedia("(max-width: 640px)");

  if (!section || !image || prefersReducedMotion) {
    return;
  }

  const rect = section.getBoundingClientRect();
  const scrollableDistance = rect.height - window.innerHeight;
  const progress =
    scrollableDistance > 0
      ? clamp(-rect.top / scrollableDistance, 0, 1)
      : 0;

  const zoomProgress = easeOutCubic(clamp(progress / 0.86, 0, 1));
  const blackoutProgress = easeInOutQuad(
    clamp((progress - 0.72) / 0.28, 0, 1),
  );
  const targetScale = window.innerWidth <= 390 ? 8.2 : 7.4;

  section.style.setProperty(
    "--mobile-image-scale",
    lerp(1.06, targetScale, zoomProgress).toFixed(3),
  );
  section.style.setProperty("--blackout-opacity", blackoutProgress.toFixed(3));
}
```

El valor `targetScale` hace que la imagen movil aumente mucho mas que un parallax basico. El oscurecimiento final se controla con `blackoutProgress`, que aumenta al final del recorrido.

Fragmento de `styles.css` para el hero movil:

```css
@media (max-width: 640px) {
  .zoom-card {
    display: none;
  }

  .zoom-hero {
    min-height: 260svh;
  }

  .zoom-hero__sticky::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 9;
    background: #000;
    opacity: var(--blackout-opacity);
    pointer-events: none;
  }

  .hero-mobile-parallax {
    transform: translate3d(0, var(--mobile-image-shift-y), 0)
      scale(var(--mobile-image-scale));
  }
}
```

En movil `.zoom-card` se oculta para eliminar la imagen de escritorio. La pseudo-capa `::after` crea el fundido a negro, y la imagen `.hero-mobile-parallax` usa las variables actualizadas por JavaScript.

Archivos relacionados: `index.html`, `styles.css` y `script.js`.

## 4. Funcionalidad 2 - Seccion Programa con animacion reveal

### 4.1. Descripcion del comportamiento de la funcionalidad 2

La segunda funcionalidad es el apartado Programa. Al pulsar el enlace "Programa" del header, la pagina baja a una seccion donde se muestran los bloques principales del curso:

- Fundamentos web.
- Diseno con CSS.
- Interaccion con JavaScript.
- Proyecto final.

La seccion no requiere click para mostrarse. Aparece automaticamente al entrar en pantalla, con un efecto de desenfoque inicial, desplazamiento vertical y aparicion progresiva. Este comportamiento es similar al apartado de planes.

### 4.2. Explicacion del funcionamiento de la funcionalidad 2

El HTML define la seccion con `id="programa"` para que el enlace del header pueda navegar hasta ella. En CSS se preparan estados iniciales con opacidad 0, blur y desplazamiento. JavaScript usa `IntersectionObserver` para detectar cuando la seccion entra en el viewport. Cuando entra, se anade la clase `is-program-visible`.

El uso de `IntersectionObserver` evita comprobar manualmente el scroll en cada pixel y mejora rendimiento. La animacion se ejecuta una sola vez porque despues se llama a `observer.unobserve(programPanel)`.

### 4.3. Fragmentos de codigo relevantes de la funcionalidad 2

Fragmento de `index.html`:

```html
<section
  class="program-panel program-panel--reveal"
  id="programa"
  aria-label="Programa del curso"
>
  <div class="program-panel__content">
    <div class="program-panel__intro">
      <p class="program-panel__eyebrow">Programa Del Curso</p>
      <h2>De cero a una landing publicada, paso a paso.</h2>
    </div>
  </div>
</section>
```

`id="programa"` conecta esta seccion con el enlace `<a href="#programa">Programa</a>` del header. La clase `program-panel--reveal` indica que esta seccion tendra animacion de entrada.

Fragmento de `script.js`:

```js
function initProgramReveal() {
  const programPanel = document.querySelector(".program-panel--reveal");

  if (!programPanel) {
    return;
  }

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    programPanel.classList.add("is-program-visible");
    return;
  }

  programPanel.classList.add("is-program-ready");
}
```

Primero se localiza la seccion. Si el navegador no soporta `IntersectionObserver` o el usuario tiene movimiento reducido, se muestra directamente. Si no, se anade `is-program-ready`, que activa el estado inicial de animacion.

Fragmento de `script.js`:

```js
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      programPanel.classList.add("is-program-visible");
      window.setTimeout(() => {
        programPanel.classList.remove("is-program-ready");
      }, 1700);
      observer.unobserve(programPanel);
    });
  },
  {
    threshold: 0.28,
    rootMargin: "0px 0px -12% 0px",
  },
);
```

`IntersectionObserver` recibe una funcion callback. Cada `entry` representa el estado de visibilidad de la seccion. Cuando `entry.isIntersecting` es verdadero, se anade la clase visible. `threshold: 0.28` significa que la animacion empieza cuando aproximadamente el 28% de la seccion es visible.

Fragmento de `styles.css`:

```css
.program-panel--reveal.is-program-ready .program-panel__content,
.program-panel--reveal.is-program-ready .program-card,
.program-panel--reveal.is-program-ready .program-panel__actions {
  opacity: 0;
  filter: blur(14px);
}

.program-panel--reveal.is-program-ready .program-card {
  --program-card-reveal-y: 62px;
  --program-card-reveal-scale: 0.94;
}
```

Cuando la seccion esta preparada pero aun no visible, el contenido tiene opacidad 0, blur y desplazamiento. Las variables CSS permiten que las tarjetas compartan el mismo sistema de animacion.

Archivos relacionados: `index.html`, `styles.css` y `script.js`.

## 5. Funcionalidad 3 - Pasarela de pago con Stripe Checkout

### 5.1. Descripcion del comportamiento de la funcionalidad 3

La tercera funcionalidad permite al usuario contratar una suscripcion. En la landing se muestran varios planes. El usuario elige uno, introduce nombre, correo y contrasena, y al enviar el formulario se abre Stripe Checkout para completar el pago.

Si el pago se completa, el usuario se crea o reactiva en la base de datos local. Si el pago se cancela, se muestra la pagina `cancel.html`.

### 5.2. Explicacion del funcionamiento de la funcionalidad 3

El frontend no crea la sesion de Stripe directamente, porque eso requeriria exponer la clave secreta. En su lugar, envia los datos del formulario al backend mediante `fetch("/api/create-checkout-session")`. El backend valida el plan, valida datos, crea una sesion en Stripe y devuelve el `sessionId`. Despues el frontend usa Stripe.js para redirigir al checkout.

Tambien se guarda un alta pendiente en `database.pendingSignups`, porque el usuario solo debe crearse definitivamente cuando Stripe confirme el pago.

### 5.3. Fragmentos de codigo relevantes de la funcionalidad 3

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
    authToken,
  }),
});
```

`fetch()` realiza una peticion HTTP al backend. El metodo `POST` se usa porque se estan enviando datos para crear una nueva sesion. El cuerpo se convierte a JSON con `JSON.stringify()`.

Fragmento de `script.js`:

```js
const result = await stripe.redirectToCheckout({
  sessionId: data.sessionId,
});
```

`redirectToCheckout()` pertenece a Stripe.js. Recibe el identificador de sesion creado por el servidor y redirige al usuario a la pasarela segura de Stripe.

Fragmento de `server.js`:

```js
app.post("/api/create-checkout-session", async (request, response) => {
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
});
```

Este endpoint extrae los datos enviados desde el frontend. `PLAN_CATALOG[planId]` busca la configuracion del plan elegido. Si no existe, se responde con error 400.

Fragmento de `server.js`:

```js
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
});
```

`mode: "subscription"` indica a Stripe que no es un pago unico, sino una suscripcion. `success_url` y `cancel_url` indican a donde vuelve el usuario tras completar o cancelar el proceso. `metadata` guarda datos propios del proyecto dentro de Stripe.

Fragmento de `server.js`:

```js
database.pendingSignups[session.id] = {
  existingUserId: existingUser?.id || null,
  name: customerName.trim(),
  email: normalizedEmail,
  passwordHash: existingUser?.passwordHash || hashPassword(accountPassword),
  planId,
  createdAt: new Date().toISOString(),
};
```

El proyecto no guarda la contrasena en claro. Usa `hashPassword()` para almacenar un hash. El alta queda pendiente hasta que Stripe confirme el pago.

Archivos relacionados: `index.html`, `script.js`, `server.js`, `success.html` y `cancel.html`.

## 6. Funcionalidad 4 - Inicio de sesion, sesiones y control de suscripcion

### 6.1. Descripcion del comportamiento de la funcionalidad 4

La cuarta funcionalidad permite iniciar sesion con correo y contrasena. Si la suscripcion del usuario esta activa, se muestra el area de usuario. Si la suscripcion esta cancelada o inactiva, se bloquea el acceso y se muestra el mensaje:

```text
Has desactivado la subscripcion, vuelvela a activar para poder acceder de nuevo a tu cuenta.
```

Ademas, en el panel de suscripcion se muestra la fecha de fin, renovacion o suspension de la cuenta cuando esta disponible:

```text
Tu subscripcion finaliza el dia ...
```

### 6.2. Explicacion del funcionamiento de la funcionalidad 4

El frontend envia el email y la contrasena al endpoint `/api/login`. El backend busca el usuario en la base de datos JSON y valida la contrasena con `verifyPassword()`. Despues comprueba si la suscripcion esta activa.

La comprobacion se hace de dos formas:

1. Con el estado local guardado en `data/users.json`.
2. Consultando Stripe mediante `syncUserSubscriptionFromStripe()`.

Si Stripe indica que la suscripcion esta cancelada, el servidor elimina las sesiones del usuario y devuelve un error 403. Si esta activa, crea un token de sesion y lo guarda en `database.sessions`.

### 6.3. Fragmentos de codigo relevantes de la funcionalidad 4

Fragmento de `server.js`:

```js
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const INACTIVE_SUBSCRIPTION_MESSAGE =
  "Has desactivado la subscripcion, vuelvela a activar para poder acceder de nuevo a tu cuenta.";

function isUserSubscriptionActive(user) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(user?.subscriptionStatus);
}
```

`Set` permite comprobar rapidamente si un estado pertenece al conjunto de estados permitidos. Solo `active` y `trialing` dejan acceder.

Fragmento de `server.js`:

```js
app.post("/api/login", async (request, response) => {
  const { email, password } = request.body || {};
  const normalizedEmail = normalizeEmail(email);

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
});
```

El endpoint normaliza el correo para evitar diferencias por mayusculas. Busca el usuario y verifica la contrasena. Si falla, responde con estado 401.

Fragmento de `server.js`:

```js
if (!isUserSubscriptionActive(user)) {
  deactivateUserSessions(database, user.id);
  await writeDatabase(database);
  response.status(403).json({
    error: INACTIVE_SUBSCRIPTION_MESSAGE,
    code: "subscription_inactive",
    subscriptionStatus: user.subscriptionStatus || null,
  });
  return;
}

await syncUserSubscriptionFromStripe(database, user);
```

Antes de crear una nueva sesion se comprueba el estado local. Despues se sincroniza con Stripe para detectar cancelaciones hechas desde el panel de Stripe. Si la suscripcion no es valida, el servidor devuelve 403 y no crea token.

Fragmento de `server.js`:

```js
function getSubscriptionAccessEndTimestamp(subscription) {
  if (typeof subscription.cancel_at === "number") {
    return subscription.cancel_at;
  }

  if (subscription.status === "canceled" && typeof subscription.ended_at === "number") {
    return subscription.ended_at;
  }

  return getSubscriptionPeriodEndTimestamp(subscription);
}
```

Esta funcion calcula la fecha hasta la que la cuenta tiene acceso. Primero mira si Stripe ha indicado fecha de cancelacion futura. Si la suscripcion ya esta cancelada, usa `ended_at`. Si no, usa la fecha de final de periodo.

Fragmento de `script.js`:

```js
const subscriptionEndDate =
  user.subscriptionAccessEndsAt || user.subscriptionCurrentPeriodEnd;

currentPlan.textContent = subscriptionEndDate
  ? `Plan actual: ${
      PLAN_NAMES[user.planId] || user.planId || "Pendiente"
    }. Tu subscripcion finaliza el dia ${subscriptionEndDate}.`
  : `Plan actual: ${PLAN_NAMES[user.planId] || user.planId || "Pendiente"}.`;
```

El frontend muestra la fecha enviada por el backend. Si no llega fecha, muestra solo el plan actual.

Archivos relacionados: `login.html`, `script.js`, `server.js` y `data/users.json`.

## 7. Funcionalidad 5 - Reserva de clases con limites por plan

### 7.1. Descripcion del comportamiento de la funcionalidad 5

La quinta funcionalidad permite a un usuario con sesion iniciada reservar clases desde el area de usuario. El formulario permite elegir tipo de clase, fecha y notas.

El sistema limita las reservas segun el plan:

- Plan Base: no permite reservas.
- Plan Pro: permite clases en directo y revision de proyecto, con limite semanal.
- Plan Mentoria: permite tambien mentoria individual, con limite mayor.

### 7.2. Explicacion del funcionamiento de la funcionalidad 5

El frontend configura el selector de tipo de clase segun el plan del usuario. Si el plan no permite una clase, esa opcion se oculta y se desactiva.

Cuando se envia una reserva, el backend vuelve a validar todo. Esta segunda validacion es importante porque no se debe confiar solo en el frontend. El servidor comprueba sesion, estado de suscripcion, tipo de clase permitido y numero de reservas ya realizadas en la misma semana.

### 7.3. Fragmentos de codigo relevantes de la funcionalidad 5

Fragmento de `script.js`:

```js
function configureClassTypeSelect(select, planId) {
  const rules = PLAN_RESERVATION_RULES[planId] || PLAN_RESERVATION_RULES.base;

  Array.from(select.options).forEach((option) => {
    option.hidden = !rules.allowedClassTypes.includes(option.value);
    option.disabled = !rules.allowedClassTypes.includes(option.value);
  });
}
```

`Array.from(select.options)` convierte las opciones del select en un array para poder recorrerlas con `forEach()`. Cada opcion se oculta y desactiva si no esta incluida en `allowedClassTypes`.

Fragmento de `server.js`:

```js
function validateReservationForPlan(user, reservations, classType, classDate) {
  if (!isUserSubscriptionActive(user)) {
    return INACTIVE_SUBSCRIPTION_MESSAGE;
  }

  const rules = PLAN_RESERVATION_RULES[user.planId] || PLAN_RESERVATION_RULES.base;

  if (!rules.allowedClassTypes.includes(classType)) {
    return `Tu ${PLAN_CATALOG[user.planId]?.name || "plan"} no permite reservar "${classType}".`;
  }
}
```

El backend valida la reserva usando el plan real del usuario. Si la suscripcion esta inactiva, no permite reservar. Si el tipo de clase no esta permitido, devuelve un mensaje de error.

Fragmento de `server.js`:

```js
app.post("/api/reservations", async (request, response) => {
  const { sessionId, classDate, classType, notes } = request.body || {};
  const database = await readDatabase();
  const authToken = getAuthTokenFromRequest(request);
  const user =
    getAuthenticatedUser(database, authToken) ||
    database.users.find(
      (candidate) =>
        typeof sessionId === "string" &&
        candidate.stripeCheckoutSessionId === sessionId,
    );
});
```

Este endpoint recibe la reserva. Primero intenta identificar al usuario por token de sesion. Tambien permite encontrarlo por `sessionId` de Stripe en casos posteriores a un checkout reciente.

Fragmento de `server.js`:

```js
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
```

`crypto.randomUUID()` genera un identificador unico para la reserva. La reserva se guarda en el array `database.reservations` y se persiste en `data/users.json`.

Archivos relacionados: `login.html`, `script.js`, `server.js` y `data/users.json`.

## 8. Funcionalidades adicionales

### 8.1. Descripcion del comportamiento de la funcionalidad adicional

Como funcionalidad adicional, la web incluye un enlace dinamico de WhatsApp. El usuario puede consultar dudas y el sistema genera un mensaje automatico con el contexto del curso y del plan seleccionado.

Tambien se integran correos de confirmacion/cancelacion de reserva mediante EmailJS.

### 8.2. Explicacion del funcionamiento de la funcionalidad adicional

El telefono de WhatsApp se obtiene desde `/api/config`, usando la variable `WHATSAPP_PHONE`. El frontend construye una URL `https://wa.me/...` con un mensaje codificado mediante `encodeURIComponent()`.

EmailJS se usa desde el backend para enviar correos sin montar un servidor SMTP propio. El servidor decide si debe usar plantilla de confirmacion o de cancelacion.

### 8.3. Fragmentos de codigo relevantes de la funcionalidad adicional

Fragmento de `script.js`:

```js
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
```

La funcion crea el texto del mensaje y lo codifica para que pueda viajar correctamente dentro de una URL. Si no hay telefono configurado, devuelve `#whatsapp`.

Fragmento de `server.js`:

```js
app.get("/api/config", (_request, response) => {
  response.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    whatsappPhone: process.env.WHATSAPP_PHONE || "",
  });
});
```

Este endpoint expone al frontend solo datos publicos: la clave publicable de Stripe y el telefono de WhatsApp. La clave secreta de Stripe nunca se envia al navegador.

Archivos relacionados: `index.html`, `script.js`, `server.js` y `.env`.

### 8.4. Lógica de Notificaciones (EmailJS)
Aunque la plataforma EmailJS limita el número de plantillas activas en su plan gratuito, el backend está preparado para gestionar las notificaciones de reserva.

**Fragmento de server.js (Lógica de envío):**
```js
async function sendReservationEmail(user, reservation, type = 'confirmation') {
  const templateId = type === 'confirmation'
    ? process.env.EMAILJS_TEMPLATE_ID
    : process.env.EMAILJS_CANCEL_TEMPLATE_ID;

  // Solo se intenta el envío si las claves están configuradas
  if (!process.env.EMAILJS_PUBLIC_KEY || !templateId) return;

return fetch("[https://api.emailjs.com/api/v1.0/email/send](https://api.emailjs.com/api/v1.0/email/send)", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: user.email,
        user_name: user.name,
        class_type: reservation.classType,
        class_date: reservation.classDate
      }
    })
  });
}
```


## 9. Funcionalidad Backend

### 9.1. Descripcion del comportamiento de la funcionalidad backend

El backend gestiona la parte segura de la aplicacion. Sus responsabilidades principales son:

- Crear sesiones de Stripe Checkout.
- Crear o reactivar usuarios tras el pago.
- Guardar usuarios, reservas y sesiones.
- Validar inicio de sesion.
- Consultar el estado real de suscripciones en Stripe.
- Bloquear el acceso si la suscripcion esta cancelada.
- Procesar webhooks de Stripe.
- Enviar correos con EmailJS.

### 9.2. Explicacion del funcionamiento de la funcionalidad backend

El servidor esta construido con Express. Usa `dotenv` para leer variables de entorno y `fs/promises` para leer y escribir la base de datos local. La informacion se guarda en `data/users.json`.

Las rutas principales son:

```text
GET  /api/config
POST /api/create-checkout-session
GET  /api/checkout-session
POST /api/login
GET  /api/me
POST /api/reservations
PATCH /api/reservations/:reservationId/cancel
POST /api/change-plan
POST /api/stripe-webhook
```

### 9.3. Fragmentos de codigo relevantes de la funcionalidad backend

Fragmento de `server.js`:

```js
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
```

Esta funcion lee `data/users.json`. Si el archivo aun no existe, devuelve una estructura vacia valida. Esto permite arrancar el proyecto desde cero sin crear manualmente la base de datos.

Fragmento de `server.js`:

```js
async function writeDatabase(database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    DATABASE_PATH,
    `${JSON.stringify(database, null, 2)}\n`,
    "utf8",
  );
}
```

`fs.mkdir()` con `{ recursive: true }` crea la carpeta `data` si no existe. `JSON.stringify(database, null, 2)` guarda el JSON con indentacion para que sea legible.

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

El backend crea tokens aleatorios con `crypto.randomBytes(32)`. Cada token se guarda asociado al usuario y tiene caducidad de 30 dias.

Fragmento de `server.js`:

```js
app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const signature = request.headers["stripe-signature"];

    const event = stripe.webhooks.constructEvent(
      request.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  },
);
```

El webhook usa `express.raw()` porque Stripe necesita el cuerpo original de la peticion para validar la firma. `constructEvent()` comprueba que el evento viene realmente de Stripe usando `STRIPE_WEBHOOK_SECRET`.

Archivos relacionados: `server.js`, `.env` y `data/users.json`.

## 10. Responsividad

### 10.1. Descripcion del comportamiento de la responsividad

La web esta adaptada a escritorio, iPad/tablet y movil. El header cambia su distribucion, los grids pasan de varias columnas a una sola, los formularios se apilan verticalmente y las tarjetas ajustan su tamano para no desbordar.

En movil, el hero cambia de comportamiento: se oculta la imagen de escritorio, se usa una imagen especifica para movil y se mantiene una animacion de zoom hasta pantalla negra. El header tambien se reorganiza para que los enlaces principales queden en la fila superior y el boton de inicio de sesion quede centrado en la fila inferior. En la pantalla de login, el enlace de registro y el boton de entrada se ajustan de forma diferente en escritorio y movil para mantener el centrado visual dentro de la tarjeta.

### 10.2. Explicacion del funcionamiento de la responsividad

La responsividad se consigue con:

- `clamp()` para tamanos fluidos.
- `min()`, `max()` y `calc()` para limitar anchuras.
- CSS Grid para cambiar numero de columnas.
- Media queries en `900px`, `640px`, `430px` y `390px`.
- Unidades `svh` para mejorar el comportamiento en navegadores moviles.
- `env(safe-area-inset-*)` para respetar zonas seguras de dispositivos como iPhone.

### 10.3. Fragmentos de codigo relevantes de la responsividad

Fragmento de `styles.css`:

```css
@media (max-width: 900px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .program-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .checkout-layout {
    grid-template-columns: 1fr;
  }
}
```

En tablet, los planes pasan a una columna para mejorar la lectura. El programa usa dos columnas, un punto intermedio adecuado para iPad.

Fragmento de `styles.css`:

```css
@media (max-width: 640px) {
  .site-header__nav {
    flex-direction: column;
    align-items: stretch;
    border-radius: 24px;
  }

  .site-header__links {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: 100%;
  }
}
```

En movil el header pasa a dos filas: marca arriba y enlaces en una cuadricula. Esto evita que los enlaces se salgan de pantalla.

Fragmento actualizado de `styles.css` para el boton de inicio de sesion en movil:

```css
@media (max-width: 640px) {
  .site-header__links {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: 100%;
  }

  .site-header__links .site-header__login {
    grid-column: 2 / 4;
    grid-row: 2;
    justify-self: center;
    width: 100%;
  }
}
```

Esta regla coloca `Inicio`, `Programa`, `Precios` y `Realizar reserva` en la fila superior cuando estan visibles, y deja `Iniciar sesion` centrado en la segunda fila del header movil.

Fragmento de `styles.css`:

```css
@media (max-width: 640px) {
  .program-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .program-panel__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .program-panel__cta,
  .program-panel__link {
    width: 100%;
  }
}
```

En iPhone y moviles pequenos, el programa pasa a una sola columna y los botones ocupan todo el ancho. Esto mejora la legibilidad y la accesibilidad tactil.

Fragmento de `styles.css`:

```css
@media (max-width: 640px) {
  .zoom-hero__sticky {
    min-height: 100vh;
    min-height: 100svh;
    padding:
      calc(env(safe-area-inset-top) + 108px)
      12px
      calc(env(safe-area-inset-bottom) + 18px);
  }
}
```

`100svh` ayuda a evitar problemas con la barra del navegador en movil. `env(safe-area-inset-top)` y `env(safe-area-inset-bottom)` respetan las zonas seguras del dispositivo.

Fragmento de `styles.css` para el formulario de login:

```css
.login-form {
  display: grid;
  gap: 16px;
  width: min(100%, 520px);
  margin: 28px auto 0;
  justify-items: center;
}

#login-form .checkout-form__submit,
#login-form .login-form__register {
  width: min(100%, 360px);
}

@media (max-width: 640px) {
  #login-form .checkout-form__submit,
  #login-form .login-form__register {
    transform: none;
  }
}
```

El formulario se centra dentro de la tarjeta de login. En escritorio se mantiene el ajuste visual aplicado para centrar el boton y el enlace dentro del recuadro, mientras que en movil se elimina ese desplazamiento para que no se descoloque en pantallas pequenas.

Fragmento de `styles.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .zoom-hero {
    min-height: 100vh;
  }

  .pricing-panel--reveal.is-pricing-ready .pricing-panel__intro,
  .pricing-panel--reveal.is-pricing-ready .price-card {
    opacity: 1;
    filter: none;
    transform: none;
  }
}
```

Esta media query mejora la accesibilidad. Si el usuario ha configurado reduccion de movimiento, las animaciones se simplifican o se desactivan.

Archivos relacionados: `styles.css`, `index.html`, `login.html` y `script.js`.
