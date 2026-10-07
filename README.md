# Forma: Tu Coach IA

Crea una app web mobile-first (pensada para iPhone, instalable como PWA) llamada "Forma": una app de entrenamiento de gimnasio estilo Hevy, con un asistente de IA que actúa como entrenador personal. Toda la interfaz en español.

## DISEÑO
- Tema oscuro. Fondo #0E0F13, tarjetas #1A1C23, bordes #2E3240, texto secundario #8A8F9E.
- Color de acento principal: lima #C6FF3D (botones primarios, volumen, checks, números destacados). Secundarios: coral #FF6B4A, morado #6C5CE7, azul marino #1B2A4A.
- Colores de fatiga muscular: rojo #FF4D4D, naranja #FF9A3D, amarillo #FFD84D.
- Tipografía limpia tipo iOS, esquinas muy redondeadas (12-16 px), botones grandes fáciles de tocar, aspecto premium y moderno.
- Navegación inferior con 4 pestañas: Inicio, Rutina, Progreso y Coach IA.

## 1. ONBOARDING
1. Pantalla de bienvenida con el logo y botón "Empezar".
2. Datos corporales: peso (kg), altura (cm) y medidas (pecho, cintura, brazo en cm).
3. Planificación semanal: lista de lunes a domingo; en cada día se eligen uno o varios grupos musculares (pecho, espalda, hombro, bíceps, tríceps, pierna, brazo, abdomen) o "Descanso". Ejemplo precargado: Lunes pecho/hombro/tríceps; Martes espalda/bíceps; Miércoles pierna; Jueves pecho/espalda; Viernes brazo/hombro; Sábado y Domingo descanso.
4. Pregunta: "¿Cómo armamos tus días?" con dos opciones: "Manual" (eliges tú los ejercicios de cada día) o "Con IA" ("Soy nuevo: crea los ejercicios según lo que toca cada día"). Si elige IA, genera automáticamente una rutina de ejercicios para cada día según sus grupos musculares.

## 2. BIBLIOTECA DE EJERCICIOS (con imagen y descripción)
Cada ejercicio debe mostrar su animación (GIF) y su descripción/guía. Usa el dataset https://github.com/hasaneyldrm/exercises-dataset, cargando los datos de data/exercises.json y los GIFs desde jsDelivr (patrón: https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/ID.gif). Campos a usar: nombre, músculo objetivo (target), músculos secundarios, equipamiento, instrucciones (en español si existen) y GIF. Si el archivo completo es demasiado pesado, empieza con estos ejercicios de prueba y amplía después:
- Press banca con barra: 0025-EIeI8Vf
- Sentadilla: 0043-qXTaZnJ
- Peso muerto: 0032-ila4NZS
- Dominadas: 0652-lBDjFxJ
- Curl de bíceps con mancuernas: 0294-NbVPDMW
- Elevaciones laterales: 0334-DsgkuIt
Pantalla de detalle de ejercicio: GIF grande, etiquetas (equipamiento, músculo principal, secundarios), pasos de ejecución y la nota "© Gym visual". Incluye búsqueda y filtro por grupo muscular.

## 3. PANTALLA DE ENTRENO EN VIVO
- Cabecera: "Lunes · Pecho", cronómetro del entreno en lima, y una tarjeta "Volumen total" con el número grande en lima (ej. 1.920 kg).
- Los ejercicios siguen el orden de la rutina del día. Cada ejercicio muestra miniatura GIF, nombre y "Equipamiento · Músculo".
- 3 series por defecto. Cada serie: botón rojo para quitarla, número de serie, campo editable de kg × campo editable de repeticiones, y check circular para completarla. Botón "+ Añadir serie".
- Al completar cada serie, el volumen total del entreno suma peso × repeticiones de esa serie (con animación de contador). Si se desmarca, se resta.
- Dos botones bajo cada ejercicio:
  · "Ocupada": cuando la máquina, mancuernas o banco no están libres. Reordena la rutina y propone un nuevo orden de forma inteligente: los ejercicios de mayor desgaste (compuestos) van primero y el ejercicio ocupado pasa más abajo. Muestra el nuevo orden con flechas y botón "Aceptar orden".
  · "Cambiar": sugiere automáticamente otro ejercicio del MISMO grupo muscular (preferiblemente con distinto equipamiento) para sustituirlo.
- Maqueta visual (sin funcionalidad real) de un mini reproductor tipo Spotify en la parte inferior, con portada, título, controles y barra de progreso.
- Botón grande lima "Terminar entreno".

## 4. ASISTENTE DE IA (ENTRENADOR PERSONAL)
- Botón flotante con icono de chispas, visible en todo momento, que abre un chat con el entrenador IA.
- Puede responder cualquier pregunta y MODIFICAR la rutina en directo si el usuario lo pide (cambiar un ejercicio, reordenar, añadir o quitar series, regenerar un día). Ejemplo: "Me molesta el hombro, cambia el press militar" → lo sustituye por elevaciones laterales y lo explica con la tarjeta del ejercicio (GIF).
- Cada cambio de la IA muestra un aviso ("1 cambio en tu rutina") y un botón "Deshacer" que restaura la rutina anterior. Guarda una copia (snapshot) de la rutina antes de cada cambio para poder deshacer varios pasos.
- La IA debe usar herramientas/funciones estructuradas (cambiar ejercicio, reordenar, añadir/quitar serie, generar día). La clave del modelo nunca debe estar en el frontend: usa Lovable AI o una función de backend.
- También debe poder aconsejar según el mapa de calor (ej. "tienes el pecho fatigado, hoy mejor espalda").

## 5. FIN DEL ENTRENO Y MONIGOTE
- Pantalla "¡Entreno completado!" con un monigote anatómico (estilo oscuro con brillo, vista frontal y trasera con selector) donde los músculos trabajados ese día aparecen al rojo vivo. Etiquetas flotantes con los nombres de músculos, chips con los grupos entrenados, tarjeta "Volumen total de hoy" en lima y botón "Finalizar y guardar".
- Construye el monigote en SVG con un path independiente por músculo (pecho, hombros, bíceps, tríceps, antebrazos, abdomen, espalda alta/trapecio, dorsal, lumbar, glúteos, cuádriceps, isquiotibiales, gemelos) para poder colorear cada uno por separado. Relaciona los músculos del dataset (target y secundarios) con estos paths.

## 6. MAPA DE CALOR CON MEMORIA
- El monigote mantiene un degradado de fatiga durante las 24-48 h siguientes al entreno, para que al abrir la app al día siguiente se vea qué zonas siguen cansadas antes de elegir qué entrenar. Muestra el monigote también en la pantalla de Inicio, con leyenda: rojo = hoy / máxima fatiga, naranja = recuperando, amarillo = ayer / casi recuperado, y etiquetas "HOY" y "AYER".
- No guardes colores: guarda cada serie con su fecha y hora y calcula la fatiga al abrir la app. Cada serie completada suma fatiga 1 al músculo principal y 0,5 a cada secundario, y decae con el tiempo: fatiga = suma de peso × e^(−horas/24). Colores: >2 rojo, >1 naranja, >0,3 amarillo, el resto sin color. El factor de 24 h debe ser configurable por grupo muscular.

## 7. RÉCORDS Y PROGRESO
- Cada ejercicio guarda su historial de pesos. Si en un entreno se supera el peso máximo anterior, se muestra una tarjeta "Nuevo récord" con trofeo, el peso nuevo y la marca anterior, y un botón "Compartir logro".
- Pestaña Progreso: lista de ejercicios con su récord actual y una gráfica de barras con la evolución (la última barra destacada en lima), insignia "PR" en los ejercicios con récord reciente y "sin récord" en los demás. Historial de entrenos con volumen total.

## 8. DATOS
- Guarda todo en Supabase (perfil, plan semanal, rutina por día, entrenos, series con peso, repeticiones y fecha/hora, récords e historial de cambios de la IA). Si no es posible, usa almacenamiento local como alternativa, pero con la estructura preparada para migrar.

Empieza construyendo el flujo completo con datos de ejemplo y que todo sea navegable.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/39afac41-8727-51fd-8834-85b3415eb282).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
