import { FormEvent, useState } from 'react'
import type { Project, ProjectItem } from '../../types'
import { makeId } from '../../utils/helpers'
import { downloadProjectPdf } from '../../services/pdfService'

interface ProjectsProps {
  projects: Project[]
  onSave: (p: Project) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function Projects({ projects, onSave, onDelete }: ProjectsProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Project | null>(null)

  const totalCotizado = projects.reduce(
    (acc, p) => acc + p.items.reduce((iAcc, item) => iAcc + (Number(item.price) || 0), 0),
    0
  )
  const totalProfit = projects.reduce((acc, p) => acc + (Number(p.expectedProfit) || 0), 0)

  const filtered = projects
    .filter(p => {
      const matchesSearch = `${p.title} ${p.clientName} ${p.location || ''}`.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'TODOS' || p.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => b.fecha - a.fecha)

  return (
    <>
      <div className="stats">
        <div className="stat">
          <span>Proyectos adicionales</span>
          <strong>{projects.length}</strong>
          <small>Cotizaciones / Obras</small>
        </div>
        <div className="stat">
          <span>Monto total cotizado</span>
          <strong>CRC {totalCotizado.toLocaleString('es-CR')}</strong>
          <small>Suma de ítems</small>
        </div>
        <div className="stat">
          <span>Ganancia proyectada</span>
          <strong>CRC {totalProfit.toLocaleString('es-CR')}</strong>
          <small>Ganancias estimadas</small>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">OBRAS Y TRABAJOS ADICIONALES</span>
          <h2>Proyectos y Cotizaciones</h2>
        </div>
        <button className="primary-button compact" onClick={() => setShowForm(true)}>
          + Nuevo proyecto
        </button>
      </div>
      <div className="invoice-filters" style={{ marginBottom: '20px' }}>
        <input
          className="search"
          style={{ marginBottom: 0 }}
          placeholder="Buscar proyecto, cliente o ubicación..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="COTIZACION">Cotización</option>
          <option value="EN_PROGRESO">En Progreso</option>
          <option value="COMPLETADO">Completado</option>
        </select>
      </div>
      <div className="pool-grid">
        {filtered.length ? (
          filtered.map(p => {
            const subtotal = p.items.reduce((acc, i) => acc + (Number(i.price) || 0), 0)
            const statusLabels: Record<Project['status'], string> = {
              COTIZACION: 'Cotización',
              EN_PROGRESO: 'En Progreso',
              COMPLETADO: 'Completado'
            }
            const statusClasses: Record<Project['status'], string> = {
              COTIZACION: 'warn',
              EN_PROGRESO: 'scheduled-status',
              COMPLETADO: 'good'
            }
            return (
              <article
                className="pool-card"
                key={p.id}
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}
                  >
                    <span className="eyebrow">{p.location || 'Proyecto'}</span>
                    <span className={'status ' + statusClasses[p.status]}>{statusLabels[p.status]}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>
                    Cliente: <strong>{p.clientName}</strong>
                  </p>
                  <div style={{ margin: '14px 0', fontSize: '13px', color: '#52716d' }}>
                    <div>Ítems: {p.items.length} trabajos</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--teal)', marginTop: '4px' }}>
                      CRC {subtotal.toLocaleString('es-CR')}
                    </div>
                    {p.expectedProfit ? (
                      <small style={{ color: '#267253' }}>
                        Ganancia est.: CRC {p.expectedProfit.toLocaleString('es-CR')}
                      </small>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button className="primary-button compact" style={{ flex: 1 }} onClick={() => setSelected(p)}>
                    Ver detalle
                  </button>
                  <button className="secondary-button compact" onClick={() => downloadProjectPdf(p)}>
                    PDF
                  </button>
                </div>
              </article>
            )
          })
        ) : (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            No hay proyectos registrados con ese criterio.
          </div>
        )}
      </div>
      {showForm && (
        <ProjectForm
          onClose={() => setShowForm(false)}
          onSave={async proj => {
            await onSave(proj)
            setShowForm(false)
          }}
        />
      )}
      {selected && (
        <ProjectDetail
          project={selected}
          onClose={() => setSelected(null)}
          onDelete={async id => {
            await onDelete(id)
            setSelected(null)
          }}
          onSave={onSave}
        />
      )}
    </>
  )
}

export function ProjectDetail({
  project,
  onClose,
  onDelete,
  onSave
}: {
  project: Project
  onClose: () => void
  onDelete: (id: string) => Promise<void>
  onSave: (p: Project) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const subtotal = project.items.reduce((acc, i) => acc + (Number(i.price) || 0), 0)
  const statusLabels: Record<Project['status'], string> = {
    COTIZACION: 'Cotización',
    EN_PROGRESO: 'En Progreso',
    COMPLETADO: 'Completado'
  }
  const statusClasses: Record<Project['status'], string> = {
    COTIZACION: 'warn',
    EN_PROGRESO: 'scheduled-status',
    COMPLETADO: 'good'
  }

  if (editing) {
    return (
      <ProjectForm
        project={project}
        onClose={() => setEditing(false)}
        onSave={async updated => {
          await onSave(updated)
          setEditing(false)
        }}
      />
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="modal pool-detail-modal" style={{ maxWidth: '640px' }}>
        <div className="modal-head">
          <h2>Detalle de Proyecto</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{project.title}</h1>
          <span className={'status ' + statusClasses[project.status]}>{statusLabels[project.status]}</span>
        </div>
        <p className="pool-owner">
          Cliente: <strong>{project.clientName}</strong> {project.location ? '· ' + project.location : ''}
        </p>
        <p style={{ fontSize: '11px', color: '#78908b', marginTop: '4px' }}>
          Fecha de emisión: {new Date(project.fecha).toLocaleDateString('es-CR')}
          {project.fechaVencimiento
            ? ` · Vence: ${new Date(project.fechaVencimiento).toLocaleDateString('es-CR')}`
            : ''}
        </p>

        <div className="detail-actions">
          <button className="secondary-button" onClick={() => setEditing(true)}>Editar proyecto</button>
          <button className="primary-button" onClick={() => downloadProjectPdf(project)}>
            Descargar Cotización PDF
          </button>
          <button className="danger-button" onClick={() => onDelete(project.id)}>Eliminar</button>
        </div>

        <h3>Desglose de Trabajos / Equipos ({project.items.length})</h3>
        <div
          style={{
            background: '#f5f9f7',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px'
          }}
        >
          {project.items.map((item, index) => (
            <div
              key={item.id || index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: index < project.items.length - 1 ? '1px solid #dce5e1' : 'none',
                fontSize: '13px'
              }}
            >
              <span style={{ flex: 1, paddingRight: '12px' }}>{index + 1 + '. ' + item.description}</span>
              <strong>CRC {Number(item.price).toLocaleString('es-CR')}</strong>
            </div>
          ))}
        </div>

        <div className="pool-detail-grid">
          <div className="pool-detail-item">
            <span>Total ítems</span>
            <strong>{'CRC ' + subtotal.toLocaleString('es-CR')}</strong>
          </div>
          {project.fechaVencimiento ? (
            <div className="pool-detail-item">
              <span>Válida hasta</span>
              <strong>{new Date(project.fechaVencimiento).toLocaleDateString('es-CR')}</strong>
            </div>
          ) : null}
          {project.suggestedPrice ? (
            <div className="pool-detail-item">
              <span>Precio Sugerido</span>
              <strong>{'CRC ' + project.suggestedPrice.toLocaleString('es-CR')}</strong>
            </div>
          ) : null}
          <div className="pool-detail-item">
            <span>Factura electrónica</span>
            <strong>{project.facturaElectronica ? 'Sí (13% IVA)' : 'No'}</strong>
          </div>
          {project.facturaElectronica ? (
            <div className="pool-detail-item">
              <span>Monto Total con IVA (+13%)</span>
              <strong>{'CRC ' + ((project.suggestedPrice || subtotal) * 1.13).toLocaleString('es-CR')}</strong>
            </div>
          ) : null}
          {project.expectedProfit ? (
            <div className="pool-detail-item">
              <span>Ganancia Estimada</span>
              <strong>{'CRC ' + project.expectedProfit.toLocaleString('es-CR')}</strong>
            </div>
          ) : null}
        </div>

        {project.notes ? (
          <div
            style={{
              marginTop: '16px',
              background: '#fff',
              border: '1px dashed var(--line)',
              padding: '12px',
              borderRadius: '4px'
            }}
          >
            <h4 style={{ fontSize: '12px', margin: '0 0 6px', color: '#52716d' }}>Notas / Cálculo</h4>
            <p style={{ fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0, color: '#183236' }}>{project.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ProjectForm({
  project,
  onClose,
  onSave
}: {
  project?: Project
  onClose: () => void
  onSave: (p: Project) => Promise<void>
}) {
  const [title, setTitle] = useState(project?.title || '')
  const [clientName, setClientName] = useState(project?.clientName || '')
  const [location, setLocation] = useState(project?.location || '')
  const [fechaVencimiento, setFechaVencimiento] = useState(
    project?.fechaVencimiento ? new Date(project.fechaVencimiento).toISOString().slice(0, 10) : ''
  )
  const [status, setStatus] = useState<Project['status']>(project?.status || 'COTIZACION')
  const [suggestedPrice, setSuggestedPrice] = useState(String(project?.suggestedPrice || ''))
  const [expectedProfit, setExpectedProfit] = useState(String(project?.expectedProfit || ''))
  const [facturaElectronica, setFacturaElectronica] = useState(project?.facturaElectronica || false)
  const [notes, setNotes] = useState(project?.notes || '')
  const [items, setItems] = useState<ProjectItem[]>(
    project?.items || [{ id: makeId(), description: '', price: 0 }]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subtotal = items.reduce((acc, i) => acc + (Number(i.price) || 0), 0)
  const baseForIva = suggestedPrice && !isNaN(Number(suggestedPrice)) ? Number(suggestedPrice) : subtotal
  const ivaAmount = facturaElectronica ? baseForIva * 0.13 : 0
  const totalWithIva = baseForIva + ivaAmount

  const addItem = () => setItems([...items, { id: makeId(), description: '', price: 0 }])
  const removeItem = (index: number) => setItems(items.filter((_, idx) => idx !== index))
  const updateItem = (index: number, field: 'description' | 'price', val: any) => {
    const next = [...items]
    next[index] = { ...next[index], [field]: field === 'price' ? (val === '' ? 0 : Number(val) || 0) : val }
    setItems(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const validItems = items
        .filter(i => i.description.trim() !== '')
        .map(i => ({
          id: i.id || makeId(),
          description: i.description.trim(),
          price: Number(i.price) || 0
        }))

      if (validItems.length === 0) {
        setError('Debes agregar al menos un trabajo o ítem con descripción.')
        setLoading(false)
        return
      }

      const payload: Project = {
        id: project?.id || makeId(),
        title: title.trim(),
        clientName: clientName.trim(),
        location: location.trim(),
        fecha: project?.fecha || Date.now(),
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento + 'T12:00:00').getTime() : undefined,
        status,
        items: validItems,
        suggestedPrice: suggestedPrice && !isNaN(Number(suggestedPrice)) ? Number(suggestedPrice) : 0,
        expectedProfit: expectedProfit && !isNaN(Number(expectedProfit)) ? Number(expectedProfit) : 0,
        facturaElectronica,
        notes: notes.trim()
      }

      await onSave(payload)
      onClose()
    } catch (err) {
      console.error('Error al guardar proyecto:', err)
      setError('No se pudo guardar el proyecto. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal pool-form" style={{ maxWidth: '680px' }} onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{project ? 'Editar Proyecto / Cotización' : 'Nuevo Proyecto / Cotización'}</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {error && <p className="login-error">{error}</p>}
        <div className="form-grid">
          <label>Título del proyecto
            <input value={title} onChange={e => setTitle(e.target.value)} required />
          </label>
          <label>Cliente / Atendido a
            <input value={clientName} onChange={e => setClientName(e.target.value)} required />
          </label>
          <label>Ubicación
            <input value={location} onChange={e => setLocation(e.target.value)} />
          </label>
          <label>Fecha de vencimiento de cotización
            <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
          </label>
          <label>Estado
            <select value={status} onChange={e => setStatus(e.target.value as Project['status'])}>
              <option value="COTIZACION">Cotización</option>
              <option value="EN_PROGRESO">En Progreso</option>
              <option value="COMPLETADO">Completado</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 10px' }}>
          <h3 style={{ margin: 0 }}>Desglose de Ítems / Trabajos ({items.length})</h3>
          <button type="button" className="secondary-button compact" onClick={addItem}>
            + Agregar Ítem
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {items.map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                style={{ flex: 3 }}
                placeholder="Descripción del trabajo / equipo"
                value={item.description}
                onChange={e => updateItem(idx, 'description', e.target.value)}
                required
              />
              <input
                style={{ flex: 1.2 }}
                type="number"
                min="0"
                placeholder="Monto CRC"
                value={item.price || ''}
                onChange={e => updateItem(idx, 'price', e.target.value)}
              />
              {items.length > 1 && (
                <button
                  type="button"
                  className="danger-button"
                  style={{ padding: '10px 12px' }}
                  onClick={() => removeItem(idx)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#f5f9f7',
            padding: '10px 14px',
            borderRadius: '4px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '13px',
            fontWeight: 'bold',
            color: 'var(--teal)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal de ítems:</span>
            <span>CRC {subtotal.toLocaleString('es-CR')}</span>
          </div>
          {facturaElectronica ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6d8e8a', fontSize: '12px' }}>
                <span>IVA (13%):</span>
                <span>CRC {ivaAmount.toLocaleString('es-CR')}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#183236',
                  fontSize: '14px',
                  paddingTop: '4px',
                  borderTop: '1px solid #dce5e1'
                }}
              >
                <span>Monto Total con IVA:</span>
                <span>CRC {totalWithIva.toLocaleString('es-CR')}</span>
              </div>
            </>
          ) : null}
        </div>

        <label
          className="form-task"
          style={{ margin: '12px 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <input
            type="checkbox"
            checked={facturaElectronica}
            onChange={e => setFacturaElectronica(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          Factura electrónica (+13% IVA)
        </label>

        <label style={{ marginTop: '12px' }}>Notas adicionales / Cálculos
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ejemplo: Mínimo: ₡370k | Máximo: ₡530k | Sugerido: ₡450k"
          />
        </label>

        <button
          className="primary-button"
          type="submit"
          style={{ marginTop: '18px' }}
          disabled={loading || !title.trim() || !clientName.trim()}
        >
          {loading ? 'Guardando...' : 'Guardar Proyecto'}
        </button>
      </form>
    </div>
  )
}
