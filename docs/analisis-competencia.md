# Análisis de competencia — Apps de recordatorio de medicación

## 1. Apps analizadas

| App | Modelo | Precio premium |
|---|---|---|
| **MyTherapy** | Gratis (con anuncios); premium quita anuncios | Suscripción o pago único (~10-13€) |
| **Medisafe** | Gratis con compras dentro de la app | 4,99€/mes o 39,99€/año |
| **RecuerdaMed** | Totalmente gratuita (proyecto público andaluz) | No tiene |
| **Recordatorio de Medicamentos** | Gratis hasta 3 medicamentos | De pago para medicamentos ilimitados |
| **Dosecast** | Gratis con versión premium | De pago |

---

## 2. Funciones que ofrecen (agrupadas)

### Núcleo — presente en todas
- Alarma/recordatorio a la hora exacta de cada toma
- Posponer una toma desde la notificación
- Marcar como "tomado" / "omitido" y guardar el motivo
- Gestión de varios medicamentos con horarios distintos
- Historial de tomas (calendario o lista)

### Gestión avanzada de tratamiento
- Aviso de "quedan pocas pastillas" para reponer a tiempo (Recordatorio de Medicamentos, Medisafe)
- Escaneo del código de barras de la caja para dar de alta el medicamento automáticamente (RecuerdaMed, Medisafe)
- Indicación de si el medicamento se toma antes/después de las comidas y agrupación de varias tomas en una sola notificación (MyTherapy)
- Información del prospecto y alertas (p. ej. si afecta a la conducción) (RecuerdaMed)
- Recordatorio de citas médicas y envío del listado de medicación al médico por email (Recordatorio de Medicamentos)

### Seguimiento de salud (más allá de la medicación)
- Registro de medidas: tensión arterial, glucosa, peso, síntomas, estado de ánimo (MyTherapy, Medisafe)
- Informes mensuales exportables en PDF para consultas médicas (MyTherapy)
- Gráficos de evolución en el tiempo

### Función social / cuidadores
- Añadir familiares o cuidadores que reciben alerta si el usuario olvida una toma ("Medafriends" en Medisafe, aviso a familiares en MyTherapy)
- Portal o vista para que un cuidador supervise varios perfiles

### Monetización que usan
- Anuncios en la versión gratuita, opción de pago para quitarlos (MyTherapy, similar a lo que planteáis)
- Límite de funciones (nº de medicamentos, nº de cuidadores, colores de tema) desbloqueables con premium
- Suscripción mensual/anual además de pago único de por vida

---

## 3. Funciones adoptadas para vuestra app

Dado que será **gratuita con anuncios pequeños en el futuro**, conviene diferenciarse por ser rápida, simple y 100% offline (muchas competidoras exigen cuenta y sincronización en la nube). Se descarta el "modo cuidador" con sincronización entre dispositivos, ya que requeriría un servidor propio — rompería el objetivo de app sin backend. El resto de funciones detectadas en la competencia sí se incorporan:

**MVP (núcleo):**
- Alta de medicamento con nombre, dosis, horario y frecuencia
- Alarma nativa a la hora exacta con opción de posponer
- Marcar tomado / omitido, con motivo opcional
- Historial simple (lista o calendario) de tomas
- Aviso de "quedan pocas unidades" (se calcula con SQLite: unidades restantes = stock − tomas registradas)

**Incorporadas de la competencia, sin necesidad de servidor:**
- Agrupar varias tomas en una sola notificación si coinciden en horario (evita fatiga de notificaciones)
- Indicar si se toma antes/después de comer, como aviso extra en la notificación
- Exportar historial a PDF o compartirlo antes de una cita médica (se genera localmente en el dispositivo, sin backend)
- Escaneo del código de barras de la caja para dar de alta el medicamento más rápido (lectura local con la cámara, sin llamada a servidor externo)
- Registro de medidas de salud básicas (peso, tensión, glucosa, síntomas, estado de ánimo) con gráfico de evolución, guardado en SQLite
- Recordatorio de citas médicas (mismo motor de notificaciones locales que las tomas)
- Información básica del medicamento y alertas asociadas (p. ej. si afecta a la conducción), como ficha estática guardada localmente

**Descartada:**
- Modo "cuidador" (un familiar ve el estado de tomas de otro usuario) — es la función estrella de Medisafe y MyTherapy, pero exige sincronizar datos entre dos dispositivos, lo cual requiere servidor. Queda fuera del alcance actual.

**Dónde poner los anuncios (cuando lleguen):**
- Banner discreto en pantallas no críticas (historial, ajustes), nunca en la pantalla de alarma/toma — por seguridad y porque interrumpir ese flujo genera rechazo
- Nunca anuncio intersticial al abrir la app recién instalada por primera vez ni justo antes de confirmar una toma
