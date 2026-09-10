import { useState } from 'react'
import type { Invoice, Pool, Visit } from '../../types'
import { weekDays } from '../../constants/dataSeed'
import { makeId, makePoolCode } from '../../utils/helpers'
import { downloadInvoicePdf } from '../../services/pdfService'

interface PoolsProps {
  pools: Pool[]
  visits: Visit[]
  isAdmin: boolean
  onAdd: (pool: Pool) => void
  onUpdate: (pool: Pool) => void
  onDelete: (id: string) => void
  invoices: Invoice[]
  onInvoice: (invoice: Invoice) => void
}

export function Pools({ pools, visits, isAdmin, onAdd, onUpdate, onDelete, invoices, onInvoice }: PoolsProps) {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Pool | null>(null)
  const results = pools.filter(pool => `${pool.name} ${pool.owner}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">CARTERA DE CLIENTES</span>
          <h2>Piscinas <small className="count">{pools.length}</small></h2>
        </div>
        {isAdmin && (
          <button className="primary-button compact" onClick={() => setShowForm(true)}>
            + Añadir piscina
          </button>
        )}
      </div>
      <input
        className="search"
        placeholder="Buscar por nombre o dueño..."
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      <div className="pool-grid">
        {results.map(pool => (
          <button className="pool-card pool-card-button" onClick={() => setSelected(pool)} key={pool.id}>
            <div className="pool-icon">◌</div>
            <span className="eyebrow">{pool.location}</span>
            <h3>{pool.name}</h3>
            <p>{pool.owner}</p>
            <div className="pool-meta">
              <span>{pool.size} m²</span>
              <b>{pool.visitsPerWeek} visitas / semana</b>
            </div>
            <div className="days">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
                <i className={pool.scheduledDays.includes(index + 1) ? 'day selected' : 'day'} key={day}>
                  {day}
                </i>
              ))}
            </div>
          </button>
        ))}
      </div>
      {showForm && (
        <PoolForm
          onClose={() => setShowForm(false)}
          onSave={pool => {
            onAdd(pool)
            setShowForm(false)
          }}
        />
      )}
      {selected && (
        <PoolDetail
          pool={selected}
          visits={visits}
          isAdmin={isAdmin}
          invoices={invoices}
          onInvoice={onInvoice}
          onClose={() => setSelected(null)}
          onUpdate={pool => {
            onUpdate(pool)
            setSelected(pool)
          }}
          onDelete={id => {
            onDelete(id)
            setSelected(null)
          }}
        />
      )}
    </>
  )
}

function PoolDetail({
  pool,
  visits,
  isAdmin,
  invoices,
  onInvoice,
  onClose,
  onUpdate,
  onDelete
}: {
  pool: Pool
  visits: Visit[]
  isAdmin: boolean
  invoices: Invoice[]
  onInvoice: (invoice: Invoice) => void
  onClose: () => void
  onUpdate: (pool: Pool) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <PoolForm
        pool={pool}
        onClose={() => setEditing(false)}
        onSave={updated => {
          onUpdate(updated)
          setEditing(false)
        }}
      />
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="modal pool-detail-modal">
        <div className="modal-head">
          <h2>Detalle de piscina</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <h1>{pool.name}</h1>
        <p className="pool-owner">{pool.owner}</p>
        {isAdmin && (
          <div className="detail-actions">
            <button className="secondary-button" onClick={() => setEditing(true)}>Editar piscina</button>
            <button className="danger-button" onClick={() => onDelete(pool.id)}>Eliminar</button>
          </div>
        )}
        <button className="primary-button" onClick={() => emitInvoice(pool, visits, onInvoice)}>
          Generar factura PDF
        </button>
        <h3>Información de la piscina</h3>
        <div className="pool-detail-grid">
          <Detail label="Dueño" value={pool.owner} />
          <Detail label="Ubicación" value={pool.location || 'No indicada'} />
          <Detail label="Teléfono" value={pool.phone || 'No indicado'} />
          <Detail label="Correo" value={pool.email || 'No indicado'} />
          <Detail label="Compañía de manejo" value={pool.managementCompany || 'No indicada'} />
          <Detail label="Tamaño (m²)" value={pool.size.toFixed(2)} />
          <Detail label="Visitas por semana" value={pool.visitsPerWeek.toFixed(0)} />
          <Detail label="Días programados" value={pool.scheduledDays.map(day => weekDays[day - 1]).join(', ') || 'Ninguno'} />
          <Detail label="Código de acceso" value={pool.codigo || makePoolCode(pool)} />
          <Detail label="Factura electrónica" value={pool.facturaElectronica ? 'Sí (13%)' : 'No'} />
          {isAdmin && <Detail label="Pago mensual" value={`₡${pool.monthlyPayment.toLocaleString('es-CR')}`} />}
        </div>
        <h3>Facturas recientes</h3>
        <div className="invoice-mini-list">
          {invoices
            .filter(invoice => invoice.poolId === pool.id)
            .slice(-3)
            .reverse()
            .map(invoice => (
              <div key={invoice.id}>
                <strong>{invoice.periodo}</strong>
                <span>₡{invoice.total.toLocaleString('es-CR')} · {invoice.facturaElectronica ? 'IVA 13%' : 'IVA 0%'}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export function PoolForm({ pool, onClose, onSave }: { pool?: Pool; onClose: () => void; onSave: (pool: Pool) => void }) {
  const [name, setName] = useState(pool?.name || '')
  const [owner, setOwner] = useState(pool?.owner || '')
  const [location, setLocation] = useState(pool?.location || '')
  const [phone, setPhone] = useState(pool?.phone || '')
  const [email, setEmail] = useState(pool?.email || '')
  const [company, setCompany] = useState(pool?.managementCompany || '')
  const [size, setSize] = useState(String(pool?.size || ''))
  const [visits, setVisits] = useState(String(pool?.visitsPerWeek || 1))
  const [days, setDays] = useState<number[]>(pool?.scheduledDays || [1])
  const [payment, setPayment] = useState(String(pool?.monthlyPayment || ''))
  const [codigo, setCodigo] = useState(pool?.codigo || makePoolCode(pool || { id: makeId() }))
  const [error, setError] = useState('')
  const [facturaElectronica, setFacturaElectronica] = useState(pool?.facturaElectronica || false)

  const maxVisits = Number(visits) || 0
  const toggle = (day: number) =>
    setDays(current =>
      current.includes(day)
        ? current.filter(value => value !== day)
        : current.length < maxVisits
        ? [...current, day].sort()
        : current
    )

  return (
    <div className="modal-backdrop">
      <form
        className="modal pool-form"
        onSubmit={async event => {
          event.preventDefault()
          setError('')
          try {
            await onSave({
              id: pool?.id || makeId(),
              name,
              owner,
              location,
              phone,
              email,
              managementCompany: company,
              size: Number(size),
              visitsPerWeek: maxVisits,
              scheduledDays: days,
              monthlyPayment: Number(payment),
              codigo: codigo.trim().toUpperCase() || makePoolCode({ id: pool?.id || makeId() }),
              facturaElectronica
            })
            onClose()
          } catch {
            setError('No se pudo guardar la piscina. Revisa los permisos de Firebase.')
          }
        }}
      >
        <div className="modal-head">
          <h2>{pool ? 'Editar piscina' : 'Añadir piscina'}</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {error && <p className="login-error">{error}</p>}
        <div className="form-grid">
          <label>Nombre
            <input value={name} onChange={e => setName(e.target.value)} required />
          </label>
          <label>Dueño
            <input value={owner} onChange={e => setOwner(e.target.value)} required />
          </label>
          <label>Ubicación
            <input value={location} onChange={e => setLocation(e.target.value)} />
          </label>
          <label>Teléfono
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </label>
          <label>Correo
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>Compañía de manejo
            <input value={company} onChange={e => setCompany(e.target.value)} />
          </label>
          <label>Tamaño (m²)
            <input type="number" step="0.01" value={size} onChange={e => setSize(e.target.value)} required />
          </label>
          <label>Visitas por semana
            <input type="number" min="1" value={visits} onChange={e => setVisits(e.target.value)} required />
          </label>
          <label>Código de acceso
            <input value={codigo} onChange={e => setCodigo(e.target.value)} required />
          </label>
          <label>Pago mensual
            <input type="number" step="0.01" value={payment} onChange={e => setPayment(e.target.value)} />
          </label>
        </div>
        <label className="form-task">
          <input
            type="checkbox"
            checked={facturaElectronica}
            onChange={event => setFacturaElectronica(event.target.checked)}
          />{' '}
          Factura electrónica (+13%)
        </label>
        <h3>Días programados ({days.length}/{maxVisits})</h3>
        <div className="pool-day-grid">
          {weekDays.map((day, index) => (
            <button
              type="button"
              className={days.includes(index + 1) ? 'selected' : ''}
              onClick={() => toggle(index + 1)}
              disabled={!days.includes(index + 1) && days.length >= maxVisits}
              key={day}
            >
              {day}
            </button>
          ))}
        </div>
        <button
          className="primary-button"
          type="submit"
          disabled={!name.trim() || !owner.trim() || maxVisits < 1 || days.length !== maxVisits}
        >
          Guardar
        </button>
      </form>
    </div>
  )
}

function emitInvoice(pool: Pool, visits: Visit[], onSave: (invoice: Invoice) => void) {
  const now = new Date()
  const monthlyVisits = visits.filter(visit => {
    const date = new Date(visit.fecha)
    return (
      visit.piscina === pool.name &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    )
  })
  const lastVisit = monthlyVisits.sort((a, b) => b.fecha - a.fecha)[0]
  const invoiceDate = lastVisit ? new Date(lastVisit.fecha) : now
  const periodo = invoiceDate.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })
  const subtotal = Number(pool.monthlyPayment) || 0
  const iva = pool.facturaElectronica ? subtotal * 0.13 : 0
  const invoice: Invoice = {
    id: `invoice-${pool.id}-${invoiceDate.getFullYear()}-${invoiceDate.getMonth() + 1}`,
    poolId: pool.id,
    poolName: pool.name,
    owner: pool.owner,
    fecha: invoiceDate.getTime(),
    periodo,
    subtotal,
    iva,
    total: subtotal + iva,
    facturaElectronica: Boolean(pool.facturaElectronica),
    estado: 'EMITIDA'
  }
  onSave(invoice)
  downloadInvoicePdf(invoice)
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="pool-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
