import { FormEvent, useState } from 'react'
import type { Pool, User, Visit } from '../../types'
import { visitTasks } from '../../constants/dataSeed'
import { makeId, uploadVisitPhoto, visitInstructions } from '../../utils/helpers'
import { downloadVisitReport } from '../../services/pdfService'

interface VisitsProps {
  visits: Visit[]
  pools: Pool[]
  users?: User[]
  operator: User
  onAdd: (v: Visit) => void
  onDelete?: (id: string) => void
  readOnly?: boolean
}

export function Visits({ visits, pools, users = [], operator, onAdd, onDelete, readOnly = false }: VisitsProps) {
  const [show, setShow] = useState(false)
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [month, setMonth] = useState(new Date())
  const [openVisit, setOpenVisit] = useState<string | null>(null)

  const first = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const selectedClient = users.find(user => user.id === selectedClientId)
  const scopedVisits = selectedClient?.poolId
    ? visits.filter(visit => visit.piscina === pools.find(pool => pool.id === selectedClient.poolId)?.name)
    : visits
  const scopedPools = selectedClient?.poolId ? pools.filter(pool => pool.id === selectedClient.poolId) : pools

  const visitsForDay = scopedVisits.filter(visit => {
    const date = new Date(visit.fecha)
    return (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    )
  })

  const visitsForDate = (day: number) =>
    scopedVisits.filter(visit => {
      const date = new Date(visit.fecha)
      return (
        date.getFullYear() === month.getFullYear() &&
        date.getMonth() === month.getMonth() &&
        date.getDate() === day
      )
    })

  const scheduledForDate = (day: number) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
    return scopedPools.filter(pool => pool.scheduledDays.includes(dayOfWeek))
  }

  const scheduledPoolsForSelectedDay = scheduledForDate(selectedDate.getDate()).filter(
    pool => !visitsForDay.some(visit => visit.piscina === pool.name)
  )

  const selectDay = (day: number) => setSelectedDate(new Date(month.getFullYear(), month.getMonth(), day))
  const changeMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next)
    setSelectedDate(next)
    setOpenVisit(null)
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">{readOnly ? 'PORTAL DE CLIENTE' : 'ACTIVIDAD OPERATIVA'}</span>
          <h2>Calendario de visitas</h2>
        </div>
        <div className="visit-toolbar">
          {!readOnly && (
            <select
              className="client-filter"
              value={selectedClientId}
              onChange={event => setSelectedClientId(event.target.value)}
            >
              <option value="">Todos los clientes</option>
              {users
                .filter(user => user.role === 'CLIENTE')
                .map(client => (
                  <option key={client.id} value={client.id}>
                    {client.fullName}
                  </option>
                ))}
            </select>
          )}
          {!readOnly && (
            <button className="primary-button compact" onClick={() => setShow(true)}>
              + Registrar visita
            </button>
          )}
        </div>
      </div>
      <div className="visit-calendar-panel">
        <div className="calendar-toolbar">
          <button className="month-arrow" onClick={() => changeMonth(-1)} aria-label="Mes anterior">
            ←
          </button>
          <strong>{month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</strong>
          <button className="month-arrow" onClick={() => changeMonth(1)} aria-label="Mes siguiente">
            →
          </button>
        </div>
        <div className="calendar-head">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid visit-calendar-grid">
          {Array.from({ length: first }).map((_, index) => (
            <span className="blank" key={`blank-${index}`} />
          ))}
          {Array.from({ length: total }, (_, index) => index + 1).map(day => {
            const dayVisits = visitsForDate(day)
            const scheduledPools = scheduledForDate(day)
            const selected =
              day === selectedDate.getDate() &&
              month.getMonth() === selectedDate.getMonth() &&
              month.getFullYear() === selectedDate.getFullYear()
            return (
              <button
                type="button"
                className={selected ? 'calendar-day today' : 'calendar-day'}
                onClick={() => selectDay(day)}
                key={day}
              >
                <b>{day}</b>
                <span className="calendar-indicators">
                  {dayVisits.length > 0 && <i className="visit-indicator" />}
                  {scheduledPools.length > 0 && <i className="scheduled-indicator" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="calendar-legend">
        <span><i className="visit-indicator" /> Visita realizada</span>
        <span><i className="scheduled-indicator" /> Visita agendada</span>
      </div>
      <div className="selected-day-heading">
        <div>
          <span className="eyebrow">VISITAS DEL DÍA</span>
          <h2>{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        </div>
        <span className="visit-total">
          {visitsForDay.length} {visitsForDay.length === 1 ? 'visita' : 'visitas'}
        </span>
      </div>
      <div className="visit-detail-list">
        {visitsForDay.length ? (
          visitsForDay.map(visit => (
            <VisitDetail
              key={visit.id}
              visit={visit}
              open={openVisit === visit.id}
              onToggle={() => setOpenVisit(openVisit === visit.id ? null : visit.id)}
              onEdit={() => setEditingVisit(visit)}
              onDelete={onDelete ? () => onDelete(visit.id) : undefined}
              readOnly={readOnly}
            />
          ))
        ) : (
          <div className="empty">No hay visitas registradas para este día.</div>
        )}
      </div>
      {!readOnly && scheduledPoolsForSelectedDay.length > 0 && (
        <div className="scheduled-pools">
          <div className="section-heading">
            <div>
              <span className="eyebrow">AGENDA PENDIENTE</span>
              <h2>Piscinas previstas para este día</h2>
            </div>
          </div>
          {scheduledPoolsForSelectedDay.map(pool => (
            <div className="scheduled-pool-row" key={pool.id}>
              <span className="pool-icon small">🏊</span>
              <div>
                <strong>{pool.name}</strong>
                <span>{pool.owner} · {pool.location}</span>
              </div>
              <span className="status scheduled-status">Pendiente</span>
            </div>
          ))}
        </div>
      )}
      {!readOnly && show && (
        <VisitForm
          pools={pools}
          operator={operator}
          defaultDate={selectedDate}
          onClose={() => setShow(false)}
          onSave={visit => {
            onAdd(visit)
            setShow(false)
          }}
        />
      )}
      {!readOnly && editingVisit && (
        <VisitForm
          pools={pools}
          operator={operator}
          visitToEdit={editingVisit}
          onClose={() => setEditingVisit(null)}
          onSave={visit => {
            onAdd(visit)
            setEditingVisit(null)
          }}
        />
      )}
    </>
  )
}

function VisitDetail({
  visit,
  open,
  onToggle,
  onEdit,
  onDelete,
  readOnly = false
}: {
  visit: Visit
  open: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete?: () => void
  readOnly?: boolean
}) {
  const photos: [string, string | undefined, number | undefined][] = [
    ['Llegada 1', visit.arrivalPhoto1, visit.arrivalPhoto1Time],
    ['Llegada 2', visit.arrivalPhoto2, visit.arrivalPhoto2Time],
    ['Salida limpieza 1', visit.afterPhoto1, visit.afterPhoto1Time],
    ['Salida limpieza 2', visit.afterPhoto2, visit.afterPhoto2Time],
    ['Salida propiedad', visit.exitPhoto, visit.exitPhotoTime]
  ]

  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la visita a ${visit.piscina}?`)) {
      onDelete?.()
    }
  }

  return (
    <article className={open ? 'visit-detail open' : 'visit-detail'}>
      <button type="button" className="visit-detail-summary" onClick={onToggle}>
        <div className="visit-detail-time">
          <b>{new Date(visit.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</b>
          <span>{visit.operador}</span>
        </div>
        <div className="visit-detail-main">
          <strong>{visit.piscina}</strong>
          <span>Cloro {visit.cloroInicial} - pH {visit.phInicial}</span>
        </div>
        <span className="status good">Ver detalle</span>
        <span className="detail-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="visit-detail-content">
          <div className="visit-detail-actions">
            {!readOnly && (
              <>
                <button type="button" className="secondary-button" onClick={onEdit}>
                  Editar visita
                </button>
                {onDelete && (
                  <button type="button" className="danger-button" onClick={handleDelete}>
                    Eliminar
                  </button>
                )}
              </>
            )}
            <button type="button" className="primary-button" onClick={() => downloadVisitReport(visit)}>
              Descargar PDF
            </button>
          </div>
          <div className="visit-instructions">
            <h3>Instrucciones de tratamiento</h3>
            <div className="instruction-list">
              {visitInstructions(visit).map(([label, instruction]) => (
                <div className="instruction-row" key={label}>
                  <strong>{label}</strong>
                  <span>{instruction}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="measurements">
            <h3>Mediciones</h3>
            <div className="measurement-grid">
              <Measurement label="Cloro inicial" value={visit.cloroInicial} unit="ppm" />
              <Measurement label="pH inicial" value={visit.phInicial} />
              <Measurement label="Alcalinidad inicial" value={visit.alcalinidadInicial} unit="ppm" />
              <Measurement label="Dureza cálcica" value={visit.durezaCalcica} unit="ppm" />
              <Measurement label="Ácido cianúrico" value={visit.acidoCianuro} unit="ppm" />
              <Measurement label="Tabletas de cloro" value={visit.chlorineTablets} />
            </div>
          </div>
          <div className="tasks">
            <h3>Actividades realizadas</h3>
            <div className="task-grid">
              {visitTasks.map(([key, label]) => (
                <div className={visit[key] ? 'task done' : 'task'} key={String(key)}>
                  <span>{visit[key] ? 'OK' : '-'}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="visit-photos">
            <h3>Registro fotográfico</h3>
            <div className="photo-detail-grid">
              {photos.map(([label, url, time]) => (
                <div className="photo-detail" key={label}>
                  {url ? <img src={url} alt={label} /> : <div className="photo-empty">Sin foto</div>}
                  <span>
                    {label}
                    {time && ` - ${new Date(time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {visit.notas && (
            <div className="visit-notes">
              <h3>Notas</h3>
              <p>{visit.notas}</p>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function Measurement({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>
        {value} {unit && <small>{unit}</small>}
      </strong>
    </div>
  )
}

export function VisitForm({
  pools,
  operator,
  visitToEdit,
  defaultDate,
  onClose,
  onSave
}: {
  pools: Pool[]
  operator: User
  visitToEdit?: Visit
  defaultDate?: Date
  onClose: () => void
  onSave: (v: Visit) => void
}) {
  const [pool, setPool] = useState(visitToEdit?.piscina || pools[0]?.name || '')
  const [visitDateStr, setVisitDateStr] = useState(() => {
    const t = visitToEdit?.fecha || (defaultDate ? defaultDate.getTime() : Date.now())
    const d = new Date(t)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [values, setValues] = useState({
    chlorine: String(visitToEdit?.cloroInicial ?? ''),
    ph: String(visitToEdit?.phInicial ?? ''),
    alkalinity: String(visitToEdit?.alcalinidadInicial ?? ''),
    hardness: String(visitToEdit?.durezaCalcica ?? ''),
    cyanuric: String(visitToEdit?.acidoCianuro ?? ''),
    tablets: String(visitToEdit?.chlorineTablets ?? 0),
    notes: visitToEdit?.notas || ''
  })
  const [tasks, setTasks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(visitTasks.map(([key]) => [String(key), Boolean(visitToEdit?.[key])]))
  )
  const [photos, setPhotos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      [
        ['arrivalPhoto1', visitToEdit?.arrivalPhoto1],
        ['arrivalPhoto2', visitToEdit?.arrivalPhoto2],
        ['afterPhoto1', visitToEdit?.afterPhoto1],
        ['afterPhoto2', visitToEdit?.afterPhoto2],
        ['exitPhoto', visitToEdit?.exitPhoto]
      ].filter((entry): entry is [string, string] => Boolean(entry[1]))
    )
  )
  const [photoTimes, setPhotoTimes] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      [
        ['arrivalPhoto1', visitToEdit?.arrivalPhoto1Time],
        ['arrivalPhoto2', visitToEdit?.arrivalPhoto2Time],
        ['afterPhoto1', visitToEdit?.afterPhoto1Time],
        ['afterPhoto2', visitToEdit?.afterPhoto2Time],
        ['exitPhoto', visitToEdit?.exitPhotoTime]
      ].filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    )
  )
  const [uploading, setUploading] = useState<string | null>(null)

  const handleFileUpload = async (key: string, file: File) => {
    setUploading(key)
    try {
      const url = await uploadVisitPhoto(file)
      setPhotos(prev => ({ ...prev, [key]: url }))
      setPhotoTimes(prev => ({ ...prev, [key]: Date.now() }))
    } catch (err: any) {
      console.error('Error al subir imagen:', err)
      alert(`Error al subir la imagen: ${err?.message || err || 'Compruebe los permisos en Firebase'}`)
    } finally {
      setUploading(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    let fechaTimestamp = visitToEdit?.fecha || Date.now()
    if (visitDateStr) {
      const [y, m, d] = visitDateStr.split('-').map(Number)
      fechaTimestamp = new Date(y, m - 1, d, 12, 0, 0).getTime()
    }
    const visitData: Visit = {
      id: visitToEdit?.id || `visit-${makeId()}`,
      fecha: fechaTimestamp,
      operador: visitToEdit?.operador || operator.fullName || 'Operador',
      operadorId: visitToEdit?.operadorId || operator.id || '',
      piscina: pool,
      cloroInicial: Number(values.chlorine) || 0,
      phInicial: Number(values.ph) || 0,
      alcalinidadInicial: Number(values.alkalinity) || 0,
      durezaCalcica: Number(values.hardness) || 0,
      acidoCianuro: Number(values.cyanuric) || 0,
      chlorineTablets: Number(values.tablets) || 0,
      notas: values.notes || '',
      hasAlguicida: Boolean(tasks.hasAlguicida),
      hasAspirado: Boolean(tasks.hasAspirado),
      hasCepillado: Boolean(tasks.hasCepillado),
      hasLimpiezaCanasta: Boolean(tasks.hasLimpiezaCanasta),
      hasLimpiezaSkimer: Boolean(tasks.hasLimpiezaSkimer),
      hasLimpiezaCanastaBomba: Boolean(tasks.hasLimpiezaCanastaBomba),
      hasCheckeoCuartoMaquinas: Boolean(tasks.hasCheckeoCuartoMaquinas),
      hasMantenimientoBomba: Boolean(tasks.hasMantenimientoBomba),
      hasRellenoAgua: Boolean(tasks.hasRellenoAgua),
      hasCloroShock: Boolean(tasks.hasCloroShock),
      arrivalPhoto1: photos.arrivalPhoto1 || null,
      arrivalPhoto1Time: photoTimes.arrivalPhoto1 || null,
      arrivalPhoto2: photos.arrivalPhoto2 || null,
      arrivalPhoto2Time: photoTimes.arrivalPhoto2 || null,
      afterPhoto1: photos.afterPhoto1 || null,
      afterPhoto1Time: photoTimes.afterPhoto1 || null,
      afterPhoto2: photos.afterPhoto2 || null,
      afterPhoto2Time: photoTimes.afterPhoto2 || null,
      exitPhoto: photos.exitPhoto || null,
      exitPhotoTime: photoTimes.exitPhoto || null,
    } as any

    try {
      await onSave(visitData)
    } catch (err: any) {
      console.error('Error al guardar la visita:', err)
      alert(`Error al guardar la visita: ${err?.message || err}`)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal visit-form" onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{visitToEdit ? 'Editar visita' : 'Nueva visita'}</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="form-grid">
          <label>Fecha de la visita
            <input type="date" value={visitDateStr} onChange={e => setVisitDateStr(e.target.value)} required />
          </label>
          <label>Piscina
            <select value={pool} onChange={e => setPool(e.target.value)} required>
              {pools.map(p => (
                <option key={p.id} value={p.name}>
                  {p.name} / {p.owner}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3>Mediciones iniciales</h3>
        <div className="form-grid">
          <label>Cloro inicial (ppm)
            <input type="number" step="0.01" value={values.chlorine} onChange={e => setValues({ ...values, chlorine: e.target.value })} required />
          </label>
          <label>pH inicial
            <input type="number" step="0.01" value={values.ph} onChange={e => setValues({ ...values, ph: e.target.value })} required />
          </label>
          <label>Alcalinidad inicial (ppm)
            <input type="number" step="0.01" value={values.alkalinity} onChange={e => setValues({ ...values, alkalinity: e.target.value })} />
          </label>
          <label>Dureza cálcica (ppm)
            <input type="number" step="0.01" value={values.hardness} onChange={e => setValues({ ...values, hardness: e.target.value })} />
          </label>
          <label>Ácido cianúrico (ppm)
            <input type="number" step="0.01" value={values.cyanuric} onChange={e => setValues({ ...values, cyanuric: e.target.value })} />
          </label>
        </div>

        <h3>Actividades realizadas</h3>
        <div className="form-task-grid">
          {visitTasks.map(([key, label]) => (
            <label className="form-task" key={String(key)}>
              <input
                type="checkbox"
                checked={Boolean(tasks[String(key)])}
                onChange={e => setTasks({ ...tasks, [String(key)]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        <label>Tabletas de cloro aplicadas
          <input
            type="number"
            min="0"
            step="1"
            value={values.tablets}
            onChange={e => setValues({ ...values, tablets: e.target.value })}
          />
        </label>

        <label>Notas
          <textarea
            value={values.notes}
            onChange={e => setValues({ ...values, notes: e.target.value })}
            placeholder="Observaciones de la visita"
          />
        </label>

        <h3>Registro fotográfico</h3>
        <div className="form-photo-grid">
          {[
            ['arrivalPhoto1', 'Llegada 1'],
            ['arrivalPhoto2', 'Llegada 2'],
            ['afterPhoto1', 'Salida limpieza 1'],
            ['afterPhoto2', 'Salida limpieza 2'],
            ['exitPhoto', 'Salida propiedad']
          ].map(([key, label]) => (
            <label className="photo-upload" key={key}>
              {photos[key] ? <img src={photos[key]} alt={label} /> : <span>+ Añadir foto</span>}
              <b>{uploading === key ? 'Subiendo...' : label}</b>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(key, e.target.files[0])
                    e.target.value = ''
                  }
                }}
              />
            </label>
          ))}
        </div>

        <button className="primary-button" type="submit" disabled={uploading !== null}>
          {visitToEdit ? 'Guardar cambios' : 'Guardar visita'}
        </button>
      </form>
    </div>
  )
}
