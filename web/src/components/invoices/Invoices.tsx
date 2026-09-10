import { useState } from 'react'
import type { Invoice, Pool } from '../../types'
import { downloadInvoicePdf } from '../../services/pdfService'

interface InvoicesProps {
  invoices: Invoice[]
  pools: Pool[]
  isAdmin: boolean
  onDelete?: (id: string) => void
  onSave?: (invoice: Invoice) => Promise<void>
}

export function Invoices({ invoices, pools, isAdmin, onDelete, onSave }: InvoicesProps) {
  const [poolId, setPoolId] = useState('')
  const [months, setMonths] = useState('all')
  const [editing, setEditing] = useState<Invoice | null>(null)

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - Number(months || 0))
  const filtered = invoices
    .filter(invoice => (!poolId || invoice.poolId === poolId) && (months === 'all' || invoice.fecha >= cutoff.getTime()))
    .sort((a, b) => b.fecha - a.fecha)

  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">DOCUMENTOS DE COBRO</span>
          <h2>Facturas</h2>
        </div>
        <div className="invoice-filters">
          {isAdmin && (
            <select value={poolId} onChange={event => setPoolId(event.target.value)}>
              <option value="">Todos los clientes</option>
              {pools.map(pool => (
                <option key={pool.id} value={pool.id}>
                  {pool.name} / {pool.owner}
                </option>
              ))}
            </select>
          )}
          <select value={months} onChange={event => setMonths(event.target.value)}>
            <option value="all">Todas las facturas</option>
            <option value="1">Último mes</option>
            <option value="2">Últimos 2 meses</option>
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Últimos 12 meses</option>
          </select>
        </div>
      </div>
      <div className="invoice-list">
        {filtered.length ? (
          filtered.map(invoice => (
            <article className="invoice-row" key={invoice.id}>
              <div>
                <strong>{invoice.owner}</strong>
                <span>{invoice.poolName} · {new Date(invoice.fecha).toLocaleDateString('es-CR')}</span>
              </div>
              <div>
                <strong>₡{invoice.total.toLocaleString('es-CR')}</strong>
                <span>{invoice.facturaElectronica ? 'IVA 13%' : 'IVA 0%'}</span>
              </div>
              <button className="primary-button compact" onClick={() => downloadInvoicePdf(invoice)}>
                Descargar PDF
              </button>
              {isAdmin && (
                <>
                  <button className="secondary-button compact" onClick={() => setEditing(invoice)}>
                    Editar
                  </button>
                  <button className="danger-button" onClick={() => onDelete?.(invoice.id)}>
                    Eliminar
                  </button>
                </>
              )}
            </article>
          ))
        ) : (
          <div className="empty">No hay facturas en el periodo seleccionado.</div>
        )}
      </div>
      {editing && onSave && (
        <InvoiceForm
          invoice={editing}
          pools={pools}
          onClose={() => setEditing(null)}
          onSave={async updated => {
            await onSave(updated)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

export function InvoiceForm({
  invoice,
  pools,
  onClose,
  onSave
}: {
  invoice: Invoice
  pools: Pool[]
  onClose: () => void
  onSave: (invoice: Invoice) => Promise<void>
}) {
  const [subtotal, setSubtotal] = useState(String(invoice.subtotal))
  const [electronica, setElectronica] = useState(invoice.facturaElectronica)
  const [date, setDate] = useState(new Date(invoice.fecha).toISOString().slice(0, 10))
  const pool = pools.find(item => item.id === invoice.poolId)

  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={async event => {
          event.preventDefault()
          const amount = Number(subtotal)
          await onSave({
            ...invoice,
            fecha: new Date(date + 'T12:00:00').getTime(),
            subtotal: amount,
            iva: electronica ? amount * 0.13 : 0,
            total: electronica ? amount * 1.13 : amount,
            facturaElectronica: electronica,
            poolName: pool?.name || invoice.poolName,
            owner: pool?.owner || invoice.owner
          })
        }}
      >
        <div className="modal-head">
          <h2>Editar factura</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <p>{invoice.poolName} · {invoice.owner}</p>
        <label>Fecha
          <input type="date" value={date} onChange={event => setDate(event.target.value)} />
        </label>
        <label>Subtotal
          <input type="number" min="0" value={subtotal} onChange={event => setSubtotal(event.target.value)} />
        </label>
        <label className="form-task">
          <input
            type="checkbox"
            checked={electronica}
            onChange={event => setElectronica(event.target.checked)}
          />{' '}
          Factura electrónica (+13%)
        </label>
        <button className="primary-button" type="submit">
          Guardar factura
        </button>
      </form>
    </div>
  )
}
