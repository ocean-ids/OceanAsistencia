import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, SectionList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, TextInput,
} from 'react-native';
import { api, ReporteRow } from '../services/api';

const AZUL = '#0c2f5a';
// Solo Diurno y Nocturno (igual que el web): Diurno incluye Tarde y Veinticuatro;
// Nocturno incluye Veinticuatro. Ya no hay chips de Tarde/Veinticuatro ni "Todos".
const TURNOS = ['Diurno', 'Nocturno'];

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

function jornadaColor(turno?: string): { bg: string; fg: string } {
  switch (turno) {
    case 'Diurno': return { bg: '#FDE68A', fg: '#78350F' };
    case 'Nocturno': return { bg: '#E0E7FF', fg: '#3730A3' };
    case 'Tarde': return { bg: '#FFEDD5', fg: '#9A3412' };
    case 'Veinticuatro': return { bg: '#CCFBF1', fg: '#115E59' };
    default: return { bg: '#E5E7EB', fg: '#374151' };
  }
}

export default function PersonalDiaScreen() {
  const [fecha, setFecha] = useState<string>(toISO(new Date()));
  const [rows, setRows] = useState<ReporteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroTurno, setFiltroTurno] = useState<string>('Diurno');
  const [filtroZona, setFiltroZona] = useState<string>('');  // '' = Todas
  const [busqueda, setBusqueda] = useState<string>('');

  const q = busqueda.trim().toLowerCase();
  const pasaJornada = (r: ReporteRow) => {
    const t = r.turno || '';
    return filtroTurno === 'Nocturno'
      ? (t === 'Nocturno' || t === 'Veinticuatro')
      // Diurno (por defecto): incluye Tarde y Veinticuatro.
      : (t === 'Diurno' || t === 'Tarde' || t === 'Veinticuatro');
  };
  const pasaZona = (r: ReporteRow) => !filtroZona || (r.zona_titulo || '').trim() === filtroZona;
  const pasaBusqueda = (r: ReporteRow) => !q ||
    [r.instalacion_nombre, r.cliente, r.nombre_apellidos, r.codigo, r.puesto, r.puesto_tipo]
      .some(c => (c || '').toLowerCase().includes(q));

  const filtradas = rows.filter(r => pasaJornada(r) && pasaZona(r) && pasaBusqueda(r));

  // Resumen de asistencia (solo lectura) de lo que se está viendo por jornada + zona.
  const marcable = (r: ReporteRow) => r.asignacion_id != null || r.sacafranco_fila_id != null;
  const evaluables = rows.filter(r => marcable(r) && pasaJornada(r) && pasaZona(r));
  const resumen = {
    asistio: evaluables.filter(r => (r.estado_asistencia || '').toUpperCase() === 'ASISTIO').length,
    falto: evaluables.filter(r => (r.estado_asistencia || '').toUpperCase() === 'FALTO').length,
    pend: evaluables.filter(r => !(r.estado_asistencia || '')).length,
  };

  // Zonas disponibles para el selector (Todas / zona específica).
  const zonasDisponibles = (() => {
    const set = new Set<string>();
    for (const r of rows) { const z = (r.zona_titulo || '').trim(); if (z) set.add(z); }
    return Array.from(set).sort((a, b) => (zonaOrden(a) - zonaOrden(b)) || a.localeCompare(b));
  })();

  // Agrupar por ZONA (encabezados de sección).
  const secciones = (() => {
    const map = new Map<string, ReporteRow[]>();
    for (const r of filtradas) {
      const z = (r.zona_titulo || '').trim() || 'SIN ZONA';
      if (!map.has(z)) map.set(z, []);
      map.get(z)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => (zonaOrden(a[0]) - zonaOrden(b[0])) || a[0].localeCompare(b[0]))
      .map(([title, data]) => ({ title, data }));
  })();

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

  const renderItem = ({ item }: { item: ReporteRow }) => {
    const jc = jornadaColor(item.turno);
    const esHueca = item.hueca || (item.nombre_apellidos || '').toUpperCase() === 'HUECA';
    const asistio = (item.estado_asistencia || '').toUpperCase() === 'ASISTIO';
    const falto = (item.estado_asistencia || '').toUpperCase() === 'FALTO';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cliente} numberOfLines={1}>
            {item.instalacion_nombre || item.cliente || '—'}
          </Text>
          {!!item.turno && (
            <View style={[styles.jornada, { backgroundColor: jc.bg }]}>
              <Text style={[styles.jornadaTxt, { color: jc.fg }]}>{item.turno}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.persona, esHueca && styles.personaHueca]} numberOfLines={1}>
          {esHueca ? 'HUECA' : (item.nombre_apellidos || '—')}
        </Text>

        <View style={styles.cardBottom}>
          <Text style={styles.meta}>{item.puesto_tipo || item.puesto || ''}{item.codigo ? ` · ${item.codigo}` : ''}</Text>
          {!!item.horario && <Text style={styles.meta}>{item.horario}</Text>}
        </View>

        {(asistio || falto) && (
          <Text style={[styles.estado, asistio ? styles.ok : styles.bad]}>
            {asistio ? '✓ Asistió' : '✗ Faltó'}
          </Text>
        )}
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

      {/* Filtro de jornada (centrado): solo Diurno / Nocturno */}
      <View style={styles.chipsWrap}>
        <View style={styles.chipsRow}>
          {TURNOS.map((t) => {
            const activo = filtroTurno === t;
            return (
              <TouchableOpacity key={t} style={[styles.chip, activo && styles.chipOn]} onPress={() => setFiltroTurno(t)}>
                <Text style={[styles.chipTxt, activo && styles.chipTxtOn]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
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

      {/* Resumen (solo lectura) */}
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
          keyExtractor={(it, i) => `${it.asignacion_id ?? 's' + it.sacafranco_fila_id}-${i}`}
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
          ListHeaderComponent={<Text style={styles.total}>{filtradas.length} registros · {filtroTurno}{filtroZona ? ' · ' + filtroZona : ''}</Text>}
        />
      )}
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
  searchWrap: { backgroundColor: '#fff', paddingHorizontal: 12, paddingBottom: 10, position: 'relative', justifyContent: 'center' },
  search: { backgroundColor: '#f1f4f8', borderRadius: 10, borderWidth: 1, borderColor: '#e3e8ef', paddingHorizontal: 14, paddingVertical: 9, paddingRight: 36, fontSize: 14, color: '#14202b' },
  searchClear: { position: 'absolute', right: 22, top: 8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  searchClearTxt: { color: '#6b7787', fontSize: 14, fontWeight: '700' },
  chipsWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e3e8ef' },
  chipsRow: { paddingHorizontal: 10, paddingVertical: 8, gap: 10, flexDirection: 'row', justifyContent: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  chipOn: { backgroundColor: AZUL, borderColor: AZUL },
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTxtOn: { color: '#fff' },
  zonaBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e3e8ef' },
  zonaBarRow: { paddingHorizontal: 10, paddingBottom: 8, gap: 8, flexDirection: 'row' },
  zChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#dbe2ea', backgroundColor: '#f4f6f9' },
  zChipOn: { backgroundColor: '#1c4a80', borderColor: '#1c4a80' },
  zChipTxt: { fontSize: 13, fontWeight: '600', color: '#5b6b79' },
  zChipTxtOn: { color: '#fff' },
  zonaHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#e8edf3', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginBottom: 8, marginTop: 4 },
  zonaHeadTxt: { fontSize: 13, fontWeight: '800', color: '#334155', letterSpacing: 0.5 },
  zonaHeadCount: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  err: { color: '#c33a34', textAlign: 'center' },
  vacio: { color: '#6b7787' },
  listPad: { padding: 12, paddingBottom: 28 },
  total: { fontSize: 12, color: '#6b7787', marginBottom: 8, marginLeft: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e3e8ef' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cliente: { flex: 1, fontSize: 13, fontWeight: '600', color: '#5b6b79' },
  jornada: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  jornadaTxt: { fontSize: 12, fontWeight: '700' },
  persona: { fontSize: 16, fontWeight: '700', color: '#14202b', marginTop: 6 },
  personaHueca: { color: '#B45309' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 8 },
  meta: { fontSize: 12, color: '#6b7787' },
  estado: { marginTop: 8, fontSize: 13, fontWeight: '700' },
  ok: { color: '#1a8a5c' },
  bad: { color: '#c33a34' },
  pend: { color: '#b4870b' },
  // Barra de resumen (solo lectura)
  resumen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e3e8ef' },
  resItem: { alignItems: 'center', flex: 1 },
  resSep: { width: 1, height: 28, backgroundColor: '#e3e8ef' },
  resNum: { fontSize: 20, fontWeight: '800' },
  resLbl: { fontSize: 11, color: '#6b7787', marginTop: 2 },
});
