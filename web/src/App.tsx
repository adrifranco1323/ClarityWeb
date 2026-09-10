import { FormEvent, useEffect, useState } from 'react'
import type { Invoice, Pool, Project, ProjectItem, User, Visit } from './types'
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { GoogleAuthProvider, signInAnonymously, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from './firebase'
import { jsPDF } from 'jspdf'

type View = 'visits' | 'pools' | 'calculator' | 'users' | 'invoices' | 'projects'

const usersSeed: User[] = [
  { id: '1', fullName: 'Admin User', email: 'admin@clarity.com', password: 'admin123', role: 'ADMIN' },
  { id: '2', fullName: 'Operario User', email: 'operario@clarity.com', password: 'ope123', role: 'OPERARIO' },
]

const poolsSeed: Pool[] = [
  { id: 'p1', name: 'Casa del Lago', owner: 'María García', location: 'Av. del Lago 42', phone: '', email: '', managementCompany: 'Particular', size: 48, visitsPerWeek: 2, scheduledDays: [2, 5], monthlyPayment: 180 },
  { id: 'p2', name: 'Residencial Clarity', owner: 'Comunidad Norte', location: 'Calle Norte 18', phone: '', email: '', managementCompany: 'Fincas Norte', size: 92, visitsPerWeek: 3, scheduledDays: [1, 3, 5], monthlyPayment: 320 },
  { id: 'p3', name: 'Villa Sol', owner: 'Javier Ruiz', location: 'Camino del Sol 7', phone: '', email: '', managementCompany: 'Particular', size: 35, visitsPerWeek: 1, scheduledDays: [6], monthlyPayment: 120 },
]

const visitsSeed: Visit[] = [
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

const historicalVisits: Visit[] = [
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

const stored = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || '') } catch { return fallback } }
const makeId = () => Math.random().toString(36).slice(2, 10)
const makePoolCode = (pool: Pick<Pool, 'id' | 'codigo'>) => pool.codigo || `CL-${pool.id.toUpperCase()}`
const clientUserForPool = (pool: Pool): User => ({ id: `client-${pool.id}`, fullName: `${pool.name} + ${pool.owner}`, email: pool.email, role: 'CLIENTE', poolId: pool.id, poolCode: makePoolCode(pool) })
const vmfpHistoricalPeriods = ['2026-06', '2026-07', '2026-08', '2026-05']
const uploadVisitPhoto = async (file: File) => { const result = await uploadBytes(ref(storage, `visits/${makeId()}-${file.name}`), file); return getDownloadURL(result.ref) }

export default function App() {
  const [user, setUser] = useState<User | null>(() => stored('clarity-user', null))
  const [pools, setPools] = useState(() => stored('clarity-pools', poolsSeed))
  const [visits, setVisits] = useState(() => stored('clarity-visits', visitsSeed))
  const [users, setUsers] = useState(() => stored('clarity-users', usersSeed))
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [view, setView] = useState<View>('visits')
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const subscriptions = [
      onSnapshot(collection(db, 'pools'), snapshot => { const nextPools = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Pool)); setPools(nextPools); nextPools.forEach(pool => { const codigo = makePoolCode(pool); if (!pool.codigo || pool.facturaElectronica === undefined) setDoc(doc(db, 'pools', pool.id), { codigo, facturaElectronica: pool.facturaElectronica ?? false }, { merge: true }).catch(() => undefined); setDoc(doc(db, 'users', `client-${pool.id}`), clientUserForPool({ ...pool, codigo }), { merge: true }).catch(() => undefined) }) }, () => undefined),
      onSnapshot(collection(db, 'visits'), snapshot => setVisits(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Visit))), () => undefined),
      onSnapshot(collection(db, 'users'), snapshot => setUsers(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as User))), () => undefined),
      onSnapshot(collection(db, 'invoices'), snapshot => setInvoices(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Invoice))), () => undefined),
      onSnapshot(collection(db, 'projects'), snapshot => setProjects(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Project))), () => undefined),
    ]
    return () => subscriptions.forEach(unsubscribe => unsubscribe())
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return
    const migrateHistoricalVisits = async () => {
      const markerRef = doc(db, 'migrations', 'historical-vista-marina-only-2026')
      if ((await getDoc(markerRef)).exists()) return
      const historicalIds = new Set(historicalVisits.map(visit => visit.id))
      const existingVisits = await getDocs(collection(db, 'visits'))
      await Promise.all(existingVisits.docs.filter(item => !historicalIds.has(item.id)).map(item => deleteDoc(item.ref)))
      await Promise.all(historicalVisits.map(visit => setDoc(doc(db, 'visits', visit.id), visit, { merge: true })))
      await setDoc(markerRef, { completedAt: Date.now(), records: historicalVisits.length, action: 'removed all other visits' })
    }
    migrateHistoricalVisits().catch(() => undefined)
  }, [user])
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return
    const syncPoolCodes = async () => {
      const poolSnapshot = await getDocs(collection(db, 'pools'))
      const currentPools = poolSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as Pool))
      await Promise.all(currentPools.filter(pool => !pool.codigo).map(pool => setDoc(doc(db, 'pools', pool.id), { codigo: makePoolCode(pool) }, { merge: true })))
      const userSnapshot = await getDocs(collection(db, 'users'))
      const currentUsers = userSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as User))
      await Promise.all(currentUsers.filter(item => item.role === 'CLIENTE' && item.poolId && !item.poolCode).map(item => { const pool = currentPools.find(candidate => candidate.id === item.poolId); return pool ? setDoc(doc(db, 'users', item.id), { poolCode: makePoolCode(pool) }, { merge: true }) : Promise.resolve() }))
      const invoiceMarker = doc(db, 'migrations', 'vmfp-historical-invoices-2026')
      if (!(await getDoc(invoiceMarker)).exists()) {
        const vmfp = currentPools.find(pool => pool.codigo?.toUpperCase() === 'VMFP')
        if (vmfp) {
          await Promise.all(vmfpHistoricalPeriods.map(period => { const invoice: Invoice = { id: `invoice-${vmfp.id}-${period}`, poolId: vmfp.id, poolName: vmfp.name, owner: vmfp.owner, fecha: new Date(`${period}-01T12:00:00`).getTime(), periodo: period, subtotal: 45000, iva: 0, total: 45000, facturaElectronica: false, estado: 'EMITIDA' }; return setDoc(doc(db, 'invoices', invoice.id), invoice, { merge: true }) }))
          await setDoc(invoiceMarker, { completedAt: Date.now(), records: 4, poolCode: 'VMFP' })
        }
      }
      const invoiceDateMarker = doc(db, 'migrations', 'invoice-dates-last-visit-2026')
      if (!(await getDoc(invoiceDateMarker)).exists()) {
        const invoiceSnapshot = await getDocs(collection(db, 'invoices'))
        const visitSnapshot = await getDocs(collection(db, 'visits'))
        const allVisits = visitSnapshot.docs.map(item => item.data() as Visit)
        await Promise.all(invoiceSnapshot.docs.map(item => { const invoice = { id: item.id, ...item.data() } as Invoice; const invoiceDate = new Date(invoice.fecha); const lastVisit = allVisits.filter(visit => { const visitDate = new Date(visit.fecha); return visit.piscina === invoice.poolName && visitDate.getFullYear() === invoiceDate.getFullYear() && visitDate.getMonth() === invoiceDate.getMonth() }).sort((a, b) => b.fecha - a.fecha)[0]; return lastVisit ? setDoc(doc(db, 'invoices', invoice.id), { fecha: lastVisit.fecha }, { merge: true }) : Promise.resolve() }))
        await setDoc(invoiceDateMarker, { completedAt: Date.now(), action: 'invoice dates set to last monthly visit' })
      }
    }
    syncPoolCodes().catch(() => undefined)
  }, [user])

  useEffect(() => { localStorage.setItem('clarity-user', JSON.stringify(user)) }, [user])
  useEffect(() => { localStorage.setItem('clarity-pools', JSON.stringify(pools)); localStorage.setItem('clarity-visits', JSON.stringify(visits)); localStorage.setItem('clarity-users', JSON.stringify(users)) }, [pools, visits, users])

  if (!user) return <LoginForm onLogin={setUser} />
  if (user.role === 'PENDIENTE') return <div className="center-page"><div className="pending"><span className="brand-mark">💧</span><h2>Cuenta pendiente de aprobación</h2><p>Tu registro está siendo revisado por un administrador.</p><button className="secondary-button" onClick={() => setUser(null)}>Cerrar sesión</button></div></div>
  if (user.role === 'CLIENTE') return <ClientDashboard user={user} pools={pools} visits={visits} invoices={invoices} onLogout={() => setUser(null)} />

  const items: [View, string, string][] = [
    ['visits', 'Visitas', '📅'],
    ['pools', 'Piscinas', '🏊'],
    ['calculator', 'Calculadora', '🧮'],
    ['invoices', 'Facturas', '🧾'],
    ...(user.role === 'ADMIN' ? [['projects', 'Proyectos', '🛠️'] as [View, string, string], ['users', 'Usuarios', '👥'] as [View, string, string]] : [])
  ]
  const titles: Record<View, string> = { visits: 'Resumen de visitas', pools: 'Tus piscinas', calculator: 'Calculadora de volumen', invoices: 'Facturas', projects: 'Proyectos adicionales', users: 'Equipo' }

  const saveVisit = async (visit: Visit) => { setVisits(current => current.some(item => item.id === visit.id) ? current.map(item => item.id === visit.id ? visit : item) : [visit, ...current]); await setDoc(doc(db, 'visits', visit.id), visit) }
  const savePool = async (pool: Pool) => { const nextPool = { ...pool, codigo: makePoolCode(pool) }; try { await setDoc(doc(db, 'pools', nextPool.id), nextPool); await setDoc(doc(db, 'users', `client-${nextPool.id}`), clientUserForPool(nextPool), { merge: true }) } catch (error) { console.error('No se pudo guardar la piscina', error); throw error } }
  const updatePool = async (pool: Pool) => { const nextPool = { ...pool, codigo: makePoolCode(pool) }; await setDoc(doc(db, 'pools', nextPool.id), nextPool) }
  const deletePool = async (poolId: string) => { setPools(current => current.filter(item => item.id !== poolId)); await deleteDoc(doc(db, 'pools', poolId)) }
  const saveUser = async (nextUser: User) => { setUsers(current => current.some(item => item.id === nextUser.id) ? current.map(item => item.id === nextUser.id ? nextUser : item) : [...current, nextUser]); await setDoc(doc(db, 'users', nextUser.id), nextUser) }
  const deleteUser = async (userId: string) => { setUsers(current => current.filter(item => item.id !== userId)); await deleteDoc(doc(db, 'users', userId)) }
  const saveInvoice = async (invoice: Invoice) => { await setDoc(doc(db, 'invoices', invoice.id), invoice) }
  const deleteInvoice = async (invoiceId: string) => { await deleteDoc(doc(db, 'invoices', invoiceId)) }
  const saveProject = async (project: Project) => {
    const clean = JSON.parse(JSON.stringify(project))
    await setDoc(doc(db, 'projects', project.id), clean)
    setProjects(current => current.some(p => p.id === project.id) ? current.map(p => p.id === project.id ? project : p) : [project, ...current])
  }
  const deleteProject = async (projectId: string) => {
    setProjects(current => current.filter(p => p.id !== projectId))
    await deleteDoc(doc(db, 'projects', projectId))
  }

  return <div className={dark ? 'app dark' : 'app'}><aside className="sidebar"><div className="brand"><span className="brand-mark">💧</span><div><strong>CLARITY</strong><small>SOLUTIONS</small></div></div><nav>{items.map(([key, label, icon]) => <button className={view === key ? 'nav-item active' : 'nav-item'} onClick={() => setView(key)} key={key}><span>{icon}</span>{label}</button>)}</nav><button className="nav-item logout" onClick={() => setUser(null)}><span>🚪</span>Cerrar sesión</button></aside><main><header><button className="mobile-menu">☰</button><div><span className="eyebrow">PANEL DE OPERACIONES</span><h1>{titles[view]}</h1></div><div className="header-actions"><span className="user-chip">{user.fullName.slice(0, 1)}<b>{user.fullName}</b></span><button className="icon-button" onClick={() => setDark(!dark)}>{dark ? '☀️' : '🌙'}</button></div></header><section className="content">{view === 'visits' && <Visits visits={visits} pools={pools} users={users} operator={user} onAdd={saveVisit} />}{view === 'pools' && <Pools pools={pools} visits={visits} isAdmin={user.role === 'ADMIN'} onAdd={savePool} onUpdate={updatePool} onDelete={deletePool} invoices={invoices} onInvoice={saveInvoice} />}{view === 'calculator' && <Calculator />}{view === 'invoices' && <Invoices invoices={invoices} pools={pools} isAdmin onDelete={deleteInvoice} />}{view === 'projects' && <Projects projects={projects} onSave={saveProject} onDelete={deleteProject} />}{view === 'users' && <Users users={users} pools={pools} onUpdate={saveUser} onDelete={deleteUser} />}</section></main></div>
}

function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clientMode, setClientMode] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadProfile = async (firebaseUser: { uid: string; displayName: string | null; email: string | null }) => {
    const userRef = doc(db, 'users', firebaseUser.uid)
    const existing = await getDoc(userRef)
    const profile: User = existing.exists()
      ? ({ id: existing.id, ...existing.data() } as User)
      : { id: firebaseUser.uid, fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario', email: firebaseUser.email || '', role: 'PENDIENTE' }
    if (!existing.exists()) await setDoc(userRef, profile)
    onLogin(profile)
  }

  const loginWithPassword = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (clientMode) {
        const normalized = email.trim().toUpperCase()
        const authResult = await signInAnonymously(auth)
        const snapshot = await getDocs(query(collection(db, 'pools'), where('codigo', '==', normalized)))
        const pool = snapshot.docs[0] ? ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Pool) : null
        if (!pool) throw new Error('client-not-found')
        onLogin({ id: authResult.user.uid, fullName: `${pool.name} + ${pool.owner}`, email: pool.email, role: 'CLIENTE', poolId: pool.id, poolCode: pool.codigo })
        return
      }
      const result = await signInWithEmailAndPassword(auth, email.trim(), password)
      await loadProfile(result.user)
    } catch (caught) {
      const code = caught instanceof Error && 'code' in caught ? String(caught.code) : ''
      const messages: Record<string, string> = {
        'auth/invalid-credential': 'El usuario o la contraseña no son correctos.',
        'auth/user-not-found': 'No existe una cuenta con ese usuario.',
        'auth/wrong-password': 'El usuario o la contraseña no son correctos.',
        'auth/invalid-email': 'Escribe un usuario válido.',
        'auth/operation-not-allowed': 'El acceso con usuario y contraseña no está habilitado en Firebase.',
        'auth/network-request-failed': 'No hay conexión con Firebase. Comprueba tu conexión e inténtalo de nuevo.',
      }
      setError(messages[code] || 'No se pudo iniciar sesión. Comprueba tus datos e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      await loadProfile(result.user)
    } catch (caught) {
      const code = caught instanceof Error && 'code' in caught ? String(caught.code) : ''
      setError(code === 'auth/popup-closed-by-user' ? 'La ventana de Google se cerró antes de completar el acceso.' : 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="login-page simple-login" style={{ gridTemplateColumns: '1fr' }}><form className="login-form" onSubmit={loginWithPassword}>
    <div className="login-logo"><span className="brand-mark">💧</span><strong>CLARITY</strong></div>
    <div><span className="eyebrow">{clientMode ? 'ACCESO DE CLIENTES' : 'ACCESO DE USUARIOS'}</span><h1>{clientMode ? 'Portal de cliente' : 'Iniciar sesión'}</h1><p className="login-subtitle">{clientMode ? 'Consulta las visitas y reportes de tu piscina.' : 'Accede a tu panel de operaciones.'}</p></div>
    <label className="field">{clientMode ? 'Código de piscina' : 'Correo electrónico'}<input type={clientMode ? 'text' : 'email'} autoComplete="username" placeholder={clientMode ? 'CL-P1' : 'tu@email.com'} value={email} onChange={event => setEmail(event.target.value)} required /></label>
    {!clientMode && <label className="field">Contraseña<input type="password" autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={event => setPassword(event.target.value)} required /></label>}
    {error && <p className="login-error">{error}</p>}
    <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
    <div className="login-divider"><span>o</span></div>
    <button className="google-button" type="button" onClick={loginWithGoogle} disabled={loading}><span>G</span> Continuar con Google</button>
    <button className="login-mode-button" type="button" onClick={() => { setClientMode(!clientMode); setEmail(''); setPassword(''); setError('') }} disabled={loading}>{clientMode ? 'Volver al acceso administrativo' : 'Ingresar como cliente'}</button>
  </form></div>
}

function ClientDashboard({ user, pools, visits, invoices, onLogout }: { user: User; pools: Pool[]; visits: Visit[]; invoices: Invoice[]; onLogout: () => void }) {
  const pool = pools.find(item => item.id === user.poolId) || pools.find(item => item.name.toLowerCase() === user.fullName.split('+')[0]?.trim().toLowerCase())
  const clientVisits = pool ? visits.filter(visit => visit.piscina === pool.name) : []
  const clientInvoices = pool ? invoices.filter(invoice => invoice.poolId === pool.id) : []
  return <div className="client-dashboard"><header className="client-header"><div><span className="eyebrow">PORTAL DE CLIENTE</span><h1>{pool?.name || 'Mis reportes'}</h1><p>{pool?.owner || user.fullName}</p></div><button className="secondary-button" onClick={onLogout}>Cerrar sesión</button></header><main className="client-content">{pool ? <><Visits visits={clientVisits} pools={[pool]} operator={user} onAdd={() => undefined} readOnly /><Invoices invoices={clientInvoices} pools={[pool]} isAdmin={false} /></> : <div className="empty">Tu cuenta todavía no tiene una piscina asignada.</div>}</main></div>
}

function Visits({ visits, pools, users = [], operator, onAdd, readOnly = false }: { visits: Visit[]; pools: Pool[]; users?: User[]; operator: User; onAdd: (v: Visit) => void; readOnly?: boolean }) {
  const [show, setShow] = useState(false)
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [month, setMonth] = useState(new Date())
  const [openVisit, setOpenVisit] = useState<string | null>(null)
  const first = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const selectedClient = users.find(user => user.id === selectedClientId)
  const scopedVisits = selectedClient?.poolId ? visits.filter(visit => visit.piscina === pools.find(pool => pool.id === selectedClient.poolId)?.name) : visits
  const scopedPools = selectedClient?.poolId ? pools.filter(pool => pool.id === selectedClient.poolId) : pools
  const visitsForDay = scopedVisits.filter(visit => {
    const date = new Date(visit.fecha)
    return date.getFullYear() === selectedDate.getFullYear() && date.getMonth() === selectedDate.getMonth() && date.getDate() === selectedDate.getDate()
  })
  const visitsForDate = (day: number) => scopedVisits.filter(visit => {
    const date = new Date(visit.fecha)
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth() && date.getDate() === day
  })
  const scheduledForDate = (day: number) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
    return scopedPools.filter(pool => pool.scheduledDays.includes(dayOfWeek))
  }
  const scheduledPoolsForSelectedDay = scheduledForDate(selectedDate.getDate()).filter(pool => !visitsForDay.some(visit => visit.piscina === pool.name))
  const selectDay = (day: number) => setSelectedDate(new Date(month.getFullYear(), month.getMonth(), day))
  const changeMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next)
    setSelectedDate(next)
    setOpenVisit(null)
  }
  return <>
    <div className="section-heading"><div><span className="eyebrow">{readOnly ? 'PORTAL DE CLIENTE' : 'ACTIVIDAD OPERATIVA'}</span><h2>Calendario de visitas</h2></div><div className="visit-toolbar">{!readOnly && <select className="client-filter" value={selectedClientId} onChange={event => setSelectedClientId(event.target.value)}><option value="">Todos los clientes</option>{users.filter(user => user.role === 'CLIENTE').map(client => <option key={client.id} value={client.id}>{client.fullName}</option>)}</select>}{!readOnly && <button className="primary-button compact" onClick={() => setShow(true)}>+ Registrar visita</button>}</div></div>
    <div className="visit-calendar-panel">
      <div className="calendar-toolbar"><button className="month-arrow" onClick={() => changeMonth(-1)} aria-label="Mes anterior">←</button><strong>{month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</strong><button className="month-arrow" onClick={() => changeMonth(1)} aria-label="Mes siguiente">→</button></div>
      <div className="calendar-head">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid visit-calendar-grid">{Array.from({ length: first }).map((_, index) => <span className="blank" key={`blank-${index}`} />)}{Array.from({ length: total }, (_, index) => index + 1).map(day => { const dayVisits = visitsForDate(day); const scheduledPools = scheduledForDate(day); const selected = day === selectedDate.getDate() && month.getMonth() === selectedDate.getMonth() && month.getFullYear() === selectedDate.getFullYear(); return <button type="button" className={selected ? 'calendar-day today' : 'calendar-day'} onClick={() => selectDay(day)} key={day}><b>{day}</b><span className="calendar-indicators">{dayVisits.length > 0 && <i className="visit-indicator" />}{scheduledPools.length > 0 && <i className="scheduled-indicator" />}</span></button> })}</div>
    </div>
    <div className="calendar-legend"><span><i className="visit-indicator" /> Visita realizada</span><span><i className="scheduled-indicator" /> Visita agendada</span></div>
    <div className="selected-day-heading"><div><span className="eyebrow">VISITAS DEL DÍA</span><h2>{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2></div><span className="visit-total">{visitsForDay.length} {visitsForDay.length === 1 ? 'visita' : 'visitas'}</span></div>
    <div className="visit-detail-list">{visitsForDay.length ? visitsForDay.map(visit => <VisitDetail key={visit.id} visit={visit} open={openVisit === visit.id} onToggle={() => setOpenVisit(openVisit === visit.id ? null : visit.id)} onEdit={() => setEditingVisit(visit)} readOnly={readOnly} />) : <div className="empty">No hay visitas registradas para este día.</div>}</div>
    {!readOnly && scheduledPoolsForSelectedDay.length > 0 && <div className="scheduled-pools"><div className="section-heading"><div><span className="eyebrow">AGENDA PENDIENTE</span><h2>Piscinas previstas para este día</h2></div></div>{scheduledPoolsForSelectedDay.map(pool => <div className="scheduled-pool-row" key={pool.id}><span className="pool-icon small">🏊</span><div><strong>{pool.name}</strong><span>{pool.owner} · {pool.location}</span></div><span className="status scheduled-status">Pendiente</span></div>)}</div>}
    {!readOnly && show && <VisitForm pools={pools} operator={operator} defaultDate={selectedDate} onClose={() => setShow(false)} onSave={visit => { onAdd(visit); setShow(false) }} />}
    {!readOnly && editingVisit && <VisitForm pools={pools} operator={operator} visitToEdit={editingVisit} onClose={() => setEditingVisit(null)} onSave={visit => { onAdd(visit); setEditingVisit(null) }} />}
  </>
}

const visitTasks: [keyof Visit, string][] = [
  ['hasAlguicida', 'Aplicación de alguicida'], ['hasAspirado', 'Aspirado'], ['hasCepillado', 'Cepillado'], ['hasLimpiezaCanasta', 'Limpieza de canasta'], ['hasLimpiezaSkimer', 'Limpieza de skimmer'], ['hasLimpiezaCanastaBomba', 'Limpieza de canasta de bomba'], ['hasCheckeoCuartoMaquinas', 'Revisión del cuarto de máquinas'], ['hasMantenimientoBomba', 'Mantenimiento de bomba'], ['hasRellenoAgua', 'Relleno de agua'], ['hasCloroShock', 'Cloro shock']
]

const formatChemicalAmount = (amount: number, unit = 'g') => amount >= 1000 ? `${(amount / 1000).toFixed(2)} ${unit === 'g' ? 'kg' : 'L'}` : `${amount.toFixed(0)} ${unit}`
const visitInstructions = (visit: Visit) => {
  const poolSize = 25.4
  const cloro = visit.cloroInicial < 2 ? `Bajo. Aplicar ${formatChemicalAmount((2 - visit.cloroInicial) * poolSize * 2)} de cloro.` : visit.cloroInicial > 3 ? `Alto (${visit.cloroInicial} ppm). No aplicar producto, monitorear.` : 'En niveles óptimos.'
  const ph = visit.phInicial < 7.2 ? `Bajo. Aplicar ${formatChemicalAmount(((7.2 - visit.phInicial) / 0.1) * 10 * poolSize)} de incrementador de pH.` : visit.phInicial > 7.6 ? `Alto. Aplicar ${formatChemicalAmount(((visit.phInicial - 7.6) / 0.1) * 10 * poolSize, 'ml')} de reductor de pH.` : 'En niveles óptimos.'
  const alkalinity = visit.alcalinidadInicial < 80 ? `Baja. Aplicar ${formatChemicalAmount(((80 - visit.alcalinidadInicial) / 10) * 18 * poolSize)} de bicarbonato de sodio.` : visit.alcalinidadInicial > 120 ? `Alta. Aplicar ${formatChemicalAmount(((visit.alcalinidadInicial - 120) / 10) * 20 * poolSize, 'ml')} de reductor de alcalinidad.` : 'En niveles óptimos.'
  const hardness = visit.durezaCalcica < 200 ? `Baja. Aplicar ${formatChemicalAmount(((200 - visit.durezaCalcica) / 10) * 15 * poolSize)} de cloruro de calcio.` : visit.durezaCalcica > 400 ? 'Alta. Monitorear o realizar purga parcial de agua.' : 'En niveles óptimos.'
  const cyanuric = visit.acidoCianuro < 30 ? `Bajo. Aplicar ${formatChemicalAmount(((30 - visit.acidoCianuro) / 10) * 10 * poolSize)} de ácido cianúrico.` : visit.acidoCianuro > 50 ? 'Alto. Monitorear o drenar parcialmente.' : 'En niveles óptimos.'
  return [['Cloro', cloro], ['pH', ph], ['Alcalinidad', alkalinity], ['Dureza cálcica', hardness], ['Ácido cianúrico', cyanuric]] as [string, string][]
}

async function downloadVisitReport(visit: Visit) {
  const pdf = new jsPDF()
  const date = new Date(visit.fecha)
  const dateText = date.toLocaleDateString('es-ES')
  const fileDate = date.toISOString().slice(0, 10)
  const safeName = `${visit.piscina}_${fileDate}`.replace(/[^a-zA-Z0-9_-]+/g, '_')
  let y = 20
  const line = (label: string, value: string) => { pdf.setFontSize(10); pdf.setTextColor(90, 110, 105); pdf.text(label, 20, y); pdf.setTextColor(25, 50, 54); pdf.text(value || '-', 75, y); y += 7 }
  pdf.setFontSize(20); pdf.setTextColor(18, 61, 66); pdf.text('CLARITY - Reporte de visita', 20, y); y += 12
  pdf.setFontSize(14); pdf.text(visit.piscina, 20, y); y += 8
  line('Fecha', dateText); y += 4
  pdf.setFontSize(13); pdf.text('Mediciones', 20, y); y += 8
  line('Cloro inicial', `${visit.cloroInicial} ppm`); line('pH inicial', String(visit.phInicial)); line('Alcalinidad', `${visit.alcalinidadInicial} ppm`); line('Dureza cálcica', `${visit.durezaCalcica} ppm`); line('Ácido cianúrico', `${visit.acidoCianuro} ppm`); line('Tabletas de cloro', String(visit.chlorineTablets)); y += 4
  pdf.setFontSize(13); pdf.text('Instrucciones de tratamiento', 20, y); y += 8
  visitInstructions(visit).forEach(([label, instruction]) => line(label, instruction)); y += 4
  pdf.setFontSize(13); pdf.text('Actividades realizadas', 20, y); y += 8
  visitTasks.forEach(([key, label]) => { line(label, visit[key] ? 'Realizado' : 'No realizado') })
  if (visit.notas) { y += 4; pdf.setFontSize(13); pdf.text('Notas', 20, y); y += 8; pdf.setFontSize(10); pdf.setTextColor(25, 50, 54); const notes = pdf.splitTextToSize(visit.notas, 170); pdf.text(notes, 20, y); y += notes.length * 5 + 5 }
  const photos: [string, string | undefined][] = [['Llegada 1', visit.arrivalPhoto1], ['Llegada 2', visit.arrivalPhoto2], ['Salida limpieza 1', visit.afterPhoto1], ['Salida limpieza 2', visit.afterPhoto2], ['Salida propiedad', visit.exitPhoto]]
  if (photos.some(([, url]) => url)) { if (y > 250) { pdf.addPage(); y = 20 }; pdf.setFontSize(13); pdf.text('Registro fotográfico', 20, y); y += 8; pdf.setFontSize(9); photos.filter(([, url]) => url).forEach(([label, url]) => { pdf.setTextColor(25, 50, 54); pdf.text(`${label}: ${url}`, 20, y, { maxWidth: 170 }); y += 8 }) }
  pdf.save(`${safeName}.pdf`)
}

function VisitDetail({ visit, open, onToggle, onEdit, readOnly = false }: { visit: Visit; open: boolean; onToggle: () => void; onEdit: () => void; readOnly?: boolean }) {
  const photos: [string, string | undefined, number | undefined][] = [['Llegada 1', visit.arrivalPhoto1, visit.arrivalPhoto1Time], ['Llegada 2', visit.arrivalPhoto2, visit.arrivalPhoto2Time], ['Salida limpieza 1', visit.afterPhoto1, visit.afterPhoto1Time], ['Salida limpieza 2', visit.afterPhoto2, visit.afterPhoto2Time], ['Salida propiedad', visit.exitPhoto, visit.exitPhotoTime]]
  return <article className={open ? 'visit-detail open' : 'visit-detail'}><button type="button" className="visit-detail-summary" onClick={onToggle}><div className="visit-detail-time"><b>{new Date(visit.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</b><span>{visit.operador}</span></div><div className="visit-detail-main"><strong>{visit.piscina}</strong><span>Cloro {visit.cloroInicial} - pH {visit.phInicial}</span></div><span className="status good">Ver detalle</span><span className="detail-chevron">{open ? '▲' : '▼'}</span></button>{open && <div className="visit-detail-content"><div className="visit-detail-actions">{!readOnly && <button type="button" className="secondary-button" onClick={onEdit}>Editar visita</button>}<button type="button" className="primary-button" onClick={() => downloadVisitReport(visit)}>Descargar PDF</button></div><div className="visit-instructions"><h3>Instrucciones de tratamiento</h3><div className="instruction-list">{visitInstructions(visit).map(([label, instruction]) => <div className="instruction-row" key={label}><strong>{label}</strong><span>{instruction}</span></div>)}</div></div><div className="measurements"><h3>Mediciones</h3><div className="measurement-grid"><Measurement label="Cloro inicial" value={visit.cloroInicial} unit="ppm" /><Measurement label="pH inicial" value={visit.phInicial} /><Measurement label="Alcalinidad inicial" value={visit.alcalinidadInicial} unit="ppm" /><Measurement label="Dureza cálcica" value={visit.durezaCalcica} unit="ppm" /><Measurement label="Ácido cianúrico" value={visit.acidoCianuro} unit="ppm" /><Measurement label="Tabletas de cloro" value={visit.chlorineTablets} /></div></div><div className="tasks"><h3>Actividades realizadas</h3><div className="task-grid">{visitTasks.map(([key, label]) => <div className={visit[key] ? 'task done' : 'task'} key={String(key)}><span>{visit[key] ? 'OK' : '-'}</span>{label}</div>)}</div></div><div className="visit-photos"><h3>Registro fotográfico</h3><div className="photo-detail-grid">{photos.map(([label, url, time]) => <div className="photo-detail" key={label}>{url ? <img src={url} alt={label} /> : <div className="photo-empty">Sin foto</div>}<span>{label}{time && ` - ${new Date(time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}</span></div>)}</div></div>{visit.notas && <div className="visit-notes"><h3>Notas</h3><p>{visit.notas}</p></div>}</div>}</article>
}

function Measurement({ label, value, unit }: { label: string; value: number; unit?: string }) { return <div><span>{label}</span><strong>{value} {unit && <small>{unit}</small>}</strong></div> }

function VisitForm({ pools, operator, visitToEdit, defaultDate, onClose, onSave }: { pools: Pool[]; operator: User; visitToEdit?: Visit; defaultDate?: Date; onClose: () => void; onSave: (v: Visit) => void }) {
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
  const [tasks, setTasks] = useState<Record<string, boolean>>(() => Object.fromEntries(visitTasks.map(([key]) => [String(key), Boolean(visitToEdit?.[key])])))
  const [photos, setPhotos] = useState<Record<string, string>>(() => Object.fromEntries([['arrivalPhoto1', visitToEdit?.arrivalPhoto1], ['arrivalPhoto2', visitToEdit?.arrivalPhoto2], ['afterPhoto1', visitToEdit?.afterPhoto1], ['afterPhoto2', visitToEdit?.afterPhoto2], ['exitPhoto', visitToEdit?.exitPhoto]].filter((entry): entry is [string, string] => Boolean(entry[1]))))
  const [photoTimes, setPhotoTimes] = useState<Record<string, number>>(() => Object.fromEntries([['arrivalPhoto1', visitToEdit?.arrivalPhoto1Time], ['arrivalPhoto2', visitToEdit?.arrivalPhoto2Time], ['afterPhoto1', visitToEdit?.afterPhoto1Time], ['afterPhoto2', visitToEdit?.afterPhoto2Time], ['exitPhoto', visitToEdit?.exitPhotoTime]].filter((entry): entry is [string, number] => typeof entry[1] === 'number')))
  const [uploading, setUploading] = useState<string | null>(null)

  const handleFileUpload = async (key: string, file: File) => {
    setUploading(key)
    try {
      const url = await uploadVisitPhoto(file)
      setPhotos(prev => ({ ...prev, [key]: url }))
      setPhotoTimes(prev => ({ ...prev, [key]: Date.now() }))
    } catch {
      alert('Error al subir la imagen')
    } finally {
      setUploading(null)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    let fechaTimestamp = visitToEdit?.fecha || Date.now()
    if (visitDateStr) {
      const [y, m, d] = visitDateStr.split('-').map(Number)
      fechaTimestamp = new Date(y, m - 1, d, 12, 0, 0).getTime()
    }
    const visitData: Visit = {
      id: visitToEdit?.id || `visit-${makeId()}`,
      fecha: fechaTimestamp,
      operador: visitToEdit?.operador || operator.fullName,
      operadorId: visitToEdit?.operadorId || operator.id,
      piscina: pool,
      cloroInicial: Number(values.chlorine) || 0,
      phInicial: Number(values.ph) || 0,
      alcalinidadInicial: Number(values.alkalinity) || 0,
      durezaCalcica: Number(values.hardness) || 0,
      acidoCianuro: Number(values.cyanuric) || 0,
      chlorineTablets: Number(values.tablets) || 0,
      notas: values.notes,
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
      arrivalPhoto1: photos.arrivalPhoto1,
      arrivalPhoto1Time: photoTimes.arrivalPhoto1,
      arrivalPhoto2: photos.arrivalPhoto2,
      arrivalPhoto2Time: photoTimes.arrivalPhoto2,
      afterPhoto1: photos.afterPhoto1,
      afterPhoto1Time: photoTimes.afterPhoto1,
      afterPhoto2: photos.afterPhoto2,
      afterPhoto2Time: photoTimes.afterPhoto2,
      exitPhoto: photos.exitPhoto,
      exitPhotoTime: photoTimes.exitPhoto,
    }
    onSave(visitData)
  }

  return (
    <div className="modal-backdrop">
      <form className="modal visit-form" onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{visitToEdit ? 'Editar visita' : 'Nueva visita'}</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="form-grid">
          <Field label="Fecha de la visita" type="date" value={visitDateStr} onChange={setVisitDateStr} required />
          <label>Piscina
            <select value={pool} onChange={e => setPool(e.target.value)} required>
              {pools.map(p => <option key={p.id} value={p.name}>{p.name} / {p.owner}</option>)}
            </select>
          </label>
        </div>

        <h3>Mediciones iniciales</h3>
        <div className="form-grid">
          <Field label="Cloro inicial (ppm)" type="number" step="0.01" value={values.chlorine} onChange={v => setValues({ ...values, chlorine: v })} required />
          <Field label="pH inicial" type="number" step="0.01" value={values.ph} onChange={v => setValues({ ...values, ph: v })} required />
          <Field label="Alcalinidad inicial (ppm)" type="number" step="0.01" value={values.alkalinity} onChange={v => setValues({ ...values, alkalinity: v })} />
          <Field label="Dureza cálcica (ppm)" type="number" step="0.01" value={values.hardness} onChange={v => setValues({ ...values, hardness: v })} />
          <Field label="Ácido cianúrico (ppm)" type="number" step="0.01" value={values.cyanuric} onChange={v => setValues({ ...values, cyanuric: v })} />
        </div>

        <h3>Actividades realizadas</h3>
        <div className="form-task-grid">
          {visitTasks.map(([key, label]) => (
            <label className="form-task" key={String(key)}>
              <input type="checkbox" checked={Boolean(tasks[String(key)])} onChange={e => setTasks({ ...tasks, [String(key)]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>

        <label>Tabletas de cloro aplicadas
          <input type="number" min="0" step="1" value={values.tablets} onChange={e => setValues({ ...values, tablets: e.target.value })} />
        </label>

        <label>Notas
          <textarea value={values.notes} onChange={e => setValues({ ...values, notes: e.target.value })} placeholder="Observaciones de la visita" />
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
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(key, e.target.files[0])} />
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

function Field({ label, value, onChange, type = 'text', step, min, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; step?: string; min?: string; required?: boolean }) { return <label>{label}<input type={type} min={min} step={step} value={value} onChange={event => onChange(event.target.value)} required={required} /></label> }

function Pools({ pools, visits, isAdmin, onAdd, onUpdate, onDelete, invoices, onInvoice }: { pools: Pool[]; visits: Visit[]; isAdmin: boolean; onAdd: (pool: Pool) => void; onUpdate: (pool: Pool) => void; onDelete: (id: string) => void; invoices: Invoice[]; onInvoice: (invoice: Invoice) => void }) {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Pool | null>(null)
  const results = pools.filter(pool => `${pool.name} ${pool.owner}`.toLowerCase().includes(query.toLowerCase()))
  return <><div className="section-heading"><div><span className="eyebrow">CARTERA DE CLIENTES</span><h2>Piscinas <small className="count">{pools.length}</small></h2></div>{isAdmin && <button className="primary-button compact" onClick={() => setShowForm(true)}>+ Añadir piscina</button>}</div><input className="search" placeholder="Buscar por nombre o dueño..." value={query} onChange={event => setQuery(event.target.value)} /><div className="pool-grid">{results.map(pool => <button className="pool-card pool-card-button" onClick={() => setSelected(pool)} key={pool.id}><div className="pool-icon">◌</div><span className="eyebrow">{pool.location}</span><h3>{pool.name}</h3><p>{pool.owner}</p><div className="pool-meta"><span>{pool.size} m²</span><b>{pool.visitsPerWeek} visitas / semana</b></div><div className="days">{['L','M','X','J','V','S','D'].map((day, index) => <i className={pool.scheduledDays.includes(index + 1) ? 'day selected' : 'day'} key={day}>{day}</i>)}</div></button>)}</div>{showForm && <PoolForm onClose={() => setShowForm(false)} onSave={pool => { onAdd(pool); setShowForm(false) }} />}{selected && <PoolDetail pool={selected} visits={visits} isAdmin={isAdmin} invoices={invoices} onInvoice={onInvoice} onClose={() => setSelected(null)} onUpdate={pool => { onUpdate(pool); setSelected(pool) }} onDelete={id => { onDelete(id); setSelected(null) }} />}</>
}
const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
function PoolDetail({ pool, visits, isAdmin, invoices, onInvoice, onClose, onUpdate, onDelete }: { pool: Pool; visits: Visit[]; isAdmin: boolean; invoices: Invoice[]; onInvoice: (invoice: Invoice) => void; onClose: () => void; onUpdate: (pool: Pool) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  if (editing) return <PoolForm pool={pool} onClose={() => setEditing(false)} onSave={updated => { onUpdate(updated); setEditing(false) }} />
  return <div className="modal-backdrop"><div className="modal pool-detail-modal"><div className="modal-head"><h2>Detalle de piscina</h2><button type="button" onClick={onClose}>×</button></div><h1>{pool.name}</h1><p className="pool-owner">{pool.owner}</p>{isAdmin && <div className="detail-actions"><button className="secondary-button" onClick={() => setEditing(true)}>Editar piscina</button><button className="danger-button" onClick={() => onDelete(pool.id)}>Eliminar</button></div>}<button className="primary-button" onClick={() => emitInvoice(pool, visits, onInvoice)}>Generar factura PDF</button><h3>Información de la piscina</h3><div className="pool-detail-grid"><Detail label="Dueño" value={pool.owner} /><Detail label="Ubicación" value={pool.location || 'No indicada'} /><Detail label="Teléfono" value={pool.phone || 'No indicado'} /><Detail label="Correo" value={pool.email || 'No indicado'} /><Detail label="Compañía de manejo" value={pool.managementCompany || 'No indicada'} /><Detail label="Tamaño (m²)" value={pool.size.toFixed(2)} /><Detail label="Visitas por semana" value={pool.visitsPerWeek.toFixed(0)} /><Detail label="Días programados" value={pool.scheduledDays.map(day => weekDays[day - 1]).join(', ') || 'Ninguno'} /><Detail label="Código de acceso" value={pool.codigo || makePoolCode(pool)} /><Detail label="Factura electrónica" value={pool.facturaElectronica ? 'Sí (13%)' : 'No'} />{isAdmin && <Detail label="Pago mensual" value={`₡${pool.monthlyPayment.toLocaleString('es-CR')}`} />}</div><h3>Facturas recientes</h3><div className="invoice-mini-list">{invoices.filter(invoice => invoice.poolId === pool.id).slice(-3).reverse().map(invoice => <div key={invoice.id}><strong>{invoice.periodo}</strong><span>₡{invoice.total.toLocaleString('es-CR')} · {invoice.facturaElectronica ? 'IVA 13%' : 'IVA 0%'}</span></div>)}</div></div></div>
}

function PoolForm({ pool, onClose, onSave }: { pool?: Pool; onClose: () => void; onSave: (pool: Pool) => void }) { const [name, setName] = useState(pool?.name || ''); const [owner, setOwner] = useState(pool?.owner || ''); const [location, setLocation] = useState(pool?.location || ''); const [phone, setPhone] = useState(pool?.phone || ''); const [email, setEmail] = useState(pool?.email || ''); const [company, setCompany] = useState(pool?.managementCompany || ''); const [size, setSize] = useState(String(pool?.size || '')); const [visits, setVisits] = useState(String(pool?.visitsPerWeek || 1)); const [days, setDays] = useState<number[]>(pool?.scheduledDays || [1]); const [payment, setPayment] = useState(String(pool?.monthlyPayment || '')); const [codigo, setCodigo] = useState(pool?.codigo || makePoolCode(pool || { id: makeId() })); const [error, setError] = useState(''); const [facturaElectronica, setFacturaElectronica] = useState(pool?.facturaElectronica || false); const maxVisits = Number(visits) || 0; const toggle = (day: number) => setDays(current => current.includes(day) ? current.filter(value => value !== day) : current.length < maxVisits ? [...current, day].sort() : current); return <div className="modal-backdrop"><form className="modal pool-form" onSubmit={async event => { event.preventDefault(); setError(''); try { await onSave({ id: pool?.id || makeId(), name, owner, location, phone, email, managementCompany: company, size: Number(size), visitsPerWeek: maxVisits, scheduledDays: days, monthlyPayment: Number(payment), codigo: codigo.trim().toUpperCase() || makePoolCode({ id: pool?.id || makeId() }), facturaElectronica }); onClose() } catch { setError('No se pudo guardar la piscina. Revisa los permisos de Firebase.') } }}><div className="modal-head"><h2>{pool ? 'Editar piscina' : 'Añadir piscina'}</h2><button type="button" onClick={onClose}>×</button></div>{error && <p className="login-error">{error}</p>}<div className="form-grid"><Field label="Nombre" value={name} onChange={setName} required /><Field label="Dueño" value={owner} onChange={setOwner} required /><Field label="Ubicación" value={location} onChange={setLocation} /><Field label="Teléfono" value={phone} onChange={setPhone} type="tel" /><Field label="Correo" value={email} onChange={setEmail} type="email" /><Field label="Compañía de manejo" value={company} onChange={setCompany} /><Field label="Tamaño (m²)" value={size} onChange={setSize} type="number" step="0.01" required /><Field label="Visitas por semana" value={visits} onChange={setVisits} type="number" min="1" required /><Field label="Código de acceso" value={codigo} onChange={setCodigo} required /><Field label="Pago mensual" value={payment} onChange={setPayment} type="number" step="0.01" /></div><label className="form-task"><input type="checkbox" checked={facturaElectronica} onChange={event => setFacturaElectronica(event.target.checked)} /> Factura electrónica (+13%)</label><h3>Días programados ({days.length}/{maxVisits})</h3><div className="pool-day-grid">{weekDays.map((day, index) => <button type="button" className={days.includes(index + 1) ? 'selected' : ''} onClick={() => toggle(index + 1)} disabled={!days.includes(index + 1) && days.length >= maxVisits} key={day}>{day}</button>)}</div><button className="primary-button" type="submit" disabled={!name.trim() || !owner.trim() || maxVisits < 1 || days.length !== maxVisits}>Guardar</button></form></div> }

function emitInvoice(pool: Pool, visits: Visit[], onSave: (invoice: Invoice) => void) { const now = new Date(); const monthlyVisits = visits.filter(visit => { const date = new Date(visit.fecha); return visit.piscina === pool.name && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() }); const lastVisit = monthlyVisits.sort((a, b) => b.fecha - a.fecha)[0]; const invoiceDate = lastVisit ? new Date(lastVisit.fecha) : now; const periodo = invoiceDate.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' }); const subtotal = Number(pool.monthlyPayment) || 0; const iva = pool.facturaElectronica ? subtotal * 0.13 : 0; const invoice: Invoice = { id: `invoice-${pool.id}-${invoiceDate.getFullYear()}-${invoiceDate.getMonth() + 1}`, poolId: pool.id, poolName: pool.name, owner: pool.owner, fecha: invoiceDate.getTime(), periodo, subtotal, iva, total: subtotal + iva, facturaElectronica: Boolean(pool.facturaElectronica), estado: 'EMITIDA' }; onSave(invoice); downloadInvoicePdf(invoice) }

async function loadInvoiceLogo() { const response = await fetch('/clarity-logo.png'); const blob = await response.blob(); return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob) }) }

async function downloadInvoicePdf(invoice: Invoice) {
  const pdf = new jsPDF()
  const money = (value: number) => `CRC ${value.toLocaleString('es-CR')}`
  const drawMoney = (value: number, x: number, y: number) => pdf.text(money(value), x, y)
  const dueDate = new Date(invoice.fecha)
  dueDate.setMonth(dueDate.getMonth() + 1, 3)
  try { pdf.addImage(await loadInvoiceLogo(), 'PNG', 158, 10, 28, 38) } catch { /* El PDF sigue siendo válido aunque el logo no cargue. */ }
  pdf.setFont('times', 'bold'); pdf.setFontSize(18); pdf.text('Electronic Receipt', 24, 24)
  pdf.setFont('times', 'normal'); pdf.setFontSize(11)
  pdf.text('Issuer:', 24, 40); pdf.text('Clarity Solutions Company', 58, 40)
  pdf.text('Business Activity:', 24, 48); pdf.text('Professional Pool Maintenance', 112, 48)
  pdf.text('Client:', 24, 64); pdf.text(invoice.owner, 58, 64)
  pdf.text('Pool:', 24, 72); pdf.text(invoice.poolName, 58, 72)
  pdf.text('Date:', 24, 80); pdf.text(new Date(invoice.fecha).toLocaleDateString('en-US'), 58, 80)
  pdf.text('Sale Condition:', 24, 88); pdf.text('Cash', 92, 88)
  pdf.setDrawColor(150); pdf.line(24, 98, 186, 98)
  pdf.setFont('times', 'bold'); pdf.setFontSize(14); pdf.text('Service Details', 24, 114)
  pdf.setFontSize(10); pdf.rect(24, 122, 162, 42); pdf.line(132, 122, 132, 164); pdf.line(164, 122, 164, 164); pdf.text('Description', 74, 130); pdf.text('Quantity', 136, 130); pdf.text('Unit', 170, 130); pdf.text('Price', 170, 138)
  pdf.setFont('times', 'normal'); pdf.text('Monthly pool maintenance service according to proposal', 27, 148); pdf.text('(1 weekly visit, full cleaning, brushing, water parameter', 27, 155); pdf.text('check, supply and application of chemicals, basic equipment inspection).', 27, 162); pdf.text('1', 138, 148); drawMoney(invoice.subtotal, 168, 148)
  pdf.setDrawColor(150); pdf.line(24, 174, 186, 174)
  pdf.setFont('times', 'bold'); pdf.setFontSize(14); pdf.text('Summary', 24, 190); pdf.setFont('times', 'normal'); pdf.setFontSize(11); pdf.text('•  Subtotal:', 30, 202); drawMoney(invoice.subtotal, 70, 202); pdf.text('•  IVA (' + (invoice.facturaElectronica ? '13' : '0') + '%):', 30, 212); drawMoney(invoice.iva, 76, 212); pdf.text('•  Total Due:', 30, 222); drawMoney(invoice.total, 76, 222)
  pdf.setDrawColor(150); pdf.line(24, 234, 186, 234); pdf.setFont('times', 'bold'); pdf.setFontSize(14); pdf.text('Notes', 24, 250); pdf.setFont('times', 'normal'); pdf.setFontSize(11); pdf.text('Service corresponding to the monthly pool maintenance plan for', 24, 264); pdf.setFont('times', 'bold'); pdf.text(invoice.periodo + '.', 24, 274); pdf.text('Payment Due Date:', 24, 288); pdf.setFont('times', 'normal'); pdf.text(dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '.', 76, 288); pdf.save(invoice.poolName + '_' + invoice.periodo.replace(/\s+/g, '_') + '.pdf')
}

function Invoices({ invoices, pools, isAdmin, onDelete }: { invoices: Invoice[]; pools: Pool[]; isAdmin: boolean; onDelete?: (id: string) => void }) {
  const [poolId, setPoolId] = useState(''); const [months, setMonths] = useState('all'); const [editing, setEditing] = useState<Invoice | null>(null)
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - Number(months || 0)); const filtered = invoices.filter(invoice => (!poolId || invoice.poolId === poolId) && (months === 'all' || invoice.fecha >= cutoff.getTime())).sort((a, b) => b.fecha - a.fecha)
  return <><div className="section-heading"><div><span className="eyebrow">DOCUMENTOS DE COBRO</span><h2>Facturas</h2></div><div className="invoice-filters">{isAdmin && <select value={poolId} onChange={event => setPoolId(event.target.value)}><option value="">Todos los clientes</option>{pools.map(pool => <option key={pool.id} value={pool.id}>{pool.name} / {pool.owner}</option>)}</select>}<select value={months} onChange={event => setMonths(event.target.value)}><option value="all">Todas las facturas</option><option value="1">Último mes</option><option value="2">Últimos 2 meses</option><option value="3">Últimos 3 meses</option><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></select></div></div><div className="invoice-list">{filtered.length ? filtered.map(invoice => <article className="invoice-row" key={invoice.id}><div><strong>{invoice.owner}</strong><span>{invoice.poolName} · {new Date(invoice.fecha).toLocaleDateString('es-CR')}</span></div><div><strong>₡{invoice.total.toLocaleString('es-CR')}</strong><span>{invoice.facturaElectronica ? 'IVA 13%' : 'IVA 0%'}</span></div><button className="primary-button compact" onClick={() => downloadInvoicePdf(invoice)}>Descargar PDF</button>{isAdmin && <><button className="secondary-button compact" onClick={() => setEditing(invoice)}>Editar</button><button className="danger-button" onClick={() => onDelete?.(invoice.id)}>Eliminar</button></>}</article>) : <div className="empty">No hay facturas en el periodo seleccionado.</div>}</div>{editing && <InvoiceForm invoice={editing} pools={pools} onClose={() => setEditing(null)} onSave={async updated => { await setDoc(doc(db, 'invoices', updated.id), updated); setEditing(null) }} />}</>
}

function InvoiceForm({ invoice, pools, onClose, onSave }: { invoice: Invoice; pools: Pool[]; onClose: () => void; onSave: (invoice: Invoice) => Promise<void> }) { const [subtotal, setSubtotal] = useState(String(invoice.subtotal)); const [electronica, setElectronica] = useState(invoice.facturaElectronica); const [date, setDate] = useState(new Date(invoice.fecha).toISOString().slice(0, 10)); const pool = pools.find(item => item.id === invoice.poolId); return <div className="modal-backdrop"><form className="modal" onSubmit={async event => { event.preventDefault(); const amount = Number(subtotal); await onSave({ ...invoice, fecha: new Date(date + 'T12:00:00').getTime(), subtotal: amount, iva: electronica ? amount * 0.13 : 0, total: electronica ? amount * 1.13 : amount, facturaElectronica: electronica, poolName: pool?.name || invoice.poolName, owner: pool?.owner || invoice.owner }) }}><div className="modal-head"><h2>Editar factura</h2><button type="button" onClick={onClose}>×</button></div><p>{invoice.poolName} · {invoice.owner}</p><label>Fecha<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>Subtotal<input type="number" min="0" value={subtotal} onChange={event => setSubtotal(event.target.value)} /></label><label className="form-task"><input type="checkbox" checked={electronica} onChange={event => setElectronica(event.target.checked)} /> Factura electrónica (+13%)</label><button className="primary-button" type="submit">Guardar factura</button></form></div> }

function Detail({ label, value }: { label: string; value: string }) { return <div className="pool-detail-item"><span>{label}</span><strong>{value}</strong></div> }

function Calculator() { const [shape, setShape] = useState('Rectangular'); const [length, setLength] = useState(''); const [width, setWidth] = useState(''); const [diameter, setDiameter] = useState(''); const [depths, setDepths] = useState(['', '', '']); const average = depths.map(Number).filter(value => value > 0).reduce((a, b) => a + b, 0) / (depths.filter(value => Number(value) > 0).length || 1); const volume = shape === 'Circular' ? Math.PI * (Number(diameter) / 2) ** 2 * average : shape === 'Ovalada' ? Math.PI * (Number(length) / 2) * (Number(width) / 2) * average : Number(length) * Number(width) * average; return <><div className="section-heading"><div><span className="eyebrow">HERRAMIENTA DE CAMPO</span><h2>Calculadora de volumen</h2></div></div><div className="calculator"><div className="calc-form"><span className="label-title">Forma de la piscina</span><div className="segmented">{['Rectangular','Circular','Ovalada'].map(option => <button className={shape === option ? 'selected' : ''} onClick={() => setShape(option)} key={option}>{option}</button>)}</div>{shape === 'Circular' ? <label>Diámetro (m)<input type="number" value={diameter} onChange={event => setDiameter(event.target.value)} /></label> : <div className="form-grid"><label>Largo (m)<input type="number" value={length} onChange={event => setLength(event.target.value)} /></label><label>Ancho (m)<input type="number" value={width} onChange={event => setWidth(event.target.value)} /></label></div>}<span className="label-title">Profundidades (m)</span>{['Parte baja','Centro','Parte profunda'].map((label, index) => <label key={label}>{label}<input type="number" value={depths[index]} onChange={event => setDepths(depths.map((value, position) => position === index ? event.target.value : value))} /></label>)}</div><div className="result-card"><span>VOLUMEN TOTAL</span><strong>{volume.toFixed(2)} <small>m³</small></strong><p>{(volume * 1000).toFixed(0)} litros</p><i>Profundidad media: {average.toFixed(2)} m</i></div></div></> }

function Users({ users, pools, onUpdate, onDelete }: { users: User[]; pools: Pool[]; onUpdate: (user: User) => void; onDelete: (id: string) => void }) { const [show, setShow] = useState(false); const [editing, setEditing] = useState<User | null>(null); return <><div className="section-heading"><div><span className="eyebrow">CONTROL DE ACCESO</span><h2>Equipo</h2></div><button className="primary-button compact" onClick={() => setShow(true)}>+ Agregar usuario</button></div><div className="user-table"><div className="table-head"><span>Persona</span><span>Correo</span><span>Rol</span><span>Acciones</span></div>{users.map(user => <div className="table-row" key={user.id}><div className="person"><span>{user.fullName.slice(0, 1)}</span><b>{user.fullName}</b></div><span>{user.email}</span><span>{user.role}</span><div className="user-actions"><button className="secondary-button" onClick={() => setEditing(user)}>Editar</button><button className="danger-button" onClick={() => onDelete(user.id)}>Eliminar</button></div></div>)}</div>{show && <UserForm pools={pools} onClose={() => setShow(false)} onSave={user => { onUpdate(user); setShow(false) }} />}{editing && <UserForm pools={pools} user={editing} onClose={() => setEditing(null)} onSave={user => { onUpdate(user); setEditing(null) }} />}</> }
function UserForm({ pools, user, onClose, onSave }: { pools: Pool[]; user?: User; onClose: () => void; onSave: (user: User) => void }) { const [fullName, setFullName] = useState(user?.fullName || ''); const [email, setEmail] = useState(user?.email || ''); const [password, setPassword] = useState(user?.password || ''); const [role, setRole] = useState<User['role']>(user?.role || 'OPERARIO'); const [poolId, setPoolId] = useState(user?.poolId || ''); const selectedPool = pools.find(pool => pool.id === poolId); return <div className="modal-backdrop"><form className="modal user-form" onSubmit={event => { event.preventDefault(); onSave({ id: user?.id || makeId(), fullName, email, password: role === 'CLIENTE' ? undefined : password, role, poolId: role === 'CLIENTE' ? poolId : undefined, poolCode: role === 'CLIENTE' && selectedPool ? makePoolCode(selectedPool) : undefined }) }}><div className="modal-head"><h2>{user ? 'Editar usuario' : 'Agregar usuario'}</h2><button type="button" onClick={onClose}>×</button></div><label>Nombre o piscina + dueño<input value={fullName} onChange={event => setFullName(event.target.value)} required /></label><label>Correo<input type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>{role !== 'CLIENTE' && <label>Contraseña<input type="password" value={password} onChange={event => setPassword(event.target.value)} required={!user} /></label>}<label>Rol<select value={role} onChange={event => setRole(event.target.value as User['role'])}><option>ADMIN</option><option>OPERARIO</option><option>CLIENTE</option><option>PENDIENTE</option></select></label>{role === 'CLIENTE' && <label>Piscina<select value={poolId} onChange={event => setPoolId(event.target.value)} required><option value="">Selecciona una piscina</option>{pools.map(pool => <option key={pool.id} value={pool.id}>{pool.name} / {pool.owner} - {makePoolCode(pool)}</option>)}</select></label>}<button className="primary-button" type="submit">Guardar usuario</button></form></div> }
async function downloadProjectPdf(project: Project) {
  const pdf = new jsPDF()
  const money = (v: number) => 'CRC ' + v.toLocaleString('es-CR')
  const totalCost = project.items.reduce((acc, item) => acc + (Number(item.price) || 0), 0)
  const basePrice = project.suggestedPrice || totalCost
  const ivaAmount = project.facturaElectronica ? basePrice * 0.13 : 0
  const finalTotal = basePrice + ivaAmount
  
  pdf.setFont('times', 'bold'); pdf.setFontSize(18); pdf.text('COTIZACIÓN DE PROYECTO', 24, 24)
  pdf.setFont('times', 'normal'); pdf.setFontSize(11)
  pdf.text('Issuer:', 24, 40); pdf.text('Clarity Solutions Company', 65, 40)
  pdf.text('Business Activity:', 24, 48); pdf.text('Professional Pool Services & Construction', 65, 48)
  pdf.text('Cliente / Atención:', 24, 64); pdf.text(project.clientName, 65, 64)
  pdf.text('Proyecto:', 24, 72); pdf.text(project.title, 65, 72)
  if (project.location) { pdf.text('Ubicación:', 24, 80); pdf.text(project.location, 65, 80) }
  pdf.text('Fecha de emisión:', 24, 88); pdf.text(new Date(project.fecha).toLocaleDateString('es-CR'), 65, 88)
  if (project.fechaVencimiento) {
    pdf.text('Válida hasta:', 24, 96); pdf.text(new Date(project.fechaVencimiento).toLocaleDateString('es-CR'), 65, 96)
  }
  try { pdf.addImage(await loadInvoiceLogo(), 'PNG', 158, 10, 28, 38) } catch {}
  
  const lineY = project.fechaVencimiento ? 104 : 98
  pdf.setDrawColor(150); pdf.line(24, lineY, 186, lineY)
  pdf.setFont('times', 'bold'); pdf.setFontSize(14); pdf.text('Desglose de Trabajos y Equipamiento', 24, lineY + 16)
  
  let y = lineY + 28
  pdf.setFontSize(10)
  project.items.forEach((item, index) => {
    if (y > 250) { pdf.addPage(); y = 24 }
    pdf.setFont('times', 'bold'); pdf.text((index + 1) + '.', 24, y)
    pdf.setFont('times', 'normal')
    const lines = pdf.splitTextToSize(item.description, 115)
    pdf.text(lines, 32, y)
    pdf.text(money(item.price), 155, y)
    y += (lines.length * 6) + 4
  })
  
  pdf.setDrawColor(150); pdf.line(24, y + 4, 186, y + 4); y += 16
  pdf.setFont('times', 'bold'); pdf.setFontSize(13); pdf.text('Resumen de Inversión', 24, y); y += 10
  pdf.setFont('times', 'normal'); pdf.setFontSize(11)
  pdf.text('•  Total de ítems / Mano de obra:', 30, y); pdf.text(money(totalCost), 130, y); y += 8
  if (project.suggestedPrice) { pdf.text('•  Precio Sugerido / Cotización:', 30, y); pdf.text(money(project.suggestedPrice), 130, y); y += 8 }
  if (project.facturaElectronica) {
    pdf.text('•  IVA (' + (project.facturaElectronica ? '13' : '0') + '%):', 30, y); pdf.text(money(ivaAmount), 130, y); y += 8
    pdf.text('•  Monto Total con IVA:', 30, y); pdf.text(money(finalTotal), 130, y); y += 8
  }
  if (project.expectedProfit) { pdf.text('•  Ganancia Estimada (Interno):', 30, y); pdf.text(money(project.expectedProfit), 130, y); y += 8 }
  
  if (project.notes) {
    y += 10
    pdf.setFont('times', 'bold'); pdf.setFontSize(13); pdf.text('Notas y Observaciones', 24, y); y += 8
    pdf.setFont('times', 'normal'); pdf.setFontSize(10)
    const noteLines = pdf.splitTextToSize(project.notes, 160)
    pdf.text(noteLines, 24, y)
  }
  
  const safeName = project.clientName.replace(/[^a-zA-Z0-9_-]+/g, '_')
  pdf.save('Cotizacion_' + safeName + '_' + project.title.slice(0, 15) + '.pdf')
}

function Projects({ projects, onSave, onDelete }: { projects: Project[]; onSave: (p: Project) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Project | null>(null)
  
  const totalCotizado = projects.reduce((acc, p) => acc + p.items.reduce((iAcc, item) => iAcc + (Number(item.price) || 0), 0), 0)
  const totalProfit = projects.reduce((acc, p) => acc + (Number(p.expectedProfit) || 0), 0)
  
  const filtered = projects.filter(p => {
    const matchesSearch = (p.title + ' ' + p.clientName + ' ' + (p.location || '')).toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'TODOS' || p.status === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => b.fecha - a.fecha)

  return (
    <>
      <div className="stats">
        <div className="stat"><span>Proyectos adicionales</span><strong>{projects.length}</strong><small>Cotizaciones / Obras</small></div>
        <div className="stat"><span>Monto total cotizado</span><strong>CRC {totalCotizado.toLocaleString('es-CR')}</strong><small>Suma de ítems</small></div>
        <div className="stat"><span>Ganancia proyectada</span><strong>CRC {totalProfit.toLocaleString('es-CR')}</strong><small>Ganancias estimadas</small></div>
      </div>
      <div className="section-heading">
        <div><span className="eyebrow">OBRAS Y TRABAJOS ADICIONALES</span><h2>Proyectos y Cotizaciones</h2></div>
        <button className="primary-button compact" onClick={() => setShowForm(true)}>+ Nuevo proyecto</button>
      </div>
      <div className="invoice-filters" style={{ marginBottom: '20px' }}>
        <input className="search" style={{ marginBottom: 0 }} placeholder="Buscar proyecto, cliente o ubicación..." value={query} onChange={e => setQuery(e.target.value)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="COTIZACION">Cotización</option>
          <option value="EN_PROGRESO">En Progreso</option>
          <option value="COMPLETADO">Completado</option>
        </select>
      </div>
      <div className="pool-grid">
        {filtered.length ? filtered.map(p => {
          const subtotal = p.items.reduce((acc, i) => acc + (Number(i.price) || 0), 0)
          const statusLabels: Record<Project['status'], string> = { COTIZACION: 'Cotización', EN_PROGRESO: 'En Progreso', COMPLETADO: 'Completado' }
          const statusClasses: Record<Project['status'], string> = { COTIZACION: 'warn', EN_PROGRESO: 'scheduled-status', COMPLETADO: 'good' }
          return (
            <article className="pool-card" key={p.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="eyebrow">{p.location || 'Proyecto'}</span>
                  <span className={'status ' + statusClasses[p.status]}>{statusLabels[p.status]}</span>
                </div>
                <h3>{p.title}</h3>
                <p>Cliente: <strong>{p.clientName}</strong></p>
                <div style={{ margin: '14px 0', fontSize: '13px', color: '#52716d' }}>
                  <div>Ítems: {p.items.length} trabajos</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--teal)', marginTop: '4px' }}>
                    CRC {subtotal.toLocaleString('es-CR')}
                  </div>
                  {p.expectedProfit ? <small style={{ color: '#267253' }}>Ganancia est.: CRC {p.expectedProfit.toLocaleString('es-CR')}</small> : null}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button className="primary-button compact" style={{ flex: 1 }} onClick={() => setSelected(p)}>Ver detalle</button>
                <button className="secondary-button compact" onClick={() => downloadProjectPdf(p)}>PDF</button>
              </div>
            </article>
          )
        }) : <div className="empty" style={{ gridColumn: '1 / -1' }}>No hay proyectos registrados con ese criterio.</div>}
      </div>
      {showForm && <ProjectForm onClose={() => setShowForm(false)} onSave={async proj => { await onSave(proj); setShowForm(false) }} />}
      {selected && <ProjectDetail project={selected} onClose={() => setSelected(null)} onDelete={async id => { await onDelete(id); setSelected(null) }} onSave={onSave} />}
    </>
  )
}

function ProjectDetail({ project, onClose, onDelete, onSave }: { project: Project; onClose: () => void; onDelete: (id: string) => Promise<void>; onSave: (p: Project) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const subtotal = project.items.reduce((acc, i) => acc + (Number(i.price) || 0), 0)
  const statusLabels: Record<Project['status'], string> = { COTIZACION: 'Cotización', EN_PROGRESO: 'En Progreso', COMPLETADO: 'Completado' }
  const statusClasses: Record<Project['status'], string> = { COTIZACION: 'warn', EN_PROGRESO: 'scheduled-status', COMPLETADO: 'good' }

  if (editing) return <ProjectForm project={project} onClose={() => setEditing(false)} onSave={async updated => { await onSave(updated); setEditing(false) }} />

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
        <p className="pool-owner">Cliente: <strong>{project.clientName}</strong> {project.location ? '· ' + project.location : ''}</p>
        <p style={{ fontSize: '11px', color: '#78908b', marginTop: '4px' }}>
          Fecha de emisión: {new Date(project.fecha).toLocaleDateString('es-CR')}
          {project.fechaVencimiento ? ` · Vence: ${new Date(project.fechaVencimiento).toLocaleDateString('es-CR')}` : ''}
        </p>
        
        <div className="detail-actions">
          <button className="secondary-button" onClick={() => setEditing(true)}>Editar proyecto</button>
          <button className="primary-button" onClick={() => downloadProjectPdf(project)}>Descargar Cotización PDF</button>
          <button className="danger-button" onClick={() => onDelete(project.id)}>Eliminar</button>
        </div>

        <h3>Desglose de Trabajos / Equipos ({project.items.length})</h3>
        <div style={{ background: '#f5f9f7', border: '1px solid var(--line)', borderRadius: '4px', padding: '12px', marginBottom: '16px' }}>
          {project.items.map((item, index) => (
            <div key={item.id || index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: index < project.items.length - 1 ? '1px solid #dce5e1' : 'none', fontSize: '13px' }}>
              <span style={{ flex: 1, paddingRight: '12px' }}>{(index + 1) + '. ' + item.description}</span>
              <strong>CRC {Number(item.price).toLocaleString('es-CR')}</strong>
            </div>
          ))}
        </div>

        <div className="pool-detail-grid">
          <Detail label="Total ítems" value={'CRC ' + subtotal.toLocaleString('es-CR')} />
          {project.fechaVencimiento ? <Detail label="Válida hasta" value={new Date(project.fechaVencimiento).toLocaleDateString('es-CR')} /> : null}
          {project.suggestedPrice ? <Detail label="Precio Sugerido" value={'CRC ' + project.suggestedPrice.toLocaleString('es-CR')} /> : null}
          <Detail label="Factura electrónica" value={project.facturaElectronica ? 'Sí (13% IVA)' : 'No'} />
          {project.facturaElectronica ? <Detail label="Monto Total con IVA (+13%)" value={'CRC ' + ((project.suggestedPrice || subtotal) * 1.13).toLocaleString('es-CR')} /> : null}
          {project.expectedProfit ? <Detail label="Ganancia Estimada" value={'CRC ' + project.expectedProfit.toLocaleString('es-CR')} /> : null}
        </div>

        {project.notes ? (
          <div style={{ marginTop: '16px', background: '#fff', border: '1px dashed var(--line)', padding: '12px', borderRadius: '4px' }}>
            <h4 style={{ fontSize: '12px', margin: '0 0 6px', color: '#52716d' }}>Notas / Cálculo</h4>
            <p style={{ fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0, color: '#183236' }}>{project.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ProjectForm({ project, onClose, onSave }: { project?: Project; onClose: () => void; onSave: (p: Project) => Promise<void> }) {
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
  const [items, setItems] = useState<ProjectItem[]>(project?.items || [
    { id: makeId(), description: '', price: 0 }
  ])
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
      const validItems = items.filter(i => i.description.trim() !== '').map(i => ({
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
          <Field label="Título del proyecto" value={title} onChange={setTitle} required />
          <Field label="Cliente / Atendido a" value={clientName} onChange={setClientName} required />
          <Field label="Ubicación" value={location} onChange={setLocation} />
          <Field label="Fecha de vencimiento de cotización" value={fechaVencimiento} onChange={setFechaVencimiento} type="date" />
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
          <button type="button" className="secondary-button compact" onClick={addItem}>+ Agregar Ítem</button>
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
                <button type="button" className="danger-button" style={{ padding: '10px 12px' }} onClick={() => removeItem(idx)}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: '#f5f9f7', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 'bold', color: 'var(--teal)' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#183236', fontSize: '14px', paddingTop: '4px', borderTop: '1px solid #dce5e1' }}>
                <span>Monto Total con IVA:</span>
                <span>CRC {totalWithIva.toLocaleString('es-CR')}</span>
              </div>
            </>
          ) : null}
        </div>

        <label className="form-task" style={{ margin: '12px 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={facturaElectronica} onChange={e => setFacturaElectronica(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          Factura electrónica (+13% IVA)
        </label>

        <label style={{ marginTop: '12px' }}>Notas adicionales / Cálculos
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ejemplo: Mínimo: ₡370k | Máximo: ₡530k | Sugerido: ₡450k" />
        </label>

        <button className="primary-button" type="submit" style={{ marginTop: '18px' }} disabled={loading || !title.trim() || !clientName.trim()}>
          {loading ? 'Guardando...' : 'Guardar Proyecto'}
        </button>
      </form>
    </div>
  )
}