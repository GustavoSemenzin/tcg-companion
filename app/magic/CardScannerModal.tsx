import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type CardScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectName: (name: string) => void;
};

export default function CardScannerModal({ visible, onClose, onSelectName }: CardScannerModalProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [error, setError] = useState('');

  const captureAndRead = async () => {
    if (!cameraReady || !cameraRef.current || scanning) return;
    setScanning(true);
    setCandidates([]);
    setError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) throw new Error('A foto nao foi capturada. Tente novamente.');

      const { extractTextFromImage, isSupported } = await import('expo-text-extractor');
      if (!isSupported) throw new Error('O reconhecimento de texto nao esta disponivel neste aparelho.');
      const recognized = await extractTextFromImage(photo.uri);
      const uniqueLines = Array.from(new Set(recognized.flatMap((text) => text.split(/\r?\n/))
        .map((line) => line.trim())
        .filter((line) => line.length >= 2 && line.length <= 60)));

      if (!uniqueLines.length) {
        setError('Nao encontramos texto legivel. Tente enquadrar melhor o topo da carta e evitar reflexos.');
      } else {
        setCandidates(uniqueLines.slice(0, 8));
      }
    } catch (captureError) {
      const message = captureError instanceof Error ? captureError.message : '';
      if (/native module|text extractor| ExpoTextExtractor/i.test(message)) {
        setError('O OCR precisa estar incluido em um novo APK. Instale uma build recente do app para usar o scanner.');
      } else {
        setError(message || 'Nao foi possivel ler a carta. Tente outra foto.');
      }
    } finally {
      setScanning(false);
    }
  };

  const resetCamera = () => {
    setCandidates([]);
    setError('');
    setCameraReady(false);
  };

  const close = () => {
    resetCamera();
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={close} statusBarTranslucent visible={visible}>
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setCameraReady(true)} />
        ) : null}

        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar scanner" onPress={close} style={styles.iconButton}>
            <Ionicons name="close" size={23} color="#F1F4F7" />
          </Pressable>
          <Text style={styles.topTitle}>Buscar pela camera</Text>
          <View style={styles.iconButton} />
        </View>

        {!permission ? (
          <View style={styles.centerMessage}><ActivityIndicator color="#B7F36B" /></View>
        ) : !permission.granted ? (
          <View style={styles.centerMessage}>
            <Ionicons name="camera-outline" size={42} color="#B7F36B" />
            <Text style={styles.messageTitle}>Permitir acesso a camera</Text>
            <Text style={styles.messageBody}>A camera sera usada para fotografar a carta e reconhecer o nome impresso.</Text>
            <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Permitir camera</Text>
            </Pressable>
          </View>
        ) : candidates.length > 0 ? (
          <View style={styles.candidatesPanel}>
            <View style={styles.resultIcon}><Ionicons name="text-outline" size={24} color="#B7F36B" /></View>
            <Text style={styles.messageTitle}>Escolha o nome da carta</Text>
            <Text style={styles.messageBody}>Se o texto reconhecido estiver incompleto, escolha o trecho que melhor corresponde ao nome.</Text>
            <ScrollView style={styles.candidateList} contentContainerStyle={styles.candidateContent}>
              {candidates.map((candidate, index) => (
                <Pressable key={`${index}-${candidate}`} accessibilityRole="button" onPress={() => { resetCamera(); onSelectName(candidate); }} style={styles.candidateButton}>
                  <Text numberOfLines={2} style={styles.candidateText}>{candidate}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#B7F36B" />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={resetCamera} style={styles.secondaryButton}>
              <Ionicons name="camera-outline" size={18} color="#F1F4F7" />
              <Text style={styles.secondaryButtonText}>Tentar outra foto</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraControls}>
            <View style={styles.frame} />
            <Text style={styles.hint}>Enquadre a carta inteira, com o nome visivel e boa iluminacao.</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Fotografar e reconhecer carta" disabled={!cameraReady || scanning} onPress={() => void captureAndRead()} style={[styles.captureButton, (!cameraReady || scanning) && styles.captureDisabled]}>
              {scanning ? <ActivityIndicator color="#101419" /> : <Ionicons name="camera" size={27} color="#101419" />}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101419' },
  topBar: { position: 'absolute', zIndex: 2, top: 0, left: 0, right: 0, paddingTop: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(16,20,25,0.82)' },
  topTitle: { color: '#F1F4F7', fontSize: 16, fontWeight: '800' },
  centerMessage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  messageTitle: { color: '#F1F4F7', fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  messageBody: { color: '#A2ADB8', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  primaryButton: { marginTop: 24, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14, backgroundColor: '#B7F36B' },
  primaryButtonText: { color: '#101419', fontSize: 14, fontWeight: '900' },
  cameraControls: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingBottom: 24 },
  frame: { width: '72%', aspectRatio: 0.718, borderWidth: 2, borderColor: '#B7F36B', borderRadius: 20, backgroundColor: 'rgba(16,20,25,0.12)' },
  hint: { color: '#F1F4F7', fontSize: 13, textAlign: 'center', marginTop: 20, paddingHorizontal: 32, textShadowColor: '#101419', textShadowRadius: 8 },
  errorText: { color: '#FF9B9F', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12, paddingHorizontal: 26 },
  captureButton: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', marginTop: 25, borderRadius: 34, borderWidth: 5, borderColor: '#F1F4F7', backgroundColor: '#B7F36B' },
  captureDisabled: { opacity: 0.55 },
  candidatesPanel: { flex: 1, alignItems: 'center', paddingTop: 125, paddingHorizontal: 20, paddingBottom: 28 },
  resultIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(183,243,107,0.1)' },
  candidateList: { width: '100%', marginTop: 18 },
  candidateContent: { gap: 9, paddingBottom: 12 },
  candidateButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#35414C', backgroundColor: '#191F26' },
  candidateText: { flex: 1, color: '#F1F4F7', fontSize: 14, fontWeight: '700' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 14, paddingHorizontal: 18 },
  secondaryButtonText: { color: '#F1F4F7', fontSize: 14, fontWeight: '800' },
});
