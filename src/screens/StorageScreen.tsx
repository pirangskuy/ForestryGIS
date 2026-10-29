import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import RNFS from 'react-native-fs';
import { pick, types } from '@react-native-documents/picker';

const StorageScreen = ({ navigation }: any) => {
  const [daftarFile, setDaftarFile] = useState<RNFS.ReadDirItem[]>([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);

  const muatDaftarFile = async () => {
    setSedangMemuat(true);
    try {
      const hasil = await RNFS.readDir(RNFS.DownloadDirectoryPath);
      
      const fileValid = hasil.filter(file => {
        const nama = file.name.toLowerCase();
        return nama.endsWith('.geojson') || nama.endsWith('.shp') || nama.endsWith('.pdf');
      });
      
      fileValid.sort((a, b) => (b.mtime?.getTime() || 0) - (a.mtime?.getTime() || 0));
      setDaftarFile(fileValid);
    } catch (error) {
      console.error(error);
      Alert.alert('Eror', 'Gagal membaca penyimpanan lokal.');
    } finally {
      setSedangMemuat(false);
    }
  };

  useEffect(() => {
    muatDaftarFile();
  }, []);

  const tambahFilePeta = async () => {
    try {
      const hasilArray = await pick({
        type: [types.allFiles],
      });

      const hasilPick = hasilArray[0];

      if (!hasilPick.name || !hasilPick.uri) return;

      const namaFile = hasilPick.name.toLowerCase();

      if (!namaFile.endsWith('.geojson') && !namaFile.endsWith('.shp') && !namaFile.endsWith('.pdf')) {
        Alert.alert('Format Tidak Didukung', 'Silakan pilih file dengan format .geojson, .shp, atau .pdf');
        return;
      }

      const pathTujuan = `${RNFS.DownloadDirectoryPath}/${hasilPick.name}`;
      await RNFS.copyFile(hasilPick.uri, pathTujuan);

      Alert.alert('Sukses', `File ${hasilPick.name} berhasil ditambahkan!`);
      muatDaftarFile(); 
      
    } catch (err: any) {
      if (err?.code === 'DOCUMENT_PICKER_CANCELED' || String(err).toLowerCase().includes('cancel')) {
        console.log('Batal memilih file');
      } else {
        console.error(err);
        Alert.alert('Eror', 'Terjadi kesalahan saat menambahkan file.');
      }
    }
  };

  // --- FUNGSI HAPUS FILE DITAMBAHKAN DI SINI ---
  const konfirmasiHapusFile = (path: string, nama: string) => {
    Alert.alert(
      'Hapus File',
      `Apakah Anda yakin ingin menghapus file "${nama}" dari penyimpanan?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive', 
          onPress: () => eksekusiHapusFile(path) 
        }
      ]
    );
  };

  const eksekusiHapusFile = async (path: string) => {
    try {
      const exists = await RNFS.exists(path);
      if (exists) {
        await RNFS.unlink(path);
        Alert.alert('Sukses', 'File berhasil dihapus.');
        muatDaftarFile(); // Refresh daftar file setelah dihapus
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Eror', 'Gagal menghapus file.');
    }
  };
  // ---------------------------------------------

  const formatUkuran = (bytes: number) => {
    if (bytes < 1024) return bytes + ' Bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const dapatkanGayaFile = (nama: string) => {
    const ext = nama.toLowerCase();
    if (ext.endsWith('.pdf')) return { icon: 'document-text', warna: '#EF5350' };
    if (ext.endsWith('.shp')) return { icon: 'map', warna: '#5C6BC0' };
    return { icon: 'globe-outline', warna: '#26A69A' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnIcon}>
          <Icon name="arrow-back" size={24} color="#004D40" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Penyimpanan Lokal</Text>
        
        <View style={styles.headerRightControls}>
          <TouchableOpacity onPress={tambahFilePeta} style={styles.btnIcon}>
            <Icon name="add-circle" size={28} color="#00796B" />
          </TouchableOpacity>

          <TouchableOpacity onPress={muatDaftarFile} style={styles.btnIcon}>
            <Icon name="refresh" size={24} color="#00796B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Icon name="folder-open" size={20} color="#00796B" />
        <Text style={styles.infoText}>Mendukung .geojson, .shp, dan .pdf</Text>
      </View>

      {sedangMemuat ? (
        <View style={styles.centerView}>
          <Text style={styles.loadingText}>Mencari file...</Text>
        </View>
      ) : (
        <FlatList
          data={daftarFile}
          keyExtractor={(item) => item.path}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => {
            const gaya = dapatkanGayaFile(item.name);
            return (
              <TouchableOpacity 
                style={styles.fileCard} 
                onPress={() => {
                  Alert.alert(
                    'Gunakan Peta Offline',
                    `Apakah Anda ingin memuat file ${item.name} ke dalam proyek pemetaan saat ini?`,
                    [
                      { text: 'Batal', style: 'cancel' },
                      { 
                        text: 'Muat ke Peta', 
                        onPress: () => navigation.navigate('Map', { 
                          filePetaOffline: item.path,
                          namaPetaOffline: item.name
                        }) 
                      }
                    ]
                  );
                }}
                onLongPress={() => konfirmasiHapusFile(item.path, item.name)} // DITAMBAHKAN DI SINI
              >
                <View style={[styles.fileIconBox, { backgroundColor: gaya.warna }]}>
                  <Icon name={gaya.icon} size={24} color="#FFF" />
                </View>
                <View style={styles.fileTextContainer}>
                  <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.fileDetails}>
                    {formatUkuran(item.size)} • {item.mtime ? item.mtime.toLocaleDateString('id-ID') : 'Tanpa tanggal'}
                  </Text>
                </View>
                <Icon name="ellipsis-vertical" size={20} color="#90A4AE" />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerView}>
              <Icon name="document-outline" size={60} color="#B0BEC5" />
              <Text style={styles.emptyText}>Belum ada berkas tersimpan.</Text>
              <Text style={styles.emptySubText}>Tekan tombol (+) untuk menambah file.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4FBFD' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#FFFFFF', 
    padding: 15, 
    elevation: 2 
  },
  btnIcon: { padding: 5 },
  headerRightControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#004D40' },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E0F2F1', 
    padding: 10, 
    marginHorizontal: 15, 
    marginTop: 15, 
    borderRadius: 8,
    gap: 10
  },
  infoText: { color: '#00796B', fontSize: 13, fontWeight: 'bold' },
  fileCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10, 
    elevation: 2 
  },
  fileIconBox: { 
    width: 45, 
    height: 45, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  fileTextContainer: { flex: 1, marginLeft: 15, marginRight: 10 },
  fileName: { fontSize: 14, fontWeight: 'bold', color: '#004D40', marginBottom: 4 },
  fileDetails: { fontSize: 12, color: '#78909C' },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { color: '#00796B', fontSize: 14, fontWeight: '500' },
  emptyText: { color: '#78909C', fontSize: 15, marginTop: 15, fontWeight: 'bold' },
  emptySubText: { color: '#B0BEC5', fontSize: 13, marginTop: 5 }
});

export default StorageScreen;