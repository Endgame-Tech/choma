import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { THEME } from '../../utils/colors';

const AddressAutocomplete = ({
  placeholder = "Enter delivery address",
  onAddressSelect,
  defaultValue = "",
  editable = true,
  style = {}
}) => {
  const { colors } = useTheme();

  const handlePlaceSelect = (data, details = null) => {
    if (details) {
      const addressInfo = {
        fullAddress: data.description,
        formattedAddress: details.formatted_address,
        coordinates: {
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
        },
        addressComponents: details.address_components,
        placeId: data.place_id,
        // Extract specific components
        streetNumber: extractComponent(details.address_components, 'street_number'),
        route: extractComponent(details.address_components, 'route'),
        locality: extractComponent(details.address_components, 'locality'),
        adminArea: extractComponent(details.address_components, 'administrative_area_level_1'),
        country: extractComponent(details.address_components, 'country'),
        postalCode: extractComponent(details.address_components, 'postal_code'),
      };
      
      onAddressSelect && onAddressSelect(addressInfo);
    }
  };

  const extractComponent = (components, type) => {
    const component = components.find(comp => comp.types.includes(type));
    return component ? component.long_name : '';
  };

  return (
    <View style={[styles(colors).container, style]}>
      <GooglePlacesAutocomplete
        placeholder={placeholder}
        onPress={handlePlaceSelect}
        fetchDetails={true}
        enablePoweredByContainer={false}
        textInputProps={{
          defaultValue,
          editable,
          placeholderTextColor: colors.textMuted,
          style: styles(colors).textInput,
        }}
        styles={{
          container: styles(colors).autocompleteContainer,
          listView: styles(colors).listView,
          row: styles(colors).row,
          separator: styles(colors).separator,
          description: styles(colors).description,
          predefinedPlacesDescription: styles(colors).predefinedDescription,
        }}
        query={{
          key: 'YOUR_GOOGLE_PLACES_API_KEY', // You'll need to add this
          language: 'en',
          components: 'country:ng', // Restrict to Nigeria
          types: 'establishment|geocode', // Address types
        }}
        GooglePlacesSearchQuery={{
          rankby: 'distance',
        }}
        filterReverseGeocodingByTypes={[
          'locality',
          'administrative_area_level_3',
          'street_address',
        ]}
        debounce={200}
        minLength={2}
        nearbyPlacesAPI="GooglePlacesSearch"
        GoogleReverseGeocodingQuery={{
          rankby: 'distance',
        }}
        renderLeftButton={() => (
          <View style={styles(colors).iconContainer}>
            <Ionicons 
              name="location-outline" 
              size={20} 
              color={colors.textMuted} 
            />
          </View>
        )}
        renderRightButton={() => (
          editable && (
            <View style={styles(colors).iconContainer}>
              <Ionicons 
                name="search-outline" 
                size={18} 
                color={colors.textMuted} 
              />
            </View>
          )
        )}
        predefinedPlaces={[
          {
            description: 'Current Location',
            geometry: { location: { lat: 6.5244, lng: 3.3792 } }, // Lagos coordinates
            place_id: 'current_location',
          },
        ]}
        currentLocation={true}
        currentLocationLabel="Current Location"
        keepResultsAfterBlur={true}
        listEmptyComponent={() => (
          <View style={styles(colors).emptyContainer}>
            <Ionicons name="location-outline" size={24} color={colors.textMuted} />
            <Text style={styles(colors).emptyText}>Start typing to see suggestions</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 1000,
  },
  autocompleteContainer: {
    flex: 1,
  },
  textInput: {
    height: 50,
    fontSize: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 50,
    color: colors.text,
  },
  listView: {
    backgroundColor: colors.cardBackground,
    borderRadius: THEME.borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 5,
    maxHeight: 200,
  },
  row: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  description: {
    fontSize: 14,
    color: colors.text,
  },
  predefinedDescription: {
    color: colors.primary,
    fontWeight: '600',
  },
  iconContainer: {
    position: 'absolute',
    zIndex: 1001,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: 40,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default AddressAutocomplete;