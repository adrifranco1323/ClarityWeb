import { useState } from 'react'

export function Calculator() {
  const [shape, setShape] = useState('Rectangular')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [diameter, setDiameter] = useState('')
  const [depths, setDepths] = useState(['', '', ''])

  const average =
    depths
      .map(Number)
      .filter(value => value > 0)
      .reduce((a, b) => a + b, 0) /
      (depths.filter(value => Number(value) > 0).length || 1)

  const volume =
    shape === 'Circular'
      ? Math.PI * (Number(diameter) / 2) ** 2 * average
      : shape === 'Ovalada'
      ? Math.PI * (Number(length) / 2) * (Number(width) / 2) * average
      : Number(length) * Number(width) * average

  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">HERRAMIENTA DE CAMPO</span>
          <h2>Calculadora de volumen</h2>
        </div>
      </div>
      <div className="calculator">
        <div className="calc-form">
          <span className="label-title">Forma de la piscina</span>
          <div className="segmented">
            {['Rectangular', 'Circular', 'Ovalada'].map(option => (
              <button
                className={shape === option ? 'selected' : ''}
                onClick={() => setShape(option)}
                key={option}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
          {shape === 'Circular' ? (
            <label>Diámetro (m)
              <input
                type="number"
                value={diameter}
                onChange={event => setDiameter(event.target.value)}
              />
            </label>
          ) : (
            <div className="form-grid">
              <label>Largo (m)
                <input
                  type="number"
                  value={length}
                  onChange={event => setLength(event.target.value)}
                />
              </label>
              <label>Ancho (m)
                <input
                  type="number"
                  value={width}
                  onChange={event => setWidth(event.target.value)}
                />
              </label>
            </div>
          )}
          <span className="label-title">Profundidades (m)</span>
          {['Parte baja', 'Centro', 'Parte profunda'].map((label, index) => (
            <label key={label}>{label}
              <input
                type="number"
                value={depths[index]}
                onChange={event =>
                  setDepths(depths.map((value, position) => (position === index ? event.target.value : value)))
                }
              />
            </label>
          ))}
        </div>
        <div className="result-card">
          <span>VOLUMEN TOTAL</span>
          <strong>
            {volume.toFixed(2)} <small>m³</small>
          </strong>
          <p>{(volume * 1000).toFixed(0)} litros</p>
          <i>Profundidad media: {average.toFixed(2)} m</i>
        </div>
      </div>
    </>
  )
}
