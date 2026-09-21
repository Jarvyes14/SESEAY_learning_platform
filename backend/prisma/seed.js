import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roles = [
  ["platform_admin", "Platform administrator"],
  ["government_admin", "Government administrator"],
  ["organization_admin", "Organization administrator"],
  ["instructor", "Instructor"],
  ["student", "Student"]
];

async function main() {
  const createdRoles = {};
  for (const [name, displayName] of roles) {
    createdRoles[name] = await prisma.role.upsert({
      where: { name },
      update: { displayName },
      create: { name, displayName }
    });
  }

  const existingAdministrator = await prisma.user.findFirst({
    where: { roleId: createdRoles.platform_admin.id },
    select: { id: true }
  });
  let administratorId = existingAdministrator?.id;

  if (!existingAdministrator) {
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!email || !email.includes("@")) {
      throw new Error("INITIAL_ADMIN_EMAIL is required to create the first administrator");
    }
    if (!password || password.length < 12 || password.length > 72) {
      throw new Error("INITIAL_ADMIN_PASSWORD must contain between 12 and 72 characters");
    }

    const administrator = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: "Platform",
        lastName: "Administrator",
        roleId: createdRoles.platform_admin.id
      }
    });
    administratorId = administrator.id;
    console.log(`Initial administrator created: ${email}`);
  } else {
    console.log("An existing platform administrator was preserved");
  }

  const tutorialSlug = "tutorial-para-crear-cursos-en-la-plataforma";
  const existingTutorial = await prisma.course.findUnique({ where: { slug: tutorialSlug } });
  if (!existingTutorial) {
    await prisma.course.create({
      data: {
        title: "Tutorial para crear cursos en la plataforma",
        slug: tutorialSlug,
        description: "Curso práctico y detallado para administradores e instructores. Explica cómo planear, estructurar, configurar el acceso, crear contenidos y ejercicios, revisar la calidad y publicar un curso completo.",
        category: "Administración de la plataforma",
        difficulty: "BEGINNER",
        durationMinutes: 180,
        passingGrade: 80,
        status: "PUBLISHED",
        certificateEnabled: true,
        instructorId: administratorId,
        accessType: "USERS",
        accessUsers: { create: [{ userId: administratorId }] },
        blocks: {
          create: [
            {
              order: 1,
              title: "Planificación del curso",
              description: "Define el propósito, la audiencia y los resultados esperados antes de crear contenido.",
              topics: {
                create: [
                  {
                    order: 1,
                    title: "Objetivos y alcance",
                    description: "Cómo convertir una necesidad de capacitación en objetivos observables.",
                    activities: {
                      create: [
                        {
                          order: 1,
                          title: "Antes de abrir el constructor",
                          instructions: "Lee la guía y relaciona cada decisión con el curso que deseas crear.",
                          type: "READING",
                          content: { body: "Un curso sólido comienza antes de capturar información en la plataforma. Identifica a quién va dirigido, qué problema debe resolver y qué conducta podrá demostrar el participante al terminar. Redacta objetivos con verbos observables, delimita los conocimientos previos y estima una duración realista. Después divide el recorrido en bloques temáticos, lecciones breves y actividades que permitan practicar. Cada actividad debe aportar evidencia de aprendizaje; evita agregar contenido que no se relacione con un objetivo. Finalmente, define desde el inicio quién tendrá acceso y cómo se aprobará el curso." },
                          minimumReadSeconds: 15
                        },
                        {
                          order: 2,
                          title: "Comprobación de la planificación",
                          instructions: "Indica si cada afirmación es verdadera o falsa.",
                          type: "TRUE_FALSE",
                          content: { statements: [
                            { prompt: "Los objetivos deben describir resultados observables.", correctAnswer: true, points: 1 },
                            { prompt: "Conviene crear actividades sin relacionarlas con los objetivos del curso.", correctAnswer: false, points: 1 },
                            { prompt: "La audiencia debe definirse antes de publicar.", correctAnswer: true, points: 1 }
                          ] },
                          points: 3,
                          maxAttempts: 3
                        }
                      ]
                    }
                  },
                  {
                    order: 2,
                    title: "Datos generales del curso",
                    activities: {
                      create: [
                        {
                          order: 1,
                          title: "Elementos de la ficha del curso",
                          instructions: "Explora las tarjetas para conocer la función de cada dato.",
                          type: "INTERACTIVE_CONTENT",
                          content: { layout: "CARDS", items: [
                            { title: "Título y descripción", body: "Usa un título directo y una descripción que explique el beneficio, el alcance y la audiencia." },
                            { title: "Categoría y dificultad", body: "Facilitan la clasificación del catálogo y ayudan al participante a reconocer el nivel esperado." },
                            { title: "Duración y calificación", body: "La duración orienta la planeación; la calificación mínima determina el criterio de aprobación." },
                            { title: "Certificado", body: "Actívalo únicamente cuando la conclusión y la calificación deban producir una constancia verificable." }
                          ] }
                        },
                        {
                          order: 2,
                          title: "Completa los conceptos",
                          instructions: "Escribe el término que completa correctamente cada frase.",
                          type: "FILL_BLANKS",
                          content: { sentences: [
                            { prompt: "El dato que agrupa cursos de temática semejante se llama ____.", answer: "categoría", caseSensitive: false, points: 1 },
                            { prompt: "El porcentaje requerido para aprobar es la ____ mínima.", answer: "calificación", caseSensitive: false, points: 1 },
                            { prompt: "Un curso nuevo debe comenzar con estado ____.", answer: "borrador", caseSensitive: false, points: 1 }
                          ] },
                          points: 3,
                          maxAttempts: 3
                        }
                      ]
                    }
                  }
                ]
              }
            },
            {
              order: 2,
              title: "Construcción de lecciones y contenidos",
              description: "Organiza el recorrido y utiliza recursos adecuados para cada objetivo.",
              topics: {
                create: [
                  {
                    order: 1,
                    title: "Bloques, lecciones y actividades",
                    activities: {
                      create: [
                        {
                          order: 1,
                          title: "La jerarquía del curso",
                          instructions: "Revisa cómo se organiza un curso dentro de la plataforma.",
                          type: "READING",
                          content: { body: "La plataforma organiza cada curso en tres niveles. Los bloques reúnen grandes unidades o etapas. Dentro de cada bloque, las lecciones desarrollan una idea concreta. Finalmente, las actividades presentan el contenido o solicitan una práctica. El estudiante avanza en el orden definido: al completar una actividad se habilita la siguiente. Por eso conviene crear lecciones breves, alternar explicación y práctica, y reservar el examen final para el cierre. Una estructura clara reduce la carga cognitiva y facilita localizar cualquier elemento en el constructor." },
                          minimumReadSeconds: 15
                        },
                        {
                          order: 2,
                          title: "Ordena el proceso de construcción",
                          instructions: "Mueve los elementos hasta representar el flujo recomendado.",
                          type: "ORDERING",
                          content: { items: [
                            "Crear el curso como borrador",
                            "Agregar bloques temáticos",
                            "Crear lecciones dentro de cada bloque",
                            "Agregar contenidos y ejercicios",
                            "Configurar la audiencia y publicar"
                          ] },
                          points: 5,
                          maxAttempts: 3
                        }
                      ]
                    }
                  },
                  {
                    order: 2,
                    title: "Recursos externos y embebidos",
                    activities: {
                      create: [
                        {
                          order: 1,
                          title: "Consulta un recurso externo",
                          instructions: "Abre el recurso en una pestaña nueva y vuelve para marcarlo como revisado.",
                          type: "EXTERNAL_LINK",
                          content: { url: "https://developer.mozilla.org/es/docs/Learn_web_development/Core/Structuring_content", label: "Ejemplo de recurso complementario", description: "Los enlaces externos sirven para leyes, artículos, sitios oficiales y material complementario que se mantiene fuera de la plataforma." }
                        },
                        {
                          order: 2,
                          title: "Ejemplo de contenido embebido",
                          instructions: "Explora el contenido integrado y confirma que lo revisaste.",
                          type: "EMBEDDED_CONTENT",
                          content: { url: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ", title: "Demostración de contenido embebido", height: 480 }
                        }
                      ]
                    }
                  }
                ]
              }
            },
            {
              order: 3,
              title: "Diseño de prácticas y evaluación",
              description: "Selecciona ejercicios que produzcan evidencia útil y retroalimentación.",
              topics: {
                create: [
                  {
                    order: 1,
                    title: "Decisiones de diseño",
                    activities: {
                      create: [
                        {
                          order: 1,
                          title: "Caso práctico: curso de integridad",
                          instructions: "Lee el escenario y elige la mejor decisión en cada pregunta.",
                          type: "CASE_STUDY",
                          content: { scenario: "Una dependencia necesita capacitar a todo su personal en prevención de conflictos de interés. Existen tres organizaciones en la plataforma, pero el curso solo corresponde a una de ellas. El equipo desea incluir explicación, práctica y una comprobación final, y necesita saber quién concluyó satisfactoriamente.", questions: [
                            { prompt: "¿Qué audiencia debe configurarse?", options: ["Todos los usuarios", "La organización correspondiente", "Solo administradores"], correctIndex: 1, points: 2 },
                            { prompt: "¿Qué combinación ofrece mejor evidencia?", options: ["Solo una lectura", "Lectura, caso práctico y examen", "Solo un enlace externo"], correctIndex: 1, points: 2 },
                            { prompt: "¿Qué opción permite emitir constancia al aprobar?", options: ["Activar certificado", "Archivar el curso", "Quitar la calificación mínima"], correctIndex: 0, points: 2 }
                          ] },
                          points: 6,
                          maxAttempts: 3
                        },
                        {
                          order: 2,
                          title: "Preguntas de selección múltiple",
                          instructions: "Selecciona la respuesta correcta.",
                          type: "QUESTIONS",
                          content: { questions: [
                            { prompt: "¿Qué nivel contiene directamente las actividades?", options: ["Curso", "Lección", "Organización"], correctIndex: 1, points: 1 },
                            { prompt: "¿Cuándo se habilita la siguiente actividad?", options: ["Al completar la anterior", "Al cerrar el navegador", "Al crear al usuario"], correctIndex: 0, points: 1 },
                            { prompt: "¿Qué estado permite a la audiencia encontrar el curso?", options: ["DRAFT", "PUBLISHED", "ARCHIVED"], correctIndex: 1, points: 1 }
                          ] },
                          points: 3,
                          maxAttempts: 3
                        }
                      ]
                    }
                  },
                  {
                    order: 2,
                    title: "Variantes de ejercicios",
                    activities: {
                      create: [
                        {
                          order: 1,
                          title: "Relaciona cada elemento",
                          instructions: "Relaciona el concepto con su función principal.",
                          type: "MATCHING",
                          content: { pairs: [
                            { left: "Bloque", right: "Agrupa una gran unidad temática" },
                            { left: "Lección", right: "Desarrolla una idea concreta" },
                            { left: "Actividad", right: "Presenta contenido o solicita práctica" },
                            { left: "Audiencia", right: "Determina quién puede acceder" }
                          ] },
                          points: 4,
                          maxAttempts: 3
                        },
                        {
                          order: 2,
                          title: "Detecta las configuraciones incorrectas",
                          instructions: "Selecciona todos los fragmentos que describen una mala práctica.",
                          type: "INCORRECT_SECTION",
                          content: { sections: [
                            { text: "Cada actividad se relaciona con un objetivo de aprendizaje.", incorrect: false },
                            { text: "El curso se publica vacío para completarlo después.", incorrect: true },
                            { text: "La audiencia se revisa antes de publicar.", incorrect: false },
                            { text: "Todas las preguntas muestran su respuesta correcta al estudiante.", incorrect: true }
                          ] },
                          points: 4,
                          maxAttempts: 3
                        }
                      ]
                    }
                  }
                ]
              }
            },
            {
              order: 4,
              title: "Acceso, revisión y publicación",
              description: "Configura la audiencia, realiza control de calidad y publica responsablemente.",
              topics: {
                create: [
                  {
                    order: 1,
                    title: "Reglas de acceso",
                    activities: {
                      create: [
                        {
                          order: 1,
                          title: "Tres maneras de asignar audiencia",
                          instructions: "Lee cuidadosamente las diferencias antes de elegir una opción.",
                          type: "READING",
                          content: { body: "La configuración de acceso ofrece tres modalidades excluyentes. Rol permite que todas las cuentas con un rol determinado encuentren el curso; resulta útil para cursos generales dirigidos, por ejemplo, a todos los estudiantes. Organización limita el curso a las personas que pertenecen a una institución concreta. Usuarios permite seleccionar cuentas individuales cuando la capacitación debe dirigirse a un grupo específico. La audiencia no sustituye la publicación: un curso en borrador permanece oculto aunque tenga una regla configurada. Revisa siempre la selección antes de cambiar el estado a publicado." },
                          minimumReadSeconds: 15
                        },
                        {
                          order: 2,
                          title: "Verifica las reglas de acceso",
                          instructions: "Marca verdadero o falso.",
                          type: "TRUE_FALSE",
                          content: { statements: [
                            { prompt: "La modalidad Usuarios permite elegir cuentas específicas.", correctAnswer: true, points: 1 },
                            { prompt: "Un curso en borrador aparece automáticamente a su audiencia.", correctAnswer: false, points: 1 },
                            { prompt: "La modalidad Organización limita el acceso a una institución.", correctAnswer: true, points: 1 }
                          ] },
                          points: 3,
                          maxAttempts: 3
                        }
                      ]
                    }
                  },
                  {
                    order: 2,
                    title: "Control de calidad y cierre",
                    activities: {
                      create: [
                        {
                          order: 1,
                          title: "Lista de revisión del autor",
                          instructions: "Describe cómo revisarías un curso antes de publicarlo. La respuesta puede ser evaluada por un instructor.",
                          type: "ASSIGNMENT",
                          content: { fields: [
                            { label: "Objetivo principal del curso", type: "textarea", required: true },
                            { label: "Cómo comprobarás el aprendizaje", type: "textarea", required: true },
                            { label: "Audiencia seleccionada y justificación", type: "textarea", required: true },
                            { label: "Observaciones finales", type: "textarea", required: false }
                          ] },
                          points: 10,
                          maxAttempts: 2
                        },
                        {
                          order: 2,
                          title: "Examen final del constructor de cursos",
                          instructions: "Responde todas las preguntas. Necesitas dominar el flujo completo para concluir.",
                          type: "FINAL_EXAM",
                          content: { questions: [
                            { prompt: "¿Cuál es el orden correcto de la estructura?", options: ["Curso, bloque, lección, actividad", "Curso, actividad, organización", "Bloque, usuario, curso"], correctIndex: 0, points: 2 },
                            { prompt: "¿Qué acceso usarías para una sola institución?", options: ["Rol", "Organización", "Usuarios sin seleccionar"], correctIndex: 1, points: 2 },
                            { prompt: "¿Qué debe existir antes de publicar?", options: ["Al menos una actividad", "Un certificado emitido", "Una cuenta desactivada"], correctIndex: 0, points: 2 },
                            { prompt: "¿Qué ejercicio permite evaluar una decisión contextual?", options: ["Caso práctico", "Enlace externo", "Texto informativo"], correctIndex: 0, points: 2 },
                            { prompt: "¿Quién elige la audiencia del curso?", options: ["El constructor autorizado", "Cada estudiante", "El navegador"], correctIndex: 0, points: 2 }
                          ] },
                          points: 10,
                          maxAttempts: 3
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    });
    console.log("Tutorial course created");
  } else {
    console.log("Existing tutorial course preserved");
  }

  console.log("Seed complete");
  console.log("No demo organizations, enrollments, grades, or certificates are seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
