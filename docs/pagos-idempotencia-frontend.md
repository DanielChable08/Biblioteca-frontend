# Recuperación de pagos en Angular

El módulo conserva en `sessionStorage` un único intento pendiente por ID de cuenta. El registro contiene el UUID de `Idempotency-Key`, el DTO exacto que se envió y el total mostrado por el formulario. No almacena el token, credenciales ni datos del lector. Los IDs de cuenta y multa se usan para asociar la recuperación sin persistir nombres o correos.

La clave se crea antes de la primera petición y el intento se guarda antes de llamar al endpoint. Tras un error de red, timeout, respuesta `5xx` o conflicto que indique procesamiento concurrente, el formulario conserva el intento y ofrece un reintento manual con el mismo UUID y cuerpo. Una recarga o navegación dentro de la misma pestaña restaura el intento como incierto; no se envía automáticamente.

## Límites

- `sessionStorage` está disponible para JavaScript del mismo origen y dura mientras siga abierta la pestaña. Cerrar la pestaña o el navegador puede borrar el intento incierto, por lo que la recuperación no es persistencia entre sesiones.
- El servidor no ofrece una consulta de estado por clave. La forma disponible de resolver un resultado incierto es repetir manualmente el `POST` con el mismo cuerpo y clave; el backend devuelve el pago original si ya se confirmó.
- Si el registro local está corrupto o no puede leerse, la pantalla bloquea pagos nuevos en esa sesión para evitar un posible cobro duplicado.
- La clasificación de `409` depende de los mensajes actuales del backend: procesamiento concurrente y cualquier conflicto no reconocido son inciertos; clave reutilizada con datos distintos y conflictos de estado de multa reconocidos son definitivos. Si el backend cambia esos mensajes, se debe actualizar el clasificador del componente.
