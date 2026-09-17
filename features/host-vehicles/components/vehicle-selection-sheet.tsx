import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Search, X } from 'lucide-react-native';

export type VehicleSelectionOption = {
  label: string;
  value: string;
};

type VehicleSelectionSheetProps = {
  options: readonly VehicleSelectionOption[];
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  value: string;
  visible: boolean;
};

export function VehicleSelectionSheet({
  onClose,
  onSelect,
  options,
  title,
  value,
  visible,
}: VehicleSelectionSheetProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? options.filter((option) => option.label.toLowerCase().includes(query))
      : options;
  }, [options, search]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              accessibilityLabel="Close selection"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X color="#111827" size={20} />
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Search color="#72809A" size={18} />
            <TextInput
              autoFocus
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor="#8B96AA"
              style={styles.searchInput}
              value={search}
            />
          </View>
          <FlatList
            data={filteredOptions}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(option) => option.value}
            ListEmptyComponent={<Text style={styles.emptyText}>No matches found.</Text>}
            renderItem={({ item }) => {
              const selected = item.value === value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                  {selected ? <Check color="#0F766E" size={19} /> : null}
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  sheet: {
    maxHeight: '78%',
    minHeight: 300,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  handle: {
    alignSelf: 'center',
    height: 4,
    width: 42,
    borderRadius: 999,
    backgroundColor: '#D7DEE9',
    marginBottom: 12,
  },
  header: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#101A35',
    fontSize: 19,
    fontWeight: '900',
  },
  closeButton: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F4F7FB',
  },
  searchBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE4EF',
    backgroundColor: '#F9FBFD',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    paddingVertical: 0,
  },
  list: {
    marginTop: 10,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    paddingHorizontal: 8,
  },
  optionSelected: {
    backgroundColor: '#ECFDF5',
  },
  optionText: {
    color: '#17213B',
    fontSize: 15,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#0F766E',
    fontWeight: '900',
  },
  emptyText: {
    color: '#6B7892',
    fontSize: 14,
    paddingVertical: 24,
    textAlign: 'center',
  },
});
