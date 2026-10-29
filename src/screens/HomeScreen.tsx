import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import SQLite from 'react-native-sqlite-storage';

// Aktifkan promise untuk SQLite
SQLite.enablePromise(true);

const HomeScreen = ({ navigation }: any) => {
  const [daftarPeta, setDaftarPeta] = useState<any[]>([]);
  const [modalCreateVisible, setModalCreateVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedBasemap, setSelectedBasemap] = useState('Standard');

  // Konfigurasi Database
  const getDBConnection = async () => {
    return SQLite.openDatabase({ name: 'kehutanan.db', location: 'default' });
  };

  const inisialisasiTabelProject = async () => {
    try {
      const db = await getDBConnection();
      await db.executeSql(
        `CREATE TABLE IF NOT EXISTS tabel_project (id TEXT PRIMARY KEY, nama TEXT, detail TEXT, icon TEXT);`
      );
      muatDataProject();
    } catch (error) {
      console.error(error);
    }
  };

  const muatDataProject = async () => {
    try {
      const db = await getDBConnection();
      const [hasil] = await db.executeSql(`SELECT * FROM tabel_project ORDER BY id DESC`);
      const projectDB: any[] = [];
      for (let i = 0; i < hasil.rows.length; i++) {
        projectDB.push(hasil.rows.item(i));
      }
      setDaftarPeta(projectDB);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    inisialisasiTabelProject();
  }, []);

  const tanganiBuatProject = async () => {
    if (!newProjectName.trim()) {
      Alert.alert('Peringatan', 'Nama project wajib diisi.');
      return;
    }
    
    const idBaru = Date.now().toString();
    const detailBaru = `Basemap: ${selectedBasemap}`;
    const iconBaru = 'map';

    try {
      const db = await getDBConnection();
      await db.executeSql(
        `INSERT INTO tabel_project (id, nama, detail, icon) VALUES (?, ?, ?, ?)`,
        [idBaru, newProjectName, detailBaru, iconBaru]
      );
      
      setNewProjectName('');
      setSelectedBasemap('Standard');
      setModalCreateVisible(false);
      muatDataProject(); 
      navigation.navigate('Map');
    } catch (error) {
      Alert.alert('Eror', 'Gagal menyimpan project.');
      console.error(error);
    }
  };

  const konfirmasiHapusProject = (id: string, nama: string) => {
    Alert.alert(
      'Hapus Project',
      `Apakah Anda yakin ingin menghapus project "${nama}"? Data yang dihapus tidak dapat dikembalikan.`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive', 
          onPress: () => eksekusiHapusProject(id) 
        }
      ]
    );
  };

  const eksekusiHapusProject = async (id: string) => {
    try {
      const db = await getDBConnection();
      await db.executeSql(`DELETE FROM tabel_project WHERE id = ?`, [id]);
      muatDataProject();
    } catch (error) {
      console.error(error);
      Alert.alert('Eror', 'Gagal menghapus project.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      
      {/* Header Profile */}
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <View style={styles.avatarContainer}>
            <Icon name="person" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingText}>Selamat datang,</Text>
            <Text style={styles.userNameText}>Kurniawan Alhamdani</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Pengaturan')}
        >
          <Icon name="settings-outline" size={24} color="#495057" />
        </TouchableOpacity>
      </View>

      {/* Main Banner */}
      <View style={styles.mainBanner}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Forestry GIS</Text>
          <Text style={styles.bannerSubtitle}>Aplikasi Pemetaan & Tata Ruang</Text>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => navigation.navigate('Map')}
          >
            <Icon name="map-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Buka Peta Dasar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bannerImageContainer}>
          <Image
            source={require('../../assets/forestrygis.png')}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Action Menu Grid */}
      <View style={styles.actionGrid}>
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => navigation.navigate('CloudScreen')}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#E3F2FD' }]}>
            <Icon name="cloud-download" size={26} color="#1565C0" />
          </View>
          <Text style={styles.actionText}>Cloud Peladen</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => navigation.navigate('StorageScreen')}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#E8F5E9' }]}>
            <Icon name="folder" size={26} color="#2E7D32" />
          </View>
          <Text style={styles.actionText}>Penyimpanan</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => setModalCreateVisible(true)}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#E0F2F1' }]}>
            <Icon name="add-circle" size={26} color="#00695C" />
          </View>
          <Text style={styles.actionText}>Project Baru</Text>
        </TouchableOpacity>
      </View>

      {/* Projects List Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Project Anda</Text>
        <Text style={styles.projectCount}>{daftarPeta.length} Project</Text>
      </View>

      {/* Project List */}
      <FlatList
        data={daftarPeta}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.projectItem} 
            onPress={() => navigation.navigate('Map')}
            onLongPress={() => konfirmasiHapusProject(item.id, item.nama)}
            activeOpacity={0.7}
          >
            <View style={styles.projectIconBox}>
              <Icon name={item.icon} size={22} color="#00695C" />
            </View>
            <View style={styles.projectTextContainer}>
              <Text style={styles.projectTitle} numberOfLines={1}>{item.nama}</Text>
              <Text style={styles.projectSubtitle}>{item.detail}</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#ADB5BD" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Icon name="layers-outline" size={48} color="#CED4DA" />
            <Text style={styles.emptyStateTitle}>Belum ada project</Text>
            <Text style={styles.emptyStateDesc}>Tekan menu 'Project Baru' untuk memulai pemetaan.</Text>
          </View>
        }
      />

      {/* Modal Buat Project Baru */}
      <Modal visible={modalCreateVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buat Project Baru</Text>
              <TouchableOpacity onPress={() => setModalCreateVisible(false)}>
                <Icon name="close" size={24} color="#495057" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Nama Project</Text>
            <TextInput
              style={styles.textInput}
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="Contoh: Pemetaan Blok Sungai Sambang"
              placeholderTextColor="#ADB5BD"
              autoFocus={true}
            />
            
            <Text style={styles.inputLabel}>Pilih Peta Dasar (Basemap)</Text>
            <View style={styles.basemapContainer}>
              <TouchableOpacity 
                style={[styles.basemapOption, selectedBasemap === 'Standard' && styles.basemapOptionActive]} 
                onPress={() => setSelectedBasemap('Standard')}
                activeOpacity={0.8}
              >
                <Icon name="map" size={22} color={selectedBasemap === 'Standard' ? '#FFFFFF' : '#00695C'} />
                <Text style={[styles.basemapText, selectedBasemap === 'Standard' && styles.basemapTextActive]}>Standard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.basemapOption, selectedBasemap === 'Satelit' && styles.basemapOptionActive]} 
                onPress={() => setSelectedBasemap('Satelit')}
                activeOpacity={0.8}
              >
                <Icon name="earth" size={22} color={selectedBasemap === 'Satelit' ? '#FFFFFF' : '#00695C'} />
                <Text style={[styles.basemapText, selectedBasemap === 'Satelit' && styles.basemapTextActive]}>Satelit</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalActionRow}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setModalCreateVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={tanganiBuatProject}
              >
                <Text style={styles.saveButtonText}>Simpan Project</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Warna latar belakang abu-abu sangat muda yang modern
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00695C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  greetingText: {
    fontSize: 13,
    color: '#6C757D',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 16,
    color: '#212529',
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  mainBanner: {
    flexDirection: 'row',
    backgroundColor: '#004D40',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#004D40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#B2DFDB',
    marginBottom: 16,
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#00695C',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00796B',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  bannerImageContainer: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center', // Diubah dari flex-end menjadi center agar letaknya lebih presisi
  },
  bannerImage: {
    width: 70,
    height: 70,
    borderRadius: 35, // Menjadikan gambar berbentuk lingkaran
    backgroundColor: '#FFFFFF', // Memastikan latar belakang logo berwarna putih jika format aslinya transparan
    opacity: 0.9,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  projectCount: {
    fontSize: 13,
    color: '#6C757D',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  projectItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  projectIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  projectSubtitle: {
    fontSize: 13,
    color: '#6C757D',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateDesc: {
    fontSize: 13,
    color: '#ADB5BD',
    textAlign: 'center',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#212529',
    marginBottom: 10,
  },
  basemapContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 5,
    marginBottom: 24,
  },
  basemapOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    backgroundColor: '#FFFFFF',
  },
  basemapOptionActive: {
    backgroundColor: '#00695C',
    borderColor: '#00695C',
  },
  basemapText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 8,
  },
  basemapTextActive: {
    color: '#FFFFFF',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#004D40',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  }
});

export default HomeScreen;