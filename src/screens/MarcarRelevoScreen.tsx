import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, SectionList, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { api, ReporteRow, PersonaLite } from '../services/api';

const AZUL = '#0c2f5a';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function fechaLegible(s: string): string {
  const d = fromISO(s);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// Orden por el número de la zona (Zona 1, 2, 3…); las sin número van al final.
function zonaOrden(z: string): number {
  const m = z.match(/\d+/);
  return m ? parseInt(m[0], 10) : 9999;
}

type Estado = 'ASISTIO' | 'FALTO' | '';

export default function MarcarRelevoScreen() {
  const [fecha, setFecha] = useState<string>(toISO(new Date()));
  const [rows, setRows] = useState<ReporteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroTurno, setFiltroTurno] = useState<string>('Diurno');
  const [filtroZona, setFiltroZona] = useState<string>('');  // '' = Todas

  // Modal de reemplazo
  const [reempTarget, setReempTarget] = useState<ReporteRow | null>(null);
  const [busPersona, setBusPersona] = useState<string>('');
  const [personas, setPersonas] = useState<PersonaLite[]>([]);
  const [buscandoPersona, setBuscandoPersona] = useState(false);

  const cargar = useCallback(async (f: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getReporteDia(f);
      setRows(res?.results || []);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el personal');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(fecha); }, [fecha, cargar]);

  const cambiarDia = (delta: number) => {
    const d = fromISO(fecha);
    d.setDate(d.getDate() + delta);
    setFecha(toISO(d));
  };

  const keyOf = (r: ReporteRow) =>
    r.asignacion_id != null ? `a${r.asignacion_id}` : `s${r.sacafranco_fila_id}`;

  const marcable = (r: ReporteRow) => r.asignacion_id != null || r.sacafranco_fila_id != null;

  const marcar = async (row: ReporteRow, destino: Estado) => {
    if (!marcable(row)) return;
    const actual = (row.estado_asistencia || '').toUpperCase() as Estado;
    const nuevo: Estado = actual === destino ? '' : destino;  // segundo toque = quitar
    const color = nuevo === 'ASISTIO' ? '#fff8b3' : (nuevo === 'FALTO' ? '#ffb3b3' : '');
    const k = keyOf(row);
    const prev = row.estado_asistencia;

    // Actualización optimista.
    setRows(rs => rs.map(r => (keyOf(r) === k ? { ...r, estado_asistencia: nuevo } : r)));
    setSavingKey(k);
    try {
      if (row.asignacion_id != null) {
        await api.marcarAsistencia(row.asignacion_id, {
          estado_asistencia: nuevo || null,
          estado: 'TURNO',
          reemplazo_id: null,
          descripcion: null,
          hueca: false,
          hueca_motivo: null,
          row_color: color,
          fecha,
        });
      } else {
        await api.marcarSacafrancoAsistencia(row.sacafranco_fila_id!, {
          estado_asistencia: nuevo || null,
          row_color: color,
          fecha,
        });
      }
    } catch (e: any) {
      // Revertir si falla.
      setRows(rs => rs.map(r => (keyOf(r) === k ? { ...r, estado_asistencia: prev } : r)));
      Alert.alert('No se pudo guardar', e?.message || 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSavingKey(null);
    }
  };

  // --- Reemplazo (mover a otra persona a cubrir este puesto) ---
  const abrirReemplazo = (row: ReporteRow) => {
    if (!marcable(row)) return;
    setReempTarget(row);
    setBusPersona('');
    setPersonas([]);
  };

  const buscarPersona = async (texto: string) => {
    setBusPersona(texto);
    if (texto.trim().length < 2) { setPersonas([]); return; }
    setBuscandoPersona(true);
    try {
      const res = await api.buscarPersonas(texto.trim());
      setPersonas((res || []).slice(0, 40));
    } catch {
      setPersonas([]);
    } finally {
      setBuscandoPersona(false);
    }
  };

  const guardarReemplazo = async (row: ReporteRow, personaId: number | null, nombre: string) => {
    const k = keyOf(row);
    const prev = { id: row.reemplazo_id, nom: row.reemplazo, estado: row.estado };
    const nuevoEstado = personaId ? 'ADICIONAL' : 'TURNO';
    // Optimista
    setRows(rs => rs.map(r => (keyOf(r) === k ? { ...r, reemplazo_id: personaId, reemplazo: nombre, estado: nuevoEstado } : r)));
    setReempTarget(null);
    setSavingKey(k);
    try {
      const payload = { estado: nuevoEstado, reemplazo_id: personaId, fecha };
      const res = row.asignacion_id != null
        ? await api.marcarAsistencia(row.asignacion_id, payload)
        : await api.marcarSacafrancoAsistencia(row.sacafranco_fila_id!, payload);
      setRows(rs => rs.map(r => (keyOf(r) === k
        ? { ...r, reemplazo_id: res.reemplazo_id ?? null, reemplazo: res.reemplazo ?? '', estado: res.estado ?? nuevoEstado }
        : r)));
    } catch (e: any) {
      setRows(rs => rs.map(r => (keyOf(r) === k ? { ...r, reemplazo_id: prev.id, reemplazo: prev.nom, estado: prev.estado } : r)));
      Alert.alert('No se pudo guardar el reemplazo', e?.message || 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSavingKey(null);
    }
  };

  const elegirReemplazo = (persona: PersonaLite) => {
    if (!reempTarget) return;
    guardarReemplazo(reempTarget, persona.id, `${persona.nombres} ${persona.apellidos}`.trim());
  };

  const quitarReemplazo = (row: ReporteRow) => guardarReemplazo(row, null, '');

  // Jornada: Diurno incluye Tarde y Veinticuatro; Nocturno incluye Veinticuatro.
  const pasaJornada = (r: ReporteRow) => {
    const t = r.turno || '';
    return filtroTurno === 'Nocturno'
      ? (t === 'Nocturno' || t === 'Veinticuatro')
      : (t === 'Diurno' || t === 'Tarde' || t === 'Veinticuatro');
  };
  // Filtro por ZONA ('' = todas).
  const pasaZona = (r: ReporteRow) => !filtroZona || (r.zona_titulo || '').trim() === filtroZona;
  // Buscar por cliente/instalación o por apellidos y nombres.
  const q = busqueda.trim().toLowerCase();
  const pasaBusqueda = (r: ReporteRow) => !q ||
    [r.instalacion_nombre, r.cliente, r.nombre_apellidos, r.codigo, r.puesto, r.puesto_tipo]
      .some(c => (c || '').toLowerCase().includes(q));

  const visibles = rows.filter(r => pasaJornada(r) && pasaZona(r) && pasaBusqueda(r));

  // Zonas disponibles (para el selector Todas / zona específica).
  const zonasDisponibles = (() => {
    const set = new Set<string>();
    for (const r of rows) { const z = (r.zona_titulo || '').trim(); if (z) set.add(z); }
    return Array.from(set).sort((a, b) => (zonaOrden(a) - zonaOrden(b)) || a.localeCompare(b));
  })();

  // Resumen de la JORNADA + ZONA seleccionadas (lo que se está viendo).
  const evaluables = rows.filter(r => marcable(r) && pasaJornada(r) && pasaZona(r));
  const resumen = {
    asistio: evaluables.filter(r => (r.estado_asistencia || '').toUpperCase() === 'ASISTIO').length,
    falto: evaluables.filter(r => (r.estado_asistencia || '').toUpperCase() === 'FALTO').length,
    pend: evaluables.filter(r => !(r.estado_asistencia || '')).length,
  };

  // Agrupar por ZONA (encabezados de sección), ordenadas por su número (Zona 1, 2, 3…).
  const secciones = (() => {
    const map = new Map<string, ReporteRow[]>();
    for (const r of visibles) {
      const z = (r.zona_titulo || '').trim() || 'SIN ZONA';
      if (!map.has(z)) map.set(z, []);
      map.get(z)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => (zonaOrden(a[0]) - zonaOrden(b[0])) || a[0].localeCompare(b[0]))
      .map(([title, data]) => ({ title, data }));
  })();

  const renderItem = ({ item }: { item: ReporteRow }) => {
    const est = (item.estado_asistencia || '').toUpperCase();
    const esHueca = item.hueca || (item.nombre_apellidos || '').toUpperCase() === 'HUECA';
    const k = keyOf(item);
    const guardando = savingKey === k;
    return (
      <View style={styles.card}>
        <Text style={styles.cliente} numberOfLines={1}>
          {item.instalacion_nombre || item.cliente || '—'}
        </Text>
        <Text style={[styles.persona, esHueca && styles.hueca]} numberOfLines={1}>
          {esHueca ? 'HUECA' : (item.nombre_apellidos || '—')}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.puesto_tipo || item.puesto || ''}
          {item.codigo ? ` · ${item.codigo}` : ''}
          {item.horario ? ` · ${item.horario}` : ''}
        </Text>

        <View style={styles.btnRow}>
          <TouchableOpacity
            disabled={guardando}
            style={[styles.btn, est === 'ASISTIO' && styles.btnAsistOn]}
            onPress={() => marcar(item, 'ASISTIO')}
            activeOpacity={0.7}>
            <Text style={[styles.btnTxt, est === 'ASISTIO' && styles.btnTxtOn]}>✓ Asistió</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={guardando}
            style={[styles.btn, est === 'FALTO' && styles.btnFaltoOn]}
            onPress={() => marcar(item, 'FALTO')}
            activeOpacity={0.7}>
            <Text style={[styles.btnTxt, est === 'FALTO' && styles.btnTxtOn]}>✗ Faltó</Text>
          </TouchableOpacity>
        </View>

        {item.reemplazo ? (
          <View style={styles.reempRow}>
            <Text style={styles.reempLbl} numberOfLines={1}>
              Cubre: <Text style={styles.reempNom}>{item.reemplazo}</Text>
            </Text>
            <TouchableOpacity disabled={guardando} onPress={() => quitarReemplazo(item)}>
              <Text style={styles.reempQuitar}>Quitar ✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.reempBtn} disabled={guardando} onPress={() => abrirReemplazo(item)}>
            <Text style={styles.reempBtnTxt}>＋ Reemplazo</Text>
          </TouchableOpacity>
        )}

        {guardando && <ActivityIndicator size="small" color={AZUL} style={styles.saving} />}
      </View>
    );
  };

  return (
    <View style={styles.bg}>
      {/* Barra de fecha */}
      <View style={styles.fechaBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => cambiarDia(-1)}>
          <Text style={styles.navTxt}>◀</Text>
        </TouchableOpacity>
        <View style={styles.fechaBox}>
          <Text style={styles.fechaTxt}>{fechaLegible(fecha)}</Text>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={() => cambiarDia(1)}>
          <Text style={styles.navTxt}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador por cliente/instalación o apellidos y nombres */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por cliente o apellidos y nombres…"
          placeholderTextColor="#9aa7b4"
          returnKeyType="search"
          autoCorrect={false}
        />
        {!!busqueda && (
          <TouchableOpacity style={styles.searchClear} onPress={() => setBusqueda('')}>
            <Text style={styles.searchClearTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Jornada: Diurno / Nocturno */}
      <View style={styles.chipsWrap}>
        {['Diurno', 'Nocturno'].map((t) => {
          const activo = filtroTurno === t;
          return (
            <TouchableOpacity key={t} style={[styles.chip, activo && styles.chipOn]} onPress={() => setFiltroTurno(t)}>
              <Text style={[styles.chipTxt, activo && styles.chipTxtOn]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selector de zona: Todas o una específica */}
      <View style={styles.zonaBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zonaBarRow}>
          {['', ...zonasDisponibles].map((z) => {
            const activo = filtroZona === z;
            return (
              <TouchableOpacity key={z || 'todas'} style={[styles.zChip, activo && styles.zChipOn]} onPress={() => setFiltroZona(z)}>
                <Text style={[styles.zChipTxt, activo && styles.zChipTxtOn]}>{z || 'Todas'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Resumen */}
      <View style={styles.resumen}>
        <View style={styles.resItem}><Text style={[styles.resNum, styles.ok]}>{resumen.asistio}</Text><Text style={styles.resLbl}>Asistió</Text></View>
        <View style={styles.resSep} />
        <View style={styles.resItem}><Text style={[styles.resNum, styles.bad]}>{resumen.falto}</Text><Text style={styles.resLbl}>Faltó</Text></View>
        <View style={styles.resSep} />
        <View style={styles.resItem}><Text style={[styles.resNum, styles.pend]}>{resumen.pend}</Text><Text style={styles.resLbl}>Pendiente</Text></View>
      </View>

      {loading && rows.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={AZUL} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.err}>{error}</Text></View>
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(it, i) => `${keyOf(it)}-${i}`}
          renderItem={({ item }) => renderItem({ item })}
          renderSectionHeader={({ section }) => (
            <View style={styles.zonaHead}>
              <Text style={styles.zonaHeadTxt}>{section.title.toUpperCase()}</Text>
              <Text style={styles.zonaHeadCount}>{section.data.length}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listPad}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => cargar(fecha)} colors={[AZUL]} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.vacio}>Sin registros de {filtroTurno} para este día</Text></View>}
        />
      )}

      {/* Modal: elegir persona para el reemplazo */}
      <Modal visible={!!reempTarget} animationType="slide" transparent onRequestClose={() => setReempTarget(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Poner reemplazo</Text>
              <TouchableOpacity onPress={() => setReempTarget(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {!!reempTarget && (
              <Text style={styles.modalSub} numberOfLines={1}>
                {(reempTarget.instalacion_nombre || reempTarget.cliente || '')}
                {' · '}
                {(reempTarget.puesto_tipo || reempTarget.puesto || '')}
              </Text>
            )}
            <TextInput
              style={styles.modalSearch}
              value={busPersona}
              onChangeText={buscarPersona}
              placeholder="Buscar persona (nombre o cédula)…"
              placeholderTextColor="#9aa7b4"
              autoFocus
              autoCorrect={false}
            />
            {buscandoPersona ? (
              <ActivityIndicator color={AZUL} style={{ marginTop: 18 }} />
            ) : (
              <FlatList
                data={personas}
                keyExtractor={(p) => String(p.id)}
                keyboardShouldPersistTaps="handled"
                style={styles.modalList}
                renderItem={({ item: p }) => (
                  <TouchableOpacity style={styles.personaRow} onPress={() => elegirReemplazo(p)}>
                    <Text style={styles.personaNom}>{p.apellidos} {p.nombres}</Text>
                    <Text style={styles.personaMeta}>{p.cedula} · {p.tipo}{!p.is_active ? ' · inactivo' : ''}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.modalVacio}>
                    {busPersona.trim().length >= 2 ? 'Sin resultados' : 'Escribe al menos 2 letras'}
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f4f6f9' },
  fechaBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e3e8ef' },
  navBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: AZUL, alignItems: 'center', justifyContent: 'center' },
  navTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fechaBox: { flex: 1, alignItems: 'center' },
  fechaTxt: { fontSize: 15, fontWeight: '700', color: '#14202b', textTransform: 'capitalize' },
  chipsWrap: { flexDirection: 'row', justifyContent: 'center', gap: 10, backgroundColor: '#fff', paddingBottom: 10 },
  chip: { paddingHorizontal: 22, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  chipOn: { backgroundColor: AZUL, borderColor: AZUL },
  chipTxt: { fontSize: 14, fontWeight: '700', color: '#475569' },
  chipTxtOn: { color: '#fff' },
  zonaBar: { backgroundColor: '#fff' },
  zonaBarRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  zChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#dbe2ea', backgroundColor: '#f4f6f9' },
  zChipOn: { backgroundColor: '#1c4a80', borderColor: '#1c4a80' },
  zChipTxt: { fontSize: 13, fontWeight: '600', color: '#5b6b79' },
  zChipTxtOn: { color: '#fff' },
  zonaHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#e8edf3', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginBottom: 8, marginTop: 4 },
  zonaHeadTxt: { fontSize: 13, fontWeight: '800', color: '#334155', letterSpacing: 0.5 },
  zonaHeadCount: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  searchWrap: { backgroundColor: '#fff', paddingHorizontal: 12, paddingBottom: 10, position: 'relative', justifyContent: 'center' },
  search: { backgroundColor: '#f1f4f8', borderRadius: 10, borderWidth: 1, borderColor: '#e3e8ef', paddingHorizontal: 14, paddingVertical: 9, paddingRight: 36, fontSize: 14, color: '#14202b' },
  searchClear: { position: 'absolute', right: 22, top: 8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  searchClearTxt: { color: '#6b7787', fontSize: 14, fontWeight: '700' },
  resumen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e3e8ef' },
  resItem: { alignItems: 'center', flex: 1 },
  resSep: { width: 1, height: 28, backgroundColor: '#e3e8ef' },
  resNum: { fontSize: 20, fontWeight: '800' },
  resLbl: { fontSize: 11, color: '#6b7787', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  err: { color: '#c33a34', textAlign: 'center' },
  vacio: { color: '#6b7787' },
  listPad: { padding: 12, paddingBottom: 28 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e3e8ef' },
  cliente: { fontSize: 13, fontWeight: '600', color: '#5b6b79' },
  persona: { fontSize: 16, fontWeight: '700', color: '#14202b', marginTop: 4 },
  hueca: { color: '#B45309' },
  meta: { fontSize: 12, color: '#6b7787', marginTop: 3 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: '#cbd5e1', alignItems: 'center', backgroundColor: '#fff' },
  btnAsistOn: { backgroundColor: '#1a8a5c', borderColor: '#1a8a5c' },
  btnFaltoOn: { backgroundColor: '#c33a34', borderColor: '#c33a34' },
  btnTxt: { fontSize: 14, fontWeight: '700', color: '#475569' },
  btnTxtOn: { color: '#fff' },
  saving: { position: 'absolute', top: 12, right: 12 },
  ok: { color: '#1a8a5c' },
  bad: { color: '#c33a34' },
  pend: { color: '#b4870b' },
  // Reemplazo en tarjeta
  reempBtn: { marginTop: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', alignItems: 'center' },
  reempBtnTxt: { fontSize: 13, fontWeight: '600', color: AZUL },
  reempRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eef4ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  reempLbl: { flex: 1, fontSize: 13, color: '#3b4a59' },
  reempNom: { fontWeight: '700', color: '#14202b' },
  reempQuitar: { fontSize: 12, fontWeight: '700', color: '#c33a34' },
  // Modal
  modalBg: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '80%' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#14202b' },
  modalClose: { fontSize: 18, color: '#6b7787', fontWeight: '700', paddingHorizontal: 6 },
  modalSub: { fontSize: 12, color: '#6b7787', marginTop: 4 },
  modalSearch: { backgroundColor: '#f1f4f8', borderRadius: 10, borderWidth: 1, borderColor: '#e3e8ef', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#14202b', marginTop: 12 },
  modalList: { marginTop: 8 },
  personaRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef1f5' },
  personaNom: { fontSize: 15, fontWeight: '600', color: '#14202b' },
  personaMeta: { fontSize: 12, color: '#6b7787', marginTop: 2 },
  modalVacio: { textAlign: 'center', color: '#6b7787', paddingVertical: 24 },
});
