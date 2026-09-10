import { FormEvent, useState } from 'react'
import type { User, Pool } from '../../types'
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { GoogleAuthProvider, signInAnonymously, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, db } from '../../firebase'

interface LoginFormProps {
  onLogin: (user: User) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
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
      : {
          id: firebaseUser.uid,
          fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
          email: firebaseUser.email || '',
          role: 'PENDIENTE'
        }
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
        
        // 1. Buscar en la colección 'pools' por 'codigo'
        const poolSnap = await getDocs(query(collection(db, 'pools'), where('codigo', '==', normalized)))
        let pool = poolSnap.docs[0] ? ({ id: poolSnap.docs[0].id, ...poolSnap.docs[0].data() } as Pool) : null

        // 2. Si no se encontró, buscar en la colección 'users' por 'poolCode'
        if (!pool) {
          const userSnap = await getDocs(query(collection(db, 'users'), where('poolCode', '==', normalized)))
          const clientDoc = userSnap.docs[0]?.data() as User | undefined
          if (clientDoc?.poolId) {
            const directPool = await getDoc(doc(db, 'pools', clientDoc.poolId))
            if (directPool.exists()) {
              pool = { id: directPool.id, ...directPool.data() } as Pool
            }
          }
        }

        // 3. Respaldo insensible a mayúsculas/espacios buscando en todas las piscinas
        if (!pool) {
          const allPools = await getDocs(collection(db, 'pools'))
          const found = allPools.docs.find(d => {
            const data = d.data() as Pool
            const c = data.codigo?.trim().toUpperCase()
            return c === normalized || d.id.toUpperCase() === normalized || `CL-${d.id.toUpperCase()}` === normalized
          })
          if (found) {
            pool = { id: found.id, ...found.data() } as Pool
          }
        }

        if (!pool) throw new Error('client-not-found')

        onLogin({
          id: authResult.user.uid,
          fullName: `${pool.name} + ${pool.owner}`,
          email: pool.email,
          role: 'CLIENTE',
          poolId: pool.id,
          poolCode: pool.codigo || normalized
        })
        return
      }
      const result = await signInWithEmailAndPassword(auth, email.trim(), password)
      await loadProfile(result.user)
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'client-not-found') {
        setError('No se encontró ninguna piscina con ese código de acceso. Verifica las mayúsculas o consúltalo con el administrador.')
        return
      }
      const code = caught instanceof Error && 'code' in caught ? String(caught.code) : ''
      const messages: Record<string, string> = {
        'auth/invalid-credential': 'El usuario o la contraseña no son correctos.',
        'auth/user-not-found': 'No existe una cuenta con ese usuario.',
        'auth/wrong-password': 'El usuario o la contraseña no son correctos.',
        'auth/invalid-email': 'Escribe un usuario válido.',
        'auth/operation-not-allowed': 'El acceso anónimo o con contraseña no está habilitado en Firebase.',
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

  return (
    <div className="login-page simple-login" style={{ gridTemplateColumns: '1fr' }}>
      <form className="login-form" onSubmit={loginWithPassword}>
        <div className="login-logo"><span className="brand-mark">💧</span><strong>CLARITY</strong></div>
        <div>
          <span className="eyebrow">{clientMode ? 'ACCESO DE CLIENTES' : 'ACCESO DE USUARIOS'}</span>
          <h1>{clientMode ? 'Portal de cliente' : 'Iniciar sesión'}</h1>
          <p className="login-subtitle">{clientMode ? 'Consulta las visitas y reportes de tu piscina.' : 'Accede a tu panel de operaciones.'}</p>
        </div>
        <label className="field">
          {clientMode ? 'Código de piscina' : 'Correo electrónico'}
          <input
            type={clientMode ? 'text' : 'email'}
            autoComplete="username"
            placeholder={clientMode ? 'CL-P1' : 'tu@email.com'}
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />
        </label>
        {!clientMode && (
          <label className="field">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </label>
        )}
        {error && <p className="login-error">{error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <div className="login-divider"><span>o</span></div>
        <button className="google-button" type="button" onClick={loginWithGoogle} disabled={loading}>
          <span>G</span> Continuar con Google
        </button>
        <button
          className="login-mode-button"
          type="button"
          onClick={() => { setClientMode(!clientMode); setEmail(''); setPassword(''); setError('') }}
          disabled={loading}
        >
          {clientMode ? 'Volver al acceso administrativo' : 'Ingresar como cliente'}
        </button>
      </form>
    </div>
  )
}
