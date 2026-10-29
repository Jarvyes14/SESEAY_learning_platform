import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const courseId = "0d3bfc11-6f31-432e-b32c-f2e9691f4ce0";

const modules = [
  {
    id: "intro",
    type: "READING",
    title: "Antes de comenzar",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { body: "En esta guía crearás un curso completo desde el panel de administración. Todo el recorrido vive dentro de una sola actividad modular: encontrarás explicaciones, capturas reales, tarjetas interactivas, una secuencia para ordenar y preguntas de comprobación.\n\nLa estructura de la plataforma es: Curso → Bloque → Lección → Actividad. Una actividad modular puede contener tantos bloques de contenido como necesites." }
  },
  {
    id: "courses-panel",
    type: "IMAGE",
    title: "1. Abre el apartado de Cursos",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { url: "/course-assets/01-panel-cursos.png", alt: "Panel de administración con el apartado Cursos", caption: "Desde Cursos puedes crear, localizar y abrir el constructor de cada curso." }
  },
  {
    id: "planning-cards",
    type: "INTERACTIVE_CONTENT",
    title: "Prepara la experiencia",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { layout: "CARDS", items: [
      { title: "Define el objetivo", body: "Escribe qué podrá hacer el estudiante al terminar. El objetivo determina el contenido y la evaluación." },
      { title: "Diseña la ruta", body: "Agrupa el contenido en bloques y lecciones breves, con títulos que anticipen el resultado." },
      { title: "Decide cómo comprobar", body: "Mezcla explicaciones, ejemplos y preguntas. Configura intentos y calificación mínima cuando corresponda." }
    ] }
  },
  {
    id: "builder-structure",
    type: "IMAGE",
    title: "2. Construye la estructura",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { url: "/course-assets/02-constructor-estructura.png", alt: "Constructor del curso con un bloque, una lección y una actividad", caption: "Dentro del curso crea primero un bloque, después una lección y finalmente la actividad." }
  },
  {
    id: "hierarchy",
    type: "READING",
    title: "Cómo organizar el contenido",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { body: "Un BLOQUE representa una etapa amplia del curso. Dentro de él, cada LECCIÓN agrupa un propósito concreto. Dentro de cada lección, las ACTIVIDADES contienen la experiencia del estudiante.\n\nElige “Actividad modular” para mezclar texto, imágenes, video, enlaces, elementos interactivos y preguntas en una misma pantalla. Usa el botón “Agregar contenido” debajo de cada elemento para insertar el siguiente bloque y cambia el orden con las flechas." }
  },
  {
    id: "course-settings",
    type: "IMAGE",
    title: "3. Configura el curso",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { url: "/course-assets/03-configuracion-curso.png", alt: "Panel de configuración de un curso", caption: "Configura acceso, calificación, duración y certificado antes de publicar." }
  },
  {
    id: "configuration-tabs",
    type: "INTERACTIVE_CONTENT",
    title: "Revisa la configuración clave",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { layout: "TABS", items: [
      { title: "Acceso", body: "Define si el curso estará disponible por rol, organización o para usuarios específicos." },
      { title: "Certificado", body: "Selecciona una plantilla si el curso otorgará certificado. Si dejas la opción vacía, el paso para reclamarlo no aparecerá." },
      { title: "Publicación", body: "Verifica títulos, instrucciones y evaluaciones. Publica solo cuando la ruta esté completa y pueda recorrerse de inicio a fin." }
    ] }
  },
  {
    id: "activity-editor",
    type: "IMAGE",
    title: "4. Edita como lo verá el estudiante",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { url: "/course-assets/04-editor-actividad.png", alt: "Editor visual de una actividad modular", caption: "El editor utiliza la misma composición que la vista del estudiante; cada bloque sigue siendo editable." }
  },
  {
    id: "process-order",
    type: "ORDERING",
    title: "Ordena el flujo recomendado",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { items: ["Definir el objetivo de aprendizaje", "Crear el curso", "Agregar un bloque", "Agregar una lección", "Crear una actividad modular", "Configurar el certificado opcional", "Revisar y publicar"] }
  },
  {
    id: "knowledge-check",
    type: "QUESTIONS",
    title: "Comprueba lo aprendido",
    minimumReadSeconds: 0,
    minimumWatchPercent: 80,
    content: { questions: [
      { prompt: "¿Cuál es la jerarquía correcta?", options: ["Curso → Bloque → Lección → Actividad", "Curso → Actividad → Bloque → Lección", "Lección → Curso → Actividad → Bloque"], correctIndex: 0, points: 1 },
      { prompt: "¿Qué permite una actividad modular?", options: ["Usar únicamente texto", "Combinar varios tipos de contenido en una sola actividad", "Crear un certificado sin completar el curso"], correctIndex: 1, points: 1 },
      { prompt: "¿Cuándo aparece el paso para reclamar un certificado?", options: ["En todos los cursos", "Solo cuando el curso tiene una plantilla configurada y se completó", "Antes de iniciar la primera actividad"], correctIndex: 1, points: 1 }
    ] }
  }
];

const lessons = [
  {
    title: "Planea tu curso",
    description: "Define el propósito y conoce el espacio de trabajo antes de construir.",
    activities: [
      { title: "Bienvenida y estructura general", instructions: "Conoce la ruta que seguirás y la jerarquía de contenidos de la plataforma.", modules: [modules[0]] },
      { title: "Ubica el panel y prepara la experiencia", instructions: "Identifica dónde se administran los cursos y revisa las decisiones de planeación.", modules: [modules[1], modules[2]] }
    ]
  },
  {
    title: "Construye bloques, lecciones y actividades",
    description: "Crea la estructura que recorrerán los estudiantes.",
    activities: [
      { title: "Crea la estructura del curso", instructions: "Abre el constructor y reconoce cómo se relacionan bloques, lecciones y actividades.", modules: [modules[3], modules[4]] },
      { title: "Ordena el flujo de creación", instructions: "Organiza los pasos en la secuencia recomendada para construir y publicar.", modules: [modules[8]] }
    ]
  },
  {
    title: "Diseña una actividad modular",
    description: "Combina diferentes formatos en una misma experiencia continua.",
    activities: [
      { title: "Conoce el editor visual", instructions: "Revisa cómo se edita una actividad desde la misma perspectiva del estudiante.", modules: [modules[7]] },
      { title: "Comprueba el diseño modular", instructions: "Responde las preguntas para confirmar que puedes combinar y organizar contenidos.", modules: [modules[9]] }
    ]
  },
  {
    title: "Configura y publica",
    description: "Define acceso, evaluación y certificado antes de abrir el curso.",
    activities: [
      { title: "Configura el acceso y el certificado", instructions: "Revisa los ajustes esenciales y decide si el curso entregará un certificado.", modules: [modules[5], modules[6]] },
      { title: "Lista final para publicar", instructions: "Repasa el flujo completo antes de publicar tu curso.", modules: [{ id: "publish-checklist", type: "READING", title: "Antes de publicar", minimumReadSeconds: 0, minimumWatchPercent: 80, content: { body: "Comprueba que el objetivo del curso sea claro, que cada lección tenga una secuencia lógica y que todas las actividades puedan completarse. Revisa ortografía, enlaces, respuestas correctas, intentos y calificación mínima.\n\nSi configuraste una plantilla, al completar el curso aparecerá la actividad final para reclamar y descargar el certificado. Guarda los cambios, recorre el curso como estudiante y, cuando todo esté listo, publícalo." } }, modules[8]] }
    ]
  }
];

function activityPoints(activityModules) {
  const scoredPoints = activityModules.reduce((total, module) => {
    if (module.type === "QUESTIONS") return total + module.content.questions.reduce((sum, question) => sum + question.points, 0);
    if (module.type === "ORDERING") return total + module.content.items.length;
    return total;
  }, 0);
  return Math.max(1, scoredPoints);
}

async function main() {
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: { enrollments: true } });
  if (!course) throw new Error(`No se encontró el curso ${courseId}`);
  const template = await prisma.certificateTemplate.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!template) throw new Error("Crea al menos una plantilla de certificado antes de reconstruir el curso");
  const enrollmentIds = course.enrollments.map((enrollment) => enrollment.id);

  await prisma.$transaction(async (tx) => {
    await tx.certificate.deleteMany({ where: { courseId } });
    await tx.grade.deleteMany({ where: { courseId } });
    await tx.activityAttempt.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
    await tx.activityProgress.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
    await tx.courseProgress.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
    await tx.courseBlock.deleteMany({ where: { courseId } });

    const block = await tx.courseBlock.create({ data: { courseId, title: "Crea y publica un curso completo", description: "Un bloque formativo dividido en lecciones progresivas, desde la planeación hasta la publicación.", order: 1 } });
    const createdActivities = [];
    for (const [lessonIndex, lesson] of lessons.entries()) {
      const topic = await tx.topic.create({ data: { blockId: block.id, title: lesson.title, description: lesson.description, order: lessonIndex + 1 } });
      for (const [activityIndex, activity] of lesson.activities.entries()) {
        createdActivities.push(await tx.activity.create({ data: { topicId: topic.id, title: activity.title, instructions: activity.instructions, type: "COMPOSITE", order: activityIndex + 1, content: { modules: activity.modules }, points: activityPoints(activity.modules), maxAttempts: 3 } }));
      }
    }
    await tx.course.update({ where: { id: courseId }, data: { title: "Cómo crear cursos en la plataforma", description: "Aprende a diseñar, configurar y publicar un curso mezclando diferentes tipos de contenido dentro de una sola actividad modular.", category: "Capacitación para autores", durationMinutes: 45, passingGrade: 70, certificateEnabled: true, certificateTemplateId: template.id, status: "PUBLISHED" } });

    for (const enrollment of course.enrollments) {
      await tx.enrollment.update({ where: { id: enrollment.id }, data: { status: "ACTIVE", completedAt: null } });
      await tx.courseProgress.create({ data: { enrollmentId: enrollment.id } });
      await tx.activityProgress.createMany({ data: createdActivities.map((activity, index) => ({ enrollmentId: enrollment.id, studentId: enrollment.studentId, activityId: activity.id, status: index === 0 ? "AVAILABLE" : "LOCKED" })) });
    }
  });
  console.log(`Curso reconstruido con 1 bloque, ${lessons.length} lecciones, ${lessons.reduce((total, lesson) => total + lesson.activities.length, 0)} actividades y ${course.enrollments.length} inscripción(es) reiniciada(s).`);
}

main().finally(() => prisma.$disconnect());
