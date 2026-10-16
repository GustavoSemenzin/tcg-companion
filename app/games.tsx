import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const palette = {
  background: '#101419', surface: '#191F26', border: '#29313A', text: '#F1F4F7',
  muted: '#A2ADB8', accent: '#B7F36B', purple: '#38245D',
};

export default function GamesScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>SUA BIBLIOTECA</Text>
      <Text style={styles.title}>Jogos</Text>
      <Text style={styles.subtitle}>Escolha um jogo para acessar suas partidas e ferramentas.</Text>

      <Link href="/magic" asChild>
        <Pressable accessibilityRole="button" style={styles.gameCard}>
          <View style={styles.logo}>
            <Text style={styles.logoMark}>M</Text>
            <Text style={styles.logoSpark}>✦</Text>
          </View>
          <View style={styles.gameCopy}>
            <Text style={styles.gameName}>Magic: The Gathering</Text>
            <Text style={styles.gameSubtitle}>Partidas, cartas e ferramentas</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { padding: 24, paddingTop: 38, paddingBottom: 36 },
  eyebrow: { color: palette.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 8 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 24 },
  gameCard: { flexDirection: 'row', alignItems: 'center', minHeight: 112, padding: 16, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  logo: { width: 70, height: 78, borderRadius: 16, backgroundColor: palette.purple, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoMark: { color: '#F6F0FF', fontSize: 38, fontWeight: '900', fontStyle: 'italic' },
  logoSpark: { position: 'absolute', color: palette.accent, fontSize: 15, top: 8, right: 10 },
  gameCopy: { flex: 1, marginLeft: 14 },
  gameName: { color: palette.text, fontWeight: '700', fontSize: 15 },
  gameSubtitle: { color: palette.muted, fontSize: 12, marginTop: 5 },
  chevron: { color: palette.muted, fontSize: 27, marginLeft: 8 },
});
