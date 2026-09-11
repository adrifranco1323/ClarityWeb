import { useEffect, useState } from 'react'
import type { Invoice, Pool, Project, User, Visit } from './types'
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { clientUserForPool, makePoolCode, stored } from './utils/helpers'
import { historicalVisits, vmfpHistoricalPeriods } from './constants/dataSeed'
import { LoginForm } from './components/auth/LoginForm'
import { ClientDashboard } from './components/client/ClientDashboard'
import { Visits } from './components/visits/Visits'
import { Pools } from './components/pools/Pools'
import { Invoices } from './components/invoices/Invoices'
import { Projects } from './components/projects/Projects'
import { Calculator } from './components/calculator/Calculator'
import { Users } from './components/users/Users'

type View = 'visits' | 'pools' | 'calculator' | 'users' | 'invoices' | 'projects'

export default function App() {
  const [user, setUser] = useState<User | null>(() => stored('clarity-user', null))
  const [pools, setPools] = useState<Pool[]>(() => stored('clarity-pools', []))
  const [visits, setVisits] = useState<Visit[]>(() => stored('clarity-visits', []))
  const [users, setUsers] = useState<User[]>(() => stored('clarity-users', []))
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [view, setView] = useState<View>('visits')
  const [dark, setDark] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Sincronización en tiempo real desde Cloud Firestore
  useEffect(() => {
    const subscriptions = [
      onSnapshot(
        collection(db, 'pools'),
        snapshot => {
          const nextPools = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Pool))
          setPools(nextPools)
          nextPools.forEach(pool => {
            const codigo = makePoolCode(pool)
            if (!pool.codigo || pool.facturaElectronica === undefined) {
              setDoc(
                doc(db, 'pools', pool.id),
                { codigo, facturaElectronica: pool.facturaElectronica ?? false },
                { merge: true }
              ).catch(() => undefined)
            }
            setDoc(doc(db, 'users', `client-${pool.id}`), clientUserForPool({ ...pool, codigo }), {
              merge: true
            }).catch(() => undefined)
          })
        },
        () => undefined
      ),
      onSnapshot(
        collection(db, 'visits'),
        snapshot => setVisits(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Visit))),
        () => undefined
      ),
      onSnapshot(
        collection(db, 'users'),
        snapshot => setUsers(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as User))),
        () => undefined
      ),
      onSnapshot(
        collection(db, 'invoices'),
        snapshot => setInvoices(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Invoice))),
        () => undefined
      ),
      onSnapshot(
        collection(db, 'projects'),
        snapshot => setProjects(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Project))),
        () => undefined
      ),
    ]
    return () => subscriptions.forEach(unsubscribe => unsubscribe())
  }, [])

  // Migraciones automáticas de datos de producción para el administrador
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return
    const migrateHistoricalVisits = async () => {
      const markerRef = doc(db, 'migrations', 'historical-vista-marina-only-2026')
      if ((await getDoc(markerRef)).exists()) return
      const historicalIds = new Set(historicalVisits.map(visit => visit.id))
      const existingVisits = await getDocs(collection(db, 'visits'))
      await Promise.all(
        existingVisits.docs.filter(item => !historicalIds.has(item.id)).map(item => deleteDoc(item.ref))
      )
      await Promise.all(
        historicalVisits.map(visit => setDoc(doc(db, 'visits', visit.id), visit, { merge: true }))
      )
      await setDoc(markerRef, {
        completedAt: Date.now(),
        records: historicalVisits.length,
        action: 'removed all other visits'
      })
    }
    migrateHistoricalVisits().catch(() => undefined)
  }, [user])

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return
    const syncPoolCodes = async () => {
      const poolSnapshot = await getDocs(collection(db, 'pools'))
      const currentPools = poolSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as Pool))
      await Promise.all(
        currentPools
          .filter(pool => !pool.codigo)
          .map(pool => setDoc(doc(db, 'pools', pool.id), { codigo: makePoolCode(pool) }, { merge: true }))
      )

      const userSnapshot = await getDocs(collection(db, 'users'))
      const currentUsers = userSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as User))
      await Promise.all(
        currentUsers
          .filter(item => item.role === 'CLIENTE' && item.poolId && !item.poolCode)
          .map(item => {
            const pool = currentPools.find(candidate => candidate.id === item.poolId)
            return pool
              ? setDoc(doc(db, 'users', item.id), { poolCode: makePoolCode(pool) }, { merge: true })
              : Promise.resolve()
          })
      )

      const invoiceMarker = doc(db, 'migrations', 'vmfp-historical-invoices-2026')
      if (!(await getDoc(invoiceMarker)).exists()) {
        const vmfp = currentPools.find(pool => pool.codigo?.toUpperCase() === 'VMFP')
        if (vmfp) {
          await Promise.all(
            vmfpHistoricalPeriods.map(period => {
              const invoice: Invoice = {
                id: `invoice-${vmfp.id}-${period}`,
                poolId: vmfp.id,
                poolName: vmfp.name,
                owner: vmfp.owner,
                fecha: new Date(`${period}-01T12:00:00`).getTime(),
                periodo: period,
                subtotal: 45000,
                iva: 0,
                total: 45000,
                facturaElectronica: false,
                estado: 'EMITIDA'
              }
              return setDoc(doc(db, 'invoices', invoice.id), invoice, { merge: true })
            })
          )
          await setDoc(invoiceMarker, { completedAt: Date.now(), records: 4, poolCode: 'VMFP' })
        }
      }

      const invoiceDateMarker = doc(db, 'migrations', 'invoice-dates-last-visit-2026')
      if (!(await getDoc(invoiceDateMarker)).exists()) {
        const invoiceSnapshot = await getDocs(collection(db, 'invoices'))
        const visitSnapshot = await getDocs(collection(db, 'visits'))
        const allVisits = visitSnapshot.docs.map(item => item.data() as Visit)
        await Promise.all(
          invoiceSnapshot.docs.map(item => {
            const invoice = { id: item.id, ...item.data() } as Invoice
            const invoiceDate = new Date(invoice.fecha)
            const lastVisit = allVisits
              .filter(visit => {
                const visitDate = new Date(visit.fecha)
                return (
                  visit.piscina === invoice.poolName &&
                  visitDate.getFullYear() === invoiceDate.getFullYear() &&
                  visitDate.getMonth() === invoiceDate.getMonth()
                )
              })
              .sort((a, b) => b.fecha - a.fecha)[0]
            return lastVisit
              ? setDoc(doc(db, 'invoices', invoice.id), { fecha: lastVisit.fecha }, { merge: true })
              : Promise.resolve()
          })
        )
        await setDoc(invoiceDateMarker, {
          completedAt: Date.now(),
          action: 'invoice dates set to last monthly visit'
        })
      }
    }
    syncPoolCodes().catch(() => undefined)
  }, [user])

  // Persistencia de respaldo local
  useEffect(() => {
    localStorage.setItem('clarity-user', JSON.stringify(user))
  }, [user])
  useEffect(() => {
    localStorage.setItem('clarity-pools', JSON.stringify(pools))
    localStorage.setItem('clarity-visits', JSON.stringify(visits))
    localStorage.setItem('clarity-users', JSON.stringify(users))
  }, [pools, visits, users])

  if (!user) return <LoginForm onLogin={setUser} />
  if (user.role === 'PENDIENTE') {
    return (
      <div className="center-page">
        <div className="pending">
          <span className="brand-mark">💧</span>
          <h2>Cuenta pendiente de aprobación</h2>
          <p>Tu registro está siendo revisado por un administrador.</p>
          <button className="secondary-button" onClick={() => setUser(null)}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }
  if (user.role === 'CLIENTE') {
    return (
      <ClientDashboard
        user={user}
        pools={pools}
        visits={visits}
        invoices={invoices}
        onLogout={() => setUser(null)}
      />
    )
  }

  const items: [View, string, string][] = [
    ['visits', 'Visitas', '📅'],
    ['pools', 'Piscinas', '🏊'],
    ['calculator', 'Calculadora', '🧮'],
    ['invoices', 'Facturas', '🧾'],
    ...(user.role === 'ADMIN'
      ? ([
          ['projects', 'Proyectos', '🛠️'] as [View, string, string],
          ['users', 'Usuarios', '👥'] as [View, string, string]
        ] as [View, string, string][])
      : [])
  ]

  const titles: Record<View, string> = {
    visits: 'Resumen de visitas',
    pools: 'Tus piscinas',
    calculator: 'Calculadora de volumen',
    invoices: 'Facturas',
    projects: 'Proyectos adicionales',
    users: 'Equipo'
  }

  const saveVisit = async (visit: Visit) => {
    const cleanVisit = JSON.parse(JSON.stringify(visit))
    setVisits(current =>
      current.some(item => item.id === visit.id)
        ? current.map(item => (item.id === visit.id ? visit : item))
        : [visit, ...current]
    )
    await setDoc(doc(db, 'visits', visit.id), cleanVisit)
  }

  const deleteVisit = async (visitId: string) => {
    setVisits(current => current.filter(item => item.id !== visitId))
    await deleteDoc(doc(db, 'visits', visitId))
  }

  const savePool = async (pool: Pool) => {
    const nextPool = { ...pool, codigo: pool.codigo?.trim().toUpperCase() || makePoolCode(pool) }
    try {
      await setDoc(doc(db, 'pools', nextPool.id), nextPool)
      await setDoc(doc(db, 'users', `client-${nextPool.id}`), clientUserForPool(nextPool), { merge: true })
    } catch (error) {
      console.error('No se pudo guardar la piscina', error)
      throw error
    }
  }

  const updatePool = async (pool: Pool) => {
    const nextPool = { ...pool, codigo: pool.codigo?.trim().toUpperCase() || makePoolCode(pool) }
    await setDoc(doc(db, 'pools', nextPool.id), nextPool)
    await setDoc(doc(db, 'users', `client-${nextPool.id}`), clientUserForPool(nextPool), { merge: true })
  }

  const deletePool = async (poolId: string) => {
    setPools(current => current.filter(item => item.id !== poolId))
    await deleteDoc(doc(db, 'pools', poolId))
  }

  const saveUser = async (nextUser: User) => {
    const cleanUser = JSON.parse(JSON.stringify(nextUser))
    setUsers(current =>
      current.some(item => item.id === nextUser.id)
        ? current.map(item => (item.id === nextUser.id ? nextUser : item))
        : [...current, nextUser]
    )
    try {
      await setDoc(doc(db, 'users', nextUser.id), cleanUser, { merge: true })
      if (nextUser.role === 'CLIENTE' && nextUser.poolId && nextUser.poolCode) {
        await setDoc(doc(db, 'pools', nextUser.poolId), { codigo: nextUser.poolCode }, { merge: true })
      }
    } catch (error) {
      console.error('Error al guardar usuario en Firestore:', error)
      throw error
    }
  }

  const deleteUser = async (userId: string) => {
    setUsers(current => current.filter(item => item.id !== userId))
    await deleteDoc(doc(db, 'users', userId))
  }

  const saveInvoice = async (invoice: Invoice) => {
    await setDoc(doc(db, 'invoices', invoice.id), invoice)
  }

  const deleteInvoice = async (invoiceId: string) => {
    await deleteDoc(doc(db, 'invoices', invoiceId))
  }

  const saveProject = async (project: Project) => {
    const clean = JSON.parse(JSON.stringify(project))
    await setDoc(doc(db, 'projects', project.id), clean)
    setProjects(current =>
      current.some(p => p.id === project.id)
        ? current.map(p => (p.id === project.id ? project : p))
        : [project, ...current]
    )
  }

  const deleteProject = async (projectId: string) => {
    setProjects(current => current.filter(p => p.id !== projectId))
    await deleteDoc(doc(db, 'projects', projectId))
  }

  return (
    <div className={dark ? 'app dark' : 'app'}>
      {/* Barra superior de navegación para teléfonos y tablets */}
      <nav className="mobile-top-nav" aria-label="Navegación móvil">
        <div className="mobile-nav-scroll">
          {items.map(([key, label, icon]) => (
            <button
              className={view === key ? 'mobile-nav-chip active' : 'mobile-nav-chip'}
              onClick={() => setView(key)}
              key={key}
              type="button"
            >
              <span>{icon}</span>
              <b>{label}</b>
            </button>
          ))}
          <button
            className="mobile-nav-chip"
            onClick={() => setUser(null)}
            key="logout-mobile"
            type="button"
            style={{ color: '#e89898' }}
          >
            <span>🚪</span>
            <b>Salir</b>
          </button>
        </div>
      </nav>

      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">💧</span>
          <div>
            <strong>CLARITY</strong>
            <small>SOLUTIONS</small>
          </div>
        </div>
        <nav>
          {items.map(([key, label, icon]) => (
            <button
              className={view === key ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setView(key)
                setMobileMenuOpen(false)
              }}
              key={key}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <button className="nav-item logout" onClick={() => setUser(null)}>
          <span>🚪</span>Cerrar sesión
        </button>
      </aside>

      <main>
        <header>
          <button
            className="mobile-menu"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          <div>
            <span className="eyebrow">PANEL DE OPERACIONES</span>
            <h1>{titles[view]}</h1>
          </div>
          <div className="header-actions">
            <span className="user-chip">
              {user.fullName.slice(0, 1)}
              <b>{user.fullName}</b>
            </span>
            <button className="icon-button" onClick={() => setDark(!dark)}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <section className="content">
          {view === 'visits' && (
            <Visits
              visits={visits}
              pools={pools}
              users={users}
              operator={user}
              onAdd={saveVisit}
              onDelete={deleteVisit}
            />
          )}
          {view === 'pools' && (
            <Pools
              pools={pools}
              visits={visits}
              isAdmin={user.role === 'ADMIN'}
              onAdd={savePool}
              onUpdate={updatePool}
              onDelete={deletePool}
              invoices={invoices}
              onInvoice={saveInvoice}
            />
          )}
          {view === 'calculator' && <Calculator />}
          {view === 'invoices' && (
            <Invoices
              invoices={invoices}
              pools={pools}
              isAdmin={user.role === 'ADMIN'}
              onDelete={deleteInvoice}
              onSave={saveInvoice}
            />
          )}
          {view === 'projects' && (
            <Projects
              projects={projects}
              onSave={saveProject}
              onDelete={deleteProject}
            />
          )}
          {view === 'users' && (
            <Users
              users={users}
              pools={pools}
              onUpdate={saveUser}
              onDelete={deleteUser}
            />
          )}
        </section>
      </main>
    </div>
  )
}