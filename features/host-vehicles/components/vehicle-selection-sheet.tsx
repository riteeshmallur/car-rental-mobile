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
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import { radioAccessibilityProps } from '@/utils/radio-accessibility';

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
  useWebBackGuard({ active: visible, onBack: onClose });

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable accessible={false} onPress={onClose} style={styles.backdrop} />
        <SafeAreaView
          accessibilityLabel={`${title} selection`}
          accessibilityViewIsModal
          edges={['bottom']}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable
              accessibilityLabel="Close selection"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X color="#102550" size={20} />
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Search color="#536B91" size={18} />
            <TextInput
              accessibilityHint={`Filter ${title.toLowerCase()} options.`}
              accessibilityLabel={`Search ${title}`}
              autoFocus
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor="#536B91"
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
                  accessibilityLabel={item.label}
                  accessibilityRole="radio"
                  {...radioAccessibilityProps(selected)}
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
        </SafeAreaView>
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
    backgroundColor: '#D6E8FF',
    marginBottom: 12,
  },
  header: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#102550',
    fontSize: 19,
    fontWeight: '900',
  },
  closeButton: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F9FF',
  },
  searchBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#F3F9FF',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    color: '#102550',
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
    borderBottomColor: '#D6E8FF',
    paddingHorizontal: 8,
  },
  optionSelected: {
    backgroundColor: '#ECFDF5',
  },
  optionText: {
    color: '#102550',
    fontSize: 15,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#0F766E',
    fontWeight: '900',
  },
  emptyText: {
    color: '#536B91',
    fontSize: 14,
    paddingVertical: 24,
    textAlign: 'center',
  },
});
