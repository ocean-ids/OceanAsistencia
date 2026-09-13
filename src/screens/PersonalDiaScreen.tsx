import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, TextInput,
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
  const [busqueda, setBusqueda] = useState<string>('');

  const q = busqueda.trim().toLowerCase();
  const filtradas = rows.filter(r => {
    const t = r.turno || '';
    const okTurno = filtroTurno === 'Nocturno'
      ? (t === 'Nocturno' || t === 'Veinticuatro')
      // Diurno (por defecto): incluye Tarde y Veinticuatro.
      : (t === 'Diurno' || t === 'Tarde' || t === 'Veinticuatro');
    if (!okTurno) return false;
    if (!q) return true;
    // Buscar por cliente/instalación o por apellidos y nombres.
    const campos = [r.instalacion_nombre, r.cliente, r.nombre_apellidos, r.codigo, r.puesto, r.puesto_tipo];
    return campos.some(c => (c || '').toLowerCase().includes(q));
  });

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

      {/* Filtro de jornada */}
      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {TURNOS.map((t) => {
            const activo = filtroTurno === t;
            return (
              <TouchableOpacity key={t} style={[styles.chip, activo && styles.chipOn]} onPress={() => setFiltroTurno(t)}>
                <Text style={[styles.chipTxt, activo && styles.chipTxtOn]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && rows.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={AZUL} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.err}>{error}</Text></View>
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={(it, i) => `${it.asignacion_id ?? 's' + it.sacafranco_fila_id}-${i}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listPad}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => cargar(fecha)} colors={[AZUL]} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.vacio}>Sin registros{filtroTurno ? ' de ' + filtroTurno : ''} para este día</Text></View>}
          ListHeaderComponent={<Text style={styles.total}>{filtradas.length} registros{filtroTurno ? ' · ' + filtroTurno : ''}</Text>}
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
  chipsRow: { paddingHorizontal: 10, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  chipOn: { backgroundColor: AZUL, borderColor: AZUL },
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTxtOn: { color: '#fff' },
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
});
