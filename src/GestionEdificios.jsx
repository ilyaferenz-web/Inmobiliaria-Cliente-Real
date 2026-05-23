import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Eye, Search, ChevronRight, Building2, AlertCircle, CheckCircle, Edit2, RotateCcw, Wrench, Image, DollarSign, BarChart3, DatabaseBackup, FolderOpen } from 'lucide-react'

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(71, 85, 105, 0.5)', color: '#fff', fontSize: '14px', marginBottom: '12px', fontFamily: 'inherit' }
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }

function formatTamanoBytes(n) {
  if (n == null || Number.isNaN(n)) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '-'
  try {
    const normalized = fechaStr.includes('T') ? fechaStr : fechaStr.replace(' ', 'T')
    const d = new Date(normalized)
    if (isNaN(d.getTime())) return fechaStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const h = d.getHours()
    const m = String(d.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'p. m.' : 'a. m.'
    const h12 = h % 12 || 12
    return `${day}/${month}/${year}, ${h12}:${m} ${ampm}`
  } catch {
    return fechaStr
  }
}

function RangoPicker({ years, months, selectedYearId, selectedBuildingId, mostrarMensaje, obtenerMonths }) {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const [todosLosMeses, setTodosLosMeses] = useState([])
  const [fromId, setFromId] = useState('')
  const [toId, setToId]     = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    // Cargar todos los meses de todos los años del edificio
    const cargar = async () => {
      const todos = []
      for (const y of years) {
        const ms = await obtenerMonths(y.id)
        for (const m of ms) {
          todos.push({ ...m, year: y.year })
        }
      }
      // Ordenar cronológicamente
      todos.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return MESES.indexOf(a.mes) - MESES.indexOf(b.mes)
      })
      setTodosLosMeses(todos)
      if (todos.length) {
        setFromId(todos[0].id)
        setToId(todos[todos.length - 1].id)
      }
    }
    cargar()
  }, [years])

  const combinar = async () => {
    if (!fromId || !toId) return mostrarMensaje('error', 'Seleccioná rango')
    setCargando(true)
    mostrarMensaje('success', '⏳ Combinando PDFs, aguardá...')
    const res = await window.api.combinarFacturasYearImagenes({
      fromMonthId: Number(fromId),
      toMonthId:   Number(toId),
      buildingId:  selectedBuildingId
    })
    setCargando(false)
    if (res?.success) mostrarMensaje('success', '✓ PDF combinado abierto')
    else mostrarMensaje('error', res?.error || 'Error al combinar')
  }

  const label = (m) => `${m.mes} ${m.year}`

  return (
    <div style={{
      marginTop: '6px',
      padding: '12px',
      borderRadius: '10px',
      background: 'rgba(139,92,246,0.08)',
      border: '1px solid rgba(139,92,246,0.25)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700', marginBottom: '2px' }}>
        📄 Combinar rango
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px' }}>Desde</div>
          <select
            value={fromId}
            onChange={e => setFromId(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', borderRadius: '7px', border: '1px solid rgba(71,85,105,0.5)', background: 'rgba(15,23,42,0.8)', color: '#f1f5f9', fontSize: '12px' }}
          >
            {todosLosMeses.map(m => <option key={m.id} value={m.id}>{label(m)}</option>)}
          </select>
        </div>
        <div style={{ color: '#475569', paddingTop: '16px' }}>→</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px' }}>Hasta</div>
          <select
            value={toId}
            onChange={e => setToId(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', borderRadius: '7px', border: '1px solid rgba(71,85,105,0.5)', background: 'rgba(15,23,42,0.8)', color: '#f1f5f9', fontSize: '12px' }}
          >
            {todosLosMeses.map(m => <option key={m.id} value={m.id}>{label(m)}</option>)}
          </select>
        </div>
      </div>
      <button
        onClick={combinar}
        disabled={cargando}
        style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'linear-gradient(90deg,#8b5cf6,#6d28d9)', color: '#fff', border: 'none', cursor: cargando ? 'wait' : 'pointer', fontSize: '12px', fontWeight: '600', opacity: cargando ? 0.7 : 1 }}
      >
        {cargando ? '⏳ Combinando...' : '📄 Combinar'}
      </button>
    </div>
  )
}

// ============================================================
// COMPONENTE DE MANTENIMIENTO
// ============================================================

function MantenimientoView({ edificios, mostrarMensaje, showConfirm }) {

  const [buildingId, setBuildingId] = useState(null)
  const [secciones, setSecciones] = useState([])
  const [loadingSecciones, setLoadingSecciones] = useState(false)

  const [nuevaSeccionTitulo, setNuevaSeccionTitulo] = useState('')
  const [nuevaSeccionDesc, setNuevaSeccionDesc] = useState('')

  const [subitemInputs, setSubitemInputs] = useState({})
  const [seccionesExpandidas, setSeccionesExpandidas] = useState({})

  const [editandoSeccion, setEditandoSeccion] = useState(null)
  const [tituloEditado, setTituloEditado] = useState('')

  const S = {
    card: {
      background: 'rgba(30,41,59,0.6)',
      border: '1px solid rgba(71,85,105,0.3)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '11px',
      fontWeight: '700',
      color: '#94a3b8',
      marginBottom: '5px',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '10px',
      border: '1px solid rgba(71,85,105,0.5)',
      background: 'rgba(15,23,42,0.6)',
      color: '#f1f5f9',
      fontSize: '14px',
      boxSizing: 'border-box',
      outline: 'none',
      fontFamily: 'inherit'
    },
    btn: (bg = '#3b82f6', extra = {}) => ({
      padding: '9px 16px',
      borderRadius: '9px',
      border: 'none',
      background: bg,
      color: '#fff',
      fontWeight: '600',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all .15s ease',
      ...extra
    }),
    select: {
      width: '100%',
      padding: '11px 14px',
      borderRadius: '10px',
      border: '1px solid rgba(71,85,105,0.5)',
      background: 'rgba(15,23,42,0.9)',
      color: '#f1f5f9',
      fontSize: '14px',
      boxSizing: 'border-box',
      cursor: 'pointer'
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('mant-secciones')
    if (saved) {
      try { setSeccionesExpandidas(JSON.parse(saved)) } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('mant-secciones', JSON.stringify(seccionesExpandidas))
  }, [seccionesExpandidas])

  // Reemplazá cargarSecciones
  const cargarSecciones = async (id) => {
    if (!id) return
    setLoadingSecciones(true)
    try {
      const secs = await window.api.obtenerSeccionesMantenimiento(id)

      const seccionesConItems = await Promise.all(
        (secs || []).map(async (sec) => {
          const items = await window.api.obtenerItemsMantenimiento(sec.id)
          return {
            ...sec,
            tituloLimpio: sec.titulo,
            subitems: (items || []).map(it => {
  console.log('item updated_at:', it.updated_at, 'created_at:', it.created_at)
  return { ...it, textoLimpio: it.texto }
})
          }
        })
      )

      setSecciones(seccionesConItems)
    } catch (err) {
      console.error(err)
      mostrarMensaje('error', 'Error al cargar mantenimiento')
    } finally {
      setLoadingSecciones(false)
    }
  }

  // Reemplazá agregarSeccion
  const agregarSeccion = async () => {
    if (!buildingId) return mostrarMensaje('error', 'Seleccioná un edificio')
    if (!nuevaSeccionTitulo.trim()) return mostrarMensaje('error', 'El título es obligatorio')
    try {
      await window.api.agregarSeccionMantenimiento({
        buildingId,
        titulo: nuevaSeccionTitulo.trim(),
        descripcion: nuevaSeccionDesc.trim() || null
      })
      mostrarMensaje('success', '✓ Sección creada')
      setNuevaSeccionTitulo('')
      setNuevaSeccionDesc('')
      await cargarSecciones(buildingId)
    } catch {
      mostrarMensaje('error', 'Error al crear sección')
    }
  }

  // Reemplazá agregarSubitem
  const agregarSubitem = async (seccionId) => {
    const texto = (subitemInputs[seccionId] || '').trim()
    if (!texto) return mostrarMensaje('error', 'Escribí el ítem')
    try {
      await window.api.agregarItemMantenimiento({ sectionId: seccionId, texto })
      setSubitemInputs(prev => ({ ...prev, [seccionId]: '' }))
      await cargarSecciones(buildingId)
    } catch (e) {
      mostrarMensaje('error', 'Error al agregar ítem: ' + e.message)
    }
  }

  // Reemplazá cambiarEstadoItem
  const cambiarEstadoItem = async (item) => {
    const ciclo = ['pendiente', 'progreso', 'completado']
    const nuevoEstado = ciclo[(ciclo.indexOf(item.estado || 'pendiente') + 1) % ciclo.length]
    try {
      await window.api.cambiarEstadoItemMantenimiento({ id: item.id, nuevoEstado })
      // Actualiza solo ese item en el estado local — sin reordenar
      setSecciones(prev => prev.map(sec => ({
        ...sec,
        subitems: sec.subitems.map(it =>
          it.id === item.id ? { ...it, estado: nuevoEstado } : it
        )
      })))
    } catch {
      mostrarMensaje('error', 'Error al cambiar estado')
    }
  }

  // Reemplazá eliminarNota
  const eliminarNota = async (id, esSeccion = false) => {
    try {
      if (esSeccion) {
        await window.api.eliminarSeccionMantenimiento(id)
      } else {
        await window.api.eliminarItemMantenimiento(id)
      }
      await cargarSecciones(buildingId)
    } catch {
      mostrarMensaje('error', 'Error al eliminar')
    }
  }

  // Reemplazá guardarTituloSeccion
  const guardarTituloSeccion = async (seccionId) => {
    if (!tituloEditado.trim()) return mostrarMensaje('error', 'Título inválido')
    try {
      await window.api.editarSeccionMantenimiento({
        id: seccionId,
        titulo: tituloEditado.trim()
      })
      setEditandoSeccion(null)
      setTituloEditado('')
      await cargarSecciones(buildingId)
      mostrarMensaje('success', '✓ Sección actualizada')
    } catch {
      mostrarMensaje('error', 'Error al editar sección')
    }
  }

  const toggleSeccion = (id) =>
    setSeccionesExpandidas(prev => ({ ...prev, [id]: !(prev[id] !== false) }))

  const estaExpandida = (id) => seccionesExpandidas[id] !== false

  const estadoColor = (estado) => {
    if (estado === 'completado') return { bg: 'rgba(16,185,129,0.2)', color: '#86efac', label: '✓ Completado' }
    if (estado === 'progreso') return { bg: 'rgba(59,130,246,0.2)', color: '#93c5fd', label: '⚡ En progreso' }
    return { bg: 'rgba(245,158,11,0.2)', color: '#fcd34d', label: '⏳ Pendiente' }
  }

  const colorBordeIzq = (progreso, total) => {
    if (total === 0) return '#6d28d9'
    if (progreso === 100) return '#10b981'
    if (progreso > 0) return '#3b82f6'
    return '#6d28d9'
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px' }}>🔧 Mantenimiento</h2>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>
        Historial de mantenimiento organizado por secciones con seguimiento.
      </p>

      <div style={S.card}>
        <label style={S.label}>🏢 Edificio</label>
        <select
          style={S.select}
          value={buildingId || ''}
          onChange={async e => {
            const id = e.target.value ? parseInt(e.target.value) : null
            setBuildingId(id)
            setSecciones([])
            if (id) await cargarSecciones(id)
          }}
        >
          <option value="">— Seleccioná un edificio —</option>
          {edificios.map(ed => (
            <option key={ed.id} value={ed.id}>{ed.direccion}</option>
          ))}
        </select>
      </div>

      {buildingId && (
        <>
          <div style={{
            ...S.card,
            borderColor: 'rgba(139,92,246,0.4)',
            background: 'rgba(139,92,246,0.07)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#a78bfa', marginBottom: '14px' }}>
              ➕ Nueva Sección
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={S.label}>Título *</label>
                <input
                  style={S.input}
                  value={nuevaSeccionTitulo}
                  placeholder="Ej: Ascensor"
                  onChange={e => setNuevaSeccionTitulo(e.target.value)}
                />
              </div>
              <div>
                <label style={S.label}>Descripción</label>
                <input
                  style={S.input}
                  value={nuevaSeccionDesc}
                  placeholder="Descripción"
                  onChange={e => setNuevaSeccionDesc(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={agregarSeccion}
              style={S.btn('linear-gradient(135deg,#8b5cf6,#6d28d9)')}
            >
              + Crear Sección
            </button>
          </div>

          {loadingSecciones ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando...</div>
          ) : secciones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>Sin secciones</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {secciones.map(seccion => {
                const expandida = estaExpandida(seccion.id)
                const totalItems = seccion.subitems?.length || 0
                const completados = seccion.subitems?.filter(s => s.estado === 'completado').length || 0
                const progreso = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0

                return (
                  <div
                    key={seccion.id}
                    style={{
                      background: 'rgba(15,23,42,0.7)',
                      border: '1px solid rgba(71,85,105,0.3)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      borderLeft: `4px solid ${colorBordeIzq(progreso, totalItems)}`
                    }}
                  >
                    <div
                      onClick={() => toggleSeccion(seccion.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        background: expandida ? 'rgba(139,92,246,0.08)' : 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <span style={{ transform: expandida ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'all .2s' }}>▶</span>
                        <div style={{ flex: 1 }}>
                          {editandoSeccion === seccion.id ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                style={S.input}
                                value={tituloEditado}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setTituloEditado(e.target.value)}
                              />
                              <button
                                onClick={e => { e.stopPropagation(); guardarTituloSeccion(seccion.id) }}
                                style={S.btn('#10b981')}
                              >✓</button>
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>
                                {seccion.tituloLimpio}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                Creado: {formatFecha(seccion.created_at)}
                              </div>
                              {seccion.nota && seccion.nota !== '-' && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                  {seccion.nota}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {totalItems > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                              {completados}/{totalItems} · {progreso}%
                            </div>
                            <div style={{ width: '90px', height: '6px', background: 'rgba(71,85,105,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${progreso}%`, height: '100%', background: progreso === 100 ? '#10b981' : '#3b82f6' }} />
                            </div>
                          </div>
                        )}

                        {progreso === 100 && totalItems > 0 && (
                          <span style={{ fontSize: '11px', color: '#86efac', background: 'rgba(16,185,129,0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                            ✨ Completada
                          </span>
                        )}

                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setEditandoSeccion(seccion.id)
                            setTituloEditado(seccion.tituloLimpio)
                          }}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', cursor: 'pointer' }}
                        >✏️</button>

                        <button
                          onClick={e => {
                            e.stopPropagation()
                            showConfirm(
                              `¿Eliminar la sección "${seccion.tituloLimpio}" y todos sus ítems?`,
                              () => eliminarNota(seccion.id, true)
                            )
                          }}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', cursor: 'pointer' }}
                        >🗑️</button>
                      </div>
                    </div>

                    {expandida && (
                      <div style={{ padding: '0 20px 20px' }}>
                        {seccion.subitems?.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                            {seccion.subitems.map((item, idx) => {
                              const ec = estadoColor(item.estado)
                              const completado = item.estado === 'completado'
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 14px',
                                    borderRadius: '9px',
                                    background: completado ? 'rgba(16,185,129,0.05)' : 'rgba(30,41,59,0.5)',
                                    border: `1px solid ${completado ? 'rgba(16,185,129,0.15)' : 'rgba(71,85,105,0.2)'}`,
                                    transition: 'all .15s ease'
                                  }}
                                >
                                  <span style={{ fontSize: '12px', color: '#475569', minWidth: '22px' }}>{idx + 1}.</span>
                                  <span style={{
                                    flex: 1,
                                    fontSize: '14px',
                                    color: completado ? '#64748b' : '#e2e8f0',
                                    textDecoration: completado ? 'line-through' : 'none'
                                  }}>
                                    {item.textoLimpio}
                                  </span>
                                  {/* <span style={{ fontSize: '11px', color: '#475569' }}>
                                    {formatFecha(item.updated_at) || item.created_at}
                                  </span> */}
                                  <button
                                    onClick={() => cambiarEstadoItem(item)}
                                    style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: ec.bg, color: ec.color }}
                                  >
                                    {ec.label}
                                  </button>
                                  <button
                                    onClick={() => showConfirm('¿Eliminar este ítem?', () => eliminarNota(item.id))}
                                    style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', cursor: 'pointer' }}
                                  >✕</button>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            style={{ ...S.input, flex: 1 }}
                            placeholder="Agregar ítem..."
                            value={subitemInputs[seccion.id] || ''}
                            onChange={e => setSubitemInputs(prev => ({ ...prev, [seccion.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && agregarSubitem(seccion.id)}
                          />
                          <button
                            onClick={() => agregarSubitem(seccion.id)}
                            style={S.btn('linear-gradient(135deg,#8b5cf6,#6d28d9)')}
                          >
                            + Ítem
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// COMPONENTE DE PAGOS
// ============================================================
function PagosView({ edificios, cargarEdificiosConDeuda, mostrarMensaje, showConfirm }) {
  const [selectedBuildingId, setSelectedBuildingId] = useState(null)
  const [pagos, setPagos] = useState([])
  const [deudas, setDeudas] = useState([])
  const [montoPago, setMontoPago] = useState('')
  const [conceptoPago, setConceptoPago] = useState('')
  const [montoDeuda, setMontoDeuda] = useState('')
  const [descripcionDeuda, setDescripcionDeuda] = useState('')
  const [pdfCargando, setPdfCargando] = useState(false)
  const [tipoFactura, setTipoFactura] = useState('deuda')
  const [tab, setTab] = useState('pagos')
  const [fechaPago, setFechaPago] = useState('')
  const [numeroFacturaPago, setNumeroFacturaPago] = useState('')
  const [fechaDeuda, setFechaDeuda] = useState('')
  const [numeroFacturaDeuda, setNumeroFacturaDeuda] = useState('')

  const S = {
    card: { background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: '16px', padding: '24px', marginBottom: '16px' },
    pdfCard: { background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '18px', marginBottom: '20px' },
    label: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' },
    input: { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(71,85,105,0.5)', background: 'rgba(15,23,42,0.6)', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
    inputFilled: { border: '1px solid rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.07)' },
    select: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(71,85,105,0.5)', background: 'rgba(15,23,42,0.9)', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' },
    btn: (bg = '#3b82f6', extra = {}) => ({ padding: '10px 18px', borderRadius: '10px', border: 'none', background: bg, color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', ...extra }),
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', background: 'rgba(15,23,42,0.4)', marginBottom: '8px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' },
    fieldWrap: { display: 'flex', flexDirection: 'column' }
  }

  const flash = (type, text) => { if (mostrarMensaje) mostrarMensaje(type, text) }
  const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  async function cargarDatos(buildingId) {
    try {
      const [pagosData, deudasData] = await Promise.all([
        window.api.obtenerPagos(buildingId),
        window.api.obtenerDeudas(buildingId)
      ])
      setPagos(pagosData || [])
      setDeudas(deudasData || [])
    } catch { flash('error', 'Error al cargar datos') }
  }

  useEffect(() => {
    if (selectedBuildingId) cargarDatos(Number(selectedBuildingId))
  }, [selectedBuildingId])

  async function handleAgregarPago(e) {
    e.preventDefault()
    if (!selectedBuildingId) return flash('error', 'Seleccioná un edificio primero')
    const monto = parseFloat(montoPago)
    if (!monto || monto <= 0) return flash('error', 'Ingresá un monto válido mayor a 0')
    try {
      await window.api.agregarPago({ buildingId: Number(selectedBuildingId), monto, fecha: fechaPago || undefined, numero_factura: numeroFacturaPago || undefined, concepto: conceptoPago || 'Pago general' })
      flash('success', '✓ Pago registrado correctamente')
      setMontoPago(''); setFechaPago(''); setNumeroFacturaPago(''); setConceptoPago('')
      await cargarDatos(Number(selectedBuildingId))
    } catch (err) { flash('error', 'Error al registrar pago: ' + (err.message || err)) }
  }

  async function handleAgregarDeuda(e) {
    e.preventDefault()
    if (!selectedBuildingId) return flash('error', 'Seleccioná un edificio primero')
    const monto = parseFloat(montoDeuda)
    if (!monto || monto <= 0) return flash('error', 'Ingresá un monto válido mayor a 0')
    try {
      await window.api.agregarDeuda({ buildingId: Number(selectedBuildingId), monto, fecha: fechaDeuda || undefined, numero_factura: numeroFacturaDeuda || '', descripcion: descripcionDeuda || 'Deuda general' })
      flash('success', '✓ Deuda registrada correctamente')
      setMontoDeuda(''); setFechaDeuda(''); setNumeroFacturaDeuda(''); setDescripcionDeuda('')
      await cargarDatos(Number(selectedBuildingId))
    } catch (err) { flash('error', 'Error al registrar deuda: ' + (err.message || err)) }
  }

  const convertirFormatoFecha = (fecha) => {
    if (!fecha) return fecha
    const match = fecha.trim().replace(/[^\d\/\-]/g, '').match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
    if (!match) return fecha
    const [, dia, mes, anio] = match
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  async function procesarPDF() {
    try {
      alert('🔍 Paso 1: Iniciando selección de PDF...')
      const pdfPath = await window.api.seleccionarPDF()
      if (!pdfPath) { alert('❌ Paso 2: No se seleccionó ningún PDF'); return }
      alert('✅ Paso 2: PDF seleccionado correctamente\n\nEnviando al extractor OCR...')
      const resultado = await window.api.extraerDatosFactura(pdfPath)
      if (!resultado || !resultado.success) { alert('❌ Paso 3: Error en extracción\n\n' + (resultado?.error || 'Error desconocido')); return }
      alert('✅ Paso 3: Extracción completada\n\nLlenando campos del formulario...')
      const datos = resultado.datos || {}
      if (!selectedBuildingId) { alert('⚠️ Paso 4: Debes seleccionar un edificio primero'); return }
      if (tipoFactura === 'deuda') {
        if (datos.fecha) setFechaDeuda(convertirFormatoFecha(datos.fecha))
        if (datos.monto) setMontoDeuda(String(datos.monto))
        if (datos.numero) setNumeroFacturaDeuda(datos.numero)
        setDescripcionDeuda(datos.numero ? `Factura ${datos.numero}` : 'Factura PDF')
      } else {
        if (datos.fecha) setFechaPago(convertirFormatoFecha(datos.fecha))
        if (datos.monto) setMontoPago(String(datos.monto))
        if (datos.numero) setNumeroFacturaPago(datos.numero)
        setConceptoPago(datos.numero ? `Pago factura ${datos.numero}` : 'Pago desde PDF')
      }
      alert(`✅ Paso 4: Campos llenados\n\n📅 Fecha: ${datos.fecha || 'No encontrada'}\n💰 Monto: $${datos.monto || 'No encontrado'}\n🧾 N° Factura: ${datos.numero || 'No encontrado'}`)
    } catch (err) {
      alert('❌ Error general: ' + err.message)
    }
  }

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', paddingBottom: '40px' }}>
      <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px' }}>💳 Gestión de Pagos</h2>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>Seleccioná un edificio para registrar pagos, deudas o importar facturas AFIP.</p>

      <div style={S.card}>
        <label style={S.label}>🏢 Edificio</label>
        <select style={S.select} value={selectedBuildingId} onChange={e => setSelectedBuildingId(e.target.value)}>
          <option value="">— Seleccioná un edificio —</option>
          {edificios.map(ed => (<option key={ed.id} value={ed.id}>{ed.direccion}</option>))}
        </select>
      </div>

      {selectedBuildingId && (
        <>
          <div style={S.pdfCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '18px' }}>📄</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>Cargar desde factura PDF (AFIP)</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Extrae automáticamente: N° comprobante, monto e importe total</div>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={S.label}>Tipo de documento</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setTipoFactura('deuda')} style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(71,85,105,0.5)', background: tipoFactura === 'deuda' ? 'rgba(239,68,68,0.2)' : 'rgba(15,23,42,0.6)', color: tipoFactura === 'deuda' ? '#fca5a5' : '#94a3b8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>📋 Registrar como Deuda</button>
                <button onClick={() => setTipoFactura('pago')} style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(71,85,105,0.5)', background: tipoFactura === 'pago' ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.6)', color: tipoFactura === 'pago' ? '#86efac' : '#94a3b8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>💳 Registrar como Pago</button>
              </div>
            </div>
            <button onClick={procesarPDF} disabled={pdfCargando} style={{ ...S.btn(tipoFactura === 'deuda' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)'), opacity: pdfCargando ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              {pdfCargando ? '⏳ Procesando PDF...' : `📄 Agregar ${tipoFactura === 'deuda' ? 'Deuda' : 'Pago'} desde PDF`}
            </button>

            <div style={{ marginTop: '24px', padding: '20px', background: tipoFactura === 'deuda' ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)', border: tipoFactura === 'deuda' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 18px', color: '#cbd5e1', fontSize: '15px' }}>{tipoFactura === 'deuda' ? '📋 Registrar deuda' : '💳 Registrar pago'}</h4>
              {tipoFactura === 'deuda' ? (
                <form onSubmit={handleAgregarDeuda}>
                  <div style={S.grid2}>
                    <div style={S.fieldWrap}><label style={S.label}>Monto *</label><input style={{ ...S.input, ...(montoDeuda ? S.inputFilled : {}) }} type="number" step="0.01" min="0.01" placeholder="Ej: 36900.00" value={montoDeuda} onChange={e => setMontoDeuda(e.target.value)} required /></div>
                    <div style={S.fieldWrap}><label style={S.label}>Fecha</label><input style={{ ...S.input, ...(fechaDeuda ? S.inputFilled : {}) }} type="date" value={fechaDeuda} onChange={e => setFechaDeuda(e.target.value)} /></div>
                    <div style={S.fieldWrap}><label style={S.label}>N° Comprobante</label><input style={{ ...S.input, ...(numeroFacturaDeuda ? S.inputFilled : {}) }} type="text" placeholder="Ej: 00003-00000796" value={numeroFacturaDeuda} onChange={e => setNumeroFacturaDeuda(e.target.value)} /></div>
                    <div style={S.fieldWrap}><label style={S.label}>Descripción</label><input style={{ ...S.input, ...(descripcionDeuda ? S.inputFilled : {}) }} type="text" placeholder="Ej: Expensas enero" value={descripcionDeuda} onChange={e => setDescripcionDeuda(e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={S.btn('#ef4444')}>+ Registrar Deuda</button>
                    {(montoDeuda || fechaDeuda || numeroFacturaDeuda || descripcionDeuda) && (<button type="button" onClick={() => { setMontoDeuda(''); setFechaDeuda(''); setNumeroFacturaDeuda(''); setDescripcionDeuda('') }} style={S.btn('rgba(71,85,105,0.4)', { fontSize: '12px' })}>✕ Limpiar</button>)}
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAgregarPago}>
                  <div style={S.grid2}>
                    <div style={S.fieldWrap}><label style={S.label}>Monto *</label><input style={{ ...S.input, ...(montoPago ? S.inputFilled : {}) }} type="number" step="0.01" min="0.01" placeholder="Ej: 36900.00" value={montoPago} onChange={e => setMontoPago(e.target.value)} required /></div>
                    <div style={S.fieldWrap}><label style={S.label}>Fecha</label><input style={{ ...S.input, ...(fechaPago ? S.inputFilled : {}) }} type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} /></div>
                    <div style={S.fieldWrap}><label style={S.label}>N° Comprobante</label><input style={{ ...S.input, ...(numeroFacturaPago ? S.inputFilled : {}) }} type="text" placeholder="Ej: 00001-00012345" value={numeroFacturaPago} onChange={e => setNumeroFacturaPago(e.target.value)} /></div>
                    <div style={S.fieldWrap}><label style={S.label}>Concepto</label><input style={{ ...S.input, ...(conceptoPago ? S.inputFilled : {}) }} type="text" placeholder="Ej: Pago expensas enero" value={conceptoPago} onChange={e => setConceptoPago(e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={S.btn('#10b981')}>+ Registrar Pago</button>
                    {(montoPago || fechaPago || numeroFacturaPago || conceptoPago) && (<button type="button" onClick={() => { setMontoPago(''); setFechaPago(''); setNumeroFacturaPago(''); setConceptoPago('') }} style={S.btn('rgba(71,85,105,0.4)', { fontSize: '12px' })}>✕ Limpiar</button>)}
                  </div>
                </form>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(71,85,105,0.3)' }}>
            {[{ key: 'pagos', label: '💰 Ganancia', count: pagos.length }, { key: 'deudas', label: '📋 Deudas pendientes', count: deudas.length }].map(({ key, label, count }) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '10px 16px', background: tab === key ? 'rgba(59,130,246,0.2)' : 'transparent', border: 'none', borderBottom: tab === key ? '2px solid #3b82f6' : '2px solid transparent', color: tab === key ? '#3b82f6' : '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{label} ({count})</button>
            ))}
          </div>

          {tab === 'pagos' && (
            <div style={S.card}>
              <h4 style={{ margin: '0 0 18px', color: '#cbd5e1', fontSize: '15px' }}>Ganancias registradas ({pagos.length})</h4>
              {pagos.length === 0 ? <p style={{ color: '#475569', fontSize: '13px' }}>Sin pagos registrados.</p>
                : pagos.map(p => (
                  <div key={p.id} style={S.row}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#86efac', fontSize: '15px' }}>${fmt(p.monto)}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{p.fecha}{p.concepto ? ` · ${p.concepto}` : ''}{p.numero_factura ? ` · Comp: ${p.numero_factura}` : ''}</div>
                    </div>
                    <button
                      onClick={() => showConfirm('¿Eliminar este pago?', async () => {
                        try {
                          await window.api.eliminarPago(p.id)
                          flash('success', 'Pago eliminado')
                          await cargarDatos(Number(selectedBuildingId))
                        } catch (err) { flash('error', 'Error: ' + (err.message || err)) }
                      })}
                      style={{ ...S.btn('rgba(16,185,129,.12)'), color: '#86efac', padding: '6px 12px', fontSize: '12px' }}
                    >Eliminar</button>
                  </div>
                ))}
            </div>
          )}

          {tab === 'deudas' && (
            <div style={S.card}>
              <h4 style={{ margin: '0 0 18px', color: '#cbd5e1', fontSize: '15px' }}>Deudas pendientes ({deudas.length})</h4>
              {deudas.length === 0 ? <p style={{ color: '#475569', fontSize: '13px' }}>Sin deudas pendientes.</p>
                : deudas.map(d => (
                  <div key={d.id} style={S.row}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#fca5a5', fontSize: '15px' }}>${fmt(d.monto)}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{d.fecha}{d.descripcion ? ` · ${d.descripcion}` : ''}{d.numero_factura ? ` · Fac: ${d.numero_factura}` : ''}</div>
                    </div>
                    <button
                      onClick={() => showConfirm('¿Eliminar esta deuda?', async () => {
                        try {
                          await window.api.eliminarDeuda(d.id)
                          flash('success', 'Deuda eliminada')
                          await cargarDatos(Number(selectedBuildingId))
                        } catch (err) { flash('error', 'Error: ' + (err.message || err)) }
                      })}
                      style={{ ...S.btn('rgba(239,68,68,.12)'), color: '#fca5a5', padding: '6px 12px', fontSize: '12px' }}
                    >Eliminar</button>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function GestionEdificios() {
  const [edificios, setEdificios] = useState([])
  const [view, setView] = useState('home')
  const [errors, setErrors] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formAgregar, setFormAgregar] = useState({ direccion: '', ficha: '' })
  const [formBuscar, setFormBuscar] = useState({ direccion: '' })
  const [resultadoBusca, setResultadoBusca] = useState(null)
  const [filterCalle, setFilterCalle] = useState('')
  const [editForm, setEditForm] = useState({ direccion: '' })

  // Facturas
  const [years, setYears] = useState([])
  const [months, setMonths] = useState([])
  const [facturas, setFacturas] = useState([])
  const [newYearInput, setNewYearInput] = useState('')
  const [newMonthInput, setNewMonthInput] = useState('')
  const [selectedBuildingId, setSelectedBuildingId] = useState(null)
  const [selectedYearId, setSelectedYearId] = useState(null)
  const [selectedMonthId, setSelectedMonthId] = useState(null)
  const [editingInvoiceId, setEditingInvoiceId] = useState(null)
  const [editingInvoiceForm, setEditingInvoiceForm] = useState({ fecha: '', monto: '', descripcion: '' })
  const [comprobantes, setComprobantes] = useState([])

  // Fotos
  const [photoBuildingId, setPhotoBuildingId] = useState(null)
  const [buildingPhotos, setBuildingPhotos] = useState([])
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null)
  const [selectedPhotoForModal, setSelectedPhotoForModal] = useState(null)
  const [photoYearId, setPhotoYearId] = useState(null)
  const [photoMonthId, setPhotoMonthId] = useState(null)

  const [photoYears, setPhotoYears] = useState([])
  const [photoMonths, setPhotoMonths] = useState([])
  const photoInputRef = useRef(null)

  // Dashboard
  const [dashboardData, setDashboardData] = useState([])
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [selectedEdificios, setSelectedEdificios] = useState([])
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(null)
  const [busquedaDashboard, setBusquedaDashboard] = useState('')
  const [mostrarAutocompletado, setMostrarAutocompletado] = useState(false)
  const [sugerencias, setSugerencias] = useState([])
  const [previousView, setPreviousView] = useState('home')

  // Backup
  const [backupsList, setBackupsList] = useState([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [backupBusy, setBackupBusy] = useState(false)
  const [rutaInfoBackups, setRutaInfoBackups] = useState(null)

  // ── Confirm Modal (ÚNICO, en el componente raíz) ──────────────
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '' })
  const confirmCallbackRef = useRef(null)

  const showConfirm = (message, onConfirm) => {
    confirmCallbackRef.current = onConfirm
    setConfirmModal({ show: true, message })
  }

  const hideConfirm = () => {
    confirmCallbackRef.current = null
    setConfirmModal({ show: false, message: '' })
  }

  const handleConfirm = async () => {
    const callback = confirmCallbackRef.current
    if (!callback) {
      hideConfirm()
      return
    }
    // Clear and hide AFTER capturing the callback
    confirmCallbackRef.current = null
    setConfirmModal({ show: false, message: '' })
    try {
      await callback()
    } catch (err) {
      console.error('Confirm action error:', err)
    }
  }
  // ─────────────────────────────────────────────────────────────

  // Ficha
  const [fichaBuildingId, setFichaBuildingId] = useState(null)
  const [fichaTexto, setFichaTexto] = useState('')

  const cargarEdificios = async () => {
    try {
      if (window.api && window.api.obtenerEdificios) {
        const data = await window.api.obtenerEdificios()
        setEdificios(data)
      } else {
        setEdificios([])
      }
    } catch (err) { console.error(err) }
  }

  const cargarEdificiosConDeuda = async () => {}

  const cargarDashboardData = async () => {
    try {
      setLoadingDashboard(true)
      const edificiosConDatos = []
      for (const edificio of edificios) {
        try {
          const [pagosData, deudasData] = await Promise.all([
            window.api.obtenerPagos(edificio.id),
            window.api.obtenerDeudas(edificio.id)
          ])
          const totalPagos = pagosData?.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0) || 0
          const totalDeudas = deudasData?.reduce((sum, d) => sum + parseFloat(d.monto || 0), 0) || 0
          const saldo = totalPagos - totalDeudas
          const ultimoPago = pagosData?.length > 0 ? pagosData.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))[0] : null
          const ultimaDeuda = deudasData?.length > 0 ? deudasData.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))[0] : null
          const estado = saldo < 0 ? 'deudor' : 'al_dia'
          edificiosConDatos.push({ ...edificio, totalPagos, totalDeudas, saldo, cantidadPagos: pagosData?.length || 0, cantidadDeudas: deudasData?.length || 0, ultimoPago, ultimaDeuda, estado, seleccionado: selectedEdificios.includes(edificio.id) })
        } catch {
          edificiosConDatos.push({ ...edificio, totalPagos: 0, totalDeudas: 0, saldo: 0, cantidadPagos: 0, cantidadDeudas: 0, ultimoPago: null, ultimaDeuda: null, estado: 'error', seleccionado: selectedEdificios.includes(edificio.id) })
        }
      }
      setDashboardData(edificiosConDatos)
    } catch {
      mostrarMensaje('error', 'Error al cargar datos del dashboard')
    } finally {
      setLoadingDashboard(false)
    }
  }

  const toggleSeleccionEdificio = (edificioId) => {
    setSelectedEdificios(prev => prev.includes(edificioId) ? prev.filter(id => id !== edificioId) : [...prev, edificioId])
  }

  const seleccionarEstado = (estado) => setEstadoSeleccionado(estadoSeleccionado === estado ? null : estado)

  const edificiosPorEstado = estadoSeleccionado
    ? dashboardData.filter(e => e.estado === estadoSeleccionado)
    : dashboardData

  const edificiosFiltrados = edificiosPorEstado.filter(e => e.direccion.toLowerCase().includes(busquedaDashboard.toLowerCase()) || e.id.toString().includes(busquedaDashboard))

  const manejarBusqueda = (valor) => {
    setBusquedaDashboard(valor)
    if (valor.length > 0 && estadoSeleccionado) {
      const filtradas = edificiosPorEstado.filter(e => e.direccion.toLowerCase().includes(valor.toLowerCase()) || e.id.toString().includes(valor))
      setSugerencias(filtradas.slice(0, 5))
      setMostrarAutocompletado(true)
    } else {
      setSugerencias([])
      setMostrarAutocompletado(false)
    }
  }

  useEffect(() => { cargarEdificios() }, [])
  useEffect(() => { if (view === 'dashboard') cargarDashboardData() }, [view])

  const cargarRutasBackup = async () => {
    if (!window.api?.obtenerRutaCarpetaBackups) return
    try {
      const res = await window.api.obtenerRutaCarpetaBackups()
      if (res?.success) {
        setRutaInfoBackups({ backupsRoot: res.backupsRoot, facturasDir: res.facturasDir, appDataRoot: res.appDataRoot })
      } else setRutaInfoBackups(null)
    } catch { setRutaInfoBackups(null) }
  }

  const cargarListaBackups = async () => {
    if (!window.api?.obtenerBackups) return
    setLoadingBackups(true)
    try {
      const res = await window.api.obtenerBackups()
      if (res?.success) setBackupsList(res.backups || [])
      else mostrarMensaje('error', res?.error || 'No se pudo cargar la lista de backups')
    } catch { mostrarMensaje('error', 'Error al cargar backups') } finally { setLoadingBackups(false) }
  }

  useEffect(() => {
    if (view === 'backup') { cargarRutasBackup(); cargarListaBackups() }
  }, [view])

  const guardarCambios = async () => {
    if (!editingId) return
    const { direccion } = editForm
    if (!direccion) { mostrarMensaje('error', 'Dirección vacía'); return }
    try {
      setLoading(true)
      if (window.api && window.api.modificarEdificio) await window.api.modificarEdificio({ id: editingId, direccion })
      mostrarMensaje('success', '✓ Dirección modificada')
      setEditingId(null)
      setEditForm({ direccion: '' })
      await cargarEdificios()
    } catch { mostrarMensaje('error', 'Error al modificar') } finally { setLoading(false) }
  }

  const ejecutarBackupDefault = async () => {
    if (!window.api?.crearBackupDefault) return
    setBackupBusy(true)
    try {
      const res = await window.api.crearBackupDefault()
      if (res?.success) { mostrarMensaje('success', `Backup guardado en carpeta Backups (${res.date})`); await cargarListaBackups() }
      else mostrarMensaje('error', res?.error || 'No se pudo crear el backup')
    } catch (e) { mostrarMensaje('error', 'Error al crear backup: ' + (e.message || e)) } finally { setBackupBusy(false) }
  }

  const ejecutarBackupPersonalizado = async () => {
    if (!window.api?.seleccionarUbicacionBackup || !window.api?.crearBackupCustom) return
    setBackupBusy(true)
    try {
      const destino = await window.api.seleccionarUbicacionBackup()
      if (!destino || destino.canceled) { setBackupBusy(false); return }
      const res = await window.api.crearBackupCustom(destino.filePath)
      if (res?.success) { mostrarMensaje('success', 'Backup guardado en la ubicación elegida'); await cargarListaBackups() }
      else mostrarMensaje('error', res?.error || 'No se pudo guardar el backup')
    } catch (e) { mostrarMensaje('error', 'Error al guardar backup: ' + (e.message || e)) } finally { setBackupBusy(false) }
  }

  const abrirCarpetaBackup = async (filePath) => {
    if (!window.api?.abrirUbicacionArchivo) return
    try {
      const res = await window.api.abrirUbicacionArchivo(filePath)
      if (!res?.success) mostrarMensaje('error', res?.error || 'No se pudo abrir la carpeta')
    } catch { mostrarMensaje('error', 'No se pudo abrir la ubicación') }
  }

  const abrirCarpetaBackupsRaiz = async () => {
    if (!window.api?.abrirCarpetaBackups) return
    try {
      const res = await window.api.abrirCarpetaBackups()
      if (!res?.success) mostrarMensaje('error', res?.error || 'No se pudo abrir la carpeta Backups')
    } catch { mostrarMensaje('error', 'No se pudo abrir la carpeta Backups') }
  }

  const mostrarMensaje = (tipo, msg) => {
    if (tipo === 'error') { setErrors(msg); setTimeout(() => setErrors(''), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }
  }

  const guardarEdificio = async () => {
    const { direccion, ficha } = formAgregar
    if (!direccion || !direccion.trim()) { mostrarMensaje('error', 'La dirección es obligatoria'); return }
    try {
      setLoading(true)
      let nuevoEdificio
      if (window.api && window.api.agregarEdificio) nuevoEdificio = await window.api.agregarEdificio(direccion)
      if (ficha && ficha.trim() !== '') await window.api.guardarFicha({ id: nuevoEdificio.id, ficha })
      mostrarMensaje('success', '✓ Edificio agregado correctamente')
      setFormAgregar({ direccion: '', ficha: '' })
      await cargarEdificios()
    } catch (err) { mostrarMensaje('error', 'Error al guardar: ' + (err.message || err)) } finally { setLoading(false) }
  }

  const abrirFicha = async (buildingId) => {
    try {
      const ficha = await window.api.obtenerFicha(buildingId)
      setFichaBuildingId(buildingId)
      setFichaTexto(ficha || '')
      setPreviousView(view)
      setView('ficha')
    } catch { mostrarMensaje('error', 'Error al cargar ficha') }
  }

  const guardarFicha = async () => {
    if (!fichaBuildingId) return
    try {
      await window.api.guardarFicha({ id: fichaBuildingId, ficha: fichaTexto })
      mostrarMensaje('success', 'Ficha guardada correctamente')
    } catch { mostrarMensaje('error', 'Error al guardar ficha') }
  }

  const agregarAno = async () => {
    if (!selectedBuildingId) { mostrarMensaje('error', 'Seleccioná un edificio primero'); return }
    const year = parseInt(String(newYearInput).trim(), 10)
    if (Number.isNaN(year)) { mostrarMensaje('error', 'Año inválido'); return }
    if (year < 1900 || year > 3000) { mostrarMensaje('error', 'Año fuera de rango'); return }
    if (years.some((y) => Number(y.year) === year)) { mostrarMensaje('error', 'Ese año ya existe para este edificio'); return }
    try {
      await window.api.agregarYear({ buildingId: Number(selectedBuildingId), year })
      const ys = await window.api.obtenerYears(Number(selectedBuildingId))
      setYears(ys || [])
      setNewYearInput('')
      mostrarMensaje('success', 'Año agregado')
    } catch (err) {
      const msg = err && err.message ? err.message : String(err)
      if (msg.includes('UNIQUE') || msg.includes('unique')) mostrarMensaje('error', 'Ese año ya existe')
      else mostrarMensaje('error', 'Error al agregar año: ' + msg)
    }
  }

  const agregarMes = async () => {
    if (!selectedYearId || !newMonthInput) { mostrarMensaje('error', 'Seleccione año y nombre de mes'); return }
    try {
      await window.api.agregarMonth({ yearId: selectedYearId, mes: newMonthInput })
      const ms = await window.api.obtenerMonths(selectedYearId)
      setMonths(ms || [])
      setNewMonthInput('')
      mostrarMensaje('success', 'Mes agregado')
    } catch { mostrarMensaje('error', 'Error al agregar mes') }
  }

  const eliminarAno = (yearId) => {
    const year = years.find(y => y.id === yearId)
    const label = year?.year ?? yearId
    const buildingIdSnapshot = selectedBuildingId
    showConfirm(`¿Eliminar el año ${label} y todas sus facturas?`, async () => {
      try {
        await window.api.eliminarYear(yearId)
        const ys = await window.api.obtenerYears(buildingIdSnapshot)
        setYears(ys || [])
        setSelectedYearId(null)
        setMonths([])
        setFacturas([])
        mostrarMensaje('success', 'Año eliminado')
      } catch { mostrarMensaje('error', 'Error al eliminar año') }
    })
  }

  const handleReplacePDF = async (facturaId) => {
    try {
      const path = await window.api.seleccionarPDF()
      if (!path) return
      const res = await window.api.reemplazarFactura({ facturaId, sourcePath: path })
      if (res && res.success) {
        mostrarMensaje('success', 'PDF reemplazado')
        const fns = await window.api.obtenerFacturas(selectedMonthId)
        setFacturas(fns || [])
      } else mostrarMensaje('error', res.error || 'Error al reemplazar PDF')
    } catch { mostrarMensaje('error', 'Error al reemplazar PDF') }
  }

  const handleDropOnInvoice = async (facturaId, e) => {
    e.preventDefault()
    try {
      const dt = e.nativeEvent && e.nativeEvent.dataTransfer ? e.nativeEvent.dataTransfer : e.dataTransfer
      const file = dt && dt.files && dt.files[0]
      const sourcePath = file && (file.path || file.name)
      if (!sourcePath) { mostrarMensaje('error', 'No se obtuvo ruta del archivo'); return }
      const res = await window.api.reemplazarFactura({ facturaId, sourcePath })
      if (res && res.success) {
        mostrarMensaje('success', 'PDF reemplazado')
        const fns = await window.api.obtenerFacturas(selectedMonthId)
        setFacturas(fns || [])
      } else mostrarMensaje('error', res.error || 'Error al reemplazar via arrastre')
    } catch { mostrarMensaje('error', 'Error al procesar drop') }
  }

  const eliminarEdificio = (id) => {
    const edificio = edificios.find(e => e.id === id)
    const direccion = edificio?.direccion || 'Edificio desconocido'
    showConfirm(`¿Eliminar el edificio "${direccion}"?`, async () => {
      try {
        setLoading(true)
        if (window.api?.eliminarEdificio) await window.api.eliminarEdificio(id)
        mostrarMensaje('success', '✓ Edificio eliminado')
        await cargarEdificios()
      } catch { mostrarMensaje('error', 'Error al eliminar') } finally { setLoading(false) }
    })
  }

  const cargarFotosEdificio = async ({
    buildingId,
    yearId = null,
    monthId = null
  }) => {

    if (!buildingId) return

    try {

      const data =
        await window.api.obtenerFotosEdificio({
          buildingId,
          yearId,
          monthId
        })

      const fotosConPreview =
        await Promise.all(

          (data || []).map(async (photo) => {

            const preview =
              await window.api.obtenerImagenBase64(
                photo.file_path
              )

            return {
              ...photo,
              preview
            }

          })

        )

      setBuildingPhotos(fotosConPreview)

    } catch (err) {

      console.error(err)

    }
  }

  const subirFotoEdificio = async () => {

    if (!photoYearId) {
    mostrarMensaje(
      'error',
      'Seleccione un año'
    )
    return
  }

  if (!photoMonthId) {
    mostrarMensaje(
      'error',
      'Seleccione un mes'
    )
    return
  }

    if (!photoBuildingId) {
      mostrarMensaje(
        'error',
        'Seleccione un edificio'
      )
      return
    }

    if (!selectedPhotoFile) {
      mostrarMensaje(
        'error',
        'Seleccione una imagen'
      )
      return
    }

    try {

      const arrayBuffer =
        await selectedPhotoFile.arrayBuffer()

      const fileData = {
        name: selectedPhotoFile.name,
        data: Array.from(
          new Uint8Array(arrayBuffer)
        )
      }

      await window.api.guardarFotoEdificio({
        buildingId: photoBuildingId,
        yearId: photoYearId,
        monthId: photoMonthId,
        file: fileData
      })

      mostrarMensaje(
        'success',
        'Foto guardada'
      )

      await cargarFotosEdificio({
        buildingId: photoBuildingId,
        yearId: photoYearId,
        monthId: photoMonthId
      })

    } catch (err) {

      console.error(err)

      mostrarMensaje(
        'error',
        'Error al guardar foto'
      )

    } finally {

      setSelectedPhotoFile(null)

      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }

    }
  }

  const eliminarFotoEdificio = (id) => {

    const foto =
      buildingPhotos.find(
        f => f.id === id
      )

    const nombre =
      foto?.nombre ||
      foto?.name ||
      'foto'

    showConfirm(
      `¿Eliminar la foto "${nombre}"?`,
      async () => {

        try {

          await window.api.eliminarFoto(id)

          await cargarFotosEdificio({
            buildingId: photoBuildingId,
            yearId: photoYearId,
            monthId: photoMonthId
          })

          mostrarMensaje(
            'success',
            'Foto eliminada'
          )

          setSelectedPhotoForModal(null)

        } catch (err) {

          console.error(err)

          mostrarMensaje(
            'error',
            'Error al eliminar foto'
          )

        }

      }
    )
  }

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow: 'hidden', position: 'relative' },
    backdrop: { position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 },
    bgBlob1: { position: 'absolute', top: '80px', left: '40px', width: '288px', height: '288px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '9999px', filter: 'blur(80px)', animation: 'pulse 8s ease-in-out infinite' },
    bgBlob2: { position: 'absolute', bottom: '80px', right: '40px', width: '288px', height: '288px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: '9999px', filter: 'blur(80px)', animation: 'pulse 8s ease-in-out 1s infinite' },
    content: { position: 'relative', zIndex: 10 },
    header: { borderBottom: '1px solid rgba(71, 85, 105, 0.3)', backdropFilter: 'blur(10px)', background: 'rgba(15, 23, 42, 0.8)', padding: '24px 0', position: 'sticky', top: 0, zIndex: 50 },
    headerContent: { maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoBg: { padding: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', borderRadius: '12px' },
    notification: { position: 'fixed', top: '100px', right: '24px', padding: '16px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(10px)', border: '1px solid', zIndex: 50, animation: 'slideIn 0.3s ease-out' },
    main: { maxWidth: '1280px', margin: '0 auto', padding: '48px 24px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '48px' },
    card: { position: 'relative', padding: '32px', borderRadius: '16px', background: 'linear-gradient(135deg, #1e40af 0%, #0369a1 100%)', cursor: 'pointer', transition: 'all 0.3s ease', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '18px', overflow: 'hidden' },
    input: { width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(71, 85, 105, 0.5)', color: '#fff', fontSize: '14px', marginBottom: '16px', fontFamily: 'inherit' },
    button: { width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', color: 'white', border: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '12px' },
    buttonDanger: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }
  }

  const textareaStyle = {
    width: '100%',
    height: '400px',
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(2,6,23,0.6)',
    color: '#fff',
    border: '1px solid rgba(71,85,105,0.3)',
    resize: 'vertical',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  return (
    <div style={styles.container}>
      <div style={styles.backdrop}><div style={styles.bgBlob1}></div><div style={styles.bgBlob2}></div></div>
      <div style={styles.content}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.logo}>
              <div style={styles.logoBg}><Building2 size={28} /></div>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 4px 0', background: 'linear-gradient(to right, #60a5fa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BuildHub</h1>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Gestión de Edificios Premium</p>
              </div>
            </div>
            {view !== 'home' && <button onClick={() => { if (view === 'ficha' && previousView) setView(previousView); else setView('home') }} style={{ padding: '8px 24px', borderRadius: '8px', background: 'rgba(71, 85, 105, 0.5)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '500' }}>← Volver</button>}
          </div>
        </header>

        {errors && <div style={{ ...styles.notification, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5' }}><AlertCircle size={20} /><span>{errors}</span></div>}
        {success && <div style={{ ...styles.notification, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.5)', color: '#86efac' }}><CheckCircle size={20} /><span>{success}</span></div>}

        <main style={styles.main}>
          {view === 'home' && (
            <div>
              <h2 style={{ fontSize: '20px', marginBottom: '32px', color: '#cbd5e1' }}>¿Qué deseas hacer hoy?</h2>
              <div style={styles.grid}>
                {[
                  { icon: Plus, title: 'Agregar', desc: 'Nuevo edificio', color: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', view: 'agregar' },
                  { icon: Eye, title: 'Ver Todos', desc: 'Edificios registrados', color: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', view: 'mostrar' },
                  { icon: BarChart3, title: 'Panel de Control', desc: 'Dashboard general de edificios', color: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', view: 'dashboard' },
                  { icon: Search, title: 'Ver Facturas', desc: 'Facturas de edificios', color: 'linear-gradient(135deg, #06b6d4 0%, #0369a1 100%)', view: 'facturas' },
                  { icon: Wrench, title: 'Mantenimiento', desc: 'Gestión de mantenimiento', color: 'linear-gradient(135deg, #06d421 0%, #017531 100%)', view: 'mantenimiento' },
                  { icon: Image, title: 'Fotos', desc: 'Fotos del edificio', color: 'linear-gradient(135deg, #bd0c15 0%, #5e0111 100%)', view: 'fotos' },
                  { icon: DollarSign, title: 'Pagos', desc: 'Gestión de pagos', color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', view: 'pagos' },
                  { icon: DatabaseBackup, title: 'Backups', desc: 'Copias de seguridad de la base de datos', color: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)', view: 'backup' }
                ].map((item, i) => (
                  <button key={i} onClick={() => setView(item.view)} style={{ ...styles.card, background: item.color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
                    <item.icon size={40} />
                    <h3 style={{ fontSize: '20px', margin: 0 }}>{item.title}</h3>
                    <p style={{ fontSize: '12px', margin: 0, opacity: 0.9 }}>{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'agregar' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '32px' }}>➕ Agregar Nuevo Edificio</h2>
              <div style={{ padding: '32px', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(71, 85, 105, 0.3)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Dirección</label>
                <input type="text" placeholder="Ej: Av. Corrientes 1234" value={formAgregar.direccion} onChange={(e) => setFormAgregar({ ...formAgregar, direccion: e.target.value })} style={styles.input} />
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Ficha (opcional)</label>
                  <textarea
                    placeholder="Escriba aquí toda la información del edificio..."
                    value={formAgregar.ficha}
                    onChange={(e) => setFormAgregar({ ...formAgregar, ficha: e.target.value })}
                    style={{ ...styles.input, height: '150px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <button onClick={guardarEdificio} disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}>{loading ? 'Guardando...' : '💾 Guardar Dirección'}</button>
              </div>
            </div>
          )}

          {view === 'mostrar' && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>📋 Todos los Edificios</h2>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                <input placeholder="Filtro por dirección" value={filterCalle || ''} onChange={(e) => setFilterCalle(e.target.value)} style={{ ...styles.input, maxWidth: '320px' }} />
                <button onClick={() => { setFilterCalle(''); cargarEdificios() }} style={{ ...styles.button, width: '120px' }}>Reset</button>
              </div>
              {edificios.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#64748b' }}>
                  <Building2 size={64} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <p style={{ fontSize: '18px' }}>No hay edificios registrados</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                  {edificios.filter(ed => (filterCalle ? ed.direccion.toLowerCase().includes(filterCalle.toLowerCase()) : true)).map((ed) => (
                    <div key={ed.id} style={{ padding: '24px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(71, 85, 105, 0.3)' }}>
                      {editingId === ed.id ? (
                        <div>
                          <input value={editForm.direccion} onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })} style={{ ...styles.input, marginBottom: '8px' }} />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={guardarCambios} style={styles.button}>💾 Guardar</button>
                            <button onClick={() => { setEditingId(null); setEditForm({ direccion: '' }) }} style={{ ...styles.button, background: 'rgba(71,85,105,0.6)' }}>✖ Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#22d3ee', marginBottom: '16px' }}>🏢 {ed.direccion}</h4>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button onClick={() => { setEditingId(ed.id); setEditForm({ direccion: ed.direccion }) }} disabled={loading} style={{ ...styles.button, width: '120px' }}>✏️ Modificar</button>
                            <button onClick={() => abrirFicha(ed.id)} style={{ ...styles.button, width: '120px' }}>📄 Ficha</button>
                            <button onClick={() => eliminarEdificio(ed.id)} disabled={loading} style={{ ...styles.button, ...styles.buttonDanger, marginTop: '0', width: '140px' }}>🗑️ Eliminar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'facturas' && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>📄 Ver Facturas de Edificios</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>

                {/* ── PANEL IZQUIERDO ─────────────────────────── */}
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(71,85,105,0.3)' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Seleccionar Edificio</label>
                  <select
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '8px', borderRadius: '8px', background: 'rgba(2,6,23,0.6)', color: '#fff', border: '1px solid rgba(71,85,105,0.3)' }}
                    value={selectedBuildingId || ''}
                    onChange={async (e) => {
                      const id = e.target.value ? parseInt(e.target.value) : null
                      setSelectedBuildingId(id)
                      setYears([]); setMonths([]); setFacturas([]); setComprobantes([])
                      setSelectedYearId(null); setSelectedMonthId(null)
                      if (id && window.api?.obtenerYears) {
                        const ys = await window.api.obtenerYears(id)
                        setYears(ys || [])
                      }
                    }}
                  >
                    <option value="">-- Elija edificio --</option>
                    {edificios.map(ed => (<option key={ed.id} value={ed.id}>{ed.direccion}</option>))}
                  </select>

                  {selectedBuildingId && (
                    <button
                      onClick={() => abrirFicha(selectedBuildingId)}
                      style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '8px', background: 'linear-gradient(90deg,#10b981,#059669)', color: '#001', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      🏢 Ver ficha del edificio
                    </button>
                  )}

                  {/* AÑOS */}
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Años</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {years.length === 0 && <div style={{ color: '#94a3b8' }}>Seleccione un edificio para ver años</div>}
                      {years.map(y => (
                        <div key={y.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              onClick={async () => {
                                if (selectedYearId === y.id) {
                                  setSelectedYearId(null); setSelectedMonthId(null)
                                  setMonths([]); setFacturas([]); setComprobantes([])
                                } else {
                                  setSelectedYearId(y.id); setSelectedMonthId(null)
                                  setFacturas([]); setComprobantes([])
                                  if (window.api?.obtenerMonths) {
                                    const ms = await window.api.obtenerMonths(y.id)
                                    setMonths(ms || [])
                                  }
                                }
                              }}
                              style={{ padding: '8px 12px', textAlign: 'center', flex: 1, borderRadius: '8px', background: selectedYearId === y.id ? 'linear-gradient(90deg,#06b6d4,#3b82f6)' : 'rgba(2,6,23,0.2)', color: selectedYearId === y.id ? '#001' : '#cbd5e1', border: 'none', cursor: 'pointer' }}
                            >{y.year}</button>
                            <button
                              onClick={() => eliminarAno(y.id)}
                              style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.6)', color: '#fca5a5', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                            >✕</button>
                          </div>
                          {selectedYearId === y.id && (
                            <RangoPicker
                              years={years}
                              months={months}
                              selectedYearId={selectedYearId}
                              selectedBuildingId={selectedBuildingId}
                              mostrarMensaje={mostrarMensaje}
                              obtenerMonths={window.api.obtenerMonths}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        placeholder="Nuevo año"
                        value={newYearInput}
                        onChange={(e) => setNewYearInput(e.target.value)}
                        style={{ ...styles.input, marginBottom: 0 }}
                      />
                      <button onClick={agregarAno} style={{ ...styles.button, width: '120px' }}>➕ Año</button>
                    </div>
                  </div>

                  {/* MESES */}
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Meses</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {months.length === 0 && <div style={{ color: '#94a3b8' }}>Seleccione un año</div>}
                      {months.map(m => (
                        <div key={m.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={async () => {
                              if (selectedMonthId === m.id) {
                                setSelectedMonthId(null); setFacturas([]); setComprobantes([])
                              } else {
                                setSelectedMonthId(m.id)
                                if (window.api?.obtenerFacturas) {
                                  const f = await window.api.obtenerFacturas(m.id)
                                  setFacturas(f || [])
                                }
                                if (window.api?.obtenerComprobantes) {
                                  const c = await window.api.obtenerComprobantes(m.id)
                                  setComprobantes(c || [])
                                }
                              }
                            }}
                            style={{ padding: '8px 12px', borderRadius: '8px', background: selectedMonthId === m.id ? 'linear-gradient(90deg,#06b6d4,#3b82f6)' : 'rgba(2,6,23,0.2)', color: selectedMonthId === m.id ? '#001' : '#cbd5e1', border: 'none', cursor: 'pointer' }}
                          >{m.mes}</button>
                          <button
                            onClick={() => {
                              const yearIdSnap = selectedYearId
                              showConfirm(`¿Eliminar mes ${m.mes}?`, async () => {
                                await window.api.eliminarMonth(m.id)
                                const ms = await window.api.obtenerMonths(yearIdSnap)
                                setMonths(ms || [])
                                setSelectedMonthId(null)
                                setFacturas([]); setComprobantes([])
                                mostrarMensaje('success', 'Mes eliminado')
                              })
                            }}
                            style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.6)', color: '#fca5a5', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <select
                        value={newMonthInput}
                        onChange={(e) => setNewMonthInput(e.target.value)}
                        style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                      >
                        <option value="">Selecciona mes</option>
                        {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
                          .filter(mn => !months.some(m => m.mes === mn))
                          .map(mn => (<option key={mn} value={mn}>{mn}</option>))}
                      </select>
                      <button onClick={agregarMes} style={{ ...styles.button, width: '120px' }}>➕ Mes</button>
                    </div>
                  </div>
                </div>

                {/* ── PANEL DERECHO ─────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* FACTURAS */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#cbd5e1' }}>📄 Facturas</span>
                      <div style={{ marginLeft: 'auto' }}>
                        <button
                          onClick={async () => {
                            if (!selectedMonthId) { mostrarMensaje('error', 'Seleccione un mes'); return }
                            try {
                              const p = await window.api.seleccionarPDF()
                              if (!p) return
                              await window.api.agregarFactura({ monthId: selectedMonthId, filePath: p, fecha: null, monto: null, descripcion: null })
                              mostrarMensaje('success', 'Factura agregada')
                              const f = await window.api.obtenerFacturas(selectedMonthId)
                              setFacturas(f || [])
                            } catch { mostrarMensaje('error', 'Error al agregar factura') }
                          }}
                          style={{ ...styles.button, width: '200px' }}
                        >➕ Agregar Factura</button>
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(2,6,23,0.5)', border: '1px solid rgba(71,85,105,0.2)', minHeight: '100px' }}>
                      {facturas.length === 0
                        ? <div style={{ color: '#94a3b8' }}>No hay facturas para este mes</div>
                        : <div style={{ display: 'grid', gap: '12px' }}>
                            {facturas.map(f => (
                              <div
                                key={f.id}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDropOnInvoice(f.id, e)}
                                style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', gap: '12px' }}
                              >
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '700' }}>{(f.file_path || '').replace(/.*[\\/]/, '')}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={async () => { const res = await window.api.abrirPDF(f.file_path); if (!res.success) mostrarMensaje('error', res.error || 'No se pudo abrir') }}
                                    style={{ ...styles.button, width: '140px' }}
                                  >📂 Abrir</button>
                                  <button onClick={() => handleReplacePDF(f.id)} style={{ ...styles.button, width: '200px' }}>🔁 Reemplazar / Modificar</button>
                                  <button
                                    onClick={() => showConfirm('¿Eliminar esta factura?', async () => {
                                      try {
                                        await window.api.eliminarFactura(f.id)
                                        mostrarMensaje('success', 'Factura eliminada')
                                        const fns = await window.api.obtenerFacturas(selectedMonthId)
                                        setFacturas(fns || [])
                                      } catch { mostrarMensaje('error', 'Error al eliminar factura') }
                                    })}
                                    style={{ ...styles.button, width: '120px', background: 'rgba(239,68,68,0.8)' }}
                                  >🗑️ Eliminar</button>
                                </div>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  </div>

                  {/* COMPROBANTES */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#cbd5e1' }}>🧾 Comprobantes</span>
                      <div style={{ marginLeft: 'auto' }}>
                        <button
                          onClick={async () => {
                            if (!selectedMonthId) { mostrarMensaje('error', 'Seleccione un mes'); return }
                            try {
                              const p = await window.api.seleccionarPDF()
                              if (!p) return
                              await window.api.agregarComprobante({ monthId: selectedMonthId, filePath: p })
                              mostrarMensaje('success', 'Comprobante agregado')
                              const c = await window.api.obtenerComprobantes(selectedMonthId)
                              setComprobantes(c || [])
                            } catch { mostrarMensaje('error', 'Error al agregar comprobante') }
                          }}
                          style={{ ...styles.button, width: '220px', background: 'linear-gradient(90deg,#0891b2,#0e7490)' }}
                        >➕ Agregar Comprobante</button>
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(2,6,23,0.5)', border: '1px solid rgba(8,145,178,0.25)', minHeight: '100px' }}>
                      {comprobantes.length === 0
                        ? <div style={{ color: '#94a3b8' }}>No hay comprobantes para este mes</div>
                        : <div style={{ display: 'grid', gap: '12px' }}>
                            {comprobantes.map(c => (
                              <div
                                key={c.id}
                                style={{ padding: '12px', borderRadius: '8px', background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}
                              >
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '700', color: '#e2e8f0' }}>{(c.file_path || '').replace(/.*[\\/]/, '')}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={async () => { const res = await window.api.abrirPDF(c.file_path); if (!res.success) mostrarMensaje('error', res.error || 'No se pudo abrir') }}
                                    style={{ ...styles.button, width: '140px' }}
                                  >📂 Abrir</button>
                                  <button
                                    onClick={() => showConfirm('¿Eliminar este comprobante?', async () => {
                                      try {
                                        await window.api.eliminarComprobante(c.id)
                                        mostrarMensaje('success', 'Comprobante eliminado')
                                        const cs = await window.api.obtenerComprobantes(selectedMonthId)
                                        setComprobantes(cs || [])
                                      } catch { mostrarMensaje('error', 'Error al eliminar comprobante') }
                                    })}
                                    style={{ ...styles.button, width: '120px', background: 'rgba(239,68,68,0.8)' }}
                                  >🗑️ Eliminar</button>
                                </div>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {view === 'mantenimiento' && (
            <MantenimientoView
              edificios={edificios}
              mostrarMensaje={mostrarMensaje}
              showConfirm={showConfirm}
            />
          )}

          {view === 'fotos' && (
  <div>
    <h2
      style={{
        fontSize: '28px',
        fontWeight: 'bold',
        marginBottom: '16px'
      }}
    >
      🖼️ Fotos de Edificios
    </h2>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '20px'
      }}
    >
      {/* PANEL IZQUIERDO */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(30,41,59,0.6)',
          border: '1px solid rgba(71,85,105,0.3)'
        }}
      >
        {/* EDIFICIO */}
        <label
          style={{
            fontSize: '12px',
            color: '#cbd5e1'
          }}
        >
          Seleccionar Edificio
        </label>

        <select
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px',
            marginTop: '8px',
            borderRadius: '8px',
            background: 'rgba(2,6,23,0.6)',
            color: '#fff',
            border: '1px solid rgba(71,85,105,0.3)'
          }}
          value={photoBuildingId || ''}
          onChange={async (e) => {
            const id = e.target.value
              ? parseInt(e.target.value)
              : null

            setPhotoBuildingId(id)
            setBuildingPhotos([])

            setPhotoYearId(null)
            setPhotoMonthId(null)
            setPhotoMonths([])

            if (id) {
              const years =
                await window.api.obtenerYears(id)

              setPhotoYears(years)

              await cargarFotosEdificio({
                buildingId: id
              })
            }
          }}
        >
          <option value="">
            -- Elija edificio --
          </option>

          {edificios.map(ed => (
            <option
              key={ed.id}
              value={ed.id}
            >
              {ed.direccion}
            </option>
          ))}
        </select>

        {/* AÑO */}
        {photoBuildingId && (
          <>
            <label
              style={{
                fontSize: '12px',
                color: '#cbd5e1',
                marginTop: '16px',
                display: 'block'
              }}
            >
              Año
            </label>

            <select
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px',
                marginTop: '8px',
                borderRadius: '8px',
                background: 'rgba(2,6,23,0.6)',
                color: '#fff',
                border:
                  '1px solid rgba(71,85,105,0.3)'
              }}
              value={photoYearId || ''}
              onChange={async (e) => {
                const id = e.target.value
                  ? parseInt(e.target.value)
                  : null

                setPhotoYearId(id)
                setPhotoMonthId(null)

                if (id) {
                  const months =
                    await window.api.obtenerMonths(id)

                  setPhotoMonths(months)
                } else {
                  setPhotoMonths([])
                }

                await cargarFotosEdificio({
                  buildingId: photoBuildingId,
                  yearId: id,
                  monthId: null
                })
              }}
            >
              <option value="">
                -- Año --
              </option>

              {photoYears.map(y => (
                <option
                  key={y.id}
                  value={y.id}
                >
                  {y.year}
                </option>
              ))}
            </select>
          </>
        )}

        {/* MES */}
        {photoYearId && (
          <>
            <label
              style={{
                fontSize: '12px',
                color: '#cbd5e1',
                marginTop: '16px',
                display: 'block'
              }}
            >
              Mes
            </label>

            <select
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px',
                marginTop: '8px',
                borderRadius: '8px',
                background: 'rgba(2,6,23,0.6)',
                color: '#fff',
                border:
                  '1px solid rgba(71,85,105,0.3)'
              }}
              value={photoMonthId || ''}
              onChange={async (e) => {
                const id = e.target.value
                  ? parseInt(e.target.value)
                  : null

                setPhotoMonthId(id)

                await cargarFotosEdificio({
                  buildingId: photoBuildingId,
                  yearId: photoYearId,
                  monthId: id
                })
              }}
            >
              <option value="">
                -- Mes --
              </option>

              {photoMonths.map(m => (
                <option
                  key={m.id}
                  value={m.id}
                >
                  {m.mes}
                </option>
              ))}
            </select>
          </>
        )}

        {/* SUBIR FOTO */}
        {photoBuildingId && (
          <div style={{ marginTop: '20px' }}>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) =>
                setSelectedPhotoFile(
                  e.target.files?.[0] || null
                )
              }
              style={{
                marginBottom: '12px',
                color: '#fff'
              }}
            />

            <button
              onClick={subirFotoEdificio}
              style={styles.button}
            >
              💾 Guardar Foto
            </button>
          </div>
        )}
      </div>

      {/* GALERIA */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(2,6,23,0.5)',
          border:
            '1px solid rgba(71,85,105,0.2)'
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: '#cbd5e1'
          }}
        >
          Galería
        </h3>

        {!photoBuildingId ? (
          <div style={{ color: '#94a3b8' }}>
            Seleccione un edificio
          </div>
        ) : buildingPhotos.length === 0 ? (
          <div style={{ color: '#94a3b8' }}>
            No hay fotos para este filtro
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, 160px)',
              gap: '16px'
            }}
          >
            {buildingPhotos.map(photo => (
              <div
                key={photo.id}
                style={{
                  background:
                    'rgba(15,23,42,0.6)',
                  padding: '8px',
                  borderRadius: '8px'
                }}
              >
                <img
                  src={photo.preview}
                  alt=""
                  onClick={() =>
                    setSelectedPhotoForModal(
                      photo
                    )
                  }
                  style={{
                    width: '100%',
                    height: '140px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                />

                <button
                  onClick={() =>
                    eliminarFotoEdificio(
                      photo.id
                    )
                  }
                  style={{
                    ...styles.button,
                    ...styles.buttonDanger,
                    marginTop: '8px',
                    width: '100%'
                  }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}

          {view === 'ficha' && (
            <div style={{ maxWidth: '900px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>📄 Ficha del Edificio</h2>
              {fichaBuildingId && (
                <div style={{ marginBottom: '12px', padding: '8px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '13px', color: '#93c5fd' }}>
                  🏢 {edificios.find(e => e.id === fichaBuildingId)?.direccion || `Edificio #${fichaBuildingId}`}
                </div>
              )}
              <div style={{ padding: '24px', borderRadius: '12px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(71,85,105,0.3)' }}>
                <textarea
                  value={fichaTexto}
                  onChange={(e) => setFichaTexto(e.target.value)}
                  style={textareaStyle}
                  placeholder="Escribí aquí la información del edificio..."
                  spellCheck={true}
                />
                <button onClick={guardarFicha} style={{ ...styles.button, marginTop: '16px', width: '200px' }}>💾 Guardar Ficha</button>
              </div>
            </div>
          )}

          {view === 'pagos' && (
            <PagosView
              edificios={edificios}
              cargarEdificiosConDeuda={cargarEdificiosConDeuda}
              mostrarMensaje={mostrarMensaje}
              showConfirm={showConfirm}
            />
          )}

          {view === 'backup' && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '12px' }}>Backups · Base de datos</h2>
              <div style={{ marginBottom: '20px', padding: '18px', borderRadius: '12px', background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(71,85,105,0.45)' }}>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px', lineHeight: 1.5 }}>
                  Los PDF de facturas están en <code style={{ color: '#7dd3fc' }}>facturas_guardadas</code>. Los backups de la base van en <code style={{ color: '#5eead4' }}>Backups</code>, <strong style={{ color: '#e2e8f0' }}>en la misma carpeta de la aplicación</strong> (al lado de la base <code style={{ color: '#7dd3fc' }}>edificios.db</code> y del config). Estructura: <code style={{ color: '#5eead4' }}>Backups / YYYY-MM-DD / edificios.db</code>.
                </div>
                {rutaInfoBackups ? (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Carpeta de facturas (referencia)</div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1', wordBreak: 'break-all', fontFamily: 'Consolas, ui-monospace, monospace', marginBottom: '14px' }}>{rutaInfoBackups.facturasDir}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Carpeta Backups (acá se guardan)</div>
                    <div style={{ fontSize: '12px', color: '#5eead4', wordBreak: 'break-all', fontFamily: 'Consolas, ui-monospace, monospace', marginBottom: '14px' }}>{rutaInfoBackups.backupsRoot}</div>
                    <button type="button" onClick={abrirCarpetaBackupsRaiz} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      <FolderOpen size={18} /> Abrir carpeta Backups en el Explorador
                    </button>
                  </>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Obteniendo rutas…</span>
                )}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '28px', maxWidth: '780px' }}>
                Con los botones de abajo generás la copia. Si ya respaldaste hoy, el archivo <code style={{ color: '#5eead4' }}>edificios.db</code> de esa fecha se reemplaza. El segundo botón abre el diálogo de Windows para guardar una copia donde quieras.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
                <button type="button" disabled={backupBusy} onClick={ejecutarBackupDefault} style={{ ...styles.button, width: 'auto', minWidth: '260px', marginBottom: 0, opacity: backupBusy ? 0.65 : 1 }}>
                  {backupBusy ? 'Procesando…' : 'Guardar en ubicación por defecto (Backups/)'}
                </button>
                <button type="button" disabled={backupBusy} onClick={ejecutarBackupPersonalizado} style={{ ...styles.button, width: 'auto', minWidth: '280px', marginBottom: 0, background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', opacity: backupBusy ? 0.65 : 1 }}>
                  Elegir carpeta / archivo con el explorador…
                </button>
              </div>
              <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(71, 85, 105, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#e2e8f0' }}>Backups en carpeta por defecto</h3>
                  <button type="button" onClick={() => { cargarRutasBackup(); cargarListaBackups() }} disabled={loadingBackups} style={{ ...styles.button, width: 'auto', padding: '10px 18px', marginBottom: 0, fontSize: '13px' }}>
                    {loadingBackups ? 'Actualizando…' : 'Actualizar lista'}
                  </button>
                </div>
                {loadingBackups && backupsList.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px' }}>Cargando…</p>
                ) : backupsList.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px' }}>Todavía no hay backups en <strong style={{ color: '#94a3b8' }}>Backups</strong>. Creá uno con los botones de arriba.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(71,85,105,0.4)' }}>
                          <th style={{ padding: '10px 8px' }}>Archivo</th>
                          <th style={{ padding: '10px 8px' }}>Fecha carpeta</th>
                          <th style={{ padding: '10px 8px' }}>Modificación</th>
                          <th style={{ padding: '10px 8px' }}>Tamaño</th>
                          <th style={{ padding: '10px 8px', width: '140px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {backupsList.map((b) => (
                          <tr key={b.path} style={{ borderBottom: '1px solid rgba(71,85,105,0.2)', color: '#e2e8f0' }}>
                            <td style={{ padding: '12px 8px', fontWeight: 600 }}>{b.name}</td>
                            <td style={{ padding: '12px 8px', color: '#cbd5e1' }}>{b.date}</td>
                            <td style={{ padding: '12px 8px', color: '#94a3b8', fontSize: '13px' }}>{b.mtime ? formatFecha(b.mtime) : '—'}</td>
                            <td style={{ padding: '12px 8px', color: '#94a3b8' }}>{formatTamanoBytes(b.size)}</td>
                            <td style={{ padding: '12px 8px' }}>
                              <button type="button" onClick={() => abrirCarpetaBackup(b.path)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'rgba(59, 130, 246, 0.25)', color: '#93c5fd', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                <FolderOpen size={16} /> Ubicación
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'dashboard' && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>📊 Panel de Control de Edificios</h2>
              <p style={{ marginBottom: '20px', color: '#94a3b8', maxWidth: '720px' }}>En este panel verás el saldo y las cifras totales de cada edificio. Filtra por <strong>Al Día</strong> o <strong>Deudas</strong> para ver solo esos edificios.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                {[
                  { key: null, label: 'Todos', count: dashboardData.length },
                  { key: 'al_dia', label: 'Al Día', count: dashboardData.filter(e => e.estado === 'al_dia').length },
                  { key: 'deudor', label: 'Deudas', count: dashboardData.filter(e => e.estado === 'deudor').length }
                ].map((buttonData) => (
                  <button
                    key={buttonData.key || 'todos'}
                    onClick={() => setEstadoSeleccionado(buttonData.key)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: estadoSeleccionado === buttonData.key ? '1px solid #38bdf8' : '1px solid rgba(71,85,105,0.5)',
                      background: estadoSeleccionado === buttonData.key ? 'rgba(14,165,233,0.15)' : 'rgba(15,23,42,0.6)',
                      color: estadoSeleccionado === buttonData.key ? '#38bdf8' : '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {buttonData.label} ({buttonData.count})
                  </button>
                ))}
              </div>
              {loadingDashboard ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando datos del dashboard...</div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {edificiosFiltrados.map(edificio => (
                    <div key={edificio.id} style={{ padding: '24px', borderRadius: '16px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(71,85,105,0.3)', borderLeft: `4px solid ${edificio.estado === 'al_dia' ? '#10b981' : '#ef4444'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input type="checkbox" checked={edificio.seleccionado} onChange={() => toggleSeleccionEdificio(edificio.id)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                          <div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#e2e8f0' }}>🏢 {edificio.direccion}</h3>
                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: edificio.estado === 'al_dia' ? '#10b98120' : '#ef444420', color: edificio.estado === 'al_dia' ? '#86efac' : '#fca5a5' }}>
                              {edificio.estado === 'al_dia' ? '✅ Al Día' : '❌ Con deuda'}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: edificio.saldo >= 0 ? '#86efac' : '#fca5a5' }}>${edificio.saldo.toLocaleString('es-AR')}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{edificio.saldo >= 0 ? 'Saldo a favor' : 'Saldo adeudado'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                        {[['$' + edificio.totalPagos.toLocaleString('es-AR'), 'Total Pagado', '#86efac'], ['$' + edificio.totalDeudas.toLocaleString('es-AR'), 'Total Adeudado', '#fca5a5'], [edificio.cantidadPagos, 'Pagos', '#e2e8f0'], [edificio.cantidadDeudas, 'Deudas', '#e2e8f0']].map(([val, lbl, col], i) => (
                          <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: col, marginBottom: '4px' }}>{val}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {edificio.ultimoPago && (
                          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Último Pago</div>
                            <div style={{ fontSize: '13px', color: '#86efac', fontWeight: '600' }}>${edificio.ultimoPago.monto} - {formatFecha(edificio.ultimoPago.fecha)}</div>
                          </div>
                        )}
                        {edificio.ultimaDeuda && (
                          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Última Deuda</div>
                            <div style={{ fontSize: '13px', color: '#fca5a5', fontWeight: '600' }}>${edificio.ultimaDeuda.monto} - {formatFecha(edificio.ultimaDeuda.fecha)}</div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <button onClick={() => abrirFicha(edificio.id)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(30,41,59,0.85)', color: '#e2e8f0', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>📄 Ficha</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal foto */}
          {selectedPhotoForModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 9999 }}>
              <img src={selectedPhotoForModal.preview} style={{ maxWidth: '90vw', maxHeight: '75vh', borderRadius: '12px', objectFit: 'contain' }} alt="Foto ampliada" />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setSelectedPhotoForModal(null)} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>✓ Cerrar</button>
                <button onClick={() => eliminarFotoEdificio(selectedPhotoForModal.id)} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>🗑️ Eliminar</button>
              </div>
            </div>
          )}

          {/* ── Confirm Modal ÚNICO (raíz) ── */}
          {confirmModal.show && (
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
              onMouseDown={e => { if (e.target === e.currentTarget) hideConfirm() }}
            >
              <div
                style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }}
                onMouseDown={e => e.stopPropagation()}
              >
                <div style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '20px' }}>{confirmModal.message}</div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={e => { e.stopPropagation(); hideConfirm() }}
                    style={{ padding: '10px 20px', background: 'rgba(71,85,105,0.5)', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  >Cancelar</button>
                  <button
                    onClick={e => { e.stopPropagation(); handleConfirm() }}
                    style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >Confirmar</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}