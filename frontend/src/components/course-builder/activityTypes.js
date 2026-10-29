import {
  Archive,
  Blocks,
  BookOpen,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  LayoutPanelTop,
  Link2,
  ListChecks,
  ListOrdered,
  Network,
  PanelsTopLeft,
  Scale,
  TextCursorInput,
  ToggleLeft,
  Video
} from "lucide-react";

export const CONTENT_TYPES = [
  { type: "COMPOSITE", label: "Actividad modular", description: "Combina texto, recursos y preguntas en una actividad.", group: "Contenido", icon: Blocks, selectable: false },
  { type: "READING", label: "Texto", description: "Escribe un artículo, guía o explicación.", group: "Contenido", icon: BookOpen },
  { type: "IMAGE", label: "Imagen", description: "Agrega una captura, diagrama o recurso visual.", group: "Contenido", icon: ImageIcon },
  { type: "YOUTUBE_VIDEO", label: "Video", description: "Agrega un video de YouTube.", group: "Contenido", icon: Video },
  { type: "EXTERNAL_LINK", label: "Enlace", description: "Dirige al participante a un recurso externo.", group: "Contenido", icon: Link2 },
  { type: "EMBEDDED_CONTENT", label: "Contenido incrustado", description: "Muestra un recurso externo dentro de la lección.", group: "Contenido", icon: PanelsTopLeft },
  { type: "INTERACTIVE_CONTENT", label: "Interactivo", description: "Crea tarjetas, pestañas o un acordeón.", group: "Contenido", icon: LayoutPanelTop },
  { type: "TRUE_FALSE", label: "Verdadero o falso", description: "Agrega una o más afirmaciones binarias.", group: "Comprobación", icon: ToggleLeft },
  { type: "QUESTIONS", label: "Opción múltiple", description: "Crea preguntas con opciones de respuesta.", group: "Comprobación", icon: FileQuestion },
  { type: "FILL_BLANKS", label: "Completar espacio", description: "Pide completar una frase.", group: "Comprobación", icon: TextCursorInput },
  { type: "MATCHING", label: "Relacionar", description: "Relaciona conceptos con sus definiciones.", group: "Comprobación", icon: Network },
  { type: "ORDERING", label: "Ordenar", description: "Ordena pasos en la secuencia correcta.", group: "Comprobación", icon: ListOrdered },
  { type: "INCORRECT_SECTION", label: "Encontrar el error", description: "Identifica fragmentos incorrectos.", group: "Comprobación", icon: ListChecks },
  { type: "CASE_STUDY", label: "Caso de estudio", description: "Combina un escenario con preguntas.", group: "Evaluaciones", icon: Scale },
  { type: "ASSIGNMENT", label: "Tarea", description: "Recopila una respuesta para revisión.", group: "Evaluaciones", icon: FileText },
  { type: "FINAL_EXAM", label: "Examen final", description: "Crea una evaluación final calificada.", group: "Evaluaciones", icon: Archive }
];

export const ACTIVITY_ICONS = Object.fromEntries(CONTENT_TYPES.map(({ type, icon }) => [type, icon]));
