# TCG Companion

Aplicativo para jogadores de Magic: The Gathering registrarem partidas, consultarem cartas e usarem ferramentas.

## Primeira versão

- Perfil geral do jogador
- Histórico de partidas de Magic
- Contador de pontos de vida
- Busca de cartas integrada a uma fonte de dados por jogo

O primeiro recorte deve fechar um fluxo pequeno: iniciar uma partida de Magic, usar o contador de vida e salvar o resultado. Perfil, cartas e sincronização podem evoluir em etapas seguintes.

## Tecnologias

- React Native com Expo para desenvolver Android e iOS sem configurar projetos nativos no começo
- TypeScript para dar segurança aos dados de partidas e cartas
- Expo Router para navegação baseada em arquivos
- Componentes nativos (`View`, `Text`, `Pressable`, `ScrollView`) em vez de elementos HTML

## Rodar localmente

Instale uma versão LTS do Node.js e depois rode:

```sh
npm install
npm start
```

O Expo abre um QR code para testar no aparelho com Expo Go. Também é possível iniciar um emulador Android com `npm run android`.

## Estrutura

```text
app/
  _layout.tsx  navegação em abas
  index.tsx    início e visão geral
  games.tsx    cards dos jogos disponíveis
  magic/       menu e ferramentas de Magic
  profile.tsx  perfil geral
```

## Para aprender no caminho

1. `View` é o contêiner mais comum; `Text` mostra texto e `Pressable` responde a toques.
2. Estilos são objetos JavaScript criados com `StyleSheet.create`; o layout usa Flexbox, mas não há CSS do navegador.
3. Em vez de `<div>` e `<button>`, usamos componentes React Native.
4. Cada arquivo dentro de `app/` representa uma rota. `_layout.tsx` configura a navegação que envolve as telas.
5. Depois do protótipo visual, separar dados e lógica em tipos e funções; persistência e login ficam para quando os fluxos estiverem definidos.

## Decisões que podemos fechar antes do primeiro fluxo

- Se as partidas começam como solo (contador) ou registro contra outro jogador
- Quais campos formam o resultado: data, formato, deck, adversário, placar e notas
- Se o app precisa funcionar offline desde a primeira versão
