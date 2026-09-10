import { useState } from 'react'
import type { Pool, User } from '../../types'
import { makeId, makePoolCode } from '../../utils/helpers'

interface UsersProps {
  users: User[]
  pools: Pool[]
  onUpdate: (user: User) => void
  onDelete: (id: string) => void
}

export function Users({ users, pools, onUpdate, onDelete }: UsersProps) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">CONTROL DE ACCESO</span>
          <h2>Equipo</h2>
        </div>
        <button className="primary-button compact" onClick={() => setShow(true)}>
          + Agregar usuario
        </button>
      </div>
      <div className="user-table">
        <div className="table-head">
          <span>Persona</span>
          <span>Correo</span>
          <span>Rol</span>
          <span>Acciones</span>
        </div>
        {users.map(user => (
          <div className="table-row" key={user.id}>
            <div className="person">
              <span>{user.fullName.slice(0, 1)}</span>
              <b>{user.fullName}</b>
            </div>
            <span>{user.email || (user.poolCode ? `Código: ${user.poolCode}` : 'Sin correo')}</span>
            <span>{user.role}{user.poolCode ? ` (${user.poolCode})` : ''}</span>
            <div className="user-actions">
              <button className="secondary-button" onClick={() => setEditing(user)}>
                Editar
              </button>
              <button className="danger-button" onClick={() => onDelete(user.id)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      {show && (
        <UserForm
          pools={pools}
          onClose={() => setShow(false)}
          onSave={user => {
            onUpdate(user)
            setShow(false)
          }}
        />
      )}
      {editing && (
        <UserForm
          pools={pools}
          user={editing}
          onClose={() => setEditing(null)}
          onSave={user => {
            onUpdate(user)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

export function UserForm({
  pools,
  user,
  onClose,
  onSave
}: {
  pools: Pool[]
  user?: User
  onClose: () => void
  onSave: (user: User) => void
}) {
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState(user?.password || '')
  const [role, setRole] = useState<User['role']>(user?.role || 'OPERARIO')
  const [poolId, setPoolId] = useState(user?.poolId || '')
  const selectedPool = pools.find(pool => pool.id === poolId)
  const [poolCode, setPoolCode] = useState(
    user?.poolCode || (selectedPool ? makePoolCode(selectedPool) : '')
  )

  const handlePoolChange = (newPoolId: string) => {
    setPoolId(newPoolId)
    const found = pools.find(p => p.id === newPoolId)
    if (found) {
      setPoolCode(found.codigo || makePoolCode(found))
    }
  }

  return (
    <div className="modal-backdrop">
      <form
        className="modal user-form"
        onSubmit={event => {
          event.preventDefault()
          const cleanCode = poolCode.trim().toUpperCase()
          onSave({
            id: user?.id || makeId(),
            fullName,
            email,
            password: role === 'CLIENTE' ? undefined : password,
            role,
            poolId: role === 'CLIENTE' ? poolId : undefined,
            poolCode: role === 'CLIENTE' ? (cleanCode || (selectedPool ? makePoolCode(selectedPool) : undefined)) : undefined
          })
        }}
      >
        <div className="modal-head">
          <h2>{user ? 'Editar usuario' : 'Agregar usuario'}</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <label>Nombre o piscina + dueño
          <input value={fullName} onChange={event => setFullName(event.target.value)} required />
        </label>
        <label>Correo
          <input type="email" value={email} onChange={event => setEmail(event.target.value)} />
        </label>
        {role !== 'CLIENTE' && (
          <label>Contraseña
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required={!user}
            />
          </label>
        )}
        <label>Rol
          <select value={role} onChange={event => setRole(event.target.value as User['role'])}>
            <option>ADMIN</option>
            <option>OPERARIO</option>
            <option>CLIENTE</option>
            <option>PENDIENTE</option>
          </select>
        </label>
        {role === 'CLIENTE' && (
          <>
            <label>Piscina
              <select value={poolId} onChange={event => handlePoolChange(event.target.value)} required>
                <option value="">Selecciona una piscina</option>
                {pools.map(pool => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name} / {pool.owner} - {makePoolCode(pool)}
                  </option>
                ))}
              </select>
            </label>
            <label>Código de acceso (Portal de Clientes)
              <input
                value={poolCode}
                onChange={event => setPoolCode(event.target.value.toUpperCase())}
                placeholder="Ej. VMFP o CL-P1"
                required
              />
            </label>
          </>
        )}
        <button className="primary-button" type="submit">
          Guardar usuario
        </button>
      </form>
    </div>
  )
}
