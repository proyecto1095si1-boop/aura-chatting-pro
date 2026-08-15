import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface EmojiCategory {
  title: string;
  icon: string;
  emojis: string[];
}

const EMOJI_DATA: EmojiCategory[] = [
  {
    title: 'Recientes',
    icon: '🕒',
    emojis: ['❤️', '😂', '🔥', '😍', '✨', '🙌', '👍', '😊', '🥰', '💯']
  },
  {
    title: 'Caras',
    icon: '😀',
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🙈", "🙉", "🙊", "💌", "💘", "💝", "💖", "💗", "💓", "💞", "💕", "💟", "❣️", "💔", "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💋", "💯", "💢", "💥", "💫", "💦", "💨", "💬", "🗨️", "🗯️", "💭", "💤"
    ]
  },
  {
    title: 'Personas',
    icon: '👋',
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "👂", "👃", "🧠", "👀", "👁️", "👅", "👄", "👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "🧔", "👩", "🧓", "👴", "👵", "🙍", "🙎", "🙅", "🙆", "💁", "🙋", "🙇", "🤦", "🤷", "👮", "🕵️", "💂", "👷", "🤴", "👸", "👳", "👲", "🧕", "🤵", "👰", "🤰", "🤱", "👼", "🎅", "🤶", "🦸", "🦹", "🧙", "🧚", "🧛", "🧜", "🧝", "🧞", "🧟", "💆", "💇", "🚶", "🧍", "🧎", "🏃", "💃", "🕺", "🕴️", "👯", "🧖", "🧗", "🏇", "🏂", "🏌️", "🏄", "🚣", "🏊", "⛹️", "🏋️", "🚴", "🚵", "🤸", "🤼", "🤽", "🤾", "🤹", "🧘", "🛀", "🛌", "👫", "👭", "👬", "💏", "💑", "👪", "🗣️", "👤", "👥", "👣"
    ]
  },
  {
    title: 'Animales',
    icon: '🐵',
    emojis: [
      "🐵", "🐒", "🦍", "🐶", "🐕", "🐩", "🐺", "🦊", "🦝", "🐱", "🐈", "🦁", "🐯", "🐅", "🐆", "🐴", "🐎", "🦄", "🦓", "🦌", "🐮", "🐂", "🐃", "🐄", "🐷", "🐖", "🐗", "🐽", "🐏", "🐑", "🐐", "🐪", "🐫", "🦒", "🐘", "🦏", "🦛", "🐭", "🐁", "🐀", "🐹", "🐰", "🐇", "🐿️", "🦔", "🦇", "🐻", "🐨", "🐼", "🐾", "🐔", "🐓", "🐣", "🐤", "🐥", "🐦", "🐧", "🕊️", "🦅", "🦆", "🦢", "🦉", "🦩", "🦚", "🦜", "🐸", "🐊", "🐢", "🦎", "🐍", "🐲", "🐉", "🐳", "🐋", "🐬", "🐟", "🐠", "🐡", "🦈", "🐙", "🐚", "🐌", "🦋", "🐛", "🐜", "🐝", "🐞", "🦗", "🕷️", "🕸️", "🦂", "🦟", "💐", "🌸", "💮", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🍄"
    ]
  },
  {
    title: 'Comida',
    icon: '🍎',
    emojis: [
      "🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏", "🍐", "🍑", "🍒", "🍓", "🥝", "🍅", "🥥", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🥒", "🥬", "🥦", "🧄", "🧅", "🥜", "🍞", "🥐", "🥖", "🥨", "🥯", "🥞", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🍳", "🍲", "🥣", "🥗", "🍿", "🧂", "🍱", "🍘", "🍙", "🍚", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", "🥛", "☕", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🥢", "🍽️", "🍴", "🥄", "🔪"
    ]
  },
  {
    title: 'Viajes',
    icon: '🌍',
    emojis: [
      "🌍", "🌎", "🌏", "🌐", "🗺️", "🗾", "🏔️", "⛰️", "🌋", "🗻", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️", "🏟️", "🏛️", "🏗️", "🧱", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰", "💒", "🗼", "🗽", "⛪", "🕌", "⛩️", "⛲", "⛺", "🌁", "🌃", "🏙️", "🌄", "🌅", "🌆", "🌇", "🌉", "♨️", "🎡", "🎢", "💈", "🎪", "🚂", "🚃", "🚄", "🚅", "🚆", "🚇", "🚈", "🚉", "🚊", "🚝", "🚞", "🚋", "🚌", "🚍", "🚎", "🚐", "🚑", "🚒", "🚓", "🚔", "🚕", "🚖", "🚗", "🚘", "🚙", "🚚", "🚛", "🚜", "🏎️", "🏍️", "🛵", "🚲", "🛴", "🛹", "⛽", "🚨", "🚥", "🚦", "🛑", "🚧", "⚓", "⛵", "🛶", "🚤", "🛳️", "⛴️", "🛥️", "🚢", "✈️", "🛩️", "🛫", "🛬", "💺", "🚁", "🚟", "🚠", "🚡", "🛰️", "🚀", "🛸", "🛎️", "🧳", "⌛", "⏳", "⌚", "⏰", "⏱️", "⏲️", "🕰️", "🕛", "🕧", "🕐", "🕜", "🕑", "🕝", "🕒", "🕞", "🕓", "🕟", "🕔", "🕠", "🕕", "🕡", "🕖", "🕢", "🕗", "🕣", "🕘", "🕤", "🕙", "🕥", "🕚", "🕦", "🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘", "🌙", "🌚", "🌛", "🌜", "🌡️", "☀️", "🌝", "🌞", "⭐", "🌟", "🌠", "🌌", "☁️", "⛅", "⛈️", "🌤️", "🌥️", "🌦️", "🌧️", "🌨️", "🌩️", "🌪️", "🌫️", "🌬️", "🌀", "🌈", "🌂", "☂️", "☔", "⛱️", "⚡", "❄️", "☃️", "⛄", "🔥", "💧", "🌊"
    ]
  },
  {
    title: 'Actividades',
    icon: '🎃',
    emojis: [
      "🎃", "🎄", "🎆", "🎇", "🧨", "✨", "🎈", "🎉", "🎊", "🎋", "🎍", "🎎", "🎏", "🎐", "🎑", "🧧", "🎀", "🎁", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "⚾", "🥎", "🏀", "🏐", "🏈", "🏉", "🎾", "🎳", "🏏", "🏑", "🏒", "🏓", "🏸", "🥊", "🥋", "🥅", "⛳", "⛸️", "🎽", "🎯", "🔫", "🎱", "🔮", "🎮", "🕹️", "🎰", "🎲", "🧩", "🧸", "♠️", "♥️", "♦️", "♣️", "♟️", "🃏", "🎴", "🎭", "🖼️", "🎨", "🧵"
    ]
  },
  {
    title: 'Objetos',
    icon: '👓',
    emojis: [
      "👓", "🕶️", "👔", "👕", "👖", "🧣", "🧤", "🧥", "🧦", "👗", "👘", "👙", "👚", "👛", "👜", "👝", "🛍️", "🎒", "👞", "👟", "👠", "👡", "👢", "👑", "👒", "🎩", "🎓", "🧢", "⛑️", "📿", "💄", "💍", "💎", "🔇", "🔈", "🔉", "🔊", "📢", "📣", "📯", "🔔", "🔕", "🎼", "🎵", "🎶", "🎙️", "🎚️", "🎛️", "🎤", "🎧", "📻", "🎷", "🎸", "🎹", "🎺", "🎻", "🥁", "📱", "📲", "☎️", "📞", "📟", "📠", "🔋", "🔌", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "🧮", "🎥", "🎞️", "📽️", "🎬", "📺", "📷", "📸", "📹", "📼", "🔍", "🔎", "🕯️", "💡", "🔦", "🏮", "📔", "📕", "📖", "📗", "📘", "📙", "📚", "📓", "📒", "📃", "📜", "📄", "📰", "🗞️", "📑", "🔖", "🏷️", "💰", "💴", "💵", "💶", "💷", "💸", "💳", "💹", "✉️", "📧", "📨", "📩", "📤", "📥", "📦", "📫", "📪", "📬", "📭", "📮", "🗳️", "✏️", "✒️", "🖋️", "🖊️", "🖌️", "🖍️", "📝", "💼", "📁", "📂", "🗂️", "📅", "📆", "🗒️", "🗓️", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️", "📏", "📐", "✂️", "🗃️", "🗄️", "🗑️", "🔒", "🔓", "🔏", "🔐", "🔑", "🗝️", "🔨", "⛏️", "⚒️", "🛠️", "🗡️", "⚔️", "💣", "🏹", "🛡️", "🔧", "🔩", "⚙️", "⚖️", "🔗", "⛓️", "🧰", "🧪", "🧫", "🧬", "🔬", "🔭", "💉", "💊", "🩹", "🩺", "🚪", "🪞", "🪟", "🛏️", "🛋️", "🪑", "🚽", "🛀", "🪒", "🧴", "🧹", "🧺", "🧼", "🪥", "🧽", "🧯", "🛒", "🚬", "⚰️", "🧿", "🗿"
    ]
  }
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  const filteredEmojis = search 
    ? EMOJI_DATA.flatMap(cat => cat.emojis).filter((_, i) => i % 5 === 0) // Mock search for now
    : EMOJI_DATA[activeCategory].emojis;

  return (
    <Animated.View 
      entering={FadeInUp.duration(300)} 
      exiting={FadeOutDown.duration(300)}
      style={styles.container}
    >
      <BlurView intensity={90} tint="dark" style={styles.blur}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar emoji..."
            placeholderTextColor="#8A8A8A"
            value={search}
            onChangeText={setSearch}
          />
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        {/* Categories */}
        {!search && (
          <View style={styles.categories}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {EMOJI_DATA.map((cat, index) => (
                <Pressable 
                    key={cat.title} 
                    onPress={() => setActiveCategory(index)}
                    style={[styles.categoryBtn, activeCategory === index && styles.categoryBtnActive]}
                >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                </Pressable>
                ))}
            </ScrollView>
          </View>
        )}

        {/* Emoji Grid */}
        <ScrollView 
          contentContainerStyle={styles.emojiGrid}
          showsVerticalScrollIndicator={false}
        >
          {filteredEmojis.map((emoji, index) => (
            <Pressable 
              key={`${emoji}-${index}`} 
              onPress={() => onSelect(emoji)}
              style={styles.emojiItem}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 350,
    width: '100%',
    position: 'absolute',
    bottom: 80,
    zIndex: 1000,
  },
  blur: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#FFF',
    fontSize: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFF',
    fontSize: 20,
    lineHeight: 22,
  },
  categories: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  categoryBtnActive: {
    backgroundColor: 'rgba(255, 45, 120, 0.2)',
    borderWidth: 1,
    borderColor: '#FF2D78',
  },
  categoryIcon: {
    fontSize: 22,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  emojiItem: {
    width: (width - 24) / 7,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 28,
  },
});
