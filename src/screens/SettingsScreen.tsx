import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SettingsScreen = () => {
  const menuPengaturan = [
    { id: '1', judul: 'Bantuan', icon: 'help-circle-outline' },
    { id: '2', judul: 'Umum', icon: 'settings-outline' },
    { id: '3', judul: 'Tampilan', icon: 'color-palette-outline' },
    { id: '4', judul: 'Unit Pengukuran', icon: 'speedometer-outline' },
    { id: '5', judul: 'Tampilan Peta', icon: 'map-outline' },
    { id: '6', judul: 'Kelola set simbol', icon: 'shapes-outline' },
    { id: '7', judul: 'Pengaturan GPS', icon: 'locate-outline' },
    { id: '8', judul: 'Navigasi', icon: 'navigate-outline' },
    { id: '9', judul: 'Pemberitahuan', icon: 'notifications-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pengaturan</Text>
      </View>
      <FlatList
        data={menuPengaturan}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Info', `Membuka menu ${item.judul}`)}>
            <View style={styles.menuLeft}>
              <Icon name={item.icon} size={24} color="#00796B" />
              <Text style={styles.menuText}>{item.judul}</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#B0BEC5" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4FBFD' },
  header: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0F2F1', elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#004D40' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  menuText: { fontSize: 16, color: '#333', fontWeight: '500' }
});

export default SettingsScreen;