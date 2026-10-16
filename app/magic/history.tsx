import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { clearMatches, getMatches, type MatchSummary } from '../../lib/database';

export default function MatchHistoryScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [clearing, setClearing] = useState(false);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setMatches(await getMatches());
    } catch {
      setLoadError('Não foi possível carregar o histórico. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadMatches();
  }, [loadMatches]));

  const clearHistory = () => {
    Alert.alert(
      'Limpar histórico?',
      'Todas as partidas salvas e seus registros serão removidos permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar histórico',
          style: 'destructive',
          onPress: () => {
            setClearing(true);
            void clearMatches()
              .then(() => setMatches([]))
              .catch(() => setLoadError('Não foi possível limpar o histórico. Tente novamente.'))
              .finally(() => setClearing(false));
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={21} color="#F1F4F7" />
        </Pressable>
        <View style={styles.headingText}>
          <Text style={styles.kicker}>MAGIC: THE GATHERING</Text>
          <Text style={styles.title}>Histórico de partidas</Text>
        </View>
      </View>

      {!loading && matches.length > 0 && !loadError && (
        <View style={styles.clearRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar todo o histórico de partidas"
            accessibilityState={{ disabled: clearing, busy: clearing }}
            disabled={clearing}
            onPress={clearHistory}
            style={[styles.clearButton, clearing && styles.clearButtonDisabled]}
          >
            <Ionicons name="trash-outline" size={16} color="#FF777C" />
            <Text style={styles.clearButtonText}>{clearing ? 'Limpando…' : 'Limpar histórico'}</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#B7F36B" />
          <Text style={styles.stateText}>Carregando partidas…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={30} color="#FF777C" />
          <Text style={styles.stateText}>{loadError}</Text>
          <Pressable accessibilityRole="button" onPress={() => void loadMatches()} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}><Ionicons name="time-outline" size={28} color="#B7F36B" /></View>
          <Text style={styles.emptyTitle}>Ainda sem partidas</Text>
          <Text style={styles.stateText}>As partidas que você finalizar aparecerão aqui.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.matchList}>
          <Text style={styles.listCaption}>{matches.length} {matches.length === 1 ? 'PARTIDA SALVA' : 'PARTIDAS SALVAS'}</Text>
          {matches.map((match) => (
            <Pressable
              key={match.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir partida ${match.name}`}
              onPress={() => router.push({ pathname: '/magic/match/[id]', params: { id: String(match.id) } })}
              style={styles.matchCard}
            >
              <View style={styles.matchCardHeader}>
                <View style={styles.matchIcon}><Ionicons name="trophy-outline" size={20} color="#B7F36B" /></View>
                <View style={styles.matchNameBlock}>
                  <Text numberOfLines={1} style={styles.matchName}>{match.name}</Text>
                  <Text style={styles.matchDate}>{new Date(match.finishedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#71808E" />
              </View>
              <View style={styles.matchFooter}>
                <Text style={styles.scoreLabel}>VIDA FINAL</Text>
                <View style={styles.finalScore}>
                  <Text style={[styles.scorePlayer, { color: match.playerOneColor }]}>J1 {match.finalLifeOne}</Text>
                  <Text style={styles.scoreSeparator}>·</Text>
                  <Text style={[styles.scorePlayer, { color: match.playerTwoColor }]}>J2 {match.finalLifeTwo}</Text>
                </View>
                <Text style={styles.snapshotCount}>{match.snapshotCount} registros</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101419', padding: 22, paddingTop: 38 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191F26' },
  headingText: { flex: 1 },
  clearRow: { alignItems: 'flex-end', marginTop: -12, marginBottom: 14 },
  clearButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,119,124,0.25)', backgroundColor: 'rgba(255,119,124,0.08)' },
  clearButtonText: { color: '#FF777C', fontSize: 12, fontWeight: '800' },
  clearButtonDisabled: { opacity: 0.55 },
  kicker: { color: '#B7F36B', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#F1F4F7', fontSize: 25, fontWeight: '900', marginTop: 4 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 50 },
  stateText: { color: '#A2ADB8', fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(183,243,107,0.1)', marginBottom: 14 },
  emptyTitle: { color: '#F1F4F7', fontSize: 19, fontWeight: '800' },
  retryButton: { marginTop: 18, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 13, backgroundColor: '#252D36' },
  retryText: { color: '#F1F4F7', fontWeight: '800' },
  matchList: { gap: 12, paddingBottom: 28 },
  listCaption: { color: '#71808E', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  matchCard: { padding: 15, borderRadius: 19, backgroundColor: '#191F26', borderWidth: 1, borderColor: '#29313A' },
  matchCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  matchIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(183,243,107,0.1)' },
  matchNameBlock: { flex: 1 },
  matchName: { color: '#F1F4F7', fontSize: 16, fontWeight: '800' },
  matchDate: { color: '#8A96A3', fontSize: 12, marginTop: 4 },
  matchFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#29313A' },
  scoreLabel: { color: '#71808E', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  finalScore: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  scorePlayer: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  scoreSeparator: { color: '#71808E', fontSize: 16 },
  snapshotCount: { color: '#8A96A3', fontSize: 11 },
});
