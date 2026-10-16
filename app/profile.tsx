import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>JOGADOR</Text>
      <Text style={styles.title}>Seu perfil</Text>
      <Text style={styles.body}>Aqui ficarão seus dados gerais e o resumo das suas partidas de Magic.</Text>
      <View style={styles.stats}><Text style={styles.number}>0</Text><Text style={styles.body}>partidas registradas</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#101419', padding: 24, paddingTop: 38 }, kicker: { color: '#B7F36B', fontWeight: '800', letterSpacing: 1.4, fontSize: 12 }, title: { color: '#F1F4F7', fontSize: 30, fontWeight: '800', marginTop: 8 }, body: { color: '#A2ADB8', fontSize: 15, lineHeight: 22, marginTop: 12 }, stats: { marginTop: 28, padding: 20, backgroundColor: '#191F26', borderColor: '#29313A', borderWidth: 1, borderRadius: 16 }, number: { color: '#B7F36B', fontSize: 34, fontWeight: '800' } });
