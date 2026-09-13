import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, TextInput,
} from 'react-native';
import { api, ReporteRow } from '../services/api';

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

type Estado = 'ASISTIO' | 'FALTO' | '';

export default function MarcarRelevoScreen() {
  const [fecha, setFecha] = useState<string>(toISO(new Date()));
  const [rows, setRows] = useState<ReporteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');

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

  // Buscar por cliente/instalación o por apellidos y nombres (solo filtra lo mostrado;
  // el resumen sigue contando todo el día).
  const q = busqueda.trim().toLowerCase();
  const visibles = q
    ? rows.filter(r => [r.instalacion_nombre, r.cliente, r.nombre_apellidos, r.codigo, r.puesto, r.puesto_tipo]
        .some(c => (c || '').toLowerCase().includes(q)))
    : rows;

  const evaluables = rows.filter(marcable);
  const resumen = {
    asistio: evaluables.filter(r => (r.estado_asistencia || '').toUpperCase() === 'ASISTIO').length,
    falto: evaluables.filter(r => (r.estado_asistencia || '').toUpperCase() === 'FALTO').length,
    pend: evaluables.filter(r => !(r.estado_asistencia || '')).length,
  };

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
        <FlatList
          data={visibles}
          keyExtractor={(it, i) => `${keyOf(it)}-${i}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listPad}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => cargar(fecha)} colors={[AZUL]} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.vacio}>Sin registros para este día</Text></View>}
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
});
