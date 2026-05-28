**Evaluación: Álvaro Vidal Madroñal / avidal-code/CursoProgramacion**

**Estado:** Evaluable

**Nota:** 6.50/10

**Desglose:**
- Ejecución y estabilidad: 13/20
- Front-end: 7/15
- Back-end: 10/15
- Funcionalidades: 8/20
- Responsive: 7/10
- Tipografías: 5/5
- Animación: 3/5
- Documentación: 8/10
- Repositorio: 4/5
**Resumen técnico:**
El proyecto arranca y queda accesible en local. Cargan correctamente la landing, login, success, cancel y `/api/config`. También he probado con un usuario local de prueba el login, `/api/me` y la creación de reservas, y esa parte responde bien. Stripe y EmailJS dependen de claves externas, así que no se ha podido comprobar un pago real ni un correo válido.

**Funcionalidades indicadas:**
- Hero con zoom/parallax sobre imagen.
- Animaciones reveal por scroll.
- Selección de planes y Stripe Checkout.
- Login y sesiones de usuario.
- Reservas con límites por plan.
- WhatsApp dinámico.
- EmailJS para reservas.
- Cambio de plan y webhook de Stripe.

**Complejidad del back-end:**
Alta. El backend es la parte más trabajada: Express, sesiones, usuarios en JSON, hash de contraseña con PBKDF2, reservas, control de suscripción, Stripe y EmailJS. Está bien planteado y tiene bastante más intención que un formulario básico, aunque parte de lo más importante depende de servicios externos no verificables sin credenciales reales.

**Puntos fuertes:**
El backend tiene buena estructura y la documentación es amplia. La web tiene una idea clara de producto y las secciones principales están bien conectadas. Se agradece que haya login, reservas y lógica de planes.

**Aspectos a mejorar:**
El front-end es efectivo, pero bastante simple en ejecución visual. Además, la parte de la “televisión” no reproduce nada: revisando el código no hay vídeo, `iframe`, `mp4` ni reproductor; es una imagen PNG (`.zoom-card__image`) que se escala con scroll y termina con una capa negra (`--blackout-opacity`). Por eso la experiencia se queda en un efecto visual sobre fondo negro, no en una reproducción real.

**Retroalimentación:**
Buen trabajo en la parte técnica del backend, que es claramente lo mejor del proyecto. Para subir nota, haría falta que el front-end tuviera más profundidad real y que las funcionalidades visibles no dependieran tanto de una promesa visual. La idea de la televisión puede funcionar, pero si parece un reproductor debería tener contenido real o una interacción más clara.
