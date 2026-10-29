import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, View, Text, Modal, TextInput, TouchableOpacity, 
  Alert, StatusBar, PermissionsAndroid, Platform, Image, ScrollView
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/Ionicons';
import RNFS from 'react-native-fs';
import notifee from '@notifee/react-native';

MapboxGL.setAccessToken('YOUR_MAPBOX_TOKEN_HERE');
SQLite.enablePromise(true);

interface TitikTemuan {
  id: string; latitude: number; longitude: number;
  title: string; description: string; kategori: string;
  foto: string | null; timestamp: string; status_sync: number;
}

interface FotoItem {
  uri: string;
  deskripsi: string;
}

const MapScreen = ({ route, navigation }: any) => {
  const petaOfflineAktif = route?.params?.filePetaOffline || null;
  const namaPetaOffline = route?.params?.namaPetaOffline || null;

  const cameraRef = useRef<MapboxGL.Camera>(null);

  const [statusInternet, setStatusInternet] = useState<boolean>(false);
  const previousNetworkState = useRef<boolean>(true);

  const [userLocation, setUserLocation] = useState<number[] | null>(null); 
  const [titikTengah, setTitikTengah] = useState<number[]>([110.9608, -0.1752]);

  const [temuanTitik, setTemuanTitik] = useState<TitikTemuan[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalAlatVisible, setModalAlatVisible] = useState<boolean>(false);
  const [modalCariVisible, setModalCariVisible] = useState<boolean>(false);
  const [modalSyncVisible, setModalSyncVisible] = useState<boolean>(false);
  
  const [dropdownKategoriVisible, setDropdownKategoriVisible] = useState<boolean>(false);
  const [modeEdit, setModeEdit] = useState<boolean>(false);
  const [idAktif, setIdAktif] = useState<string | null>(null);
  
  const [namaTemuan, setNamaTemuan] = useState<string>('');
  const [kategori, setKategori] = useState<string>('HKT (Kepadatan Tinggi)');
  const [kategoriIcon, setKategoriIcon] = useState<string>('leaf');
  const [kategoriColor, setKategoriColor] = useState<string>('#064E3B');
  const [deskripsi, setDeskripsi] = useState<string>('');
  
  const [daftarFoto, setDaftarFoto] = useState<FotoItem[]>([]);

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const isTrackingRef = useRef<boolean>(false);
  const [titikTrackingPoligon, setTitikTrackingPoligon] = useState<number[][]>([]);
  
  const [navigasiAktif, setNavigasiAktif] = useState<boolean>(false);
  const [targetNavigasi, setTargetNavigasi] = useState<number[] | null>(null);
  const [jarakNavigasi, setJarakNavigasi] = useState<string>('0 m');

  const [inputLat, setInputLat] = useState<string>('');
  const [inputLng, setInputLng] = useState<string>('');

  const daftarKategoriSKTNKT = [
    { label: 'HKT (Kepadatan Tinggi)', icon: 'leaf', color: '#064E3B' },
    { label: 'HKM (Kepadatan Sedang)', icon: 'leaf', color: '#047857' },
    { label: 'HKR (Kepadatan Rendah)', icon: 'leaf', color: '#34D399' },
    { label: 'HRM (Regenerasi Muda)', icon: 'leaf-outline', color: '#A3E635' },
    { label: 'BT (Belukar Tua)', icon: 'leaf-outline', color: '#EAB308' },
    { label: 'LT (Lahan Terbuka)', icon: 'warning', color: '#EF4444' },
    { label: 'NKT 1 - Hayati', icon: 'paw', color: '#8B5CF6' },
    { label: 'NKT 2 - Ekosistem', icon: 'image', color: '#6366F1' },
    { label: 'NKT 3 - Langka', icon: 'alert-circle', color: '#3B82F6' },
    { label: 'NKT 4 - Jasa Lingkungan', icon: 'water', color: '#0EA5E9' },
    { label: 'NKT 5 - Kebutuhan Dasar', icon: 'home', color: '#F59E0B' },
    { label: 'NKT 6 - Kultural', icon: 'flame', color: '#D946EF' }
  ];

  const getDBConnection = async () => SQLite.openDatabase({ name: 'kehutanan.db', location: 'default' });

  const inisialisasiBasisData = async () => {
    try {
      const db = await getDBConnection();
      await db.executeSql('PRAGMA foreign_keys = ON;');
      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS tabel_temuan (
          id VARCHAR(50) PRIMARY KEY, latitude DECIMAL(10,8) NOT NULL, longitude DECIMAL(11,8) NOT NULL, 
          title VARCHAR(255), description TEXT, kategori VARCHAR(50), foto TEXT, 
          timestamp TIMESTAMP, status_sync INTEGER DEFAULT 0
        );
      `);
      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS tabel_poligon (
          id INTEGER PRIMARY KEY AUTOINCREMENT, id_temuan VARCHAR(50) NOT NULL, 
          urutan INTEGER NOT NULL, latitude DECIMAL(10,8) NOT NULL, longitude DECIMAL(11,8) NOT NULL, 
          timestamp TIMESTAMP, FOREIGN KEY (id_temuan) REFERENCES tabel_temuan(id) ON DELETE CASCADE
        );
      `);
      muatDataLokal();
    } catch (error) { console.error("Error init DB: ", error); }
  };

  const muatDataLokal = async () => {
    try {
      const db = await getDBConnection();
      const [hasilTitik] = await db.executeSql(`SELECT * FROM tabel_temuan`);
      const titikDB: TitikTemuan[] = [];
      for (let i = 0; i < hasilTitik.rows.length; i++) {
        titikDB.push(hasilTitik.rows.item(i));
      }
      setTemuanTitik(titikDB);
    } catch (error) {}
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      } catch (err) { console.warn(err); }
    }
  };

  const tampilkanNotifikasiOnline = async () => {
    await notifee.requestPermission();
    const channelId = await notifee.createChannel({
      id: 'network-status',
      name: 'Status Jaringan Forestry GIS',
    });

    await notifee.displayNotification({
      title: 'Jaringan Tersedia',
      body: 'Koneksi internet kembali aktif. Silakan buka dasbor mini untuk mengirim data secara manual.',
      android: {
        channelId,
        smallIcon: 'ic_launcher', 
        pressAction: { id: 'default' },
      },
    });
  };

  useEffect(() => {
    requestLocationPermission();
    inisialisasiBasisData();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      setStatusInternet(isConnected);

      // PENGATURAN MANUAL: Hanya panggil notifikasi, jangan kirim data otomatis
      if (isConnected && !previousNetworkState.current) {
         tampilkanNotifikasiOnline();
      }
      previousNetworkState.current = isConnected; 
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const muatPetaOffline = async () => {
      if (petaOfflineAktif && petaOfflineAktif.toLowerCase().endsWith('.geojson')) {
        try {
          const isiFile = await RNFS.readFile(petaOfflineAktif, 'utf8');
          setGeoJsonData(JSON.parse(isiFile));
        } catch (error) { Alert.alert("Eror", "Gagal membaca GeoJSON"); }
      }
    };
    muatPetaOffline();
  }, [petaOfflineAktif]);

  const hitungJarakValue = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const hitungJarak = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const jarak = hitungJarakValue(lat1, lon1, lat2, lon2);
    return jarak > 1000 ? `${(jarak / 1000).toFixed(2)} km` : `${Math.round(jarak)} m`;
  };

  const mulaiNavigasi = () => {
    if (!userLocation) {
      Alert.alert("GPS Belum Siap", "Tunggu hingga sensor mendeteksi lokasimu.");
      return;
    }
    setTargetNavigasi(titikTengah);
    setJarakNavigasi(hitungJarak(userLocation[1], userLocation[0], titikTengah[1], titikTengah[0]));
    setNavigasiAktif(true);
    setModalAlatVisible(false);
  };

  const cariKoordinatManual = () => {
    const lat = parseFloat(inputLat.replace(',', '.'));
    const lng = parseFloat(inputLng.replace(',', '.'));
    
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert("Format Salah", "Masukkan angka desimal koordinat dengan benar.");
      return;
    }
    
    setTitikTengah([lng, lat]);
    setModalCariVisible(false);
    setModalAlatVisible(false);
    cameraRef.current?.setCamera({ centerCoordinate: [lng, lat], zoomLevel: 16, animationDuration: 2000 });
  };

  const toggleTracking = () => {
    if (!isTracking) {
      setTitikTrackingPoligon(userLocation ? [userLocation] : []);
      setIsTracking(true);
      isTrackingRef.current = true;
      setModalAlatVisible(false);
    } else {
      setIsTracking(false);
      isTrackingRef.current = false;
      setModalAlatVisible(false);
      
      setTitikTrackingPoligon(prev => {
        const newPoly = [...prev];
        if (newPoly.length > 2) {
          newPoly.push(newPoly[0]); 
        }
        return newPoly;
      });

      Alert.alert(
        "Selesai Merekam", 
        "Area berhasil direkam. Ingin menyimpan data poligon ini?", 
        [
          { text: "Hapus", style: "destructive", onPress: () => setTitikTrackingPoligon([]) },
          { text: "Simpan Form", onPress: () => { setModeEdit(false); setNamaTemuan(''); setDaftarFoto([]); setModalVisible(true); } }
        ]
      );
    }
  };

  const simpanData = async () => {
    if (!namaTemuan) { Alert.alert('Peringatan', 'Judul observasi wajib diisi'); return; }
    try {
      const db = await getDBConnection();
      const waktuSekarang = new Date().toISOString(); 
      const fotoDataString = daftarFoto.length > 0 ? JSON.stringify(daftarFoto) : null;

      if (modeEdit && idAktif) {
        await db.executeSql(`UPDATE tabel_temuan SET title=?, description=?, kategori=?, foto=? WHERE id=?`, [namaTemuan, deskripsi, kategori, fotoDataString, idAktif]);
      } else {
        const newId = `TMN-${Date.now()}`;
        await db.executeSql(`INSERT INTO tabel_temuan (id, latitude, longitude, title, description, kategori, foto, timestamp, status_sync) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [newId, titikTengah[1], titikTengah[0], namaTemuan, deskripsi, kategori, fotoDataString, waktuSekarang, 0]);

        if (titikTrackingPoligon.length > 0) {
          for (let i = 0; i < titikTrackingPoligon.length; i++) {
            await db.executeSql(`INSERT INTO tabel_poligon (id_temuan, urutan, latitude, longitude, timestamp) VALUES (?, ?, ?, ?, ?)`,
              [newId, i + 1, titikTrackingPoligon[i][1], titikTrackingPoligon[i][0], waktuSekarang]);
          }
          setTitikTrackingPoligon([]); 
        }
      }
      muatDataLokal(); setModalVisible(false);
    } catch (error) {}
  };

  const hapusDataPoint = async () => {
    Alert.alert("Hapus Titik", "Yakin ingin menghapus data observasi ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: async () => {
          try {
            const db = await getDBConnection();
            await db.executeSql('DELETE FROM tabel_temuan WHERE id = ?', [idAktif]);
            muatDataLokal();
            setModalVisible(false);
          } catch (error) {}
        }
      }
    ]);
  };

  const autoSyncBackground = async () => {
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) { 
      try {
        const db = await getDBConnection();
        const [hasilTemuan] = await db.executeSql(`SELECT * FROM tabel_temuan WHERE status_sync = 0`);
        
        if (hasilTemuan.rows.length > 0) {
          let arrayDataSync = [];
          for (let i = 0; i < hasilTemuan.rows.length; i++) {
            const temuan = hasilTemuan.rows.item(i);
            const [hasilPoligon] = await db.executeSql(`SELECT * FROM tabel_poligon WHERE id_temuan = ? ORDER BY urutan ASC`, [temuan.id]);
            
            let arrayKoordinatPoligon = [];
            for (let p = 0; p < hasilPoligon.rows.length; p++) {
              arrayKoordinatPoligon.push([hasilPoligon.rows.item(p).longitude, hasilPoligon.rows.item(p).latitude]);
            }

            let payloadItem: any = {
              id: temuan.id, latitude: temuan.latitude, longitude: temuan.longitude, title: temuan.title,
              description: temuan.description, kategori: temuan.kategori, foto: temuan.foto, timestamp: temuan.timestamp
            };

            if (arrayKoordinatPoligon.length > 2) {
              payloadItem.poligon_geojson = { type: "Polygon", coordinates: [arrayKoordinatPoligon] };
            }
            arrayDataSync.push(payloadItem);
          }

          const finalPayload = { device_id: "SURVEYOR-001", data_sync: arrayDataSync };
          const urlServerLaragon = 'http://172.20.10.12/forestrygis_web/sinkronisasi.php';

          const response = await fetch(urlServerLaragon, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(finalPayload)
          });

          if (response.status === 200) {
            for (const item of arrayDataSync) {
              await db.executeSql(`DELETE FROM tabel_temuan WHERE id = ?`, [item.id]);
            }
            muatDataLokal(); 
            return true; 
          } else {
            return false; 
          }
        }
        return true; 
      } catch (error) {
        return false; 
      }
    }
    return false; 
  };

  const pilihSumberFoto = () => {
    Alert.alert("Lampirkan Bukti Foto", "Pilih sumber foto dokumentasi Anda:", [
        { text: "Batal", style: "cancel" },
        { text: "Dari Galeri", onPress: bukaGaleri },
        { text: "Buka Kamera", onPress: bukaKamera }
    ]);
  };

  const bukaKamera = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      
      const opsi: CameraOptions = { mediaType: 'photo', quality: 0.5, saveToPhotos: false, includeBase64: true };
      const hasil = await launchCamera(opsi);

      if (hasil.didCancel) return;
      if (hasil.assets && hasil.assets.length > 0) {
        const base64Data = `data:${hasil.assets[0].type};base64,${hasil.assets[0].base64}`;
        setDaftarFoto([...daftarFoto, { uri: base64Data, deskripsi: '' }]);
      }
    } catch (error) {}
  };

  const bukaGaleri = async () => {
    try {
      const opsi: ImageLibraryOptions = { mediaType: 'photo', quality: 0.5, includeBase64: true };
      const hasil = await launchImageLibrary(opsi);

      if (hasil.didCancel) return;
      if (hasil.assets && hasil.assets.length > 0) {
        const base64Data = `data:${hasil.assets[0].type};base64,${hasil.assets[0].base64}`;
        setDaftarFoto([...daftarFoto, { uri: base64Data, deskripsi: '' }]);
      }
    } catch (error) {}
  };

  const updateDeskripsiFoto = (index: number, teks: string) => {
    const salinanFoto = [...daftarFoto];
    salinanFoto[index].deskripsi = teks;
    setDaftarFoto(salinanFoto);
  };

  const hapusFoto = (index: number) => {
    const salinanFoto = [...daftarFoto];
    salinanFoto.splice(index, 1);
    setDaftarFoto(salinanFoto);
  };

  const reCenterGPS = () => {
    if (userLocation) cameraRef.current?.setCamera({ centerCoordinate: userLocation, zoomLevel: 17, animationDuration: 1000 });
  };

  const openFormBukaMarker = (titik: TitikTemuan) => {
    setIdAktif(titik.id); 
    setNamaTemuan(titik.title); 
    setKategori(titik.kategori);
    setDeskripsi(titik.description); 
    setModeEdit(true);
    
    const foundCat = daftarKategoriSKTNKT.find(k => k.label === titik.kategori);
    if(foundCat){
      setKategoriIcon(foundCat.icon); setKategoriColor(foundCat.color);
    }

    let parsedFoto: FotoItem[] = [];
    if (titik.foto) {
      try {
        parsedFoto = JSON.parse(titik.foto);
        if (!Array.isArray(parsedFoto)) parsedFoto = [{ uri: titik.foto, deskripsi: '' }];
      } catch(e) {
        parsedFoto = [{ uri: titik.foto, deskripsi: '' }]; 
      }
    }
    setDaftarFoto(parsedFoto);
    setModalVisible(true);
  };

  return (
    <View style={stylesMap.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <MapboxGL.MapView 
        style={stylesMap.map} 
        styleURL={MapboxGL.StyleURL.SatelliteStreet}
        logoEnabled={false} compassEnabled={false} 
        onMapIdle={(e) => {
          if (e?.properties?.center) {
            setTitikTengah(e.properties.center);
            if (navigasiAktif && userLocation) {
              setTargetNavigasi(e.properties.center);
              setJarakNavigasi(hitungJarak(userLocation[1], userLocation[0], e.properties.center[1], e.properties.center[0]));
            }
          }
        }}
      >
        <MapboxGL.Camera ref={cameraRef} zoomLevel={14} centerCoordinate={titikTengah} />

        <MapboxGL.UserLocation 
          visible={true} 
          onUpdate={(location) => {
            if (location?.coords) {
              const coords = [location.coords.longitude, location.coords.latitude];
              setUserLocation(coords);
              
              if (isTrackingRef.current) {
                setTitikTrackingPoligon(prev => {
                  if (prev.length === 0) return [coords];
                  const lastPoint = prev[prev.length - 1];
                  const bergerak = hitungJarakValue(lastPoint[1], lastPoint[0], coords[1], coords[0]);
                  
                  if (bergerak > 2) {
                    return [...prev, coords];
                  }
                  return prev;
                });
              }
              
              if (navigasiAktif && targetNavigasi) setJarakNavigasi(hitungJarak(location.coords.latitude, location.coords.longitude, targetNavigasi[1], targetNavigasi[0]));
            }
          }} 
        />

        {titikTrackingPoligon.length > 1 && (
          <MapboxGL.ShapeSource 
            id="trackingLineSource" 
            shape={{ 
              type: 'Feature', 
              geometry: { 
                type: !isTracking && titikTrackingPoligon.length > 3 ? 'Polygon' : 'LineString', 
                coordinates: !isTracking && titikTrackingPoligon.length > 3 ? [titikTrackingPoligon] : titikTrackingPoligon 
              } 
            } as any}
          >
            {!isTracking && titikTrackingPoligon.length > 3 && (
              <MapboxGL.FillLayer id="trackingFill" style={{ fillColor: 'rgba(239, 68, 68, 0.4)', fillOutlineColor: '#EF4444' }} />
            )}
            <MapboxGL.LineLayer id="trackingLine" style={{ lineColor: '#EF4444', lineWidth: 4, lineJoin: 'round' }} />
          </MapboxGL.ShapeSource>
        )}

        {navigasiAktif && userLocation && targetNavigasi && (
          <MapboxGL.ShapeSource id="navLineSource" shape={{ type: 'Feature', geometry: { type: 'LineString', coordinates: [userLocation, targetNavigasi] } } as any}>
            <MapboxGL.LineLayer id="navLine" style={{ lineColor: '#3B82F6', lineWidth: 3, lineDasharray: [2, 2] }} />
          </MapboxGL.ShapeSource>
        )}

        {geoJsonData && (
          <MapboxGL.ShapeSource id="offlineSource" shape={geoJsonData}>
            <MapboxGL.FillLayer id="offlineFill" style={{ fillColor: 'rgba(0, 230, 118, 0.4)', fillOutlineColor: '#00E676' }} />
            <MapboxGL.LineLayer id="offlineLine" style={{ lineColor: '#00E676', lineWidth: 2 }} />
          </MapboxGL.ShapeSource>
        )}

        {temuanTitik.map((titik) => {
          const foundCat = daftarKategoriSKTNKT.find(k => k.label === titik.kategori);
          const catColor = foundCat?.color || '#10B981';
          const catIcon = foundCat?.icon || 'pin';
          return (
            <MapboxGL.PointAnnotation 
              key={titik.id} id={titik.id} coordinate={[titik.longitude, titik.latitude]}
              onSelected={() => openFormBukaMarker(titik)}
            >
              <View style={[stylesMap.markerInner, { backgroundColor: catColor }]}>
                <Icon name={catIcon} size={13} color="#FFF" />
              </View>
            </MapboxGL.PointAnnotation>
          );
        })}
      </MapboxGL.MapView>

      <View style={stylesMap.crosshairContainer} pointerEvents="none">
        <Icon name="add" size={40} color="#10B981" />
      </View>

      <View style={stylesMap.coordBox}>
        <Text style={stylesMap.coordText}>{titikTengah[1].toFixed(5)}, {titikTengah[0].toFixed(5)}</Text>
      </View>

      <View style={stylesMap.headerStatus}>
        <View style={stylesMap.brandBox}>
          <Text style={stylesMap.brandText}>Forestry GIS</Text>
        </View>
        
        <TouchableOpacity 
          style={[stylesMap.badgeContainer, { backgroundColor: statusInternet ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}
          onPress={() => setModalSyncVisible(true)}
        >
          <View style={[stylesMap.badgeDot, { backgroundColor: statusInternet ? '#10B981' : '#EF4444' }]} />
          <Text style={[stylesMap.badgeText, { color: statusInternet ? '#10B981' : '#EF4444' }]}>
            {statusInternet ? "ONLINE" : "OFFLINE"}
          </Text>
        </TouchableOpacity>
      </View>

      {isTracking && (
        <View style={stylesMap.trackingBanner}>
          <Icon name="radio-button-on" size={16} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={stylesMap.trackingText}>Merekam Poligon... ({titikTrackingPoligon.length} titik)</Text>
        </View>
      )}

      {navigasiAktif && (
        <View style={stylesMap.navBanner}>
          <Text style={stylesMap.navText}>Jarak Tujuan: <Text style={{fontWeight: 'bold', fontSize: 16}}>{jarakNavigasi}</Text></Text>
          <TouchableOpacity onPress={() => setNavigasiAktif(false)} style={stylesMap.navCloseBtn}>
            <Icon name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      <View style={stylesMap.bottomLeftContainer}>
        <TouchableOpacity style={[stylesMap.fabMain, isTracking && { backgroundColor: '#EF4444' }]} onPress={() => isTracking ? toggleTracking() : setModalAlatVisible(true)}>
          <Icon name={isTracking ? "stop" : "pencil"} size={26} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={stylesMap.bottomRightContainer}>
        <TouchableOpacity style={stylesMap.fabSmall} onPress={reCenterGPS}>
          <Icon name="navigate" size={24} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity style={stylesMap.fabMain} onPress={() => { setModeEdit(false); setNamaTemuan(''); setDaftarFoto([]); setDeskripsi(''); setModalVisible(true); }}>
          <Icon name="pin" size={28} color="#10B981" />
        </TouchableOpacity>
      </View>

      <Modal visible={modalSyncVisible} transparent animationType="fade">
        <View style={stylesMap.modalOverlayCenter}>
          <View style={stylesMap.modalForm}>
            <Text style={stylesMap.modalTitle}>Status Sinkronisasi</Text>
            
            {temuanTitik.length === 0 ? (
              <View style={{alignItems: 'center', marginVertical: 20}}>
                <Icon name="cloud-done" size={48} color="#10B981" style={{marginBottom: 10}} />
                <Text style={{textAlign: 'center', color: '#64748B'}}>Tidak ada antrean data.</Text>
                <Text style={{textAlign: 'center', color: '#64748B', fontSize: 12}}>Semua data lapangan berhasil terkirim ke server.</Text>
              </View>
            ) : (
              <ScrollView style={{maxHeight: 300}}>
                {temuanTitik.map((item, index) => (
                  <View key={index} style={{padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0'}}>
                    <Text style={{fontWeight: 'bold', color: '#0F172A', fontSize: 15}}>{item.title}</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8}}>
                       <Text style={{fontSize: 12, color: '#64748B'}}>{item.kategori}</Text>
                       <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12}}>
                         <Icon name="time" size={14} color="#F59E0B" style={{marginRight: 4}}/>
                         <Text style={{fontSize: 11, color: '#F59E0B', fontWeight: 'bold'}}>PENDING</Text>
                       </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {temuanTitik.length > 0 && (
              <TouchableOpacity 
                style={[stylesMap.btnSimpanForm, {marginTop: 20, paddingVertical: 12, backgroundColor: '#3B82F6'}]} 
                onPress={async () => {
                  const suksesKirim = await autoSyncBackground();
                  if (suksesKirim) Alert.alert("Sinkronisasi Berhasil", "Data telah terkirim dan masuk ke server.");
                  else Alert.alert("Sinkronisasi Gagal", "Koneksi ke peladen terputus.");
                }}
              >
                <Icon name="cloud-upload-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={stylesMap.teksSimpanForm}>Kirim ke Server Sekarang</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[stylesMap.btnBatal, {marginTop: 10, paddingVertical: 12}]} onPress={() => setModalSyncVisible(false)}>
              <Text style={[stylesMap.teksBatal, {textAlign: 'center'}]}>Tutup Dashboard Mini</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={stylesMap.modalOverlayForm}>
          <View style={stylesMap.formSheet}>
            <View style={stylesMap.formHeader}>
              <Text style={stylesMap.sheetTitleForm}>{modeEdit ? 'Edit Form Ekologis' : 'Formulir SKT & NKT'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Icon name="close-circle" size={28} color="#94A3B8" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={stylesMap.labelForm}>Judul Observasi</Text>
              <TextInput style={stylesMap.inputForm} value={namaTemuan} onChangeText={setNamaTemuan} placeholder="Contoh: Mata Air Blok C" placeholderTextColor="#94A3B8" />

              <Text style={stylesMap.labelForm}>Kategori Area</Text>
              <TouchableOpacity style={stylesMap.dropdownTrigger} onPress={() => setDropdownKategoriVisible(!dropdownKategoriVisible)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[stylesMap.iconKategoriMini, { backgroundColor: kategoriColor }]}><Icon name={kategoriIcon} size={16} color="#FFF" /></View>
                  <Text style={stylesMap.dropdownText}>{kategori}</Text>
                </View>
                <Icon name={dropdownKategoriVisible ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
              </TouchableOpacity>

              {dropdownKategoriVisible && (
                <View style={stylesMap.dropdownContainer}>
                  {daftarKategoriSKTNKT.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={stylesMap.dropdownItem} 
                      onPress={() => {
                        setKategori(item.label); setKategoriIcon(item.icon); setKategoriColor(item.color);
                        setDropdownKategoriVisible(false);
                      }}
                    >
                      <View style={[stylesMap.iconKategoriMini, { backgroundColor: item.color }]}><Icon name={item.icon} size={16} color="#FFF" /></View>
                      <Text style={stylesMap.dropdownItemText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={stylesMap.labelForm}>Deskripsi Lapangan</Text>
              <TextInput style={[stylesMap.inputForm, stylesMap.textArea]} value={deskripsi} onChangeText={setDeskripsi} placeholder="Catat kondisi vegetasi atau temuan spesifik..." placeholderTextColor="#94A3B8" multiline numberOfLines={4} textAlignVertical="top" />

              <View style={stylesMap.fotoHeader}>
                <Text style={stylesMap.labelForm}>Dokumentasi Foto ({daftarFoto.length})</Text>
                <TouchableOpacity style={stylesMap.btnTambahFoto} onPress={pilihSumberFoto}>
                  <Icon name="add-circle-outline" size={18} color="#00796B" />
                  <Text style={stylesMap.teksTambahFoto}>Tambah Foto</Text>
                </TouchableOpacity>
              </View>

              {daftarFoto.length === 0 ? (
                <View style={stylesMap.emptyFotoBox}>
                  <Icon name="image-outline" size={32} color="#CBD5E1" />
                  <Text style={stylesMap.emptyFotoText}>Belum ada foto terlampir</Text>
                </View>
              ) : (
                daftarFoto.map((foto, index) => (
                  <View key={index} style={stylesMap.photoItemBox}>
                    <Image source={{ uri: foto.uri }} style={stylesMap.photoPreviewThumb} />
                    <View style={stylesMap.photoInputSection}>
                      <TextInput 
                        style={stylesMap.inputFotoDesc} 
                        value={foto.deskripsi} 
                        onChangeText={(txt) => updateDeskripsiFoto(index, txt)} 
                        placeholder="Nama/Keterangan foto ini..." 
                        placeholderTextColor="#94A3B8" 
                      />
                      <TouchableOpacity onPress={() => hapusFoto(index)} style={stylesMap.btnHapusFoto}>
                        <Icon name="trash" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <TouchableOpacity style={stylesMap.btnSimpanForm} onPress={simpanData}>
                <Icon name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={stylesMap.teksSimpanForm}>Simpan ke Database Lokal</Text>
              </TouchableOpacity>

              {modeEdit && (
                <TouchableOpacity 
                  style={[stylesMap.btnSimpanForm, { backgroundColor: '#EF4444', marginTop: 15 }]} 
                  onPress={hapusDataPoint}
                >
                  <Icon name="trash-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={stylesMap.teksSimpanForm}>Hapus Titik Ini</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalAlatVisible} transparent animationType="slide">
        <TouchableOpacity style={stylesMap.modalOverlay} activeOpacity={1} onPress={() => setModalAlatVisible(false)}>
          <View style={stylesMap.bottomSheet}>
            <View style={stylesMap.dragHandle} />
            <Text style={stylesMap.sheetTitle}>Alat Pemetaan</Text>

            <TouchableOpacity style={stylesMap.sheetItem} onPress={toggleTracking}>
              <View style={[stylesMap.sheetIconBox, { backgroundColor: '#FEE2E2' }]}><Icon name="radio-button-on" size={24} color="#EF4444" /></View>
              <Text style={stylesMap.sheetItemText}>Mulai Rekam GPS (Poligon)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={stylesMap.sheetItem} onPress={() => { setModalAlatVisible(false); setModalCariVisible(true); }}>
              <View style={[stylesMap.sheetIconBox, { backgroundColor: '#FEF3C7' }]}><Icon name="search" size={24} color="#F59E0B" /></View>
              <Text style={stylesMap.sheetItemText}>Cari Koordinat Manual</Text>
            </TouchableOpacity>

            <TouchableOpacity style={stylesMap.sheetItem} onPress={mulaiNavigasi}>
              <View style={[stylesMap.sheetIconBox, { backgroundColor: '#DBEAFE' }]}><Icon name="arrow-redo" size={24} color="#3B82F6" /></View>
              <Text style={stylesMap.sheetItemText}>Navigasi ke Titik Kursor</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalCariVisible} transparent animationType="fade">
        <View style={stylesMap.modalOverlayCenter}>
          <View style={stylesMap.modalForm}>
            <Text style={stylesMap.modalTitle}>Cari Koordinat</Text>
            <Text style={stylesMap.label}>Latitude (Lintang)</Text>
            <TextInput style={stylesMap.input} keyboardType="numeric" value={inputLat} onChangeText={setInputLat} placeholder="Contoh: -0.1752" placeholderTextColor="#999" />
            <Text style={stylesMap.label}>Longitude (Bujur)</Text>
            <TextInput style={stylesMap.input} keyboardType="numeric" value={inputLng} onChangeText={setInputLng} placeholder="Contoh: 110.9608" placeholderTextColor="#999" />
            
            <View style={stylesMap.actionRow}>
              <TouchableOpacity style={stylesMap.btnBatal} onPress={() => setModalCariVisible(false)}><Text style={stylesMap.teksBatal}>Batal</Text></TouchableOpacity>
              <TouchableOpacity style={stylesMap.btnSimpan} onPress={cariKoordinatManual}><Text style={stylesMap.teksSimpan}>Cari Lokasi</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const stylesMap = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  crosshairContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20, zIndex: 10 },
  coordBox: { position: 'absolute', bottom: 35, alignSelf: 'center', backgroundColor: 'rgba(30, 41, 59, 0.85)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, zIndex: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  coordText: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  
  headerStatus: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
  brandBox: { backgroundColor: 'rgba(30, 41, 59, 0.9)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  brandText: { color: '#F8FAFC', fontWeight: '800', fontSize: 15 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  badgeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  trackingBanner: { position: 'absolute', top: 110, alignSelf: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  trackingText: { color: '#B91C1C', fontWeight: 'bold', fontSize: 13 },
  navBanner: { position: 'absolute', top: 110, alignSelf: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, flexDirection: 'row', alignItems: 'center', elevation: 5 },
  navText: { color: '#FFF', fontSize: 14, marginRight: 15 },
  navCloseBtn: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15, padding: 4 },

  bottomLeftContainer: { position: 'absolute', bottom: 30, left: 20, zIndex: 10 },
  bottomRightContainer: { position: 'absolute', bottom: 30, right: 20, alignItems: 'center', gap: 15, zIndex: 10 },
  fabMain: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  fabSmall: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', elevation: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  markerInner: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#FFF', elevation: 5, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40 },
  dragHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 15 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sheetIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sheetItemText: { fontSize: 16, fontWeight: '600', color: '#334155' },

  modalOverlayCenter: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalForm: { backgroundColor: '#FFF', borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#64748B', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, marginTop: 5, color: '#0F172A', backgroundColor: '#F8FAFC' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25, gap: 10 },
  btnBatal: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#F1F5F9' },
  btnSimpan: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#10B981' },
  teksBatal: { color: '#64748B', fontWeight: 'bold' },
  teksSimpan: { color: '#FFF', fontWeight: 'bold' },

  modalOverlayForm: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.7)' },
  formSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, height: '85%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sheetTitleForm: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  labelForm: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 15, marginBottom: 8 },
  inputForm: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC' },
  textArea: { height: 100 },
  
  dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, backgroundColor: '#F8FAFC' },
  dropdownText: { fontSize: 15, color: '#0F172A', fontWeight: '600' },
  dropdownContainer: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginTop: 5, elevation: 3, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconKategoriMini: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dropdownItemText: { fontSize: 14, color: '#334155', fontWeight: '500' },

  fotoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  btnTambahFoto: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  teksTambahFoto: { color: '#00796B', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  emptyFotoBox: { borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 12, height: 90, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  emptyFotoText: { color: '#94A3B8', fontSize: 13, marginTop: 5 },

  photoItemBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, marginBottom: 10 },
  photoPreviewThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#CBD5E1' },
  photoInputSection: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  inputFotoDesc: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: '#FFF', color: '#0F172A' },
  btnHapusFoto: { padding: 10, marginLeft: 5 },
  
  btnSimpanForm: { backgroundColor: '#10B981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 14, marginTop: 30, elevation: 4, shadowColor: '#10B981', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 6 },
  teksSimpanForm: { color: '#FFF', fontWeight: '800', fontSize: 16 }
});

export default MapScreen;