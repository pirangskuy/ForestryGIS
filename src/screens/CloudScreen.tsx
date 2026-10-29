import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import SQLite from 'react-native-sqlite-storage';

const CloudScreen = ({ navigation }: any) => {
  const [dataTertunda, setDataTertunda] = useState<any[]>([]);

  const getDBConnection = async () => SQLite.openDatabase({ name: 'kehutanan.db', location: 'default' });

  const muatDataPending = async () => {
    try {
      const db = await getDBConnection();
      const [hasil] = await db.executeSql(`SELECT id, title, kategori, timestamp FROM tabel_temuan WHERE status_sync = 0 ORDER BY timestamp DESC`);
      
      let dataDB = [];
      for (let i = 0; i < hasil.rows.length; i++) {
        dataDB.push(hasil.rows.item(i));
      }
      setDataTertunda(dataDB);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      muatDataPending();
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnBack}>
          <Icon name="arrow-back" size={24} color="#004D40" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Status Sinkronisasi</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.summaryBox}>
        <Icon name="cloud-offline" size={40} color="#FF9800" />
        <View style={styles.summaryTextContainer}>
          <Text style={styles.summaryTitle}>Antrean Pengiriman</Text>
          <Text style={styles.summarySubtitle}>
            {dataTertunda.length} laporan tertahan di perangkat (Offline)
          </Text>
        </View>
      </View>

      <FlatList
        data={dataTertunda}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <View style={styles.cardLaporan}>
            <View style={styles.cardIcon}>
              <Icon name="document-text" size={24} color="#00796B" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.judulLaporan}>{item.title}</Text>
              <Text style={styles.kategoriLaporan}>{item.kategori}</Text>
              <Text style={styles.waktuLaporan}>Disimpan: {new Date(item.timestamp).toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Icon name="time" size={14} color="#FFF" />
              <Text style={styles.statusText}>Pending</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="checkmark-done-circle" size={60} color="#10B981" />
            <Text style={styles.emptyText}>Semua data telah tersinkronisasi.</Text>
            <Text style={styles.emptySubText}>Tidak ada antrean laporan di penyimpanan lokal.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4FBFD' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: '#FFFFFF', padding: 15, elevation: 2 
  },
  btnBack: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#004D40' },
  
  summaryBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0',
    margin: 15, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#FFE0B2', elevation: 1
  },
  summaryTextContainer: { marginLeft: 15, flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#E65100' },
  summarySubtitle: { fontSize: 13, color: '#F57C00', marginTop: 4 },

  cardLaporan: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2
  },
  cardIcon: {
    width: 45, height: 45, borderRadius: 10, backgroundColor: '#E0F2F1',
    justifyContent: 'center', alignItems: 'center'
  },
  cardInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  judulLaporan: { fontSize: 15, fontWeight: 'bold', color: '#004D40', marginBottom: 4 },
  kategoriLaporan: { fontSize: 13, color: '#00796B', fontWeight: '500' },
  waktuLaporan: { fontSize: 11, color: '#78909C', marginTop: 4 },
  
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF9800',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4
  },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#004D40', marginTop: 15 },
  emptySubText: { fontSize: 13, color: '#78909C', marginTop: 5, textAlign: 'center' }
});

export default CloudScreen;