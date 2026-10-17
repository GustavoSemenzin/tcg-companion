import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Alert, Animated, AppState, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { clearCurrentMatch, getCurrentMatch, saveCurrentMatch, saveMatch, type CurrentMatchCache, type MatchSnapshotInput } from '../../lib/database';

const palettes = [
  { name: 'Vermelho', value: '#E53935', text: '#FFFFFF' },
  { name: 'Azul', value: '#315CF5', text: '#FFFFFF' },
  { name: 'Verde', value: '#159447', text: '#FFFFFF' },
  { name: 'Amarelo', value: '#F4C430', text: '#17191C' },
  { name: 'Roxo', value: '#853CC6', text: '#FFFFFF' },
  { name: 'Preto', value: '#282D33', text: '#FFFFFF' },
] as const;

type PlayerColor = (typeof palettes)[number]['value'];
type PlayerNumber = 1 | 2 | 3 | 4;

type LifeSnapshot = {
  id: string;
  lives: number[];
  createdAt: Date;
  event: MatchSnapshotInput['event'];
};

type PlayerPanelProps = {
  player: PlayerNumber;
  playerName: string;
  life: number;
  lifeDelta: { id: number; amount: number } | null;
  lifeDisabled: boolean;
  color: PlayerColor;
  pickerOpen: boolean;
  rotated: boolean;
  compact: boolean;
  grid: boolean;
  fullGridWidth: boolean;
  onLifeChange: (amount: number) => void;
  onTogglePicker: () => void;
  onChooseColor: (color: PlayerColor) => void;
};

function PlayerPanel({ player, playerName, life, lifeDelta, lifeDisabled, color, pickerOpen, rotated, compact, grid, fullGridWidth, onLifeChange, onTogglePicker, onChooseColor, onEditName }: PlayerPanelProps & { onEditName: () => void }) {
  const textColor = palettes.find((option) => option.value === color)?.text ?? '#FFFFFF';
  const deltaTranslateY = useRef(new Animated.Value(0)).current;
  const deltaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!lifeDelta) {
      deltaTranslateY.setValue(0);
      deltaOpacity.setValue(0);
      return;
    }

    const towardTop = lifeDelta.amount > 0 ? -1 : lifeDelta.amount < 0 ? 1 : 0;
    const panelRotation = rotated ? -1 : 1;
    const animation = Animated.parallel([
      Animated.timing(deltaTranslateY, {
        toValue: towardTop * panelRotation * 28,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(deltaOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.delay(350),
        Animated.timing(deltaOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]);
    animation.start();

    return () => animation.stop();
  }, [deltaOpacity, deltaTranslateY, lifeDelta, player]);

  return (
    <View style={[styles.playerPanel, compact && styles.compactPlayerPanel, grid && styles.gridPlayerPanel, fullGridWidth && styles.fullGridWidthPlayerPanel, { backgroundColor: color }]}>
      <View style={[styles.panelContent, compact && styles.compactPanelContent, rotated && styles.rotated]}>
        <View style={styles.panelHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Editar nome de ${playerName}`} onPress={onEditName} style={styles.playerNameButton}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.playerLabel, { color: textColor }]}>{playerName}</Text>
            <Ionicons name="pencil" size={12} color={textColor} />
          </Pressable>
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
          <View style={[styles.paletteRow, compact && styles.compactPaletteRow]}>
            {palettes.map((option) => (
              <Pressable
                key={option.name}
                accessibilityRole="button"
                accessibilityLabel={`Cor ${option.name} para jogador ${player}`}
                accessibilityState={{ selected: color === option.value }}
                onPress={() => onChooseColor(option.value)}
                style={[styles.swatch, compact && styles.compactSwatch, { backgroundColor: option.value }, color === option.value && styles.selectedSwatch]}
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
            style={[styles.adjustButton, compact && styles.compactAdjustButton, { backgroundColor: textColor === '#17191C' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.2)' }, lifeDisabled && styles.disabledLifeButton]}
          >
            <Ionicons name="remove" size={compact ? 25 : 34} color={textColor} />
          </Pressable>
          <View style={styles.lifeValueContainer}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.lifeTotal, compact && styles.compactLifeTotal, { color: textColor }]}>{life}</Text>
            {lifeDelta !== null && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.lifeDeltaBadge,
                  {
                    backgroundColor: lifeDelta.amount > 0 ? '#B7F36B' : lifeDelta.amount < 0 ? '#FF6268' : '#A2ADB8',
                    opacity: deltaOpacity,
                    transform: [{ translateY: deltaTranslateY }],
                  },
                ]}
              >
                <Ionicons name={lifeDelta.amount > 0 ? 'arrow-up' : lifeDelta.amount < 0 ? 'arrow-down' : 'remove'} size={14} color="#101419" />
                <Text style={styles.lifeDeltaText}>{lifeDelta.amount > 0 ? `+${lifeDelta.amount}` : lifeDelta.amount}</Text>
              </Animated.View>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Aumentar vida do jogador ${player}`}
            accessibilityState={{ disabled: lifeDisabled }}
            disabled={lifeDisabled}
            onPress={() => onLifeChange(1)}
            style={[styles.adjustButton, compact && styles.compactAdjustButton, { backgroundColor: textColor === '#17191C' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.2)' }, lifeDisabled && styles.disabledLifeButton]}
          >
            <Ionicons name="add" size={compact ? 25 : 34} color={textColor} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function LifeCounterScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  useFocusEffect(useCallback(() => {
    const tag = 'magic-life-counter';
    let isFocused = true;

    void activateKeepAwakeAsync(tag).then(() => {
      if (!isFocused) void deactivateKeepAwake(tag).catch(() => {});
    }).catch(() => {});

    return () => {
      isFocused = false;
      void deactivateKeepAwake(tag).catch(() => {});
    };
  }, []));

  const [hasStarted, setHasStarted] = useState(false);
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [startingLife, setStartingLife] = useState<20 | 25 | 30 | 40>(20);
  const [lives, setLives] = useState<number[]>([20, 20, 20, 20]);
  const [lifeDeltas, setLifeDeltas] = useState<Record<PlayerNumber, { id: number; amount: number } | null>>({ 1: null, 2: null, 3: null, 4: null });
  const [playerColors, setPlayerColors] = useState<PlayerColor[]>([palettes[1].value, palettes[0].value, palettes[2].value, palettes[4].value]);
  const [playerNames, setPlayerNames] = useState(['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4']);
  const [openPicker, setOpenPicker] = useState<PlayerNumber | null>(null);
  const [history, setHistory] = useState<LifeSnapshot[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [multiplayerMenuOpen, setMultiplayerMenuOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [playerNameEditor, setPlayerNameEditor] = useState<PlayerNumber | null>(null);
  const [playerNameDraft, setPlayerNameDraft] = useState('');
  const [playerCountSelection, setPlayerCountSelection] = useState<2 | 3 | 4>(2);
  const [startingLifeSelection, setStartingLifeSelection] = useState<20 | 25 | 30 | 40>(20);
  const [startConfirmationOpen, setStartConfirmationOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [matchName, setMatchName] = useState('');
  const [winnerPlayerSelection, setWinnerPlayerSelection] = useState<PlayerNumber | null>(null);
  const [md3PlayerOneWins, setMd3PlayerOneWins] = useState('');
  const [md3PlayerTwoWins, setMd3PlayerTwoWins] = useState('');
  const [savingMatch, setSavingMatch] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const matchStartedAt = useRef(new Date());
  const latestLives = useRef<number[]>([20, 20, 20, 20]);
  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lifeDeltaTimers = useRef<Partial<Record<PlayerNumber, ReturnType<typeof setTimeout>>>>({});
  const lifeDeltaTotals = useRef<Partial<Record<PlayerNumber, number>>>({});
  const lifeDeltaIds = useRef<Partial<Record<PlayerNumber, number>>>({});
  const longPressTriggered = useRef(false);
  const pendingSnapshotEvent = useRef<'life_change' | 'restart'>('life_change');
  const currentMatchCache = useRef<CurrentMatchCache | null>(null);
  const orientationLockQueue = useRef<Promise<void>>(Promise.resolve());

  useFocusEffect(useCallback(() => {
    const orientation = playerCount > 2
      ? ScreenOrientation.OrientationLock.LANDSCAPE
      : ScreenOrientation.OrientationLock.PORTRAIT_UP;
    orientationLockQueue.current = orientationLockQueue.current
      .then(() => ScreenOrientation.lockAsync(orientation))
      .catch(() => {});

    return () => {
      orientationLockQueue.current = orientationLockQueue.current
        .then(() => ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP))
        .catch(() => {});
    };
  }, [playerCount]));

  useFocusEffect(useCallback(() => {
    const tabNavigator = navigation.getParent();
    tabNavigator?.setOptions({
      tabBarStyle: playerCount > 2
        ? { display: 'none' }
        : { backgroundColor: '#191F26', borderTopColor: '#29313A' },
    });

    return () => {
      tabNavigator?.setOptions({ tabBarStyle: { backgroundColor: '#191F26', borderTopColor: '#29313A' } });
    };
  }, [navigation, playerCount]));

  useEffect(() => () => {
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    if (startHoldTimer.current) clearTimeout(startHoldTimer.current);
    Object.values(lifeDeltaTimers.current).forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    void getCurrentMatch().then((cached) => {
      if (!isMounted) return;
      if (cached) {
        const restoredPlayerCount: 2 | 3 | 4 = cached.playerCount === 3 || cached.playerCount === 4 ? cached.playerCount : 2;
        const restoredStartingLife: 20 | 25 | 30 | 40 = cached.startingLife === 25 || cached.startingLife === 30 || cached.startingLife === 40 ? cached.startingLife : 20;
        const cachedLives = cached.lives ?? [cached.lifeOne, cached.lifeTwo, restoredStartingLife, restoredStartingLife];
        const restoredLives = Array.from({ length: 4 }, (_, index) => cachedLives[index] ?? restoredStartingLife);
        const cachedColors = cached.playerColors ?? [cached.playerOneColor, cached.playerTwoColor, palettes[2].value, palettes[4].value];
        const restoredColors = Array.from({ length: 4 }, (_, index) => cachedColors[index] ?? palettes[index].value) as PlayerColor[];
        const restoredNames = Array.from({ length: 4 }, (_, index) => cached.playerNames?.[index]?.trim() || `Jogador ${index + 1}`);
        const restoredHistory: LifeSnapshot[] = cached.history.map((entry) => ({
          id: entry.id,
          lives: entry.lives ?? [entry.lifeOne, entry.lifeTwo, entry.lifeThree ?? restoredStartingLife, entry.lifeFour ?? restoredStartingLife],
          createdAt: new Date(entry.createdAt),
          event: entry.event,
        }));
        if (cached.hasStarted && cached.hasPendingSnapshot) {
          restoredHistory.unshift({
            id: `recovered-${Date.now()}`,
            lives: restoredLives.slice(0, restoredPlayerCount),
            createdAt: new Date(cached.updatedAt),
            event: cached.pendingSnapshotEvent,
          });
        }

        setHasStarted(cached.hasStarted);
        setPlayerCount(restoredPlayerCount);
        setStartingLife(restoredStartingLife);
        setLives(restoredLives);
        latestLives.current = restoredLives;
        setPlayerColors(restoredColors);
        setPlayerNames(restoredNames);
        setHistory(restoredHistory);
        matchStartedAt.current = new Date(cached.startedAt);
        pendingSnapshotEvent.current = 'life_change';
      }
      setCacheLoaded(true);
    }).catch(() => {
      if (isMounted) setCacheLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  currentMatchCache.current = {
    hasStarted,
    startedAt: matchStartedAt.current.toISOString(),
    lifeOne: lives[0],
    lifeTwo: lives[1],
    playerOneColor: playerColors[0],
    playerTwoColor: playerColors[1],
    playerCount,
    startingLife,
    lives,
    playerColors,
    playerNames,
    history: history.map((entry) => ({
      id: entry.id,
      lifeOne: entry.lives[0],
      lifeTwo: entry.lives[1],
      lifeThree: entry.lives[2],
      lifeFour: entry.lives[3],
      lives: entry.lives,
      createdAt: entry.createdAt.toISOString(),
      event: entry.event,
    })),
    pendingSnapshotEvent: pendingSnapshotEvent.current,
    hasPendingSnapshot: snapshotTimer.current !== null,
    updatedAt: new Date().toISOString(),
  };

  useEffect(() => {
    if (!cacheLoaded || savingMatch || !currentMatchCache.current) return;
    void saveCurrentMatch(currentMatchCache.current).catch(() => {});
  }, [cacheLoaded, hasStarted, playerCount, startingLife, lives, playerColors, playerNames, history, savingMatch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if ((state === 'inactive' || state === 'background') && !savingMatch && currentMatchCache.current) {
        void saveCurrentMatch(currentMatchCache.current).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [savingMatch]);

  const scheduleSnapshot = (event: 'life_change' | 'restart' = 'life_change') => {
    if (event === 'restart') pendingSnapshotEvent.current = 'restart';
    else if (pendingSnapshotEvent.current !== 'restart') pendingSnapshotEvent.current = 'life_change';
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(() => {
      const snapshot = latestLives.current.slice(0, playerCount);
      setHistory((entries) => [{
        id: `${Date.now()}-${Math.random()}`,
        lives: snapshot,
        createdAt: new Date(),
        event: pendingSnapshotEvent.current,
      }, ...entries]);
      pendingSnapshotEvent.current = 'life_change';
      snapshotTimer.current = null;
    }, 1000);
  };

  const changeLife = (player: PlayerNumber, amount: number) => {
    const next = [...latestLives.current];
    next[player - 1] += amount;
    latestLives.current = next;
    setLives(next);
    if (lifeDeltaTimers.current[player]) clearTimeout(lifeDeltaTimers.current[player]);
    const totalDelta = (lifeDeltaTotals.current[player] ?? 0) + amount;
    lifeDeltaTotals.current[player] = totalDelta;
    const indicatorId = Date.now() + Math.random();
    lifeDeltaIds.current[player] = indicatorId;
    setLifeDeltas((current) => ({ ...current, [player]: { id: indicatorId, amount: totalDelta } }));
    lifeDeltaTimers.current[player] = setTimeout(() => {
      if (lifeDeltaIds.current[player] !== indicatorId) return;
      lifeDeltaTotals.current[player] = 0;
      lifeDeltaIds.current[player] = undefined;
      lifeDeltaTimers.current[player] = undefined;
      setLifeDeltas((current) => current[player]?.id === indicatorId ? { ...current, [player]: null } : current);
    }, 1000);
    scheduleSnapshot();
  };

  const clearLifeDeltaIndicators = () => {
    Object.values(lifeDeltaTimers.current).forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
    lifeDeltaTimers.current = {};
    lifeDeltaTotals.current = {};
    lifeDeltaIds.current = {};
    setLifeDeltas({ 1: null, 2: null, 3: null, 4: null });
  };

  const confirmNewMatch = () => {
    clearLifeDeltaIndicators();
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = null;
    const startedAt = new Date();
    const startingLives = Array(4).fill(startingLife) as number[];
    latestLives.current = startingLives;
    setLives(startingLives);
    setOpenPicker(null);
    setHistory([{
      id: `${startedAt.getTime()}-start`,
      lives: startingLives.slice(0, playerCount),
      createdAt: startedAt,
      event: 'start',
    }]);
    pendingSnapshotEvent.current = 'life_change';
    matchStartedAt.current = startedAt;
    setHasStarted(true);
    setStartConfirmationOpen(false);
  };

  const resetLivesOnly = () => {
    clearLifeDeltaIndicators();
    const startingLives = Array(4).fill(startingLife) as number[];
    latestLives.current = startingLives;
    setLives(startingLives);
    setOpenPicker(null);
    if (hasStarted) scheduleSnapshot('restart');
  };

  const openFinishDialog = () => {
    setMatchName('');
    setWinnerPlayerSelection(null);
    setMd3PlayerOneWins('');
    setMd3PlayerTwoWins('');
    setSaveError('');
    setFinishOpen(true);
  };

  const md3Score = [Number(md3PlayerOneWins), Number(md3PlayerTwoWins)] as [number, number];
  const md3ScoreIsValid = /^\d$/.test(md3PlayerOneWins)
    && /^\d$/.test(md3PlayerTwoWins)
    && ((md3Score[0] === 2 && md3Score[1] <= 1) || (md3Score[1] === 2 && md3Score[0] <= 1));
  const finishResultIsValid = playerCount > 2 ? winnerPlayerSelection !== null : md3ScoreIsValid;

  const finishMatch = async () => {
    const trimmedName = matchName.trim();
    if (!hasStarted || !trimmedName || !finishResultIsValid || savingMatch) return;

    setSavingMatch(true);
    setSaveError('');
    const finishedAt = new Date();
    const currentLives = latestLives.current.slice(0, playerCount);
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = null;
    const snapshots: MatchSnapshotInput[] = history
      .slice()
      .reverse()
      .map((entry) => ({
        lifeOne: entry.lives[0],
        lifeTwo: entry.lives[1],
        lifeThree: entry.lives[2],
        lifeFour: entry.lives[3],
        lives: entry.lives,
        recordedAt: entry.createdAt.toISOString(),
        event: entry.event,
      }));

    if (pendingSnapshotEvent.current === 'restart') {
      snapshots.push({
        lifeOne: currentLives[0],
        lifeTwo: currentLives[1],
        lifeThree: currentLives[2],
        lifeFour: currentLives[3],
        lives: currentLives,
        recordedAt: finishedAt.toISOString(),
        event: 'restart',
      });
    }
    pendingSnapshotEvent.current = 'life_change';

    snapshots.push({
      lifeOne: currentLives[0],
      lifeTwo: currentLives[1],
      lifeThree: currentLives[2],
      lifeFour: currentLives[3],
      lives: currentLives,
      recordedAt: finishedAt.toISOString(),
      event: 'finish',
      isFinal: true,
    });

    try {
      await saveMatch({
        name: trimmedName,
        startedAt: matchStartedAt.current.toISOString(),
        finishedAt: finishedAt.toISOString(),
        finalLifeOne: currentLives[0],
        finalLifeTwo: currentLives[1],
        playerOneColor: playerColors[0],
        playerTwoColor: playerColors[1],
        playerCount,
        startingLife,
        finalLives: currentLives,
        playerColors: playerColors.slice(0, playerCount),
        playerNames: playerNames.slice(0, playerCount),
        winnerPlayer: playerCount > 2 ? winnerPlayerSelection : null,
        md3Score: playerCount === 2 ? md3Score : null,
        snapshots,
      });
      await clearCurrentMatch();
      setFinishOpen(false);
      router.replace('/magic/history');
    } catch {
      setSaveError('Não foi possível salvar a partida. Tente novamente.');
      setSavingMatch(false);
    }
  };

  const applyConfiguration = () => {
    const apply = () => {
      const now = new Date();
      const initialLives = Array(4).fill(startingLifeSelection) as number[];
      clearLifeDeltaIndicators();
      if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
      snapshotTimer.current = null;
      latestLives.current = initialLives;
      setLives(initialLives);
      setPlayerCount(playerCountSelection);
      setStartingLife(startingLifeSelection);
      setHistory([]);
      setHasStarted(false);
      setOpenPicker(null);
      pendingSnapshotEvent.current = 'life_change';
      matchStartedAt.current = now;
      setConfigOpen(false);
    };

    if (hasStarted) {
      Alert.alert(
        'Reconfigurar partida?',
        'Isso vai reiniciar a partida atual e apagar o histórico momentâneo que ainda não foi salvo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reconfigurar', style: 'destructive', onPress: apply },
        ],
      );
      return;
    }

    apply();
  };

  const openConfiguration = () => {
    setPlayerCountSelection(playerCount);
    setStartingLifeSelection(startingLife);
    setConfigOpen(true);
  };

  const orderedPlayers: PlayerNumber[] = playerCount === 2
    ? [2, 1]
    : playerCount === 3
      ? [2, 3, 1]
      : [1, 2, 3, 4];

  return (
    <View pointerEvents={cacheLoaded ? 'auto' : 'none'} style={styles.screen}>
      <StatusBar hidden />
      <View key={`players-${playerCount}`} style={[styles.playersContainer, playerCount > 2 ? styles.multiplayerContainer : styles.twoPlayerContainer]}>
        {orderedPlayers.map((player) => {
          const isRotated = playerCount === 2 ? player === 2 : playerCount === 3 ? player !== 1 : player <= 2;
          return (
            <PlayerPanel
              key={`${playerCount}-${player}`}
              player={player}
              playerName={playerNames[player - 1]}
              life={lives[player - 1]}
              lifeDelta={lifeDeltas[player]}
              lifeDisabled={!hasStarted}
              color={playerColors[player - 1]}
              pickerOpen={openPicker === player}
              rotated={isRotated}
              compact={playerCount > 2}
              grid={playerCount > 2}
              fullGridWidth={playerCount === 3 && player === 1}
              onLifeChange={(amount) => changeLife(player, amount)}
              onTogglePicker={() => setOpenPicker((current) => current === player ? null : player)}
              onChooseColor={(color) => {
                setPlayerColors((current) => current.map((item, index) => index === player - 1 ? color : item));
                setOpenPicker(null);
              }}
              onEditName={() => {
                setPlayerNameDraft(playerNames[player - 1]);
                setPlayerNameEditor(player);
              }}
            />
          );
        })}
      </View>
      {playerCount === 2 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Configurar partida atual"
          onPress={openConfiguration}
          style={styles.configButton}
        >
          <Ionicons name="settings-outline" size={19} color="#F1F4F7" />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir menu multiplayer"
          accessibilityState={{ expanded: multiplayerMenuOpen }}
          onPress={() => setMultiplayerMenuOpen(true)}
          style={styles.multiplayerMenuButton}
        >
          <Ionicons name="menu" size={17} color="#101419" />
        </Pressable>
      )}
      <Modal animationType="fade" onRequestClose={() => setMultiplayerMenuOpen(false)} transparent visible={multiplayerMenuOpen}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMultiplayerMenuOpen(false)}>
          <Pressable style={styles.multiplayerMenuCard} onPress={() => {}}>
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuKicker}>MULTIPLAYER</Text>
                <Text style={styles.menuTitle}>Menu da partida</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu multiplayer" onPress={() => setMultiplayerMenuOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#E7ECF1" />
              </Pressable>
            </View>
            <Text style={styles.menuSubtitle}>{playerCount} jogadores · {startingLife} pontos de vida iniciais</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setMultiplayerMenuOpen(false); openConfiguration(); }}
              style={styles.menuAction}
            >
              <View style={styles.menuActionIcon}><Ionicons name="settings-outline" size={19} color="#B7F36B" /></View>
              <Text style={styles.menuActionText}>Configurar partida</Text>
              <Ionicons name="chevron-forward" size={18} color="#71808E" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setMultiplayerMenuOpen(false); setHistoryOpen(true); }}
              style={styles.menuAction}
            >
              <View style={styles.menuActionIcon}><Ionicons name="time-outline" size={19} color="#B7F36B" /></View>
              <Text style={styles.menuActionText}>Histórico da partida</Text>
              <Ionicons name="chevron-forward" size={18} color="#71808E" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasStarted }}
              disabled={!hasStarted}
              onPress={() => { setMultiplayerMenuOpen(false); openFinishDialog(); }}
              style={[styles.menuAction, !hasStarted && styles.menuActionDisabled]}
            >
              <View style={styles.menuActionIcon}><Ionicons name="flag-outline" size={19} color={!hasStarted ? '#71808E' : '#B7F36B'} /></View>
              <Text style={[styles.menuActionText, !hasStarted && styles.menuActionTextDisabled]}>Finalizar partida</Text>
              <Ionicons name="chevron-forward" size={18} color="#71808E" />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal animationType="fade" onRequestClose={() => setPlayerNameEditor(null)} transparent visible={playerNameEditor !== null}>
        <View style={styles.modalBackdrop}>
          <View style={styles.finishCard}>
            <View style={styles.finishIcon}><Ionicons name="person-outline" size={22} color="#B7F36B" /></View>
            <Text style={styles.finishTitle}>Nome do jogador {playerNameEditor}</Text>
            <TextInput
              autoFocus
              maxLength={18}
              onChangeText={setPlayerNameDraft}
              onSubmitEditing={() => {
                if (playerNameEditor === null) return;
                const name = playerNameDraft.trim() || `Jogador ${playerNameEditor}`;
                setPlayerNames((current) => current.map((item, index) => index === playerNameEditor - 1 ? name : item));
                setPlayerNameEditor(null);
              }}
              placeholder={`Jogador ${playerNameEditor}`}
              placeholderTextColor="#71808E"
              returnKeyType="done"
              selectTextOnFocus
              style={styles.matchNameInput}
              value={playerNameDraft}
            />
            <View style={styles.finishActions}>
              <Pressable accessibilityRole="button" onPress={() => setPlayerNameEditor(null)} style={styles.cancelFinishButton}>
                <Text style={styles.cancelFinishText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (playerNameEditor === null) return;
                  const name = playerNameDraft.trim() || `Jogador ${playerNameEditor}`;
                  setPlayerNames((current) => current.map((item, index) => index === playerNameEditor - 1 ? name : item));
                  setPlayerNameEditor(null);
                }}
                style={styles.confirmFinishButton}
              >
                <Text style={styles.confirmFinishText}>Salvar nome</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal animationType="fade" onRequestClose={() => setConfigOpen(false)} transparent visible={configOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.finishCard}>
            <View style={styles.finishIcon}><Ionicons name="settings" size={22} color="#B7F36B" /></View>
            <Text style={styles.finishTitle}>{playerCountSelection > 2 ? 'Configurar Multiplayer' : 'Configurar partida'}</Text>
            <Text style={styles.configLabel}>NÚMERO DE JOGADORES</Text>
            <View style={styles.configChoices}>
              {([2, 3, 4] as const).map((count) => (
                <Pressable key={count} onPress={() => setPlayerCountSelection(count)} style={[styles.configChoice, playerCountSelection === count && styles.configChoiceSelected]}>
                  <Text style={[styles.configChoiceText, playerCountSelection === count && styles.configChoiceTextSelected]}>{count}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.configLabel}>VIDA INICIAL POR JOGADOR</Text>
            <View style={styles.configChoices}>
              {([20, 25, 30, 40] as const).map((life) => (
                <Pressable key={life} onPress={() => setStartingLifeSelection(life)} style={[styles.configChoice, startingLifeSelection === life && styles.configChoiceSelected]}>
                  <Text style={[styles.configChoiceText, startingLifeSelection === life && styles.configChoiceTextSelected]}>{life}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.configWarning}>Aplicar as configurações reinicia as vidas e limpa o histórico momentâneo.</Text>
            <View style={styles.finishActions}>
              <Pressable accessibilityRole="button" onPress={() => setConfigOpen(false)} style={styles.cancelFinishButton}>
                <Text style={styles.cancelFinishText}>Cancelar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={applyConfiguration} style={styles.confirmFinishButton}>
                <Text style={styles.confirmFinishText}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reiniciar os pontos de vida"
        accessibilityHint={`Toque para voltar a vida dos jogadores para ${startingLife}. Segure por 1 segundo para iniciar uma nova partida.`}
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
          }, 1000);
        }}
        onPressOut={() => {
          if (startHoldTimer.current) clearTimeout(startHoldTimer.current);
          startHoldTimer.current = null;
        }}
        style={[styles.resetButton, playerCount > 2 && styles.multiplayerResetButton]}
      >
        <Ionicons name={hasStarted ? 'refresh' : 'play'} size={18} color={hasStarted ? '#F1F4F7' : '#B7F36B'} />
      </Pressable>
      {playerCount === 2 && <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir histórico da partida, ${history.length} registros`}
        accessibilityState={{ expanded: historyOpen }}
        onPress={() => setHistoryOpen(true)}
        style={styles.historyButton}
      >
        <Ionicons name="time-outline" size={20} color="#F1F4F7" />
      </Pressable>}
      {playerCount === 2 && <Pressable
        accessibilityRole="button"
        accessibilityLabel="Finalizar partida"
        disabled={!hasStarted}
        onPress={openFinishDialog}
        style={[styles.finishButton, !hasStarted && styles.disabledButton]}
      >
        <Ionicons name="flag-outline" size={18} color="#101419" />
        <Text style={styles.finishButtonText}>Finalizar</Text>
      </Pressable>}

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
                <Text style={styles.historySubtitle}>Registro após 1 segundo sem ajustes de vida</Text>
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
                <Text style={styles.emptyHistoryText}>Altere os pontos de vida. O estado da partida será salvo aqui após 1 segundo.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.historyList}>
                {history.map((entry, index) => {
                  const previousEntry = history[index + 1];
                  const players = entry.lives.slice(0, playerCount).map((life, playerIndex) => ({
                    number: playerIndex + 1,
                    life,
                    previousLife: previousEntry?.lives[playerIndex],
                    color: playerColors[playerIndex],
                  }));

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
                                <Text numberOfLines={1} style={styles.entryPlayerName}>{playerNames[player.number - 1].toUpperCase()}</Text>
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
              Os pontos de vida dos {playerCount} jogadores voltarão para {startingLife} e um novo histórico começará. O registro da partida atual será descartado se ainda não tiver sido finalizada.
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
            <Text style={styles.resultLabel}>{playerCount > 2 ? 'QUEM VENCEU?' : 'PLACAR DA MD3 (MELHOR DE TRÊS)'}</Text>
            {playerCount > 2 ? (
              <View style={styles.winnerChoices}>
                {playerNames.slice(0, playerCount).map((name, index) => {
                  const player = (index + 1) as PlayerNumber;
                  const selected = winnerPlayerSelection === player;
                  return (
                    <Pressable
                      key={player}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setWinnerPlayerSelection(player)}
                      style={[styles.winnerChoice, selected && styles.winnerChoiceSelected]}
                    >
                      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? '#B7F36B' : '#71808E'} />
                      <Text numberOfLines={1} style={[styles.winnerChoiceText, selected && styles.winnerChoiceTextSelected]}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View>
                <Text style={styles.resultHint}>Informe quantos jogos cada jogador venceu: 2–0 ou 2–1.</Text>
                <View style={styles.md3ScoreRow}>
                  {[1, 2].map((player) => {
                    const name = playerNames[player - 1];
                    const value = player === 1 ? md3PlayerOneWins : md3PlayerTwoWins;
                    const onChangeText = player === 1 ? setMd3PlayerOneWins : setMd3PlayerTwoWins;
                    return (
                      <View key={player} style={styles.md3PlayerScore}>
                        <Text numberOfLines={1} style={styles.md3PlayerName}>{name}</Text>
                        <TextInput
                          editable={!savingMatch}
                          keyboardType="number-pad"
                          maxLength={1}
                          onChangeText={(text) => onChangeText(text.replace(/[^0-2]/g, ''))}
                          selectTextOnFocus
                          style={styles.md3ScoreInput}
                          value={value}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
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
                accessibilityState={{ disabled: !matchName.trim() || !finishResultIsValid || savingMatch, busy: savingMatch }}
                disabled={!matchName.trim() || !finishResultIsValid || savingMatch}
                onPress={finishMatch}
                style={[styles.confirmFinishButton, (!matchName.trim() || !finishResultIsValid || savingMatch) && styles.disabledButton]}
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
  playersContainer: { flex: 1, flexDirection: 'column' },
  twoPlayerContainer: { flexDirection: 'column', flexWrap: 'nowrap' },
  multiplayerContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  playerPanel: { flex: 1, minHeight: 0, overflow: 'hidden' },
  compactPlayerPanel: { borderWidth: 1, borderColor: '#101419' },
  gridPlayerPanel: { flex: 0, width: '50%', height: '50%' },
  fullGridWidthPlayerPanel: { width: '100%' },
  panelContent: { flex: 1, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 18 },
  compactPanelContent: { paddingHorizontal: 10, paddingTop: 9, paddingBottom: 10 },
  rotated: { transform: [{ rotate: '180deg' }] },
  panelHeader: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerNameButton: { maxWidth: '75%', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingRight: 6 },
  playerLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  colorButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 14 },
  colorButtonText: { fontSize: 12, fontWeight: '800' },
  paletteRow: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  compactPaletteRow: { height: 34 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  compactSwatch: { width: 22, height: 22, borderRadius: 11 },
  selectedSwatch: { borderColor: '#FFFFFF', borderWidth: 3, transform: [{ scale: 1.12 }] },
  lifeControls: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adjustButton: { width: 54, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  compactAdjustButton: { width: 40, height: 46, borderRadius: 14 },
  disabledLifeButton: { opacity: 0.38 },
  lifeValueContainer: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative', marginHorizontal: 4 },
  lifeTotal: { textAlign: 'center', fontSize: 76, fontWeight: '900', fontVariant: ['tabular-nums'] },
  compactLifeTotal: { fontSize: 52 },
  lifeDeltaBadge: { position: 'absolute', top: '18%', minWidth: 42, flexDirection: 'row', gap: 2, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lifeDeltaText: { color: '#101419', fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  resetButton: { position: 'absolute', top: '50%', left: '50%', marginLeft: -25, marginTop: -25, width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101419', borderWidth: 3, borderColor: '#F1F4F7', elevation: 6 },
  multiplayerResetButton: { top: '50%', left: '50%', marginLeft: -48, marginTop: -19, right: 'auto', bottom: 'auto', width: 38, height: 38, borderRadius: 13 },
  configButton: { position: 'absolute', top: 16, right: 16, zIndex: 10, width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191F26', borderWidth: 1, borderColor: '#3A4652', elevation: 5 },
  multiplayerMenuButton: { position: 'absolute', zIndex: 20, top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginLeft: 4, marginTop: -19, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#B7F36B', elevation: 8 },
  multiplayerMenuButtonText: { color: '#101419', fontSize: 13, fontWeight: '900' },
  menuBackdrop: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 18, backgroundColor: 'rgba(0,0,0,0.62)' },
  multiplayerMenuCard: { width: 310, maxWidth: '100%', padding: 18, borderRadius: 22, backgroundColor: '#191F26', borderWidth: 1, borderColor: '#303A45', elevation: 12 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  menuKicker: { color: '#B7F36B', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  menuTitle: { color: '#F1F4F7', fontSize: 20, fontWeight: '900', marginTop: 3 },
  menuSubtitle: { color: '#8A96A3', fontSize: 12, marginTop: 9, marginBottom: 12 },
  menuAction: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 10, marginTop: 7, borderRadius: 15, backgroundColor: '#222A33' },
  menuActionIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(183,243,107,0.1)' },
  menuActionText: { flex: 1, color: '#E7ECF1', fontSize: 14, fontWeight: '800' },
  menuActionDisabled: { opacity: 0.5 },
  menuActionTextDisabled: { color: '#71808E' },
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
  configLabel: { color: '#8A96A3', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  configChoices: { flexDirection: 'row', gap: 9 },
  configChoice: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#101419', borderWidth: 1, borderColor: '#3A4652' },
  configChoiceSelected: { backgroundColor: 'rgba(183,243,107,0.12)', borderColor: '#B7F36B' },
  configChoiceText: { color: '#A2ADB8', fontSize: 16, fontWeight: '900' },
  configChoiceTextSelected: { color: '#B7F36B' },
  configWarning: { color: '#8A96A3', fontSize: 12, lineHeight: 18, marginTop: 16 },
  finishIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(183,243,107,0.12)', marginBottom: 14 },
  finishTitle: { color: '#F1F4F7', fontSize: 22, fontWeight: '900' },
  finishDescription: { color: '#A2ADB8', fontSize: 14, lineHeight: 20, marginTop: 7 },
  matchNameInput: { height: 52, paddingHorizontal: 15, marginTop: 20, borderRadius: 15, borderWidth: 1, borderColor: '#3A4652', backgroundColor: '#101419', color: '#F1F4F7', fontSize: 15 },
  resultLabel: { color: '#B7F36B', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  resultHint: { color: '#8A96A3', fontSize: 12, marginBottom: 8 },
  winnerChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  winnerChoice: { minHeight: 42, minWidth: '47%', maxWidth: '100%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderRadius: 13, backgroundColor: '#101419', borderWidth: 1, borderColor: '#3A4652' },
  winnerChoiceSelected: { borderColor: '#B7F36B', backgroundColor: 'rgba(183,243,107,0.1)' },
  winnerChoiceText: { flex: 1, color: '#A2ADB8', fontSize: 13, fontWeight: '800' },
  winnerChoiceTextSelected: { color: '#F1F4F7' },
  md3ScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  md3PlayerScore: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 9, borderRadius: 14, backgroundColor: '#101419' },
  md3PlayerName: { flex: 1, color: '#E7ECF1', fontSize: 12, fontWeight: '800' },
  md3ScoreInput: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#3A4652', color: '#B7F36B', textAlign: 'center', fontSize: 20, fontWeight: '900' },
  saveError: { color: '#FF777C', fontSize: 13, marginTop: 9 },
  finishActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelFinishButton: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#252D36' },
  cancelFinishText: { color: '#E7ECF1', fontSize: 14, fontWeight: '800' },
  confirmFinishButton: { flex: 1.3, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#B7F36B' },
  confirmFinishText: { color: '#101419', fontSize: 14, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
});
