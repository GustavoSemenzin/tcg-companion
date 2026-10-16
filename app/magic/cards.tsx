import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CardSearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>MAGIC: THE GATHERING</Text>
      <Text style={styles.title}>Busca de cartas</Text>
      <Text style={styles.body}>Digite o nome de uma carta para pesquisar.</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Ex.: Lightning Bolt"
        placeholderTextColor="#7E8995"
        autoCapitalize="words"
        returnKeyType="search"
        style={styles.input}
      />
      {query.length > 0 && (
        <Pressable accessibilityRole="button" style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Buscar “{query}”</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101419', padding: 24, paddingTop: 38 },
  kicker: { color: '#B7F36B', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#F1F4F7', fontSize: 28, fontWeight: '800', marginTop: 8 },
  body: { color: '#A2ADB8', fontSize: 14, lineHeight: 21, marginTop: 10 },
  input: { color: '#F1F4F7', fontSize: 15, marginTop: 24, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#191F26', borderWidth: 1, borderColor: '#29313A', borderRadius: 14 },
  searchButton: { alignSelf: 'flex-start', marginTop: 14, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 13, backgroundColor: '#26351B' },
  searchButtonText: { color: '#B7F36B', fontSize: 14, fontWeight: '700' },
});
