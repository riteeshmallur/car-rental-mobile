import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { locationsApi } from '@/services/locations/locations-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useCustomerSearchStore } from '@/store/customer-search-store';
import { type LocationSearchResult } from '@/types/location';

export function LocationSelectionScreen() {
  const [query, setQuery] = useState('');
  const setSelectedLocation = useCustomerSearchStore(
    (state) => state.setSelectedLocation,
  );
  const normalizedQuery = query.trim();
  const goBack = useSafeBack({ fallback: '/(customer)/home' });

  const locationsQuery = useQuery({
    enabled: normalizedQuery.length >= 2,
    queryKey: ['locations', 'search', normalizedQuery],
    queryFn: () => locationsApi.search(normalizedQuery, 10),
  });

  const locations = locationsQuery.data ?? [];

  const selectLocation = (location: LocationSearchResult) => {
    setSelectedLocation(location);
    goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Select location</Text>
            <Text style={styles.subtitle}>Search by city or pickup area</Text>
          </View>
          <Pressable
            accessibilityLabel="Close location selection"
            accessibilityRole="button"
            onPress={goBack}
            style={styles.closeButton}
          >
            <X color="#111827" size={20} />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Search color="#6B7280" size={20} />
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            onChangeText={setQuery}
            placeholder="Search Bangalore, Indiranagar..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={query}
          />
        </View>

        {normalizedQuery.length < 2 ? (
          <EmptyState
            title="Start typing"
            body="Enter at least 2 characters to search supported HopIn locations."
          />
        ) : locationsQuery.isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#111827" />
            <Text style={styles.loadingText}>Searching locations</Text>
          </View>
        ) : locationsQuery.isError ? (
          <EmptyState
            title="Could not load locations"
            body="Check your connection and try searching again."
          />
        ) : locations.length === 0 ? (
          <EmptyState
            title="No locations found"
            body="Try another city or pickup area."
          />
        ) : (
          <FlatList
            contentContainerStyle={styles.resultList}
            data={locations}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.resultListView}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => selectLocation(item)}
                style={({ pressed }) => [
                  styles.resultItem,
                  pressed && styles.resultItemPressed,
                ]}
              >
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultMeta}>
                  {item.city}
                  {item.state ? `, ${item.state}` : ''}, {item.country}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFF',
  },
  container: {
    flex: 1,
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  closeButton: {
    height: 42,
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  resultList: {
    gap: 10,
    paddingBottom: 20,
  },
  resultListView: {
    flex: 1,
    minHeight: 0,
  },
  resultItem: {
    gap: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  resultItemPressed: {
    opacity: 0.76,
  },
  resultName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  resultMeta: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
});
