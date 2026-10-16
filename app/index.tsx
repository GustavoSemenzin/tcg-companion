import { useEffect, useRef, useState } from 'react';
import { Link } from 'expo-router';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const palette = {
  background: '#101419', surface: '#191F26', border: '#29313A', text: '#F1F4F7',
  muted: '#A2ADB8', accent: '#B7F36B', accentDark: '#26351B', purple: '#38245D',
};

const drawerWidth = Math.min(Dimensions.get('window').width * 0.84, 360);

export default function HomeScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const slideX = useRef(new Animated.Value(drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      slideX.setValue(drawerWidth);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(slideX, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [menuOpen, slideX, backdropOpacity]);

  function closeMenu() {
    Animated.parallel([
      Animated.timing(slideX, { toValue: drawerWidth, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setMenuOpen(false);
      setMenuMounted(false);
    });
  }

  return (
    <>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>MAGIC: THE GATHERING</Text>
            <Text style={styles.title}>Boa partida.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir ferramentas rápidas"
            onPress={() => setMenuOpen(true)}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Acompanhe suas partidas e tenha seu perfil e ferramentas sempre à mão.</Text>

        <Pressable accessibilityRole="button" style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>J</Text></View>
          <View style={styles.profileCopy}>
            <Text style={styles.cardLabel}>JOGADOR</Text>
            <Text style={styles.playerName}>Seu perfil</Text>
            <Text style={styles.muted}>Configure seu nome quando quiser</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Seus jogos</Text>
        <Link href="/magic" asChild>
          <Pressable accessibilityRole="button" style={styles.gameCard}>
            <View style={styles.gameLogo}>
              <Text style={styles.gameLogoMark}>M</Text>
              <Text style={styles.gameLogoFlame}>✦</Text>
            </View>
            <View style={styles.gameDetails}>
              <Text style={styles.gameName}>Magic: The Gathering</Text>
              <Text style={styles.muted}>Partidas, cartas e ferramentas</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Link>
      </ScrollView>

      <Modal
        visible={menuMounted}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <View style={styles.drawerRoot}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} accessibilityLabel="Fechar menu" />
          </Animated.View>
          <Animated.View style={[styles.drawer, { width: drawerWidth, transform: [{ translateX: slideX }] }]}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.cardLabel}>ATALHOS</Text>
                <Text style={styles.drawerTitle}>Ferramentas rápidas</Text>
              </View>
              <Pressable onPress={closeMenu} accessibilityRole="button" accessibilityLabel="Fechar menu" style={styles.closeButton}>
                <Text style={styles.closeIcon}>×</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" style={styles.toolCard}>
              <Text style={styles.toolIcon}>♥</Text>
              <View style={styles.toolCopy}>
                <Text style={styles.toolTitle}>Pontos de vida</Text>
                <Text style={styles.muted}>Abrir contador</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.toolCard}>
              <Text style={styles.toolIcon}>＋</Text>
              <View style={styles.toolCopy}>
                <Text style={styles.toolTitle}>Registrar partida</Text>
                <Text style={styles.muted}>Anotar resultado</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { padding: 24, paddingTop: 30, paddingBottom: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: palette.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 8 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 24 },
  menuButton: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  menuIcon: { color: palette.text, fontSize: 22, fontWeight: '700' },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 18 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.accentDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.accent, fontSize: 22, fontWeight: '800' },
  profileCopy: { flex: 1, marginLeft: 12 },
  cardLabel: { color: palette.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  playerName: { color: palette.text, fontSize: 17, fontWeight: '700', marginTop: 3 },
  muted: { color: palette.muted, fontSize: 12, marginTop: 4 },
  chevron: { color: palette.muted, fontSize: 27, marginLeft: 8 },
  sectionTitle: { color: palette.text, fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  gameCard: { flexDirection: 'row', alignItems: 'center', minHeight: 112, padding: 16, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  gameLogo: { width: 70, height: 78, borderRadius: 16, backgroundColor: palette.purple, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gameLogoMark: { color: '#F6F0FF', fontSize: 38, fontWeight: '900', fontStyle: 'italic' },
  gameLogoFlame: { position: 'absolute', color: palette.accent, fontSize: 15, top: 8, right: 10 },
  gameDetails: { flex: 1, marginLeft: 14 },
  gameName: { color: palette.text, fontWeight: '700', fontSize: 15 },
  drawerRoot: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.58)' },
  drawer: { height: '100%', backgroundColor: palette.background, paddingTop: 58, paddingHorizontal: 20, borderLeftWidth: 1, borderLeftColor: palette.border },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  drawerTitle: { color: palette.text, fontSize: 20, fontWeight: '800', marginTop: 6 },
  closeButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface },
  closeIcon: { color: palette.text, fontSize: 27, lineHeight: 30 },
  toolCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  toolIcon: { color: palette.accent, fontSize: 25, fontWeight: '700', width: 36 },
  toolCopy: { flex: 1 },
  toolTitle: { color: palette.text, fontWeight: '700', fontSize: 14 },
});
