# SABDA — Lista de Verificación QA del Flujo de Reserva en Español
**Para:** El hablante nativo de español que va a probar el flujo de reserva
**Página a probar:** https://sabdastudio.com/es/clases/
**Tiempo estimado:** 20-30 minutos
**Última actualización:** 9 de abril de 2026

---

## ANTES DE EMPEZAR

**Lo que necesitas:**
- Un ordenador (no móvil — la versión móvil es otro flujo separado en `/es/m/schedule.html`)
- Chrome o Safari (mejor Chrome para inspeccionar consola)
- Una tarjeta de crédito real **O** una tarjeta de prueba de Stripe (4242 4242 4242 4242, cualquier fecha futura, cualquier CVC)
- 5 minutos para una transacción de prueba (€18 por la clase de prueba — Marvyn la puede reembolsar después)

**Cómo abrir la consola del navegador (para detectar errores JS):**
1. Pulsa **F12** (Windows/Linux) o **Cmd+Option+I** (Mac)
2. Pestaña "Console"
3. Mantén la consola abierta durante todas las pruebas
4. Si ves cualquier mensaje en rojo, anótalo (texto exacto + en qué paso ocurrió)

**Cómo reportar problemas:**
Para cada problema, anota:
- **Paso** donde ocurrió (ej. "Paso 3.2")
- **Qué esperabas** (ej. "El botón debería decir X")
- **Qué pasó realmente** (ej. "El botón decía Y" o "No pasó nada al hacer clic")
- **Captura de pantalla** si es algo visual
- **Mensaje de la consola** si hay alguno en rojo

---

## PASO 1 — Carga de la página

Abre https://sabdastudio.com/es/clases/

### Verifica:
- [ ] La página carga sin errores en consola
- [ ] El logo de SABDA aparece arriba a la izquierda
- [ ] El menú de navegación muestra: **CLASES, PRECIOS, ALQUILAR, EVENTOS** (todo en español)
- [ ] El selector de idioma arriba a la derecha muestra **EN | ES (resaltado) | CA**
- [ ] El título grande de la página menciona "Clases inmersivas" o similar (en español)
- [ ] No ves ningún texto en inglés en el cuerpo principal de la página
- [ ] No hay imágenes rotas (los iconos y fotos se cargan)
- [ ] **Específicamente**: las tarjetas de clases en la zona "Explorar nuestra gama completa" deben mostrar fotos reales, no texto alt como "Clase de yoga..."

### Problemas comunes a buscar:
- Texto en inglés que se haya colado (palabras como "Book", "Class", "Today", "Schedule")
- Em-dashes (`—`) en cualquier sitio — la marca SABDA no los usa
- Símbolo "·" usado correctamente como separador en metadatos (`60 min · Todos los niveles`)
- Acentos correctos (á, é, í, ó, ú, ñ) — si ves caracteres raros como `Ã©` en lugar de `é`, hay un problema de codificación

---

## PASO 2 — Vista del horario

Desplázate hasta la sección "Reservar clase" o "Horario" donde aparece el calendario semanal.

### Verifica:
- [ ] Aparecen 7 botones de día (Lun-Dom o L-M-X-J-V-S-D)
- [ ] El día actual está resaltado con "Hoy"
- [ ] Los nombres de los días están en español: **Lun, Mar, Mié, Jue, Vie, Sáb, Dom**
- [ ] Las clases del día seleccionado aparecen en una lista con: nombre, hora, profesor/a, duración
- [ ] Los nombres de los tipos de clase usan los términos correctos: **Vinyasa Yoga, Pilates, Sound Healing, Breathwork, Sound Healing, Ice Bath** (sound healing, breathwork, ice bath se mantienen en inglés porque es la convención de la marca)
- [ ] Las plazas restantes aparecen en español: "X plazas restantes" o "Lleno" o "Lista de espera"
- [ ] Botón de "Reservar" en cada clase aparece en español

### Cosas raras a vigilar:
- Si una clase está llena, el botón debe decir **"Lista de espera"** (NO "Waitlist")
- Si una clase está completa, debe decir **"Lleno"** (NO "Full")
- Las horas deben estar en formato 24h y zona horaria de Madrid (ej. `19:00` no `7:00 PM`)

---

## PASO 3 — Abrir el modal de reserva

Haz clic en el botón "Reservar" de cualquier clase futura con plazas disponibles.

### Verifica que el modal se abre:
- [ ] El fondo se oscurece
- [ ] Aparece un panel/modal en el centro
- [ ] El panel muestra: nombre de la clase, fecha y hora, profesor/a, duración
- [ ] Hay un botón X o "Cerrar" arriba a la derecha del modal
- [ ] **CRÍTICO**: NO hay errores en la consola del navegador en este momento

### Si el modal NO se abre:
**STOP. Reporta esto inmediatamente.** Esta era una situación crítica anteriormente — un fallo de sintaxis JavaScript impedía que el modal se abriera. Si pasa de nuevo, dile a Marvyn: "El modal de reserva no abre, posible regresión del bug de JS de abril 2026."

---

## PASO 4 — Pantalla de selección de plan

Después de abrir el modal, deberías ver la pantalla "¿Cómo quieres reservar?" con varias opciones.

### Verifica las opciones mostradas:
- [ ] **Clase de prueba** — €18 (o el precio actual)
- [ ] **Drop-in / Clase suelta** — €22
- [ ] **3-Pack** — €50 — €16,67 cada una
- [ ] **5-Pack** — €85
- [ ] **10-Pack** — €149
- [ ] **Flex** — €99/mes
- [ ] **Ritual** — €109/mes
- [ ] **Immerse** — €130/mes (clases ilimitadas)
- [ ] **Immerse 3 Meses** — €330

### Detalles a verificar:
- [ ] Los precios usan la coma decimal europea: `€16,67` (NO `€16.67`)
- [ ] Las descripciones están en español (ej. "Cancela cuando quieras", "Primer mes, se renueva cada mes")
- [ ] La membresía Immerse aparece destacada como recomendada o popular
- [ ] No hay opciones marcadas como "Popular" en inglés — si existe el badge, debe estar en español o ser visualmente neutro
- [ ] Cualquier referencia a "ilimitado" usa la palabra correcta: **ilimitadas** (clases ilimitadas), no "unlimited"

---

## PASO 5 — Flujo de invitado (sin cuenta existente)

Selecciona la opción de **Clase de prueba (€18)**.

### Pantalla de datos personales:
- [ ] Aparece un formulario pidiendo: Nombre, Apellido, Email
- [ ] Las etiquetas están en español: **Nombre / Apellido / Email** (o "Correo electrónico")
- [ ] Hay un enlace o texto que dice "¿Ya tienes cuenta? Inicia sesión" — debe estar en español
- [ ] El botón principal dice **"Continuar"** (NO "Continue")

### Rellena con datos de prueba:
- Nombre: `Test`
- Apellido: `Cliente`
- Email: usa un email **que SÍ esté en el sistema** (puedes pedirle uno a Marvyn) Y luego repite la prueba con un email nuevo

### Caso 1: Email ya registrado
Si el email YA tiene cuenta en Momence, debería aparecer:
- [ ] Un mensaje en español tipo **"Cuenta encontrada"** — "Este email ya está registrado..."
- [ ] Un botón para iniciar sesión en español
- [ ] Un enlace "¿Olvidaste tu contraseña?" en español

### Caso 2: Email nuevo
Si el email es completamente nuevo, debería pasar directamente a la pantalla de pago.

---

## PASO 6 — Pantalla de pago

Después del email check, debería aparecer el formulario de pago.

### Verifica los textos:
- [ ] Cabecera "Reservando como [Nombre Apellido]" en español
- [ ] El precio total grande aparece (ej. **€18**)
- [ ] Texto descriptivo: "Pago único" (NO "One-time payment")
- [ ] Para membresías: "Primer mes, se renueva cada mes" o "Cobro único"

### Código promocional:
- [ ] Hay un enlace "Añadir código promocional →" en español (NO "Apply promo code")
- [ ] Al hacer clic, aparece el campo con placeholder en español ("Código")
- [ ] El botón al lado dice **"Aplicar"** (NO "Apply")

### Datos del cliente:
- [ ] "Número de teléfono" (con prefijo +34 por defecto)
- [ ] "Idioma preferido" (selector con opciones English / Castellano)
- [ ] "Ciudad de residencia"
- [ ] Todas las etiquetas en español

### Tarjeta:
- [ ] Etiqueta "Datos de la tarjeta" (NO "Card Details")
- [ ] El widget de Stripe aparece con campos para número, fecha, CVC
- [ ] Si el navegador soporta Apple Pay o Google Pay, debe aparecer el botón arriba con un divisor que dice "o paga con tarjeta" (NO "or pay with card")

### Botón de pago:
- [ ] El botón principal dice **"Pagar €18 y reservar clase"** (formato exacto: "Pagar [precio]€ y reservar clase")
- [ ] Hay un enlace "← Cambiar plan" debajo en español

### Auto-enroll:
- [ ] Si la sesión está vinculada a una clase concreta, hay un checkbox que dice algo como **"Inscríbeme automáticamente en [Nombre de la clase]"** (NO "Auto-enroll me in")

---

## PASO 7 — Pago real (CRÍTICO)

**ESTE ES EL PASO MÁS IMPORTANTE Y NUNCA SE HA PROBADO EN VIVO.**

### Opciones:
- **Opción A (recomendada para QA real):** Usa una tarjeta real con €18. Marvyn la reembolsa después.
- **Opción B (test):** Usa la tarjeta de prueba de Stripe `4242 4242 4242 4242` con cualquier fecha futura y cualquier CVC. Esto no cobra dinero real.

### Lo que debe pasar:
1. Botón cambia a **"Procesando..."** (NO "Processing...")
2. Después de 2-5 segundos, aparece una pantalla de confirmación
3. La confirmación está en español y muestra:
   - [ ] Mensaje de éxito en español
   - [ ] Nombre de la clase reservada (si era reserva de clase)
   - [ ] Fecha y hora
   - [ ] Botón **"Hecho"** (NO "Done")
4. NO hay errores en consola
5. Recibes un email de Momence con la confirmación de la compra

### Si algo falla:
- Mensaje de error debe estar en español
- "Error de conexión. Inténtalo de nuevo." (NO "Connection error. Try again.")
- "No se pudo cargar el formulario de pago. Desactiva los bloqueadores de anuncios y recarga la página." (NO "Payment form could not load...")

### Verifica en Stripe Dashboard (si Marvyn te da acceso):
- [ ] La transacción aparece en `https://dashboard.stripe.com/payments`
- [ ] La cantidad es la correcta
- [ ] El estado es "Successful"
- [ ] El customer email es el que usaste

### Verifica en Momence (Marvyn):
- [ ] La compra aparece en el panel de Momence
- [ ] El cliente fue creado/actualizado
- [ ] Si era reserva de clase, está inscrito en la sesión

---

## PASO 8 — Flujo con cuenta existente (login)

Cierra el modal y vuelve a abrirlo. Esta vez, en lugar de "Continuar como invitado", elige **"Iniciar sesión"**.

### Verifica:
- [ ] Pantalla de login en español
- [ ] Campos: Email, Contraseña
- [ ] Enlace "¿Olvidaste tu contraseña?" en español
- [ ] Botón **"Iniciar sesión y reservar"** (NO "Log in & Book")
- [ ] Enlace alternativo "¿Primera vez? Reserva como invitado" (NO "New here? Book as guest")

### Inicia sesión con un email/contraseña real (Marvyn te lo da):
- [ ] Si el botón cambia a **"Iniciando sesión..."** durante 1-2 segundos
- [ ] Si tienes MFA activado, aparece la pantalla de código de 6 dígitos en español
- [ ] Botón "Verificando..." durante el chequeo
- [ ] Después del login, si tienes una membresía con créditos, debe mostrar pantalla de **"Confirmar reserva"** en español
- [ ] Si NO tienes membresía con créditos, va a la pantalla de selección de plan

---

## PASO 9 — Confirmar reserva con créditos (si aplica)

Si el login te lleva a la pantalla de "Confirmar reserva":

### Verifica:
- [ ] Cabecera "Reservando como [Nombre]" en español
- [ ] Detalle de la membresía que se va a usar
- [ ] Texto de confirmación en español
- [ ] Botón **"Confirmar reserva"** (NO "Confirm booking")
- [ ] Al hacer clic, debe completar la reserva sin cobro
- [ ] Pantalla de éxito en español

---

## PASO 10 — Casos extremos

### Email vacío:
- [ ] Validación en español: **"Rellena los campos resaltados"**

### Email mal formateado:
- [ ] Mismo mensaje, campo del email resaltado en rojo

### Contraseña incorrecta:
- [ ] **"Email o contraseña incorrectos"** seguido de un enlace para reservar directamente en Momence

### Código promocional inválido:
- [ ] **"Código promocional no válido"** (NO "Invalid promo code")

### Cancelar el modal:
- [ ] El botón X cierra el modal
- [ ] La tecla ESC también cierra el modal
- [ ] Hacer clic fuera del modal lo cierra

### Refrescar la página con el modal abierto:
- [ ] El modal se cierra (estado limpio)
- [ ] Sin errores en consola

---

## PASO 11 — Móvil

Después de probar en escritorio, repite los pasos clave en móvil:
- Abre https://sabdastudio.com/es/m/schedule.html en tu teléfono
- O usa el modo móvil en Chrome DevTools (F12 → icono de móvil)

El flujo móvil es **similar pero usa una página separada** (`es/m/schedule.html`). Si encuentras diferencias entre el escritorio y el móvil, anótalas.

---

## CHECKLIST FINAL

Después de completar todos los pasos:

- [ ] El flujo completo funciona end-to-end
- [ ] No hay texto en inglés visible para el usuario
- [ ] No hay errores en la consola del navegador
- [ ] El pago real se procesa correctamente
- [ ] Recibo email de confirmación
- [ ] La reserva aparece en Momence
- [ ] El customer aparece en Stripe

### Notas de QA:
**Cosas a reportar a Marvyn aunque no sean errores:**
- Frases que suenan raras o "robóticas" (traducción literal en lugar de natural)
- Sugerencias de mejora de copy
- Cualquier elemento que se vea desalineado o mal proporcionado
- Botones difíciles de pulsar
- Tiempos de carga lentos
- Cualquier texto que se corte o no quepa en su contenedor

---

## Después del QA: lo que necesita Marvyn

Envíale a Marvyn:
1. **Lista de problemas críticos** (cosas que rompen el flujo)
2. **Lista de problemas menores** (texto raro, alineamiento, etc.)
3. **Captura de pantalla del email de confirmación** que recibiste
4. **ID de la transacción de Stripe**
5. **Tu opinión general**: ¿enviarías a un amigo a reservar aquí?

---

## CONTEXTO TÉCNICO (para Claude o quien siga después)

**Por qué este checklist existe:**
La traducción al español del flujo de reserva en `/es/clases/` se hizo en 27 commits de Git a través de varias sesiones. Los audits automatizados pasaron, pero el flujo nunca fue probado por un humano nativo. Específicamente:

- **Bug crítico anterior**: Una traducción anterior corrompió identificadores de JavaScript (`getDay()` → `getDía()`, `dateTime` → `dateHora`, `isWaitlist:` → `isLista de espera:`), lo que rompía el modal de reserva con un error de sintaxis. Fue arreglado en commit `4148a44`.
- **Después del fix**: el modal se carga sin errores de sintaxis, pero nadie ha completado un pago real end-to-end.
- **Lo que el QA humano puede pillar y los audits no**: frases poco naturales, problemas de UX, layouts rotos por texto largo en español, inconsistencias regionales (vosotros vs ustedes), validaciones que devuelven errores genéricos.

**Si encuentras un bug de JavaScript que corrompa el modal**, comenta inmediatamente a Marvyn que es una posible **regresión del bug de identificadores corruptos de abril 2026**. La forma rápida de verificarlo: abrir DevTools → Console → escribir `typeof renderDays === 'function'` — debe dar `true`. Si da `false`, es muy probable que `renderDays` se haya convertido en `renderDías` otra vez.

---

## RESUMEN: ¿qué pasa si todo funciona?

Si pasas de los Pasos 1-11 sin encontrar problemas críticos:
1. Marca este QA como completo en el sistema de tracking
2. El flujo de reserva en español está oficialmente listo para producción
3. La sesión de localización al español puede cerrarse formalmente
4. Marvyn puede empezar la localización al catalán con confianza (ya hay un manual: `SABDA_Catalan_Translation_Manual.md`)

Si encuentras problemas críticos:
1. Reporta inmediatamente a Marvyn
2. NO sigas comprando — para el flujo en cuanto el bug sea bloqueante
3. Marvyn te dirá si arregla y vuelves a probar, o si abre una sesión nueva con Claude para fix

¡Gracias por hacer este QA! Es la última pieza del puzle de la localización al español.
