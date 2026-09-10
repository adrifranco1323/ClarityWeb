import type { Pool, User, Visit } from '../types'

export const stored = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export const makeId = () => Math.random().toString(36).slice(2, 10)

export const makePoolCode = (pool: Pick<Pool, 'id' | 'codigo'>) => pool.codigo || `CL-${pool.id.toUpperCase()}`

export const clientUserForPool = (pool: Pool): User => ({
  id: `client-${pool.id}`,
  fullName: `${pool.name} + ${pool.owner}`,
  email: pool.email,
  role: 'CLIENTE',
  poolId: pool.id,
  poolCode: makePoolCode(pool)
})

export const formatChemicalAmount = (amount: number, unit = 'g') =>
  amount >= 1000 ? `${(amount / 1000).toFixed(2)} ${unit === 'g' ? 'kg' : 'L'}` : `${amount.toFixed(0)} ${unit}`

export const visitInstructions = (visit: Visit) => {
  const poolSize = 25.4
  const cloro = visit.cloroInicial < 2
    ? `Bajo. Aplicar ${formatChemicalAmount((2 - visit.cloroInicial) * poolSize * 2)} de cloro.`
    : visit.cloroInicial > 3
    ? `Alto (${visit.cloroInicial} ppm). No aplicar producto, monitorear.`
    : 'En niveles óptimos.'
  const ph = visit.phInicial < 7.2
    ? `Bajo. Aplicar ${formatChemicalAmount(((7.2 - visit.phInicial) / 0.1) * 10 * poolSize)} de incrementador de pH.`
    : visit.phInicial > 7.6
    ? `Alto. Aplicar ${formatChemicalAmount(((visit.phInicial - 7.6) / 0.1) * 10 * poolSize, 'ml')} de reductor de pH.`
    : 'En niveles óptimos.'
  const alkalinity = visit.alcalinidadInicial < 80
    ? `Baja. Aplicar ${formatChemicalAmount(((80 - visit.alcalinidadInicial) / 10) * 18 * poolSize)} de bicarbonato de sodio.`
    : visit.alcalinidadInicial > 120
    ? `Alta. Aplicar ${formatChemicalAmount(((visit.alcalinidadInicial - 120) / 10) * 20 * poolSize, 'ml')} de reductor de alcalinidad.`
    : 'En niveles óptimos.'
  const hardness = visit.durezaCalcica < 200
    ? `Baja. Aplicar ${formatChemicalAmount(((200 - visit.durezaCalcica) / 10) * 15 * poolSize)} de cloruro de calcio.`
    : visit.durezaCalcica > 400
    ? 'Alta. Monitorear o realizar purga parcial de agua.'
    : 'En niveles óptimos.'
  const cyanuric = visit.acidoCianuro < 30
    ? `Bajo. Aplicar ${formatChemicalAmount(((30 - visit.acidoCianuro) / 10) * 10 * poolSize)} de ácido cianúrico.`
    : visit.acidoCianuro > 50
    ? 'Alto. Monitorear o drenar parcialmente.'
    : 'En niveles óptimos.'
  return [
    ['Cloro', cloro],
    ['pH', ph],
    ['Alcalinidad', alkalinity],
    ['Dureza cálcica', hardness],
    ['Ácido cianúrico', cyanuric]
  ] as [string, string][]
}

export const uploadVisitPhoto = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxWidth = 1000
        const maxHeight = 1000
        let { width, height } = img
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(reader.result))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = () => resolve(String(reader.result))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'))
    reader.readAsDataURL(file)
  })
}

export async function loadImageForPdf(src: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width || 400
        canvas.height = img.naturalHeight || img.height || 300
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          resolve({ dataUrl, width: canvas.width, height: canvas.height })
        } else {
          resolve({ dataUrl: src, width: img.naturalWidth || 400, height: img.naturalHeight || 300 })
        }
      } catch {
        resolve({ dataUrl: src, width: img.naturalWidth || 400, height: img.naturalHeight || 300 })
      }
    }
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}

export async function loadInvoiceLogo(): Promise<string> {
  const response = await fetch('/clarity-logo.png')
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
