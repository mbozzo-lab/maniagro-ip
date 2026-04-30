import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseEstado(s: string) {
  const v = s.trim().toLowerCase();
  if (v === "finalizado") return "FINALIZADO" as const;
  if (v === "en proceso") return "EN_PROCESO" as const;
  if (v.startsWith("en revisi")) return "EN_REVISION" as const;
  if (v === "retrasado") return "RETRASADO" as const;
  if (v === "anulado") return "ANULADO" as const;
  return "NO_INICIADO" as const;
}

function parsePrioridad(s: string) {
  if (s.startsWith("0")) return "ALTA" as const;
  if (s.startsWith("1")) return "MEDIA" as const;
  if (s.startsWith("2")) return "BAJA" as const;
  return "MEDIA" as const;
}

function parseTipo(s: string) {
  if (s === "ST") return "ST" as const;
  if (s === "SNP") return "SNP" as const;
  return null;
}

function parseClasif(s: string) {
  if (s === "A") return "A" as const;
  if (s === "B") return "B" as const;
  if (s === "C") return "C" as const;
  return null;
}

function parseBool(s: string): boolean | null {
  if (s === "SI") return true;
  if (s === "NO") return false;
  return null;
}

function parseAvance(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(",", ".").replace("%", ""));
  return isNaN(n) ? null : n;
}

// Accepts: "01/10/24", "1/04/2025", "02/2025", "2025", "16/07/1905"(skip)
function parseDate(s: string): Date | null {
  if (!s) return null;
  const clean = s.trim();
  // just a year
  if (/^\d{4}$/.test(clean)) return new Date(`${clean}-01-01`);
  // MM/YYYY or M/YYYY
  if (/^\d{1,2}\/\d{4}$/.test(clean)) {
    const [m, y] = clean.split("/");
    return new Date(`${y}-${m.padStart(2, "0")}-01`);
  }
  // D/MM/YY or DD/MM/YY or D/MM/YYYY or DD/MM/YYYY
  const parts = clean.split("/");
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) y = `20${y}`;
    const year = parseInt(y);
    // ignore bogus years like 1905
    if (year < 2000 || year > 2030) return null;
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  return null;
}

// ─── Criterios data ───────────────────────────────────────────────────────────

const criterios = [
  {
    tipo: "ST" as const,
    clasificacion: "C" as const,
    nombre: "Tipo C: Optimización Menor",
    definicion: "Ajustes y mejoras incrementales con bajo impacto en la operación. Se gestionan a nivel de área.",
    criterio1Label: "Impacto en Producción",
    criterio1: "Mínimo o nulo. Se puede implementar con la línea en marcha o con una parada muy breve (< 2 horas).",
    criterio2Label: "Complejidad Técnica",
    criterio2: 'Baja. Uso de tecnología conocida. Solución "plug & play" o configuración de parámetros. El riesgo es muy bajo.',
    criterio3Label: "Inversión",
    criterio3: "Baja. Generalmente se cubre con el presupuesto operativo (OPEX). (Ej: < 5,000 USD)",
    rolPruebas: "Verificación simple de funcionamiento post-cambio. Documentación menor.",
    ejemplos: "• Cambio de un sensor por un modelo superior.\n• Ajuste de velocidades en una cinta transportadora.\n• Implementación de una mejora en una HMI.",
    clientesDirectos: "Supervisor de Producción / Jefe de Producción",
  },
  {
    tipo: "ST" as const,
    clasificacion: "B" as const,
    nombre: "Tipo B: Modificación Relevante",
    definicion: "Modificaciones que requieren coordinación y una parada programada. Afectan a un sistema o subsistema.",
    criterio1Label: "Impacto en Producción",
    criterio1: "Moderado. Requiere una parada de línea planificada (ej: 1 turno, fin de semana). Afecta el OEE de forma temporal.",
    criterio2Label: "Complejidad Técnica",
    criterio2: "Media. Integración de nuevos equipos en sistemas existentes. Requiere validación y pruebas específicas. Riesgo controlado.",
    criterio3Label: "Inversión",
    criterio3: "Media. Requiere un presupuesto de inversión (CAPEX) aprobado y justificado. (Ej: 5,000 - 50,000 USD)",
    rolPruebas: "Planificación y ejecución de pruebas de validación para asegurar que el sistema modificado cumple las especificaciones.",
    ejemplos: "• Instalación de una nueva codificadora o sistema de visión.\n• Retrofit de un panel de control.\n• Cambio de un cabezal de llenado.",
    clientesDirectos: "Responsable de Producción / Mantenimiento",
  },
  {
    tipo: "ST" as const,
    clasificacion: "A" as const,
    nombre: "Tipo A: Reingeniería Mayor",
    definicion: "Proyectos transformadores que impactan significativamente la capacidad, tecnología o flujo de la planta.",
    criterio1Label: "Impacto en Producción",
    criterio1: "Alto. Requiere una parada mayor de una o varias líneas. Impacto directo y significativo en el plan de producción.",
    criterio2Label: "Complejidad Técnica",
    criterio2: "Alta. Implementación de tecnología nueva para la planta, automatización compleja o cambios estructurales en el proceso. Alto riesgo técnico.",
    criterio3Label: "Inversión",
    criterio3: "Alta. Inversión estratégica que requiere un caso de negocio detallado y aprobación directiva. (Ej: > 50,000 USD)",
    rolPruebas: "Diseño de un plan de comisionamiento y validación completo. Liderazgo en las pruebas de arranque (startup) y calificación (IQ/OQ/PQ).",
    ejemplos: "• Instalación de un robot paletizador al final de línea.\n• Automatización completa de un proceso manual.\n• Traslado y reinstalación de una línea completa.",
    clientesDirectos: "Gerente Industrial / Directorio",
  },
  {
    tipo: "SNP" as const,
    clasificacion: "C" as const,
    nombre: "Tipo C: Prueba de Rutina",
    definicion: "Pruebas de productos con cambios menores o que utilizan procesos y materias primas ya conocidas y validadas.",
    criterio1Label: "Novedad del Producto/Proceso",
    criterio1: "Baja. Extensión de línea, cambio de sabor/aroma, variación menor de empaque. El proceso productivo no cambia.",
    criterio2Label: "Escala de la Prueba",
    criterio2: "Pequeña. Prueba corta, de pocas horas, utilizando un lote mínimo. El material se puede gestionar fácilmente.",
    criterio3Label: "Riesgo (Calidad / Proceso)",
    criterio3: "Bajo. Se espera que el producto cumpla con las especificaciones a la primera. El riesgo de contaminar o parar la línea es casi nulo.",
    rolPruebas: "Supervisión y recolección de datos estándar. Emisión de un reporte simple.",
    ejemplos: "• Prueba de un nuevo colorante en una fórmula existente.\n• Validación de un segundo proveedor para un empaque actual.\n• Correr un producto conocido en una línea gemela.",
    clientesDirectos: "Analista de I+D",
  },
  {
    tipo: "SNP" as const,
    clasificacion: "B" as const,
    nombre: "Tipo B: Prueba de Desarrollo",
    definicion: "Pruebas de productos con nuevas formulaciones, materiales o que requieren ajustes significativos en los parámetros del proceso.",
    criterio1Label: "Novedad del Producto/Proceso",
    criterio1: "Media. Nueva formulación, uso de un ingrediente o material de empaque nuevo. Requiere ajustar y validar parámetros de proceso.",
    criterio2Label: "Escala de la Prueba",
    criterio2: 'Media. Prueba de 1-2 turnos. Requiere planificación de materiales y coordinación con producción para "abrir una ventana" en el plan.',
    criterio3Label: "Riesgo (Calidad / Proceso)",
    criterio3: "Moderado. Existe la posibilidad de obtener producto fuera de especificación. Se necesita un plan de contingencia claro.",
    rolPruebas: "Diseño del plan de pruebas (DOE), definición de variables críticas, coordinación con Calidad y Producción. Análisis detallado de resultados.",
    ejemplos: '• Introducción de un producto "sin azúcar" con un nuevo edulcorante.\n• Prueba de un nuevo film de envasado para mejorar la vida útil.\n• Producir un producto existente con una nueva materia prima clave.',
    clientesDirectos: "Líder de Proyecto / Ing. de Producto",
  },
  {
    tipo: "SNP" as const,
    clasificacion: "A" as const,
    nombre: "Tipo A: Prueba Estratégica",
    definicion: "Pruebas de productos disruptivos, que utilizan tecnología de proceso nueva o materias primas completamente desconocidas.",
    criterio1Label: "Novedad del Producto/Proceso",
    criterio1: "Alta. Producto radicalmente nuevo para la compañía. Requiere desarrollar un nuevo proceso o usar equipos de forma no estándar.",
    criterio2Label: "Escala de la Prueba",
    criterio2: "Grande. Prueba de varios días o que requiere simular una corrida de producción a escala real. Alto consumo de recursos y materiales.",
    criterio3Label: "Riesgo (Calidad / Proceso)",
    criterio3: "Alto. Alta incertidumbre sobre el resultado. Riesgo elevado de problemas de calidad, paradas de línea no planificadas o incluso daños a equipos.",
    rolPruebas: "Liderazgo del equipo multifuncional del proyecto (I+D, Marketing, Calidad, Producción). Definición de la estrategia de validación industrial y escalado.",
    ejemplos: "• Lanzamiento de una nueva categoría de producto (ej: una empresa de lácteos que lanza una bebida vegetal).\n• Prueba de un proceso completamente nuevo (ej: extrusión, liofilización).\n• Uso de un ingrediente innovador y de difícil procesamiento.",
    clientesDirectos: "Gerente de MKT / Director de Negocio",
  },
];

// ─── Proyectos raw data ───────────────────────────────────────────────────────
// Fields: [numero, proyecto, driver, planta, linea, tipo, clasif, origen, prioridad, criterio, detalle, activo, asignado, inversionEst, nroConsuman, fechaInicio, avance, estado, fechaFin, comentario, gerencia, im, repasarCon, defGcia, definicionIM]

const rows = [
  [1,"Traslado línea Pasta","Mejora línea","PE - Maní","Pasta","ST","A","Solicitud de Gerencia","2 Baja","Posterior a nave deposito","Traslado de la línea de producción de pasta y mantequilla de maní a la nueva planta de Productos Elaborados - Maní. Reformas en la línea con inclusión de equipos: Tanque homogeneizador, enfriador, dosificador de polvo, renovación de bombas. Capacidad 1 Tn/h.","NO","Bozzo","","","01/10/24","5,00%","Retrasado","","Se definió layout y se cotizaron equipos: bombas, enfriador, tanques. (01/02/2025)","NO","SI","Gaspar","",""],
  [2,"Frito continuo","Nueva línea","PE - Maní","Frito","ST","A","Solicitud de la Dirección","0 Alta","Necesidad de productividad y cierre de proyecto","Montaje de una línea para la elaborción de maní frito, de formato continuo, con capacidad de 2 Tn/h.","SI","Colaborativo","","","2021","75,00%","En proceso","Plazo: Fin 2025","En montaje de cañerías freidor (16/04/2025)","","","Gaspar - Rodrigo","",""],
  [3,"Montaje línea grana","Nueva línea","PE - Maní","Grana","ST","A","Solicitud de Gerencia","2 Baja","Baja demanda","Montaje de una línea para la elaboración de grana de maní tostada.","NO","Externo","","","2025","90,00%","En proceso","","Estructura y equipos montados. Falta alimentación y descarga de mercadería.","","SI","Gaspar - Rodrigo","",""],
  [4,"Envasado al vacío","Nueva línea","PE - Maní","Envasado al vacío","ST","A","Solicitud de Gerencia","0 Alta","Alta demanda, incapacidad de continuar con fason","Montaje de una línea para el envasado de maní en cajas con bolsas al vacío.","NO","Colaborativo","","","2024","100,00%","Finalizado","10/12/2024","","","SI","Gaspar - Rodrigo","",""],
  [5,"Recambio de Env. (Envamec x Tecmar)","Mejora línea","PE - Alérgenos","Envasadora 8","ST","A","Solicitud de la Dirección","0 Alta","Necesidad mejora en calidad envasado","Recambio de Envasadora Envamec por Envasadora Tecmar. -Adaptaciones Varias de montaje.","SI","Colaborativo","","","2025","100,00%","Finalizado","15/02/2025","Puesta en marcha realizada 14/04/2025","","","Gaspar - Rodrigo","",""],
  [6,"Planta de Tratamiento de Agua (Ósmosis Inversa)","Nueva línea","PE - Maní","Planta Alérgenos","ST","A","Necesidad de Calidad","0 Alta","Plazo puesta en funcionamiento Generacion","Montaje y puesta en marcha de planta de tratamiento de agua por ósmosis inversa.","SI","Colaborativo","$10.000,00","","11/2025","70%","En proceso","","A la espera de redefinición de prioridades","","","Rodrigo","",""],
  [7,"Nave nueva de Insumos y MP.","Nueva línea","PE - Maní","Todas","ST","A","Solicitud de la Dirección","0 Alta","Liberacion de espacio P Mani","Emplazamiento de nueva nave en predio de Producto Elab. destinado al almacenamiento de Insumos y MP.","SI","Externo","$1.200.000,00","","02/2025","10,00%","En proceso","Plazo:","Consultar subdivision interna","","","Gaspar - Rodrigo","",""],
  [8,"Dock de descarga","Nueva línea","PE - Maní","Todas","ST","A","Solicitud de la Dirección","1 Media","Posterior a nave","Emplazamiento del dock de descarga en el nuevo galpón de Insumos y MP.","SI","Externo","","","02/2025","0,00%","Finalizado","","","","","Gaspar - Rodrigo","",""],
  [9,"Pasillo de alimentación de Lineas de PE. Con Materia Prima","Nueva línea","PE - Maní","Todas","ST","A","Solicitud de la Dirección","1 Media","Posterior a nave","Emplazamiento de pasillo de alimentación de líneas, comunicando el nuevo depósito con la alimentación de las líneas de planta Maní.","SI","Externo","","","","0,00%","Finalizado","","","","","Gaspar - Rodrigo","",""],
  [10,"Cerramiento de línea de Salado","Mejora línea","PE - Maní","Salado","ST","A","Solicitud de Gerencia","0 Alta","Daño a sala tableros por sal","Cerramiento de la línea de salado para proteger el proceso y evitar la dispersión de polvos a otros ambientes de la planta.","NO","Externo","","","02/2025","100,00%","Finalizado","01/04/2025","","","","Gaspar - Rodrigo","",""],
  [11,"Cambio de Seleccionadora Elec. BL1","Mejora línea","Blanchado","Blanchado 1","","A","Solicitud de la Dirección","1 Media","Mejora seleccion","Mejorar la selección, inocuidad, calidad, producción","NO","Externo","$500.000,00","","","","En proceso","","","","","Gaspar - Rodrigo","",""],
  [12,"Piso de celda 11","Mejora acopio","Acopio","Acopio","","","Solicitud de la Dirección","1 Media","","Construccion piso","SI","Externo","$150.000,00","","","95,00%","En proceso","","","","","Gaspar - Rodrigo","",""],
  [13,"Ingreso nuevo (clador, laboratorio, portería)","Mejora acopio","Acopio","Acopio","","A","Solicitud de la Dirección","0 Alta","","Construccion edificios y entrada en funcionamiento","SI","Externo","","","2024","50,00%","En proceso","","","","","Gaspar - Rodrigo","",""],
  [14,"Incorporación de finales de línea en empaquetado","Mejora línea","PE - Maní","Empaquetadoras","","","Solicitud de Gerencia","2 Baja","No es necesidad desde productividad","Seleccion e implementacion de sistemas de final de linea de manera escalonada comenzando por el armado de cajas","NO","Colaborativo","","","2024","10,00%","En proceso","","En evaluación preliminar de alternativas","","SI","Gaspar - Sergio","",""],
  [15,"Mejora en la cosedora","Eficiencia","PE - Maní","Embolse","ST","C","Solicitud de Gerencia","0 Alta","Reiteradas paradas por corte de hilo","Buscar alternativas mejores y solicitar compra. Consultar otras empresas.","NO","Bozzo","","","","0,00%","No iniciado","","","SI","NO","Gaspar - Sergio","Cotizar y pedir compra. Robusta",""],
  [16,"Mejora de la capacidad de bombeo en molienda 1: Vibrador y tolva","Mejora línea","PE - Maní","Pasta","","","Necesidad productiva","0 Alta","Mejora eficiencia","Colocar vibrador en tolva","SI","Bozzo","","1547","","30,00%","En proceso","","13/06/2025 Ya se mandó a pedir materiales para la tolva nueva. Hay vibradores en Stock para probar.","SI","SI","Rodrigo - Sergio","Consultar a rodrigo si lo va hacer o lo hacemos con externo. Si es interno, plazo.","Posiblemente hay mototambores en planta. Se trabajará al interno con José Requelme. Evaluar la vibración necesaria y efecto en la tolva."],
  [17,"Montaje sistema dosificacion aceite","Calidad","PE - Maní","Pasta","","","Necesidad de calidad del producto e inocuidad de la operacion","0 Alta","Mejora calidad producto","Montaje de bomba dosivac y circuito de dosificacion de aceite con precision","SI","Reynoso","","","1/02/2025","60,00%","En proceso","","Definición 16/05/2025","SI","SI","Rodrigo - Fran","Aguantar par de semanas","Se contratará a tercero para hacer el trabajo en Maniagro."],
  [18,"Calibración de los sensores de temperatura en todas las líneas. Incluye KR y BL.","Validación","Todas plantas prod.","Todas donde aplica","","","Necesidad gestional","0 Alta","Necesidad inocuidad","Calibración de todos los sensores para asegurar procesamiento correcto según las variables seteadas","NO","Bozzo","","","1/10/2024","10,00%","En proceso","","Sensores relevados y servicio cotizado. Esperando avances de gestión de calibraciones para proseguir con el servicio","NO","NO","Gaspar - Mayra - Emilse","",""],
  [19,"Sistema de visualización de líneas","Datos","Todas plantas prod.","Todas donde aplica","","","Solicitud de Gerencia","0 Alta","Solicitud Gerencia","Implementación de un sistema global de visualización de la actividad y avance de producción de todas las líneas productivas, incluyendo PE y KR, BL, secado.","SI","Bozzo","","","1/04/2025","20,00%","En proceso","","Se realizó primera reunión con Sistemas. Próximo paso generar reunión con Gerencia y responsables de procesos para definir lo que se necesita visualizar. Luego dar input a Sistemas para comenzar el relevamiento de las condiciones en cada línea.","SI","NO","Gaspar","",""],
  [20,"Piletas lavado","Inocuidad","PE - Maní","Todas donde aplica","","","Solicitud de Producción","0 Alta","Necesidad operativa y de higiene","Analizar la colocacion de piletas de lavado en Mani - Envasado, y Pasta","SI","Bozzo","","","1/10/2025","10,00%","En proceso","","Definición 16/05/2025","SI","SI","Gaspar - Rodrigo","Se cerro estructura contenedor. Ver con Rodrigo. Pileta en pasta no.","Se aguardan instalaciones de lavadero (cont. externo)"],
  [21,"Cerramiento transportadores producto","Gestión","PE - Maní","Envasadoras","","","Desvío Auditoría Interna","2 Baja","Oportunidad de Mejora","Analisis de cerramiento superior de los transportadores que ingresan producto a las envasadoras Maní.","SI","Colaborativo","","","1/05/2025","5,00%","En proceso","","Se carga solicitud a Consuman 29/4/2025 1522, 1523, 1524, 1525","NO","SI","Mario","",""],
  [22,"Cerramiento de estuchadora Raumak","Mejora línea","PE - Alérgenos","Estuchadora","","","Solicitud de Producción","2 Baja","Mejora en condiciones de Inocuidad","Solicitar un cerramiento superior para la estuchadora. Acrilico preferentemente.","SI","Colaborativo","","","1/05/2025","5,00%","Finalizado","","Se carga solicitud en Consuman 28/04/2025 N°1512.","SI","SI","Mario","",""],
  [23,"Ver agregar tolva y cinta para desmoldar una base de granola en paralelo a la rompedora","Mejora línea","PE - Alérgenos","Granola","","","Solicitud de Producción","2 Baja","Necesidad de trabajar en paralelo por cambios en demanda","Revisar en maquinarias la disponibilidad de equipo viejo de Oncativo. Retirar llevar a planta y hacer limpiar.","NO","Bozzo","","","","0,00%","No iniciado","","","SI","SI","Jime - Mario","",""],
  [24,"Mejora en manipulación de semielaborados de granola","Estandarizacion","PE - Alérgenos","Granola","","","Solicitud de Producción","0 Alta","Falta de espacio y orden en planta","Definir la mejor manera de manipular bases de granola: big bag u otro recipiente. Actualmente se estan manejando con stock para un dia = 15 pallets.","NO","Bozzo","","","","0,00%","En proceso","","Se tomaron medidas, se habló con el proveedor del rack, se cotizaron módulos para 3 tramos con parantes de 5 m de largo lo q permite 24 posiciones en total (piso+3). Se envio cotizacion a Compras y Gcia.","SI","SI","Gaspar - Rodrigo","Medir y pedir estanteria tres en altura o mas y dos","Avanzar con solicitud de estanterías para 18 posiciones. Revisar rediseño de línea en los próximos meses para migrar a uso de big bags."],
  [25,"Definicion compra enfriador","Mejora línea","PE - Maní","Pasta","","","Solicitud de Gerencia","1 Media","Mejora calidad producto y operación envasado.","Definicion de compra de enfriador + chiller agua refrigeracion + automatizaciones de protección","SI","Bozzo","","","1/12/2024","20,00%","En proceso","","Definición 16/05/2025","SI","SI","Gaspar - Rodrigo - Nico","","Aguardar Cot IFE. Cotizar FRIMONT y TRANE. Redondear costo enfriador + chiller + automatismo y presentar a Gcia."],
  [26,"Definición de Procedimiento de Ing Procesos - Gestión Proyectos","Gestión Procesos","PE","Todas","","","Necesidad gestional","1 Media","Estandarizacion del funcionamiento del área","En conjunto con Producción y H. Gioino","SI","Bozzo","","","","0,00%","No iniciado","","","SI","NO","","",""],
  [27,"Cerramiento empaquetadoras","Gestión","PE - Maní","Envasadoras","","","Desvío Auditoría Interna","1 Media","Mejora en inocuidad de material de envase","Mejora de envasadoras para incorporar recubrimiento acrilico en parte de bobina. NC 439. Cotizar con Raumak. Pasar info a Cristiane y Nicolas de DAQ.","SI","Bozzo","","","1/05/2025","5,00%","En proceso","","Se carga solicitud a Consuman 29/4/2025 1520, 1521\nDatos enviados a Raumak 12/05/2025","SI","SI","Mario","",""],
  [28,"Mejora de herramienta cajas.","","PE - Maní","Cajas al vacío","ST","C","Mejora operacional","0 Alta","Mejora operacional","Mejora en la facilidad de uso de la herramienta actual","SI","Bozzo","s/d","","12/05/2025","10,00%","En proceso","31/12/2025","Se solicito en planta a Rodrigo Quiroga la mejora de la estabilidad de la herramienta actual agregando una cuarta pata o peso.","NO","","Mario","",""],
  [29,"Levante de bajada producto para evitar atasque.","","PE - Maní","Cajas al vacío","ST","C","Mejora operacional","0 Alta","Riesgo de rotura de balanza","Evitar que el producto se atasque lo que lleva a manipular y sacudir caja sobre balanza corriendo riesgo de romperla","SI","Bozzo","","","1/03/2025","20,00%","En proceso","","Se relevo con Ingenieria el trabajo necesario y se acordó","NO","SI","Rodrigo","",""],
  [30,"Agregado del acondicionamiento del pallet en línea de embolse","Estandarizacion","PE - Maní","Embolse","ST","C","Solicitud de Producción","0 Alta","Alta improductividad por retrabajo, tiempos muertos etc","Agregar la operación de acondicionamiento de pallets de bolsas a la línea. Aguardar a ver si se puede hacer palletizado TODO las cargas.","NO","Bozzo","","","","0,00%","No iniciado","","Necesidad de modificar primero la forma de vender (palletizado)","NO","NO","Sergio","",""],
  [31,"Definicion de recetas por producto y presentacion. Implementacion.","","PE","Envasadoras","ST","C","Mejora Eficiencia","0 Alta","Mejora Eficiencia","","SI","Rivarola","","","1/04/2025","5,00%","En proceso","","En definicion de primeras recetas TECMAR (E4)","NO","NO","Javier - Sergio","",""],
  [32,"Modificaciones en funcionamiento de Empaquetadoras Tecmar en relación a las detecciones de los detectores de metal","Mantenimiento","PE","Envasadoras","ST","B","Solicitud de Producción","0 Alta","Problemas con identificacion de rechazo DM","Reclamar al proveedor fallas de funcionamiento en E5, Solicitar modificaciones y unificación del funcionamiento en ambas máquinas. Seguimiento.","SI","Colaborativo","","","","","En proceso","","Producción envió mail de reclamo y pedidos de modificación a proveedor 24/04/2025","NO","NO","Javier - Sergio","",""],
  [33,"Resolver no deteccion de ferroso en E8","","","Envasadora 8","","","Necesidad Gestional","0 Alta","Problemas en detección de probeta ferrosa","Consultar con Penta que parametro se puede ajustar","NO","Bozzo","","","","0,00%","Finalizado","","","NO","NO","Javier - Sergio","",""],
  [34,"Estandarización de operaciones de trabajo en línea Empaquetadoras","Estandarizacion","PE - Maní","Envasadoras","ST","C","Necesidad gestional","0 Alta","Mejora eficiencia","Definir metodologías para el arranque de línea, salida de producción, resolución de problemas comunes, ajustes de desvíos de peso, hermeticidad y otros componentes de la calidad, acciones a tomar ante fallas, roles de maquinista y operador, y generar una base documental. Capacitar al personal.","SI","Rivarola","","","","","En proceso","","","NO","NO","Javier - Sergio","",""],
  [35,"Generación de bot especializado para una línea en formato prueba Empaquetadora 4","IA","PE - Maní","Envasadora 4","ST","B","Solicitud de Producción","0 Alta","Solicitud de Produccion para poner a prueba","Asociar documentos al bot de envasado generado. Cargar manuales, instructivos, registros particulares de la línea.","NO","Bozzo","","","","0,00%","No iniciado","","","NO","NO","Sergio","",""],
  [36,"Estandarización de operaciones de trabajo","Estandarizacion","PE - Maní","Frito","ST","C","Necesidad gestional","0 Alta","Mejora eficiencia","Definir metodologías para el arranque de línea, salida de producción, resolución de problemas comunes, acciones a tomar ante fallas de equipos críticos, y generar una base documental. Capacitar al personal.","NO","Bozzo","","","","0,00%","No iniciado","","","NO","NO","","",""],
  [37,"Revisar DF, Registros, Procedimientos de FRITO Y SALADOR","Gestión","PE - Maní","Frito y Salador","","","Necesidad Gestional","0 Alta","BRC 2025","","SI","Bozzo","","","10/05/2025","0,00%","Finalizado","","Se revisaron DF 02/06/2025","NO","NO","","",""],
  [38,"Revisar DF del resto de los procesos de PE","Gestión","PE - Maní","Frito y Salador","","","Necesidad Gestional","0 Alta","BRC 2025","Revisar todos los DF en base a últimas reformas hechas en los de granola y kr bl","SI","Bozzo","","","10/05/2025","0,00%","Finalizado","","Se revisaron todos los DF 02/06/2025. Solo quedaría traducir todos.","NO","NO","","",""],
  [39,"Estandarización de operaciones de trabajo","Estandarizacion","PE - Maní","Pasta","","","Necesidad gestional","0 Alta","","Definir metodologías para el arranque de línea, salida de producción, resolución de problemas comunes, acciones a tomar ante fallas de equipos críticos, y generar una base documental. Capacitar al personal.","SI","Reynoso","","","","","En proceso","","","NO","NO","Fran","",""],
  [40,"Estandarización de parámetros de tostado","Estandarizacion","PE - Maní","Pasta","","","Necesidad gestional","0 Alta","Reduccion de PNC","Redefinir con mayor detalle los parámetros de tostado en base a la materia prima utilizada, color deseado del producto en USDA y L. Revisar %MG.","SI","Reynoso","","","","","En proceso","","","NO","NO","Fran","",""],
  [41,"Cerramiento tablero pasta","Gestión","PE - Maní","Pasta","","","Desvío Auditoría Interna","0 Alta","Desvio AI","NC 427","SI","Colaborativo","","","29/04/2025","5,00%","Finalizado","","Se carga solicitud a Consuman 29/4/2025 1525. Se ejecuto semana del 26/05/2025.","NO","SI","Nico","",""],
  [42,"Cambio en el sistema de manejo de artículos de PE en el sistema","Datos","PE","Todas donde aplica","","","Solicitud de Comercial","0 Alta","Solicitud Dirección, Comercial, Producción","En conjunto con Sistemas, Producción, Comercial, Logistica","SI","Bozzo","","","07/2024","50,00%","En proceso","","Se relevaron cambios necesarios, se realizo diagnóstico de la situacion de cada circuito. Pendiente definiciones de comercial sobre circuito de expo y facturacion.","NO","NO","Yami","",""],
  [43,"Acceso a trampas magnéticas","Gestión","PE - Maní","Pasta","","","Desvío Auditoría Interna","0 Alta","Desvio AI","NC 428 - Se dejaría anulada la trampa del derivado de grano hasta que se pueda sacar.","SI","Colaborativo","","1525","29/04/2025","5,00%","En proceso","","Se carga solicitud a Consuman 29/4/2025 1525","NO","SI","Mario","",""],
  [44,"Definicion de acciones ante fallo de equipos criticos","Gestión","","Pasta","","","Desvío Auditoría Interna","0 Alta","Desvio AI","NC 430","SI","Colaborativo","","","29/04/2025","20,00%","En proceso","","F Reynoso se encuentra elaborando el documento","NO","NO","Fran","",""],
  [45,"Mejora de las condiciones para manipular utensilios en pasta.","Estandarizacion","PE - Maní","Pasta","","","Desvío Inspección","0 Alta","Mejora condiciones higiene","Necesidad de brindar condiciones para la manipulacion higienica de los utensilios.","SI","Bozzo","","1399","29/04/2025","10,00%","En proceso","","Se carga solicitud a Consuman con propuesta de estructura.","NO","SI","Mario - Fran","",""],
  [46,"Reproceso de pasta Crunchy","","","Pasta","","","Aprovechar producto","0 Alta","Alto valor de la mercaderia","Reproceso de 10 pallets de PNC de Mayo 2025","","Reynoso","","","","","En proceso","","","NO","SI","Fran - Sergio","",""],
  [47,"Actualización anual de los diagramas de flujo de toda la planta. Incluye KR y BL.","Gestión","Todas plantas prod.","Todas","","","Necesidad gestional","0 Alta","BRC","Actualización documental para BRC","SI","Bozzo","","","","","En proceso","","Solo queda pendiente terminar el de HPS1 y revisar con Mario. Luego traducir.","NO","NO","","",""],
  [48,"Actualización periódica de los Procedimientos generales de cada línea de PE","Gestión","PE","Todas","","","Necesidad gestional","0 Alta","BRC","Actualización documental para BRC","SI","Bozzo","","","","","En proceso","","","NO","NO","","",""],
  [49,"Implementación de checklists de arranque en todas las líneas","Eficiencia","PE - Alérgenos","Todas","","","Necesidad gestional","0 Alta","Mejora operacional","En conjunto con Producción en ambas plantas. Rta a NC 431. Trabajo final de Javier Rivarola.","SI","Colaborativo","","","","","En proceso","","","NO","NO","Sergio","",""],
  [50,"Implementación de registros de relevamiento de tiempos de parada en todas las líneas.","Eficiencia","PE","Todas","","","Necesidad gestional","0 Alta","Relevamiento de datos para HR","En conjunto con Producción en ambas plantas. Implementación gradual.","SI","Colaborativo","","","","","En proceso","","","NO","NO","Sergio","",""],
  [51,"Definición de Hojas de Ruta por cada SKU","Eficiencia","PE","Todas","","","Necesidad gestional","0 Alta","Necesario para planificacion y control de produccion","En conjunto con Producción y H. Gioino","SI","Bozzo","","","","","En proceso","","","NO","NO","Sergio","",""],
  [52,"Generación de una Tabla de Fallas por línea en el sistema documental","Eficiencia","PE","Todas","","","Necesidad gestional","0 Alta","Mejora operacional y eficiencia","En conjunto con Producción","SI","Bozzo","","","","","En proceso","","Se avanzó con la Tabla de Barrido Nitrógeno y Pasta","NO","NO","Javier - Fran","",""],
  [53,"Validación microbiológica de todos los procesos térmicos de PE","Validación","PE","Todas donde aplica","","","Necesidad gestional","0 Alta","Necesidad inocuidad","Validación que respalde los parámetros de proceso utilizados como medidas de reducción del riesgo Salmonella en el producto","SI","Bozzo","","","","","En proceso","","Pendientes nuevo horno de granola y nuevo freidor","NO","NO","Ner","",""],
  [54,"Instructivo de ajuste del sistema de Nitrógeno en cada Empaquetadora","Estandarizacion","PE","Todas donde aplica","","","Necesidad Gestional","0 Alta","Definicion de acciones correctivas ante desvios","Reformar y detallar el archivo existente.","NO","Rivarola","","","","0,00%","No iniciado","","","NO","NO","Javier","",""],
  [55,"Completar seguimiento de proyectos para mostrar ante auditorias","Gestión","PE - Maní","Todas donde aplica","","","Necesidad Gestional","0 Alta","BRC","Revisar todos los DF en base a últimas reformas hechas en los de granola y kr bl","SI","Bozzo","","","","","En proceso","","","NO","NO","Mario - Mayra","",""],
  [56,"Implementación de OFS para medición de OEE en las líneas de envasado","Datos","PE - Maní","Todas donde aplica (5)","","","Iniciativa del área","0 Alta","Relevamiento datos de parada","Implementado en 2 empaquetadoras y línea de embolse. En implementación en líneas E2 y cajas al vacío.","SI","Bozzo","","","","","En proceso","","","NO","NO","Nico","",""],
  [57,"Estandarización de operaciones de trabajo","Estandarizacion","PE - Maní","Cajas al vacío","","","Necesidad gestional","2 Baja","Baja demanda mensual","Definir metodologías para el arranque de línea, salida de producción, resolución de problemas comunes, acciones a tomar ante fallas de equipos críticos, y generar una base documental. Capacitar al personal.","SI","Bozzo","","","","","En proceso","","","NO","NO","","",""],
  [58,"Agregado del acondicionamiento del pallet en línea de Cajas al vacío","Estandarizacion","PE - Maní","Cajas al vacío","","","Solicitud de Producción","2 Baja","Baja demanda mensual","Agregar la operación de acondicionamiento de pallets al final de la línea.","NO","Bozzo","","","","0,00%","No iniciado","","","NO","NO","Sergio","",""],
  [59,"Generación de instrucciones para la carga de programa en PLC del horno Crocante","Mantenimiento","PE - Alérgenos","Grageados","","","Iniciativa del área","2 Baja","Estandar para uso de Mantenimiento","A partir de fallas del PLC en las que es necesario eliminar y volver a cargar el programa","SI","Bozzo","","","","","En proceso","","","NO","NO","","",""],
  [60,"Definición de metodologías y frecuencia de limpieza de circuitos de refrigeración en líneas de Pasta y Grageados.","Estandarizacion","PE","Todas donde aplica","","","Iniciativa del área","2 Baja","Estandar de uso infrecuente","Dejar definidas las metodologias en documentos oficiales para tener de referencia en proximas tareas.","SI","Reynoso","","","","","Finalizado","","","NO","NO","Fran","",""],
  [61,"Pasar en limpio los flujos de salida de todo el envasado","Estandarizacion","PE - Maní","Todas donde aplica","","","Necesidad gestional","2 Baja","Necesario para proyecto final de linea","","NO","Bozzo","","","","0,00%","No iniciado","","","NO","NO","","",""],
  [62,"Mejora funcionamiento conveyer","","PE - Maní","Cajas al vacío","","","Mejora eficiencia","1 Media","Mejora eficiencia","Seguimiento de cambio de polea","SI","Bozzo","","","","40,00%","Finalizado","","Se cambió polea semana del 26/05","NO","SI","Rodrigo","",""],
  [63,"Estandarización de operaciones de trabajo","Estandarizacion","PE - Maní","Embolse","","","Necesidad gestional","1 Media","Largo plazo","Definir metodologías para el arranque de línea, salida de producción, resolución de problemas comunes, acciones a tomar ante fallas de equipos críticos, y generar una base documental. Capacitar al personal.","NO","Bozzo","","","","0,00%","No iniciado","","","NO","NO","","",""],
  [64,"Mejora en palletizado bolsas","Estandarizacion","PE - Maní","Embolse","","","Solicitud de Producción","1 Media","Reclamos clientes internos y externos","Mejorar la metodología de palletizado para evitar defectos. Reclamos internos y de clientes. Evaluar bolsas mas cortas.","NO","Bozzo","","","","0,00%","No iniciado","","","NO","NO","","",""],
  [65,"Modificar condiciones de envasado de pasta en baldes","","PE - Maní","Pasta","","","Mejora operacional","1 Media","Mejora operacional","Agregar llave del lado izquierdo, agregar mesa, definir el armado del pallet dentro de la cabina","NO","Reynoso","","","","0,00%","No iniciado","","","NO","SI","","",""],
  [66,"Bypass en camisa tanque 1","","PE - Maní","Pasta","","","Mejora operacional","1 Media","Mejora operacional","Colocar un bypass que evite la circulacion de agua fria por la doble camisa del tanque 1 en procesos de manteca ya que enfriar es contraproducente a la disolucion de los polos.","SI","Reynoso","","217","","50,00%","En proceso","","Croquis definido y materiales solicitados. Revisado con M.G. 16/05/2025","NO","SI","","",""],
  [67,"Implementación de una base de datos para fallas diarias en equipos y soluciones aplicadas, a modo de información de entrada para un asistente virtual.","Eficiencia","PE","Todas","","","Iniciativa conjunta con Producción","1 Media","Mejora operacional y eficiencia","En conjunto con Producción, Responsable y 1 Supervisor. Fase de prueba de la BD.","SI","Bozzo","","","","10,00%","En proceso","","Se armo base de datos, se le cargo información, se compartio aplicación con Supervisora para su prueba","NO","NO","","",""],
  [68,"Estandarización de operaciones de trabajo","Estandarizacion","PE - Maní","Tostado","","","Necesidad gestional","1 Media","Largo plazo","Definir metodologías para el arranque de línea, salida de producción, resolución de problemas comunes, acciones a tomar ante fallas de equipos críticos, y generar una base documental. Capacitar al personal.","NO","Bozzo","","","","0,00%","No iniciado","","","NO","NO","","",""],
  [69,"Estandarización del uso del sistema SCADA para el alta de lotes y uso correcto de la BD","Estandarizacion","PE - Maní","Tostado","","","Necesidad gestional","1 Media","Uso de sistema de datos","Definir metodología, generar instructivo, capacitar al personal sobre el correcto uso del sistema SCADA especialmente para la carga de datos correctamente en la base de datos del sistema.","NO","Bozzo","","","","0,00%","Retrasado","","","NO","NO","","",""],
  [70,"Modificacion detector de metales para pasta para recuperar la pasta de prueba","Costo","PE - Maní","Pasta","","","Aprovechar producto","0 Alta","Recuperacion de PNC","Modificar el circuito de salida de la pasta del detector de metales que se rechaza cuando se prueba el detector con probetas","SI","Bozzo","","","","20,00%","Retrasado","","13/06/25 Se encargara Jose Requelme.","SI","SI","","PRIORIDAD N° 1. Consultar a rodrigo si lo va hacer o lo hacemos con externo. Si es interno, plazo","Se encargará José Requelme. Se está pidiendo tolva. Hay vibradores en pañol."],
  [71,"Inversión de potes","Trazabilidad","PE - Maní","Pasta","","","Solicitud MKT","0 Alta","Solicitud MKT","Implementar mecanismo de inversión de potes","SI","Reynoso","","","","30,00%","En proceso","","Se enviaron muestras y se confirmó OC a Chiavarini. Semana 09/06/23.","SI","SI","","Consultar a rodrigo si lo va hacer o lo hacemos con externo. Si es interno, plazo.","Ir a opcion Chavarini. Ver la conexion e integracion con la Primo, seguridades."],
  [72,"Reubicacion de tolva de rechazo DM","","PE - Maní","Cajas al vacío","ST","C","Mejora operacional","0 Alta","Riesgo de rotura de balanza","Mejorar la maleabilidad de la tolva girando la bajada hacia atras","SI","Bozzo","","","1/03/2025","20,00%","En proceso","","Se relevo con Ingenieria el trabajo necesario y se acordó","NO","SI","","",""],
  [73,"Tabla con pesos de palletizado","Gestión","","Todas donde aplica","","","Necesidad gestional","1 Media","Necesidad de informacion para Comercial","Relevar en una tabla los accesorios de palletizado y su rango de peso estandar para tomar de referencia en los tramites de cargas MI y expo","SI","Bozzo","","","1/03/2025","20,00%","En proceso","","Javi Rivarola realizó resumen en el año 2024 de los items utilizados para palletizar en cada caso. Se requiere revisar, agregar pesos faltantes, implementar.","NO","","","",""],
  [74,"Solicitud de nivel de agua para tanques templadores","Mejora línea","PE - Alérgenos","Granola","","","Proteccion equipos","2 Baja","Evitar trabajo de resistencias con camisa vacía","","NO","Bozzo","","","","0,00%","No iniciado","","","NO","SI","","",""],
  [75,"Estandarización dosif manteca","Estandarización","PE - Maní","Pasta","","","Mejora operacional","0 Alta","Mejora operacional","","SI","Reynoso","","","1/02/2025","40,00%","En proceso","","","NO","NO","Fran","",""],
  [76,"Estandarización parametros para cada producto","Estandarización","PE - Maní","Salador","","","Mejora operacional","0 Alta","Mejora operacional","","SI","Reynoso","","","","0,00%","No iniciado","","","NO","NO","Fran","",""],
  [77,"Estructuras para apoyo/soporte de caños, abrazaderas y orings","Inocuidad","PE - Maní","Pasta","","","Mejora operacional","1 Media","Mejora operacional","","SI","Reynoso","","","","0,00%","No iniciado","","","NO","","","",""],
  [78,"Modificacion caida granola","Calidad","PE - Alérgenos","Granola","","","Mejora operacional","0 Alta","Reclamos clientes internos y externos","","SI","Bozzo","","1023","15/01/2025","0,00%","En proceso","","Definición 16/05/2025","SI","SI","Mario","Insistir con Mario. Cotizar el multicabezal para la dosificacion mas como seria la alimentacion","Realizar pruebas con Mario usando el prototipo disponible. Sem 19/05"],
  [79,"Mejora rigidez Ring Gate","Eficiencia","PE - Maní","Envasadora 4","","","Mejora operacional","1 Media","Mejora regulación pesos","Evitar la deformacion del aro para eliminar una variable en el seteo del multicabezal","SI","Bozzo","","1454","","5,00%","En proceso","","Solicitud en Consuman 1454","NO","SI","Mario","",""],
  [80,"Colocación arranque suave bombas pasta","","PE - Maní","Pasta","","","Proteccion equipos","1 Media","Saltos por arranque brusco","","","Bozzo","","","","5,00%","En proceso","","Solicitud en Consuman 1546","NO","SI","Nico","",""],
  [81,"Acceso probetas a tolva DM","Inocuidad","PE - Maní","Embolse","","","","1 Media","Dificultad en la operacion de chequeo del detector","","","","","","","","","","","Solicitud en Consuman 1387","NO","SI","Mario","",""],
  [82,"Colocación rejilla para retener probetas no rechazadas por DM","Inocuidad","PE - Maní","Envasado ATM","","","","1 Media","Dificultad en la operacion de chequeo del detector","","","","","","","","","","","Solicitud en Consuman 1388","NO","SI","Mario","",""],
  [83,"Acceso para limpieza ducto","Inocuidad","PE - Maní","Envasadora 4","ST","B","","0 Alta","Dificultad limpieza detallada","","","","","1453","","","","","","","NO","SI","Mario","",""],
  [84,"Acceso para limpieza ducto","Inocuidad","PE - Maní","Envasadora 5","ST","B","","0 Alta","Dificultad limpieza detallada","","","","","1455","","","","","","","NO","SI","Mario","",""],
  [85,"Accesorio para primer descarga de producto envasadora potes","Inocuidad","PE - Maní","Pasta","","","","0 Alta","Dificultad limpieza detallada","","","","","","","","","","","Solicitud en Consuman","NO","SI","Mario","",""],
  [86,"Acceso para limpieza ingreso a tolva","Inocuidad","PE - Maní","Envasado al vacío","ST","C","","0 Alta","Dificultad limpieza detallada","","","","","1482","","","","","","","NO","SI","Mario","",""],
  [87,"Cerrado tablero PC","Mejora línea","PE - Maní","Envasado ATM","","","","2 Baja","Protección circuito","","SI","Bozzo","","1548","","","Finalizado","","","NO","SI","","",""],
  [88,"Acceso probetas a tolva DM","Inocuidad","PE - Maní","Envasado ATM","","","","1 Media","Dificultad en la operacion de chequeo del detector","","","","","","","","","","","Solicitud en Consuman 1380","NO","SI","Mario","",""],
  [89,"Acceso destrabado de bajada rechazo DM","Inocuidad","PE - Maní","Envasado ATM","ST","C","","0 Alta","Rechazo cae al bb de producto cuando el ducto está atascado","","","","","1379","","","","","","","NO","SI","Mario","",""],
  [90,"Elevacion encintadora","Mejora línea","PE - Maní","Todas las que aplica","","","","2 Baja","Mejora operacional","","NO","Bozzo","","1336","25/03/2025","0,00%","No iniciado","","","NO","SI","","",""],
  [91,"Retirar barras antiestatica","Mejora línea","PE - Maní","E5","","","","2 Baja","","","NO","Bozzo","","","","0,00%","No iniciado","","","NO","SI","","",""],
  [92,"Cambio bases cargadores baterías","Inocuidad","PE - Maní","Todas donde aplica","","","","2 Baja","","","NO","Bozzo","","1333","","0,00%","No iniciado","","","NO","SI","","",""],
  [93,"Estructuras soporte utensilios y apoyo para registros","Inocuidad","PE - Maní","Salador","","","Desvío Inspección","0 Alta","Desvío Inspección","Esperar OT y poner en evidencias","SI","Bozzo","","1300","","","En proceso","","Solicitud en Consuman","NO","SI","Mario","","Relevando dimensiones y ubicación. Se haría con ARESE."],
  [93,"Cambio bisagras puerta grageadora y cabina","Mejora línea","PE - Alérgenos","Grageados","","","","1 Media","Mejora operacional","Cambiar bisagras plasticas por metálicas","NO","Bozzo","","35","1/02/2024","0,00%","No iniciado","","Revisada con M.G 16/05/2025","NO","SI","","",""],
  [94,"Cerramiento tolva salador","Inocuidad","PE - Maní","Salador","","","Desvío Auditoría Interna","0 Alta","Desvío Auditoría Interna","Poner OT de consuman en el registro del desvio. Poner OC de materiales.","SI","Bozzo","","1297","","20,00%","En proceso","","Actualización 13/06/2025. La tapa está en proceso. Se va a construir además una pasarela con baranda desde el descanso de la escalera de sala de tableros.","SI","SI","Mario","","La tapa está en proceso. Esperando perfiles inox para la semana del 13/06/2025. Se haría con ARESE."],
  [94,"Colocar cortina en zaranda post electronica para evitar perdida de mani","Mejora línea","PE - Maní","Tostado","","","Mejora eficiencia","1 Media","Eficiencia","Colocar cortinas o similar a los costados de la zaranda para evitar que el maní que rebota caiga fuera. Solicitud realizada por Rodrigo Gutierrez.","SI","Bozzo","","325","12/08/2025","","En proceso","","Revisada con M.G 16/05/2025","NO","SI","","",""],
  [95,"Reparación pérdidas ductos de aspiración","","PE - Maní","Tostado","","","Seguridad, Orden y Limpieza","0 Alta","Solicitud vieja, desvío de Auditoría Interna","Eliminar la pérdida de grasa de los ductos de aspiración dentro de la planta","SI","Bozzo","","361","28/08/2025","","En proceso","","Revisada con M.G 16/05/2025","NO","SI","","",""],
  [96,"Reparar resistencia tanque templador granola","","PE - Alérgenos","Tostado","","","Seguridad","1 Media","Eliminación provisorio","Reformar el agarre de la resistencia al tanque y eliminar provisorios con cinta","SI","Bozzo","","474","20/09/2024","","En proceso","","Revisada con M.G 16/05/2025","NO","SI","","",""],
  [97,"Eliminar provisorio dentro de cono","","PE - Alérgenos","E7","ST","C","Mejora operacional","0 Alta","Eliminación provisorio","Agregar tabique dentro del cono reemplazando provisorio.","SI","Bozzo","","499","25/09/2024","","Finalizado","","13/06/2025 Quedó corregido y colocado.","NO","SI","","",""],
  [98,"Resolver inversión de giro cama de rolos","Mejora línea","PE - Maní","Envasado ATM","","","Mejora operacional","0 Alta","Necesidad de facilitar la operación de calibración y control de la balanza.","Generar sistema de inversion de dirección de funcionamiento de cama de rolos que sea operable por el operario","SI","Bozzo","","244","27/05/2024","","Finalizado","Procedimentar","Revisada con M.G 16/05/2025. Materiales adquiridos. Se finalizaría en un plazo de 15 días","NO","SI","","",""],
  [99,"Dejar lista la instalacion de manguera para bomba J1","Eficiencia","PE - Maní","Pasta","","","Mejora eficiencia","0 Alta","Reprocesar producto","Dejar lista manguera sanitaria con accesorios","SI","Reynoso","","966","9/01/2025","","Finalizado","","Revisada con M.G 16/05/2025. MEDIR Y CONFIRMAR METROS DE MANGUERA.","NO","SI","","",""],
  [99,"Agregar recirculación en estanque de proceso de crocante","Mejora línea","PE - Alérgenos","Grageados","","","Mejora operacional","1 Media","Facilitar mezclado y operaciones de limpieza","Agregar vía de recirculación del tanque sobre sí mismo","SI","Bozzo","","255","30/05/2024","","En proceso","","Revisada con M.G 16/05/2025","NO","SI","","",""],
  [100,"Mejora en Ring-gate: aumentar rigidez","Eficiencia","PE - Maní","E4","ST","C","Mejora eficiencia, reducción desvíos peso","0 Alta","Reducción desvíos de peso","Reemplazar el aro que sostiene los peines por un material mas rigido (plastico mas grueso o rigido, o inox)","SI","Bozzo","","1454","9/01/2025","","En proceso","","Revisada con M.G 16/05/2025. Se da de baja el pedido antiguo y se decide avanzar con este específico. Está el pedido de materiales hecho, llegaría semana 16/06/25","NO","SI","","","Se solicitará junto con otro pedido inox próximo."],
  [101,"Soportes para bines de aceite","Mejora línea","PE","Salador","","","Mejora orden y limpieza","1 Media","Reprocesar producto","Fabricar una base para totems de aceite usados en salador planta mani y salador planta alergenos","SI","Bozzo","","831","9/01/2025","0,00%","No iniciado","","Revisada con M.G 16/05/2025","NO","SI","Mario","",""],
  [102,"Resolver pérdidas de aire en sistema de bacha","Seguridad","PE - Maní","Frito","ST","C","Seguridad","0 Alta","Seguridad","Revisar y reparar perdidas en sistema neumático","SI","Bozzo","","866","20/11/2024","","Finalizado","","Revisada con M.G 16/05/2025. Se cuenta con materiales comprados (brazo y cilindro). Se debe coordinar la obra con Producción.","NO","SI","","",""],
  [103,"Renovar aislación circuito agua","Mejora línea","PE - Maní","Pasta","","","Eficiencia","2 Baja","Eficiencia enfriamiento","Renovar aislación","SI","Bozzo","","921","11/12/2024","","En proceso","","Revisada con M.G 16/05/2025. Se solicitaron materiales.","NO","SI","","",""],
  [104,"Mejorar instrumentos alargadores de manguera para aire comprimido","Inocuidad","PE - Maní","Tostado","","","Inocuidad","2 Baja","Eliminación provisorio cinta","Generar agarre en los alargadores usados para limpiar tolvas con manguera de aire comprimido para eliminar los agarres provisorios con cinta","NO","Bozzo","","932","12/12/2024","","No iniciado","","Revisada con M.G 16/05/2025","NO","SI","","",""],
  [105,"Levantamiento bajada producto","Mejora línea","PE - Maní","Cajas al vacío","","","Mejora operacional","1 Media","Agilizar la operación de traslado de cajas llenas a cama de rolos sin necesidad de acomodar.","Levantar bajada de producto para evitar atascamiento de producto","NO","Bozzo","","955","26/12/2024","0,00%","No iniciado","","Revisada con M.G 16/05/2025. Revisado con R. Q. en planta. Se ejecutaría junto con reforma de bajada DM.","NO","SI","","",""],
  [105,"Espaldero para centrado de cajas","Estandarización","PE - Maní","Cajas al vacío","","","Mejora operacional","2 Baja","Estandarización posición caja","Generar un espaldero asociado a la cama de rolos para empujar","NO","Bozzo","","954","26/12/2024","0,00%","No iniciado","","Revisada con M.G 16/05/2025","NO","SI","","",""],
  [106,"Mejoras y reformas Env. FUSTEC","","PE - Maní","Envasadora","","","","1 Media","Mejora operativa","Enviar envasadora a Fustec para ser reacondicionada y mejorada. Agregar mordazas del ancho correspondiente a los paquetes de 20 y 45g.","","","","","","","En proceso","","Reforma de mordaza cotizada el 22/05/2025","NO","SI","","",""],
  [106,"Aspiraciones pasta","Mejora línea","PE - Maní","Pasta","","","Mejora operacional","1 Media","Mejora operativa","Colocar aspiración y pipeta de soplado (+ ciclón) en alimentación línea pasta y posterior horno","NO","Bozzo","","114","6/03/2024","10,00%","Retrasado","","Revisada con M.G 16/05/2025. En evaluación para proyecto traslado.","NO","SI","","",""],
  [107,"Mejora capacidad refrigerante Pasta","","PE - Maní","Pasta","","","","0 Alta","Mejora operativa","Revisar estado del chiller enviado a reparar que se encuentra en Maquinarias","","","","","","","En proceso","","Chiller estaría arreglado. Revisar pasos a seguir con Gcia","SI","SI","","",""],
  [107,"Resolver gotera sector envasado","Inocuidad","PE - Maní","Pasta","","","Mejora operacional","0 Alta","Inocuidad","Resolver gotera sobre sector de envasado potes","NO","Bozzo","","175","10/04/2025","0,00%","No iniciado","","Revisada con M.G 16/05/2025.","NO","SI","","",""],
  [108,"Limpieza profunda remover óxido","Inocuidad","PE - Alérgenos","E6","","","Inocuidad","1 Media","Inocuidad","Realizar limpieza profunda para remover óxido de la envasadora","NO","Rivarola","","190","20/04/2024","0,00%","No iniciado","","Revisada con M.G 16/05/2025. Se plantea ejecutarla.","NO","SI","","",""],
  [109,"Colocar cortinas entrada y salida producto","Inocuidad","PE - Alérgenos","Salador","","","Mejora operacional","0 Alta","Evitar dispersión de polvo en el ambiente","Colocar cortinas sanitarias idem a salador planta mani","NO","Bozzo","","199","20/04/2024","80,00%","Finalizado","","Revisada con M.G 16/05/2025. Se encuentra casi listo para instalar. 1/06 FALTA PEDIDO PARA TERMINAR LA DE LA ENTRADA. MATERIAL.","NO","SI","Mario","",""],
  [110,"Reacondicionar enfriador","Mejora línea","PE - Maní","Pasta","","","","1 Media","Tener enfriador de backup","","","","","215","","","","","Revisada con M.G 16/05/2025.","NO","SI","","",""],
  [111,"Analizar alternativas movimiento pallets","Mejora línea","PE - Maní","Pasta","","","Mejora operacional - Seguridad","0 Alta","Seguridad","Evaluar si apilador o zorrita eléctrica se podrían utilizar para todos los movimientos en líneas Pasta - Frito.","NO","Reynoso","","-","19/05/2025","5,00%","En proceso","","Revisar las opciones enviadas por Sergio","SI","NO","","",""],
  [112,"Generar pedana para poder subir pallets con zorra a balanza de control de peso final","Mejora línea","PE - Maní","Todas las que aplica","","","Mejora operacional - Seguridad","0 Alta","Seguridad","Generar rampa/pedana para poder usar zorra electrica en la salida del envasado y eliminar la circulacion de autoelevadores","SI","Bozzo","","1454","19/05/2025","10,00%","En proceso","","Revisar con Mario. Leo Eusebio tiene materiales comprados, falta pedir algunos mas y fabricar. Se carga solicitud a Consuman.","SI","SI","","",""],
  [113,"Abrocar cintas de E8 a estuchadora","","PE - Alérgenos","Estuchadora","","","","1 Media","Mejora operativa","Abrocar cintas para evitar corrimientos que afecten la conexion envasadora-estuchadora.","","","","1680","","","En proceso","","","NO","SI","","",""],
  [114,"Colocar cortina para aplastamiento de paquete","","PE - Alérgenos","Estuchadora","","","","1 Media","Mejora operativa","Colocar soporte con cortina plastica que mantenga el paquete plano para evitar saltos y cruzamientos al cambiar de la segunda a la tercer cinta de alimentación de la estuchadora.","","","","1681","","","En proceso","","","NO","SI","","",""],
  [115,"Modificación estructura de alimentación E6 para eliminar uso de pallet de madera (reclamos INOCUIDAD)","","PE - Alérgenos","Envasadora 6","ST","B","","0 Alta","Inocuidad","Se necesita reformar la alimentación de bb a la línea para evitar el uso de pallets de madera.","SI","Bozzo","","","10/2024","80,00%","En proceso","","02/06/2025 Se cuenta con estructura que está casi lista para esta aplicación.","NO","SI","","","Se construyó estructura. Finalizando."],
  [116,"Modificación de estructura de embolse eliminando la cinta.","","PE - Alérgenos","Granola","","","","0 Alta","","Elevacion embolse. Cambiar la forma de pesaje. Vibrador?","","","","","","","","","","","","","","",""],
  [117,"Resolver descarga de producto al big bag (resolver dispersion ingredientes - Telescopico?)","","PE - Alérgenos","Granola","","","","0 Alta","","","","","","","","","","","","","","","","",""],
  [118,"Vibrador debajo de mezcladora","","PE - Alérgenos","Granola","","","","1 Media","","","","","","","","","","","","","","","","",""],
  [119,"Definir los puntos de sacado de fino","","PE - Alérgenos","Granola","","","","1 Media","","","","","","","","","","","","","","","","",""],
  [120,"Definir mejoras en la rompedora","","PE - Alérgenos","Granola","","","","1 Media","","","","","","","","","","","","","","","","",""],
  [121,"Definir estructura en el embolse de crocante 10 kg","","PE - Alérgenos","Grageados","","","","0 Alta","","","","","","","","","","","","","","","","",""],
  [122,"Plantear nueva tolva para el embolse de tostado en caja","","PE - Maní","Embolse","ST","A","","0 Alta","","","","","","","","","","","","","","","","",""],
  [123,"Analizar mejoras para el sistema de pesaje de tostado en grano","","PE - Maní","Embolse","","","","1 Media","","","","","","","","","","","","","","","","",""],
  [null,"Acceso a techo","","PE - Maní","Salador","","","","0 Alta","Necesidad POES","Esperar OT y poner en evidencias","","","","","","","En proceso","","Solicitud en Consuman","SI","SI","Mario","","Se debe relevar y ejecutar."],
  [null,"Estructura recuperación aceite chorreado por el industria de frito","Costo","PE - Maní","Frito","ST","C","","0 Alta","Recuperación valor maní industria, hoy a alimentación animal","","","","","","","","Anulado","","","SI","SI","Sergio","",""],
  [null,"Generación de todos los documentos de producción de Grageados","","PE - Alérgenos","Grageados","ST","B","","0 Alta","","","","","","","","","","","","","","","",""],
  [null,"Solucion cerramiento porton dep log","Inocuidad","PE - Maní","Todas donde aplica","","","","0 Alta","Correcto cerramiento abertura. Plagas.","","","","","","","","","","","SI","SI","Gaspar - Sergio","Pedir a Natacha que Maria Balla que se mantenga cerrado de 8 a 5 y acuse",""],
  [null,"Mejora en filo de mordaza horizontal envasadora Tecmar","Datos","PE - Alérgenos","E8","","","Solicitud de Producción","0 Alta","Calidad del producto, productividad","Se requiere eliminar el estrés mecánico + térmico que genera el filo de la mordaza horizontal en el flexible generando microperforaciones que derivan en no hermeticidad y por lo tanto en PNC.","SI","Bozzo","s/d","2347","9/10/2025","5,00%","En proceso","","Se derivó solicitud formal por Consuman a I+M, quienes ya estuvieron analizando la problemática","SI","SI","Gaspar","",""],
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding criterios...");
  for (const c of criterios) {
    await prisma.criterioClasificacion.upsert({
      where: { tipo_clasificacion: { tipo: c.tipo, clasificacion: c.clasificacion } },
      update: c,
      create: c,
    });
  }
  console.log(`  ✓ ${criterios.length} criterios upserted`);

  console.log("Seeding proyectos...");
  // Clear existing solicitudes seeded from CSV (keep auto-created ones if any)
  await prisma.solicitud.deleteMany({});

  const proyectos = rows.map((r) => {
    const [numero, proyecto, driver, planta, linea, tipo, clasif, origen, prioridad, criterio,
      detalle, activo, asignado, inversionEst, nroConsuman, fechaInicio, avance,
      estado, fechaFin, comentario, gerencia, im, repasarCon, defGcia, definicionIM] = r as [
      number | null, string, string, string, string, string, string, string, string, string,
      string, string, string, string, string, string, string, string, string, string,
      string, string, string, string, string
    ];

    return {
      numero: numero ?? null,
      proyecto: proyecto ?? "",
      driver: driver || null,
      planta: planta || null,
      linea: linea || null,
      tipo: parseTipo(tipo),
      clasificacion: parseClasif(clasif),
      origen: origen || null,
      prioridad: parsePrioridad(prioridad),
      criterio: criterio || null,
      detalle: detalle || null,
      activo: parseBool(activo) ?? true,
      asignado: asignado || null,
      inversionEst: inversionEst || null,
      nroConsuman: nroConsuman || null,
      fechaInicio: parseDate(fechaInicio),
      avance: parseAvance(avance),
      estado: parseEstado(estado),
      fechaFin: parseDate(fechaFin),
      comentario: comentario || null,
      gerencia: parseBool(gerencia),
      im: parseBool(im),
      repasarCon: repasarCon || null,
      defGcia: defGcia || null,
      definicionIM: definicionIM || null,
    };
  });

  await prisma.solicitud.createMany({ data: proyectos });
  console.log(`  ✓ ${proyectos.length} proyectos insertados`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
