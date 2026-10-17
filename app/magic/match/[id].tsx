import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMatch, type MatchDetails } from '../../../lib/database';

export default function MatchDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    getMatch(Number(id))
      .then((result) => { if (active) setMatch(result); })
      .catch(() => { if (active) setLoadError('Não foi possível carregar os detalhes desta partida.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao histórico" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={21} color="#F1F4F7" />
        </Pressable>
        <View style={styles.headingText}>
          <Text style={styles.kicker}>MAGIC: THE GATHERING</Text>
          <Text numberOfLines={1} style={styles.title}>{match?.name ?? 'Detalhes da partida'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}><ActivityIndicator color="#B7F36B" /></View>
      ) : loadError || !match ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={30} color="#FF777C" />
          <Text style={styles.stateText}>{loadError || 'Partida não encontrada.'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>RESULTADO FINAL</Text>
            <View style={styles.finalScore}>
              {match.finalLives.map((life, index) => (
                <View key={index} style={styles.finalPlayer}>
                  <Text numberOfLines={1} style={styles.playerName}>{match.playerNames[index]}</Text>
                  <Text style={[styles.finalLife, { color: match.playerColors[index] }]}>{life}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.matchResult}>
              {match.playerCount > 2
                ? match.winnerPlayer ? `Vencedor: ${match.playerNames[match.winnerPlayer - 1]}` : 'Resultado não registrado'
                : match.md3Score ? `Resultado da MD3: ${match.md3Score[0]}–${match.md3Score[1]}` : 'MD3 sem placar'}
            </Text>
            <Text style={styles.finishedDate}>Finalizada em {new Date(match.finishedAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</Text>
          </View>

          <View style={styles.timelineHeading}>
            <Text style={styles.timelineTitle}>Linha do tempo</Text>
            <Text style={styles.timelineCount}>{match.snapshots.length} registros</Text>
          </View>
          {match.snapshots.map((snapshot, index) => {
            const previous = match.snapshots[index - 1];
            const lives = snapshot.lives ?? [snapshot.lifeOne, snapshot.lifeTwo, snapshot.lifeThree ?? 0, snapshot.lifeFour ?? 0];
            const previousLives = previous?.lives ?? (previous ? [previous.lifeOne, previous.lifeTwo, previous.lifeThree ?? 0, previous.lifeFour ?? 0] : []);

            return (
              <View key={snapshot.id} style={styles.snapshotCard}>
                <View style={styles.snapshotTop}>
                  <View style={[styles.timelineDot, snapshot.isFinal && styles.finalDot]}>
                    <Ionicons name={snapshot.isFinal ? 'flag' : index === 0 ? 'play' : 'time'} size={13} color={snapshot.isFinal ? '#101419' : '#B7F36B'} />
                  </View>
                  <View style={styles.snapshotMeta}>
                    <Text style={styles.snapshotTitle}>
                      {snapshot.event === 'start' ? 'Início da partida' : snapshot.event === 'restart' ? 'Restart' : snapshot.event === 'finish' ? 'Encerramento' : `Registro ${index}`}
                    </Text>
                    <Text style={styles.snapshotTime}>{new Date(snapshot.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
                  </View>
                </View>
                <View style={styles.snapshotPlayers}>
                  {lives.slice(0, match.playerCount).map((life, playerIndex) => (
                    <SnapshotPlayer
                      key={playerIndex}
                      label={match.playerNames[playerIndex]}
                      life={life}
                      delta={previous ? life - previousLives[playerIndex] : null}
                      color={match.playerColors[playerIndex]}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function SnapshotPlayer({ label, life, delta, color }: { label: string; life: number; delta: number | null; color: string }) {
  const deltaColor = delta === null || delta === 0 ? '#8A96A3' : delta > 0 ? '#52D68A' : '#FF6268';
  return (
    <View style={styles.snapshotPlayer}>
      <Text style={[styles.snapshotLife, { color }]}>{label} {life}</Text>
      <View style={styles.delta}>
        {delta !== null && <Ionicons name={delta > 0 ? 'arrow-up' : delta < 0 ? 'arrow-down' : 'remove'} size={15} color={deltaColor} />}
        <Text style={[styles.deltaText, { color: deltaColor }]}>{delta === null ? '—' : delta > 0 ? `+${delta}` : delta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101419', padding: 22, paddingTop: 38 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191F26' },
  headingText: { flex: 1 },
  kicker: { color: '#B7F36B', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#F1F4F7', fontSize: 24, fontWeight: '900', marginTop: 4 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: '#A2ADB8', fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  content: { gap: 12, paddingBottom: 30 },
  summaryCard: { padding: 18, borderRadius: 20, backgroundColor: '#191F26', borderWidth: 1, borderColor: '#29313A', marginBottom: 8 },
  summaryLabel: { color: '#8A96A3', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center' },
  finalScore: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', marginTop: 16, gap: 12 },
  finalPlayer: { alignItems: 'center', minWidth: 58 },
  playerName: { color: '#8A96A3', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  finalLife: { fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 4 },
  matchResult: { color: '#B7F36B', fontSize: 15, fontWeight: '900', textAlign: 'center', marginTop: 16 },
  scoreDivider: { color: '#596673', fontSize: 18 },
  finishedDate: { color: '#71808E', fontSize: 12, textAlign: 'center', marginTop: 14 },
  timelineHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, marginBottom: 2 },
  timelineTitle: { color: '#F1F4F7', fontSize: 18, fontWeight: '900' },
  timelineCount: { color: '#8A96A3', fontSize: 12 },
  snapshotCard: { padding: 14, borderRadius: 17, backgroundColor: '#191F26', borderWidth: 1, borderColor: '#29313A' },
  snapshotTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  timelineDot: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(183,243,107,0.1)' },
  finalDot: { backgroundColor: '#B7F36B' },
  snapshotMeta: { flex: 1 },
  snapshotTitle: { color: '#E7ECF1', fontSize: 13, fontWeight: '800' },
  snapshotTime: { color: '#71808E', fontSize: 11, marginTop: 2 },
  snapshotPlayers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#29313A' },
  snapshotPlayer: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  snapshotLife: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  deltaText: { fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
