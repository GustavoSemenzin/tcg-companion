import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { saveMatch, type MatchSnapshotInput } from '../../lib/database';

const palettes = [
  { name: 'Vermelho', value: '#E53935', text: '#FFFFFF' },
  { name: 'Azul', value: '#315CF5', text: '#FFFFFF' },
  { name: 'Verde', value: '#159447', text: '#FFFFFF' },
  { name: 'Amarelo', value: '#F4C430', text: '#17191C' },
  { name: 'Roxo', value: '#853CC6', text: '#FFFFFF' },
  { name: 'Preto', value: '#282D33', text: '#FFFFFF' },
] as const;

type PlayerColor = (typeof palettes)[number]['value'];

type LifeSnapshot = {
  id: string;
  lifeOne: number;
  lifeTwo: number;
  createdAt: Date;
  event: MatchSnapshotInput['event'];
};

type PlayerPanelProps = {
  player: 1 | 2;
  life: number;
  lifeDisabled: boolean;
  color: PlayerColor;
  pickerOpen: boolean;
  onLifeChange: (amount: number) => void;
  onTogglePicker: () => void;
  onChooseColor: (color: PlayerColor) => void;
};

function PlayerPanel({ player, life, lifeDisabled, color, pickerOpen, onLifeChange, onTogglePicker, onChooseColor }: PlayerPanelProps) {
  const textColor = palettes.find((option) => option.value === color)?.text ?? '#FFFFFF';

  return (
    <View style={[styles.playerPanel, { backgroundColor: color }]}>
      <View style={[styles.panelContent, player === 2 && styles.rotated]}>
        <View style={styles.panelHeader}>
          <Text style={[styles.playerLabel, { color: textColor }]}>JOGADOR {player}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mudar cor do jogador ${player}`}
            accessibilityState={{ expanded: pickerOpen }}
            onPress={onTogglePicker}
            style={[styles.colorButton, { backgroundColor: textColor === '#17191C' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.2)' }]}
          >
            <Ionicons name="color-palette-outline" size={17} color={textColor} />
            <Text style={[styles.colorButtonText, { color: textColor }]}>Cor</Text>
          </Pressable>
        </View>

        {pickerOpen && (
          <View style={styles.paletteRow}>
            {palettes.map((option) => (
              <Pressable
                key={option.name}
                accessibilityRole="button"
                accessibilityLabel={`Cor ${option.name} para jogador ${player}`}
                accessibilityState={{ selected: color === option.value }}
                onPress={() => onChooseColor(option.value)}
                style={[styles.swatch, { backgroundColor: option.value }, color === option.value && styles.selectedSwatch]}
              />
            ))}
          </View>
        )}

        <View style={styles.lifeControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Diminuir vida do jogador ${player}`}
            accessibilityState={{ disabled: lifeDisabled }}
            disabled={lifeDisabled}
            onPress={() => onLifeChange(-1)}
            style={[styles.adjustButton, { backgroundColor: textColor === '#17191C' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.2)' }, lifeDisabled && styles.disabledLifeButton]}
          >
            <Ionicons name="remove" size={34} color={textColor} />
          </Pressable>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.lifeTotal, { color: textColor }]}>{life}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Aumentar vida do jogador ${player}`}
            accessibilityState={{ disabled: lifeDisabled }}
            disabled={lifeDisabled}
            onPress={() => onLifeChange(1)}
            style={[styles.adjustButton, { backgroundColor: textColor === '#17191C' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.2)' }, lifeDisabled && styles.disabledLifeButton]}
          >
            <Ionicons name="add" size={34} color={textColor} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function LifeCounterScreen() {
  const router = useRouter();
  const [hasStarted, setHasStarted] = useState(false);
  const [lifeOne, setLifeOne] = useState(20);
  const [lifeTwo, setLifeTwo] = useState(20);
  const [colorOne, setColorOne] = useState<PlayerColor>(palettes[1].value);
  const [colorTwo, setColorTwo] = useState<PlayerColor>(palettes[0].value);
  const [openPicker, setOpenPicker] = useState<1 | 2 | null>(null);
  const [history, setHistory] = useState<LifeSnapshot[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [startConfirmationOpen, setStartConfirmationOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [matchName, setMatchName] = useState('');
  const [savingMatch, setSavingMatch] = useState(false);
  const [saveError, setSaveError] = useState('');
  const matchStartedAt = useRef(new Date());
  const latestLives = useRef({ lifeOne: 20, lifeTwo: 20 });
  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const pendingSnapshotEvent = useRef<'life_change' | 'restart'>('life_change');

  useEffect(() => () => {
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    if (startHoldTimer.current) clearTimeout(startHoldTimer.current);
  }, []);

  const scheduleSnapshot = (event: 'life_change' | 'restart' = 'life_change') => {
    if (event === 'restart') pendingSnapshotEvent.current = 'restart';
    else if (pendingSnapshotEvent.current !== 'restart') pendingSnapshotEvent.current = 'life_change';
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(() => {
      const snapshot = latestLives.current;
      setHistory((entries) => [{
        id: `${Date.now()}-${Math.random()}`,
        lifeOne: snapshot.lifeOne,
        lifeTwo: snapshot.lifeTwo,
        createdAt: new Date(),
        event: pendingSnapshotEvent.current,
      }, ...entries]);
      pendingSnapshotEvent.current = 'life_change';
      snapshotTimer.current = null;
    }, 3000);
  };

  const changeLife = (player: 1 | 2, amount: number) => {
    const current = latestLives.current;
    const next = {
      lifeOne: player === 1 ? current.lifeOne + amount : current.lifeOne,
      lifeTwo: player === 2 ? current.lifeTwo + amount : current.lifeTwo,
    };
    latestLives.current = next;
    setLifeOne(next.lifeOne);
    setLifeTwo(next.lifeTwo);
    scheduleSnapshot();
  };

  const confirmNewMatch = () => {
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = null;
    const startedAt = new Date();
    latestLives.current = { lifeOne: 20, lifeTwo: 20 };
    setLifeOne(20);
    setLifeTwo(20);
    setOpenPicker(null);
    setHistory([{
      id: `${startedAt.getTime()}-start`,
      lifeOne: 20,
      lifeTwo: 20,
      createdAt: startedAt,
      event: 'start',
    }]);
    pendingSnapshotEvent.current = 'life_change';
    matchStartedAt.current = startedAt;
    setHasStarted(true);
    setStartConfirmationOpen(false);
  };

  const resetLivesOnly = () => {
    latestLives.current = { lifeOne: 20, lifeTwo: 20 };
    setLifeOne(20);
    setLifeTwo(20);
    setOpenPicker(null);
    if (hasStarted) scheduleSnapshot('restart');
  };

  const openFinishDialog = () => {
    setMatchName('');
    setSaveError('');
    setFinishOpen(true);
  };

  const finishMatch = async () => {
    const trimmedName = matchName.trim();
    if (!hasStarted || !trimmedName || savingMatch) return;

    setSavingMatch(true);
    setSaveError('');
    const finishedAt = new Date();
    const currentLives = latestLives.current;
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = null;
    const snapshots: MatchSnapshotInput[] = history
      .slice()
      .reverse()
      .map((entry) => ({
        lifeOne: entry.lifeOne,
        lifeTwo: entry.lifeTwo,
        recordedAt: entry.createdAt.toISOString(),
        event: entry.event,
      }));

    if (pendingSnapshotEvent.current === 'restart') {
      snapshots.push({
        lifeOne: currentLives.lifeOne,
        lifeTwo: currentLives.lifeTwo,
        recordedAt: finishedAt.toISOString(),
        event: 'restart',
      });
    }
    pendingSnapshotEvent.current = 'life_change';

    snapshots.push({
      lifeOne: currentLives.lifeOne,
      lifeTwo: currentLives.lifeTwo,
      recordedAt: finishedAt.toISOString(),
      event: 'finish',
      isFinal: true,
    });

    try {
      await saveMatch({
        name: trimmedName,
        startedAt: matchStartedAt.current.toISOString(),
        finishedAt: finishedAt.toISOString(),
        finalLifeOne: currentLives.lifeOne,
        finalLifeTwo: currentLives.lifeTwo,
        playerOneColor: colorOne,
        playerTwoColor: colorTwo,
        snapshots,
      });
      setFinishOpen(false);
      router.replace('/magic/history');
    } catch {
      setSaveError('Não foi possível salvar a partida. Tente novamente.');
      setSavingMatch(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <PlayerPanel
        player={2}
        life={lifeTwo}
        lifeDisabled={!hasStarted}
        color={colorTwo}
        pickerOpen={openPicker === 2}
        onLifeChange={(amount) => changeLife(2, amount)}
        onTogglePicker={() => setOpenPicker((current) => current === 2 ? null : 2)}
        onChooseColor={(color) => { setColorTwo(color); setOpenPicker(null); }}
      />
      <PlayerPanel
        player={1}
        life={lifeOne}
        lifeDisabled={!hasStarted}
        color={colorOne}
        pickerOpen={openPicker === 1}
        onLifeChange={(amount) => changeLife(1, amount)}
        onTogglePicker={() => setOpenPicker((current) => current === 1 ? null : 1)}
        onChooseColor={(color) => { setColorOne(color); setOpenPicker(null); }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reiniciar os pontos de vida"
        accessibilityHint="Toque para voltar a vida de ambos para 20. Segure por 2 segundos para iniciar uma nova partida."
        accessibilityActions={[{ name: 'longpress', label: 'Iniciar partida' }]}
        onAccessibilityAction={() => setStartConfirmationOpen(true)}
        onPress={() => {
          if (longPressTriggered.current) {
            longPressTriggered.current = false;
            return;
          }
          resetLivesOnly();
        }}
        onPressIn={() => {
          longPressTriggered.current = false;
          if (startHoldTimer.current) clearTimeout(startHoldTimer.current);
          startHoldTimer.current = setTimeout(() => {
            startHoldTimer.current = null;
            longPressTriggered.current = true;
            setStartConfirmationOpen(true);
          }, 2000);
        }}
        onPressOut={() => {
          if (startHoldTimer.current) clearTimeout(startHoldTimer.current);
          startHoldTimer.current = null;
        }}
        style={styles.resetButton}
      >
        <Ionicons name="refresh" size={21} color="#F1F4F7" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir histórico da partida, ${history.length} registros`}
        accessibilityState={{ expanded: historyOpen }}
        onPress={() => setHistoryOpen(true)}
        style={styles.historyButton}
      >
        <Ionicons name="time-outline" size={20} color="#F1F4F7" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Finalizar partida"
        disabled={!hasStarted}
        onPress={openFinishDialog}
        style={[styles.finishButton, !hasStarted && styles.disabledButton]}
      >
        <Ionicons name="flag-outline" size={18} color="#101419" />
        <Text style={styles.finishButtonText}>Finalizar</Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setHistoryOpen(false)}
        transparent
        visible={historyOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyTitle}>Histórico da partida</Text>
                <Text style={styles.historySubtitle}>Registro após 3 segundos sem ajustes de vida</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar histórico"
                onPress={() => setHistoryOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color="#E7ECF1" />
              </Pressable>
            </View>
            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="hourglass-outline" size={28} color="#8A96A3" />
                <Text style={styles.emptyHistoryTitle}>Nenhum registro ainda</Text>
                <Text style={styles.emptyHistoryText}>Altere os pontos de vida. O estado da partida será salvo aqui após 3 segundos.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.historyList}>
                {history.map((entry, index) => {
                  const previousEntry = history[index + 1];
                  const players = [
                    { number: 1, life: entry.lifeOne, previousLife: previousEntry?.lifeOne, color: colorOne },
                    { number: 2, life: entry.lifeTwo, previousLife: previousEntry?.lifeTwo, color: colorTwo },
                  ];

                  return (
                    <View key={entry.id} style={styles.historyEntry}>
                      <View style={styles.entryHeading}>
                        <Text style={styles.entryNumber}>
                          {entry.event === 'start' ? 'Início da partida' : entry.event === 'restart' ? 'Restart' : `Registro ${history.length - index - 1}`}
                        </Text>
                        <Text style={styles.entryTime}>{entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
                      </View>
                      <View style={styles.entryPlayers}>
                        {players.map((player) => {
                          const delta = player.previousLife === undefined ? null : player.life - player.previousLife;
                          const deltaColor = delta === null || delta === 0 ? '#8A96A3' : delta > 0 ? '#52D68A' : '#FF6268';
                          const deltaLabel = delta === null
                            ? 'Início da partida'
                            : delta > 0
                              ? `Ganhou ${delta} pontos de vida`
                              : delta < 0
                                ? `Perdeu ${Math.abs(delta)} pontos de vida`
                                : 'Sem alteração em relação ao registro anterior';

                          return (
                            <View key={player.number} style={styles.entryPlayer}>
                              <View>
                                <Text style={styles.entryPlayerName}>JOGADOR {player.number}</Text>
                                <Text style={[styles.entryLife, { color: player.color }]}>{player.life} <Text style={styles.entryLifeUnit}>PV</Text></Text>
                              </View>
                              <View accessibilityLabel={deltaLabel} style={styles.deltaIndicator}>
                                {delta === null ? (
                                  <Text style={[styles.deltaValue, { color: deltaColor }]}>INÍCIO</Text>
                                ) : (
                                  <>
                                    <Ionicons name={delta > 0 ? 'arrow-up' : delta < 0 ? 'arrow-down' : 'remove'} size={17} color={deltaColor} />
                                    <Text style={[styles.deltaValue, { color: deltaColor }]}>{delta > 0 ? `+${delta}` : delta}</Text>
                                  </>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setStartConfirmationOpen(false)}
        transparent
        visible={startConfirmationOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.finishCard}>
            <View style={styles.finishIcon}>
              <Ionicons name="refresh" size={22} color="#B7F36B" />
            </View>
            <Text style={styles.finishTitle}>Iniciar nova partida?</Text>
            <Text style={styles.finishDescription}>
              Os pontos de vida voltarão para 20 e um novo histórico começará. O registro da partida atual será descartado se ainda não tiver sido finalizada.
            </Text>
            <View style={styles.finishActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setStartConfirmationOpen(false)}
                style={styles.cancelFinishButton}
              >
                <Text style={styles.cancelFinishText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmNewMatch}
                style={styles.confirmFinishButton}
              >
                <Text style={styles.confirmFinishText}>Sim, iniciar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => !savingMatch && setFinishOpen(false)}
        transparent
        visible={finishOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.finishCard}>
            <View style={styles.finishIcon}>
              <Ionicons name="flag" size={22} color="#B7F36B" />
            </View>
            <Text style={styles.finishTitle}>Finalizar partida</Text>
            <Text style={styles.finishDescription}>Dê um nome para encontrar esta partida depois no histórico.</Text>
            <TextInput
              autoFocus
              editable={!savingMatch}
              maxLength={50}
              onChangeText={setMatchName}
              onSubmitEditing={finishMatch}
              placeholder="Ex.: Sexta na loja"
              placeholderTextColor="#71808E"
              returnKeyType="done"
              style={styles.matchNameInput}
              value={matchName}
            />
            {!!saveError && <Text style={styles.saveError}>{saveError}</Text>}
            <View style={styles.finishActions}>
              <Pressable
                accessibilityRole="button"
                disabled={savingMatch}
                onPress={() => setFinishOpen(false)}
                style={[styles.cancelFinishButton, savingMatch && styles.disabledButton]}
              >
                <Text style={styles.cancelFinishText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !matchName.trim() || savingMatch, busy: savingMatch }}
                disabled={!matchName.trim() || savingMatch}
                onPress={finishMatch}
                style={[styles.confirmFinishButton, (!matchName.trim() || savingMatch) && styles.disabledButton]}
              >
                <Text style={styles.confirmFinishText}>{savingMatch ? 'Salvando…' : 'Salvar partida'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101419' },
  playerPanel: { flex: 1, overflow: 'hidden' },
  panelContent: { flex: 1, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 18 },
  rotated: { transform: [{ rotate: '180deg' }] },
  panelHeader: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  colorButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 14 },
  colorButtonText: { fontSize: 12, fontWeight: '800' },
  paletteRow: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  selectedSwatch: { borderColor: '#FFFFFF', borderWidth: 3, transform: [{ scale: 1.12 }] },
  lifeControls: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adjustButton: { width: 54, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  disabledLifeButton: { opacity: 0.38 },
  lifeTotal: { flex: 1, textAlign: 'center', fontSize: 76, fontWeight: '900', fontVariant: ['tabular-nums'], marginHorizontal: 4 },
  resetButton: { position: 'absolute', top: '50%', left: '50%', marginLeft: -25, marginTop: -25, width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101419', borderWidth: 3, borderColor: '#F1F4F7', elevation: 6 },
  historyButton: { position: 'absolute', left: 16, bottom: 16, width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191F26', borderWidth: 1, borderColor: '#3A4652', elevation: 5 },
  finishButton: { position: 'absolute', right: 16, bottom: 16, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15, borderRadius: 16, backgroundColor: '#B7F36B', elevation: 5 },
  finishButtonText: { color: '#101419', fontSize: 13, fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.68)' },
  historyCard: { width: '100%', maxHeight: '78%', minHeight: 260, padding: 20, borderRadius: 24, backgroundColor: '#191F26', borderWidth: 1, borderColor: '#303A45' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  historyTitle: { color: '#F1F4F7', fontSize: 20, fontWeight: '900' },
  historySubtitle: { color: '#8A96A3', fontSize: 12, marginTop: 4 },
  closeButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#252D36' },
  emptyHistory: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  emptyHistoryTitle: { color: '#E7ECF1', fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptyHistoryText: { color: '#8A96A3', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  historyList: { gap: 10, paddingBottom: 4 },
  historyEntry: { padding: 14, borderRadius: 16, backgroundColor: '#222A33', borderWidth: 1, borderColor: '#303A45' },
  entryHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  entryNumber: { color: '#F1F4F7', fontSize: 13, fontWeight: '800' },
  entryTime: { color: '#8A96A3', fontSize: 12, fontVariant: ['tabular-nums'] },
  entryPlayers: { gap: 10 },
  entryPlayer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, borderTopWidth: 1, borderTopColor: '#303A45' },
  entryPlayerName: { color: '#8A96A3', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  entryLife: { fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  entryLifeUnit: { color: '#8A96A3', fontSize: 10, fontWeight: '700' },
  deltaIndicator: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 60, justifyContent: 'flex-end' },
  deltaValue: { fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  finishCard: { width: '100%', padding: 22, borderRadius: 24, backgroundColor: '#191F26', borderWidth: 1, borderColor: '#303A45' },
  finishIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(183,243,107,0.12)', marginBottom: 14 },
  finishTitle: { color: '#F1F4F7', fontSize: 22, fontWeight: '900' },
  finishDescription: { color: '#A2ADB8', fontSize: 14, lineHeight: 20, marginTop: 7 },
  matchNameInput: { height: 52, paddingHorizontal: 15, marginTop: 20, borderRadius: 15, borderWidth: 1, borderColor: '#3A4652', backgroundColor: '#101419', color: '#F1F4F7', fontSize: 15 },
  saveError: { color: '#FF777C', fontSize: 13, marginTop: 9 },
  finishActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelFinishButton: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#252D36' },
  cancelFinishText: { color: '#E7ECF1', fontSize: 14, fontWeight: '800' },
  confirmFinishButton: { flex: 1.3, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#B7F36B' },
  confirmFinishText: { color: '#101419', fontSize: 14, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
});
