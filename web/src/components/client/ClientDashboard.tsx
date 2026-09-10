import type { Invoice, Pool, User, Visit } from '../../types'
import { Visits } from '../visits/Visits'
import { Invoices } from '../invoices/Invoices'

interface ClientDashboardProps {
  user: User
  pools: Pool[]
  visits: Visit[]
  invoices: Invoice[]
  onLogout: () => void
}

export function ClientDashboard({ user, pools, visits, invoices, onLogout }: ClientDashboardProps) {
  const pool =
    pools.find(item => item.id === user.poolId) ||
    pools.find(item => item.name.toLowerCase() === user.fullName.split('+')[0]?.trim().toLowerCase())

  const clientVisits = pool ? visits.filter(visit => visit.piscina === pool.name) : []
  const clientInvoices = pool ? invoices.filter(invoice => invoice.poolId === pool.id) : []

  return (
    <div className="client-dashboard">
      <header className="client-header">
        <div>
          <span className="eyebrow">PORTAL DE CLIENTE</span>
          <h1>{pool?.name || 'Mis reportes'}</h1>
          <p>{pool?.owner || user.fullName}</p>
        </div>
        <button className="secondary-button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </header>
      <main className="client-content">
        {pool ? (
          <>
            <Visits visits={clientVisits} pools={[pool]} operator={user} onAdd={() => undefined} readOnly />
            <Invoices invoices={clientInvoices} pools={[pool]} isAdmin={false} />
          </>
        ) : (
          <div className="empty">Tu cuenta todavía no tiene una piscina asignada.</div>
        )}
      </main>
    </div>
  )
}
