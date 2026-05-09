import Card from "@/shared/ui/components/Card";
import Badge from "@/shared/ui/components/Badge";

export default function ObjetivosPage() {
  const objetivosAnuales = [
    {
      año: 2026,
      objetivos: [
        { nombre: "Incrementar eficiencia operativa", meta: "15%", actual: "8%", estado: "en_progreso" },
        { nombre: "Reducir costos de producción", meta: "10%", actual: "5%", estado: "en_progreso" },
        { nombre: "Implementar nuevas tecnologías", meta: "3 proyectos", actual: "1 proyecto", estado: "en_progreso" },
      ],
    },
    {
      año: 2025,
      objetivos: [
        { nombre: "Optimizar procesos clave", meta: "12%", actual: "14%", estado: "completado" },
        { nombre: "Capacitar al equipo", meta: "40 horas", actual: "45 horas", estado: "completado" },
      ],
    },
  ];

  const informesTrimestrales = [
    { trimestre: "Q1 2026", fecha: "2026-03-31", tema: "Avances primer trimestre" },
    { trimestre: "Q4 2025", fecha: "2025-12-31", tema: "Cierre anual" },
    { trimestre: "Q3 2025", fecha: "2025-09-30", tema: "Revisión tercer trimestre" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Objetivos del Área</h1>
        <p className="text-sm text-slate-500 mt-1">
          Misión, objetivos estratégicos y seguimiento trimestral
        </p>
      </div>

      <Card title="Misión del Área" variant="highlighted">
        <p className="text-slate-700 leading-relaxed">
          Optimizar los procesos productivos de Maniagro mediante la implementación de mejoras continuas,
          garantizando la eficiencia operativa, la calidad del producto y la sostenibilidad de las operaciones.
          Fomentar la innovación tecnológica y el desarrollo del equipo para posicionar al área como
          referente en ingeniería de procesos del sector alimentario.
        </p>
      </Card>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Objetivos Anuales</h2>
        <div className="space-y-4">
          {objetivosAnuales.map((año) => (
            <Card key={año.año} title={`Año ${año.año}`}>
              <div className="space-y-3">
                {año.objetivos.map((obj, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{obj.nombre}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="text-sm">
                          <span className="text-slate-500">Meta:</span>{" "}
                          <span className="font-medium text-slate-700">{obj.meta}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-slate-500">Actual:</span>{" "}
                          <span className="font-medium text-primary-600">{obj.actual}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={obj.estado === "completado" ? "success" : "warning"}>
                      {obj.estado === "completado" ? "Completado" : "En progreso"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card title="Informes Trimestrales Presentados">
        <div className="space-y-3">
          {informesTrimestrales.map((informe, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{informe.trimestre}</p>
                  <p className="text-sm text-slate-500">{informe.tema}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-500">{informe.fecha}</p>
                <Badge variant="success">Presentado</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="warning">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-slate-900">Próximo informe trimestral</p>
            <p className="text-sm text-slate-600 mt-1">
              El informe Q2 2026 debe presentarse antes del 30 de junio de 2026.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
