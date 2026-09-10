import type { Pool, User, Visit } from '../types'

export const usersSeed: User[] = [
  { id: '1', fullName: 'Admin User', email: 'admin@clarity.com', password: 'admin123', role: 'ADMIN' },
  { id: '2', fullName: 'Operario User', email: 'operario@clarity.com', password: 'ope123', role: 'OPERARIO' },
]

export const poolsSeed: Pool[] = [
  { id: 'p1', name: 'Casa del Lago', owner: 'María García', location: 'Av. del Lago 42', phone: '', email: '', managementCompany: 'Particular', size: 48, visitsPerWeek: 2, scheduledDays: [2, 5], monthlyPayment: 180 },
  { id: 'p2', name: 'Residencial Clarity', owner: 'Comunidad Norte', location: 'Calle Norte 18', phone: '', email: '', managementCompany: 'Fincas Norte', size: 92, visitsPerWeek: 3, scheduledDays: [1, 3, 5], monthlyPayment: 320 },
  { id: 'p3', name: 'Villa Sol', owner: 'Javier Ruiz', location: 'Camino del Sol 7', phone: '', email: '', managementCompany: 'Particular', size: 35, visitsPerWeek: 1, scheduledDays: [6], monthlyPayment: 120 },
]

export const visitsSeed: Visit[] = [
  { id: 'v1', fecha: Date.now() - 86400000, operador: 'Operario User', operadorId: '2', piscina: 'Casa del Lago', cloroInicial: 2.1, phInicial: 7.3, alcalinidadInicial: 110, durezaCalcica: 250, acidoCianuro: 35, notas: 'Mantenimiento completado', hasAlguicida: true, hasAspirado: true, hasCepillado: true, hasLimpiezaCanasta: true, hasLimpiezaSkimer: false, hasLimpiezaCanastaBomba: false, hasCheckeoCuartoMaquinas: true, hasMantenimientoBomba: false, hasRellenoAgua: true, hasCloroShock: false, chlorineTablets: 2 }
]

const historicalVisit = (date: string, chlorine: number, ph: number, hardness: number, alkalinity: number, cyanuric: number, notes: string, tablets = 0): Visit => ({
  id: `historical-vista-marina-${date}`,
  fecha: new Date(`${date}T12:00:00`).getTime(),
  operador: 'Histórico',
  piscina: 'Vista Marina',
  cloroInicial: chlorine,
  phInicial: ph,
  alcalinidadInicial: alkalinity,
  durezaCalcica: hardness,
  acidoCianuro: cyanuric,
  notas: notes,
  hasAlguicida: true,
  hasAspirado: true,
  hasCepillado: true,
  hasLimpiezaCanasta: true,
  hasLimpiezaSkimer: true,
  hasLimpiezaCanastaBomba: true,
  hasCheckeoCuartoMaquinas: false,
  hasMantenimientoBomba: false,
  hasRellenoAgua: notes.includes('nivel de agua bajo') || notes.includes('llenó') || notes.includes('llenado'),
  hasCloroShock: false,
  chlorineTablets: tablets
})

export const historicalVisits: Visit[] = [
  historicalVisit('2026-09-01', 0, 7.6, 260, 180, 70, 'Se pasó el pascon, se aplicó alguicida y Súper Blue. Nivel de agua bajo, se aplicó agua.'),
  historicalVisit('2026-08-25', 5, 7.2, 0, 0, 0, 'Se pasó el pascon, se aplicó alguicida y Súper Blue. Nivel de agua bajo, se aplicó agua.'),
  historicalVisit('2026-08-21', 0, 8, 150, 110, 100, 'Químicos desbalanceados por falta de producto. Se pasó el pascon, se aplicó alguicida y Súper Blue. Nivel de agua bajo, se aplicó agua. Se estabilizaron todos los químicos. Se recomendó esperar 1.5 horas mínimo antes de ingresar a la piscina.'),
  historicalVisit('2026-08-05', 5, 7.6, 250, 170, 80, 'Se pasó el pascon, se aplicó alguicida y Súper Blue. Nivel de agua bajo, se aplicó agua.'),
  historicalVisit('2026-07-28', 2.4, 7.6, 0, 0, 0, 'Se pasó el pascon, se aplicó alguicida y Súper Blue. Nivel de agua bien.'),
  historicalVisit('2026-07-21', 3.6, 7.8, 0, 0, 0, 'Se pasó el pascon, se aplicó alguicida y Súper Blue. Nivel de agua bajo, se aplicó un poco.'),
  historicalVisit('2026-07-15', 3.6, 7.6, 0, 0, 0, 'Se pasó el pascon, se aplicó alguicida y Súper Blue. Nivel de agua bajo, se aplicó un poco.'),
  historicalVisit('2026-07-07', 3.6, 7.8, 0, 0, 0, 'Se pasó el pascon, se aplicó alguicida, cloro en tabletas y Súper Blue. Nivel de agua bien.', 2),
  historicalVisit('2026-07-02', 3.6, 7.8, 223, 170, 50, 'Se pasó el pascon, se aplicó alguicida, cloro granulado y Súper Blue. Nivel de agua un poco bajo, se aplicó agua.'),
  historicalVisit('2026-06-24', 2.4, 7.8, 0, 0, 0, 'Se pasó el pascon, se aplicó alguicida, cloro granulado y Súper Blue. Nivel de agua bien, no se aplicó agua.'),
  historicalVisit('2026-06-17', 3.6, 7.6, 0, 0, 0, 'Se pasó el pascon, se aplicó alguicida y Súper Blue. Se aplicó un poco de agua.'),
  historicalVisit('2026-06-09', 3, 7.6, 0, 0, 0, 'Se pasó el pascon, se aplicó alguicida, cloro en tabletas y Súper Blue. Nivel de agua bien.', 2),
  historicalVisit('2026-06-02', 3.5, 7.6, 240, 190, 50, 'Se pasó el pascon, se aplicó alguicida, cloro en tabletas y Súper Blue. Nivel de agua bien.', 2),
  historicalVisit('2026-05-27', 3.5, 7.6, 0, 0, 0, 'Se pasó el pascon, se aplicó alguicida, cloro en tabletas y Súper Blue. Se llenó con un poco de agua.', 2),
  historicalVisit('2026-05-18', 3, 7.6, 0, 0, 0, 'Se aplicó alguicida, Súper Blue, cloro en tabletas y un poco de agua. Se cepilló y se limpiaron las canastas de bomba y skimmer.', 3),
  historicalVisit('2026-04-21', 3.6, 7.8, 0, 0, 0, 'Se aplicó Súper Blue y alguicida. Se llenó un poco de agua, se cepilló y se limpiaron las canastas de bomba y skimmer.'),
]

export const vmfpHistoricalPeriods = ['2026-06', '2026-07', '2026-08', '2026-05']

export const visitTasks: [keyof Visit, string][] = [
  ['hasAlguicida', 'Aplicación de alguicida'],
  ['hasAspirado', 'Aspirado'],
  ['hasCepillado', 'Cepillado'],
  ['hasLimpiezaCanasta', 'Limpieza de canasta'],
  ['hasLimpiezaSkimer', 'Limpieza de skimmer'],
  ['hasLimpiezaCanastaBomba', 'Limpieza de canasta de bomba'],
  ['hasCheckeoCuartoMaquinas', 'Revisión del cuarto de máquinas'],
  ['hasMantenimientoBomba', 'Mantenimiento de bomba'],
  ['hasRellenoAgua', 'Relleno de agua'],
  ['hasCloroShock', 'Cloro shock']
]

export const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
