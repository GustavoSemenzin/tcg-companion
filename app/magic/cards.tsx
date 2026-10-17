import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import CardScannerModal from './CardScannerModal';

type ScryfallCard = {
  id: string;
  name: string;
  type_line: string;
  set_name: string;
  prints_search_uri?: string;
  oracle_id?: string;
  collector_number?: string;
  released_at?: string;
  image_uris?: { small?: string; normal?: string; large?: string };
  card_faces?: Array<{ image_uris?: { small?: string; normal?: string; large?: string } }>;
};

type ScryfallSearchResponse = {
  data?: ScryfallCard[];
  details?: string;
  next_page?: string;
};

function getCardImageSources(card: ScryfallCard) {
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris;
  return [images?.small, images?.normal, images?.large].filter((image): image is string => Boolean(image));
}

export default function CardSearchScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cardWidth = Math.max(120, (screenWidth - 52) / 2);
  const modalImageWidth = Math.min(screenWidth - 36, (screenHeight - 170) * 0.718);
  const [query, setQuery] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [error, setError] = useState('');
  const [imageFallbacks, setImageFallbacks] = useState<Record<string, number>>({});
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [variants, setVariants] = useState<ScryfallCard[]>([]);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsError, setVariantsError] = useState('');
  const [variantImageErrors, setVariantImageErrors] = useState<Record<string, boolean>>({});
  const [carouselKey, setCarouselKey] = useState(0);
  const [printsCache, setPrintsCache] = useState<Record<string, ScryfallCard[]>>({});
  const variantsController = useRef<AbortController | null>(null);
  const normalizedQuery = query.trim();
  const selectedVariant = variants[activeVariantIndex] ?? selectedCard;

  const openCardVariants = async (card: ScryfallCard) => {
    variantsController.current?.abort();
    const cacheKey = card.oracle_id ?? card.id;
    setSelectedCard(card);
    setVariants([card]);
    setActiveVariantIndex(0);
    setVariantImageErrors({});
    setVariantsError('');
    setCarouselKey((key) => key + 1);
    const cached = printsCache[cacheKey];
    if (cached) {
      setVariants(cached);
      setActiveVariantIndex(Math.max(0, cached.findIndex((print) => print.id === card.id)));
      setCarouselKey((key) => key + 1);
      return;
    }
    if (!card.prints_search_uri) return;

    const controller = new AbortController();
    variantsController.current = controller;
    setVariantsLoading(true);
    try {
      let nextUrl: string | undefined = card.prints_search_uri;
      const allPrints: ScryfallCard[] = [];
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json;q=0.9,*/*;q=0.8',
            'User-Agent': 'TCGCompanion/1.0 (Magic card search)',
          },
        });
        const payload = await response.json() as ScryfallSearchResponse;
        if (!response.ok) throw new Error(payload.details || 'Não foi possível carregar as edições desta carta.');
        allPrints.push(...(payload.data ?? []));
        nextUrl = payload.next_page;
        if (nextUrl) await new Promise((resolve) => setTimeout(resolve, 120));
      }
      if (controller.signal.aborted) return;
      const uniquePrints = Array.from(new Map(allPrints.map((print) => [print.id, print])).values());
      const orderedPrints = uniquePrints.length ? uniquePrints : [card];
      setPrintsCache((current) => ({ ...current, [cacheKey]: orderedPrints }));
      setVariants(orderedPrints);
      setActiveVariantIndex(Math.max(0, orderedPrints.findIndex((print) => print.id === card.id)));
      setCarouselKey((key) => key + 1);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setVariants([card]);
      setVariantsError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as edições desta carta.');
      setCarouselKey((key) => key + 1);
    } finally {
      if (!controller.signal.aborted) setVariantsLoading(false);
    }
  };

  const closeCardVariants = () => {
    variantsController.current?.abort();
    variantsController.current = null;
    setSelectedCard(null);
    setVariantsLoading(false);
  };

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setCards([]);
      setSearchedQuery('');
      setError('');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setCards([]);
    setImageFallbacks({});
    setError('');
    setLoading(true);

    const timer = setTimeout(() => {
      const escapedQuery = normalizedQuery.replace(/[\\"]/g, '\\$&');
      const search = `name:"${escapedQuery}"`;
      const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(search)}&unique=cards&order=name`;

      void fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json;q=0.9,*/*;q=0.8',
          'User-Agent': 'TCGCompanion/1.0 (Magic card search)',
        },
      })
        .then(async (response) => {
          const payload = await response.json() as ScryfallSearchResponse;
          if (controller.signal.aborted) return;
          if (response.status === 404) {
            setCards([]);
            setSearchedQuery(normalizedQuery);
            return;
          }
          if (!response.ok) throw new Error(payload.details || 'Não foi possível consultar o Scryfall.');
          setCards(payload.data ?? []);
          setSearchedQuery(normalizedQuery);
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return;
          setError(requestError instanceof Error ? requestError.message : 'Não foi possível consultar o Scryfall.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  const clearSearch = () => setQuery('');

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>MAGIC: THE GATHERING</Text>
      <Text style={styles.title}>Busca de cartas</Text>
      <Text style={styles.body}>Pesquise pelo nome. Resultados parciais aparecem enquanto você digita.</Text>

      <View style={styles.searchField}>
        <Ionicons name="search-outline" size={20} color="#8A96A3" />
        <TextInput
          accessibilityLabel="Buscar cartas pelo nome"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Ex.: Lightning Bolt"
          placeholderTextColor="#7E8995"
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Buscar carta com a camera" onPress={() => setScannerVisible(true)} hitSlop={8} style={styles.cameraButton}>
          <Ionicons name="camera-outline" size={20} color="#B7F36B" />
        </Pressable>
        {query.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={clearSearch} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color="#8A96A3" />
          </Pressable>
        )}
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultCount}>
          {loading ? 'BUSCANDO CARTAS' : cards.length > 0 ? `${cards.length} RESULTADOS` : searchedQuery ? 'RESULTADOS' : 'BUSCA POR NOME'}
        </Text>
        <Text style={styles.attribution}>via Scryfall</Text>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color="#B7F36B" />
          <Text style={styles.stateText}>Buscando “{normalizedQuery}”...</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Ionicons name="cloud-offline-outline" size={28} color="#FF777C" />
          <Text style={styles.stateTitle}>Não foi possível buscar</Text>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : normalizedQuery.length < 2 ? (
        <View style={styles.state}>
          <View style={styles.emptyIcon}><Ionicons name="search" size={24} color="#B7F36B" /></View>
          <Text style={styles.stateTitle}>Encontre uma carta</Text>
          <Text style={styles.stateText}>Digite pelo menos 2 caracteres do nome para começar a busca.</Text>
        </View>
      ) : cards.length === 0 && searchedQuery ? (
        <View style={styles.state}>
          <Ionicons name="file-tray-outline" size={30} color="#8A96A3" />
          <Text style={styles.stateTitle}>Nenhuma carta encontrada</Text>
          <Text style={styles.stateText}>Não encontramos resultados para “{searchedQuery}”. Tente outro trecho do nome.</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(card) => card.id}
          keyboardShouldPersistTaps="handled"
          numColumns={2}
          columnWrapperStyle={styles.cardRow}
          contentContainerStyle={styles.cardList}
          style={styles.resultsList}
          renderItem={({ item }) => {
            const imageSources = getCardImageSources(item);
            const image = imageSources[imageFallbacks[item.id] ?? 0];
            const imageLink = image ?? imageSources[0];
            return (
              <View style={styles.cardResult}>
                <Pressable
                  accessibilityRole="button"
                    accessibilityLabel={`Ver edições de ${item.name}`}
                  disabled={!imageLink}
                    onPress={() => void openCardVariants(item)}
                >
                  {image ? (
                    <Image
                      accessibilityLabel={item.name}
                    cachePolicy="disk"
                      onError={() => setImageFallbacks((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }))}
                    contentFit="contain"
                      source={{ uri: image }}
                      style={[styles.cardImage, { width: cardWidth, height: cardWidth / 0.718 }]}
                    />
                  ) : (
                    <View style={[styles.cardImage, styles.imagePlaceholder, { width: cardWidth, height: cardWidth / 0.718 }]}>
                      <Ionicons name="image-outline" size={28} color="#71808E" />
                      <Text style={styles.placeholderName}>{item.name}</Text>
                    </View>
                  )}
                </Pressable>
                <Text numberOfLines={2} style={styles.cardName}>{item.name}</Text>
                <Text numberOfLines={1} style={styles.cardSet}>{item.set_name}</Text>

              </View>
            );
          }}
        />
      )}
      <Modal animationType="fade" onRequestClose={closeCardVariants} transparent visible={selectedCard !== null}>
        <View style={styles.imageModalBackdrop}>
          <View style={styles.carouselContent}>
            <View style={styles.imageModalHeader}>
              <View style={styles.variantTitleBlock}>
                <Text numberOfLines={1} style={styles.imageModalTitle}>{selectedCard?.name}</Text>
                {variantsLoading && <Text style={styles.variantLoading}>Carregando impressoes...</Text>}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar carrossel" onPress={closeCardVariants} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#F1F4F7" />
              </Pressable>
            </View>
            <FlatList
              key={carouselKey}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={variants}
              keyExtractor={(variant) => variant.id}
              initialScrollIndex={activeVariantIndex}
              getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
              onMomentumScrollEnd={(event) => setActiveVariantIndex(Math.round(event.nativeEvent.contentOffset.x / screenWidth))}
              renderItem={({ item: variant }) => {
                const source = getCardImageSources(variant).at(-1);
                const imageHeight = modalImageWidth / 0.718;
                return (
                  <View style={[styles.variantPage, { width: screenWidth }]}>
                    {source && !variantImageErrors[variant.id] ? (
                      <Image accessibilityLabel={variant.name + ', ' + variant.set_name} cachePolicy="disk" contentFit="contain"
                        onError={() => setVariantImageErrors((current) => ({ ...current, [variant.id]: true }))}
                        source={{ uri: source }} style={{ width: modalImageWidth, height: imageHeight }} />
                    ) : (
                      <View style={[styles.modalImageFailure, { width: modalImageWidth, height: imageHeight }]}>
                        <Ionicons name="image-outline" size={36} color="#8A96A3" />
                        <Text style={styles.stateText}>Nao foi possivel carregar esta imagem.</Text>
                      </View>
                    )}
                  </View>
                );
              }}
            />
            {selectedVariant && <View style={styles.variantDetails}>
              <Text numberOfLines={1} style={styles.variantSet}>{selectedVariant.set_name}</Text>
              <Text style={styles.variantNumber}>{selectedVariant.collector_number ? '#' + selectedVariant.collector_number : ''}{selectedVariant.released_at ? '  ·  ' + selectedVariant.released_at.slice(0, 4) : ''}</Text>
            </View>}
            <Text style={styles.variantCounter}>{variants.length ? (activeVariantIndex + 1) + ' / ' + variants.length + ' IMPRESSOES' : 'IMPRESSOES'}</Text>
            {variantsError ? <Text style={styles.variantError}>{variantsError}</Text> : null}
          </View>
        </View>
      </Modal>
      <CardScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onSelectName={(recognizedName) => {
          setQuery(recognizedName);
          setScannerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101419', paddingHorizontal: 20, paddingTop: 38 },
  kicker: { color: '#B7F36B', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#F1F4F7', fontSize: 28, fontWeight: '800', marginTop: 8 },
  body: { color: '#A2ADB8', fontSize: 14, lineHeight: 21, marginTop: 8 },
  searchField: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, paddingHorizontal: 14, borderWidth: 1, borderColor: '#35414C', borderRadius: 15, backgroundColor: '#191F26' },
  input: { flex: 1, color: '#F1F4F7', fontSize: 15, paddingVertical: 0 },
  cameraButton: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  resultCount: { color: '#8A96A3', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  attribution: { color: '#71808E', fontSize: 11, fontWeight: '700' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 55 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(183,243,107,0.1)', marginBottom: 14 },
  stateTitle: { color: '#F1F4F7', fontSize: 17, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  stateText: { color: '#8A96A3', fontSize: 13, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  resultsList: { flex: 1 },
  cardList: { paddingBottom: 28 },
  cardRow: { justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  cardResult: { flex: 1, overflow: 'hidden' },
  cardImage: { borderRadius: 12, backgroundColor: '#191F26' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8 },
  placeholderName: { color: '#A2ADB8', fontSize: 12, textAlign: 'center' },
  cardName: { color: '#F1F4F7', fontSize: 13, lineHeight: 17, fontWeight: '800', marginTop: 8 },
  cardSet: { color: '#8A96A3', fontSize: 11, marginTop: 3 },
  imageModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  carouselContent: { flex: 1, paddingTop: 52, paddingBottom: 28 },
  imageModalHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  variantTitleBlock: { flex: 1 },
  imageModalTitle: { color: '#F1F4F7', fontSize: 16, fontWeight: '800' },
  variantLoading: { color: '#8A96A3', fontSize: 11, marginTop: 3 },
  variantPage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  variantDetails: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8 },
  variantSet: { color: '#F1F4F7', fontSize: 14, fontWeight: '800' },
  variantNumber: { color: '#8A96A3', fontSize: 12, marginTop: 4 },
  variantCounter: { color: '#B7F36B', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginTop: 12 },
  variantError: { color: '#FF9B9F', fontSize: 11, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#252D36' },
  modalImageFailure: { alignItems: 'center', justifyContent: 'center', padding: 22, borderRadius: 18, backgroundColor: '#191F26' },
});
