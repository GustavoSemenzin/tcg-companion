import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const palette = {
  background: '#101419', surface: '#191F26', border: '#29313A', text: '#F1F4F7',
  muted: '#A2ADB8', accent: '#B7F36B',
};

const tools = [
  { title: 'Contador de vida', detail: 'Acompanhe os pontos durante a partida.', icon: 'heart-outline' as const, href: '/magic/life-counter' as const },
  { title: 'Histórico de partidas', detail: 'Consulte os resultados que registrou.', icon: 'time-outline' as const, href: '/magic/history' as const },
  { title: 'Busca de cartas', detail: 'Encontre cartas de Magic.', icon: 'search-outline' as const, href: '/magic/cards' as const },
];

export default function MagicScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>MAGIC: THE GATHERING</Text>
      <Text style={styles.title}>Seu espaço de Magic</Text>
      <Text style={styles.subtitle}>Escolha uma ferramenta para continuar.</Text>

      <View style={styles.grid}>
        {tools.map((tool) => (
          <Link key={tool.title} href={tool.href} asChild>
            <Pressable accessibilityRole="button" style={styles.card}>
              <View style={styles.iconBox}><Ionicons name={tool.icon} size={25} color={palette.accent} /></View>
              <Text style={styles.cardTitle}>{tool.title}</Text>
              <Text style={styles.cardDetail}>{tool.detail}</Text>
              <Text style={styles.cardArrow}>›</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  content: { padding: 24, paddingTop: 38, paddingBottom: 36 },
  eyebrow: { color: palette.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: palette.text, fontSize: 30, fontWeight: '800', marginTop: 8 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', minHeight: 164, padding: 15, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#26351B' },
  cardTitle: { color: palette.text, fontSize: 15, fontWeight: '700', marginTop: 15 },
  cardDetail: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  cardArrow: { position: 'absolute', right: 13, top: 12, color: palette.muted, fontSize: 22 },
});
