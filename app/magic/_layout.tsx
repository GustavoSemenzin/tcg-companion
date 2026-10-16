import { Stack } from 'expo-router';

export default function MagicLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#101419' } }} />;
}
