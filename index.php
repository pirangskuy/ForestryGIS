<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forestry GIS - Enterprise Dashboard</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
    <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <script src="https://unpkg.com/@turf/turf@6/turf.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/shpjs/4.0.2/shp.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/togeojson/0.16.0/togeojson.min.js"></script>

    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F8FAFC; }
        #map { height: 100%; width: 100%; z-index: 10; }
        
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: #f1f1f1; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .nav-active { border-left: 4px solid #00796B; background: linear-gradient(90deg, #E0F2F1 0%, rgba(255,255,255,0) 100%); color: #004D40 !important; font-weight: 700 !important; }
        
        .mapboxgl-popup-content { border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); padding: 0; overflow: hidden; width: 280px !important; }
        .mapboxgl-popup-close-button { color: white; font-size: 20px; top: 8px; right: 8px; background: rgba(0,0,0,0.4); border-radius: 50%; width: 28px; height: 28px; z-index: 50; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .mapboxgl-popup-close-button:hover { background: rgba(0,0,0,0.7); }
        
        #project-modal, #edit-modal { backdrop-filter: blur(8px); }
    </style>
</head>
<body class="overflow-hidden flex flex-col h-screen">

    <div id="project-modal" class="fixed inset-0 z-[9999] bg-[#F4FBFD]/95 flex flex-col items-center justify-center transition-opacity duration-500">
        <div class="bg-white p-3 rounded-full shadow-sm border border-gray-100 mb-6 flex items-center justify-center w-24 h-24">
            <img src="assets/img/forestrygislogo.png" class="max-w-full max-h-full object-contain" alt="Logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2873/2873836.png'">
        </div>
        <h2 class="text-[28px] font-bold text-[#004D40] mb-1">Forestry GIS Workspace</h2>
        <p class="text-gray-500 text-sm mb-10 font-medium">Sistem Monitoring Analisis Spasial Hutan</p>
        
        <div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-[420px] max-w-full text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-[#00796B]"></div>
            <h3 class="font-bold text-gray-800 mb-6 text-left text-sm">Pilih Ruang Kerja:</h3>
            
            <button type="button" onclick="bukaPetaDasar()" class="w-full mb-4 bg-[#00796B] hover:bg-[#005e53] text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-teal-500/20 flex justify-center items-center gap-3">
                <i class="fa-solid fa-cloud-arrow-down text-lg"></i> Buka Peta Dasar (Sinkronisasi)
            </button>
            
            <div class="flex gap-3 mb-2">
                <button type="button" onclick="document.getElementById('shp-input-awal').click()" class="flex-1 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-bold transition flex justify-center items-center gap-2">
                    <i class="fa-solid fa-draw-polygon text-[#EA580C]"></i> Layer (.zip)
                </button>
                <input type="file" id="shp-input-awal" class="hidden" accept=".zip">

                <button type="button" onclick="document.getElementById('kml-input-awal').click()" class="flex-1 bg-white border-2 border-[#00796B] text-[#00796B] hover:bg-[#F4FBFD] py-3 rounded-xl font-bold transition flex justify-center items-center gap-2">
                    <i class="fa-solid fa-location-dot text-[#00796B]"></i> Titik (.kml)
                </button>
                <input type="file" id="kml-input-awal" class="hidden" accept=".kml">
            </div>
        </div>
    </div>

    <div id="edit-modal" class="fixed inset-0 z-[9999] bg-black/60 hidden flex items-center justify-center transition-opacity">
        <div class="bg-white rounded-2xl shadow-2xl w-[450px] max-w-[90%] flex flex-col overflow-hidden">
            <div class="bg-[#00796B] px-6 py-4 flex justify-between items-center">
                <h3 class="font-bold text-white text-lg">Edit Observasi Lapangan</h3>
                <button onclick="tutupModalEdit()" class="text-teal-100 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
            </div>
            
            <div class="p-6 overflow-y-auto max-h-[70vh]">
                <input type="hidden" id="edit-id">
                
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Judul Observasi</label>
                <input type="text" id="edit-title" class="w-full border border-gray-300 p-3 rounded-xl mb-4 focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="Masukkan judul temuan">

                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori (Strata)</label>
                <select id="edit-kategori" class="w-full border border-gray-300 p-3 rounded-xl mb-4 focus:ring-2 focus:ring-teal-500 focus:outline-none">
                    <option value="HKT (Kepadatan Tinggi)">HKT (Kepadatan Tinggi)</option>
                    <option value="HKM (Kepadatan Sedang)">HKM (Kepadatan Sedang)</option>
                    <option value="HKR (Kepadatan Rendah)">HKR (Kepadatan Rendah)</option>
                    <option value="HRM (Regenerasi Muda)">HRM (Regenerasi Muda)</option>
                    <option value="BT (Belukar Tua)">BT (Belukar Tua)</option>
                    <option value="LT (Lahan Terbuka)">LT (Lahan Terbuka)</option>
                    <option value="NKT 1 - Hayati">NKT 1 - Hayati</option>
                    <option value="NKT 2 - Ekosistem">NKT 2 - Ekosistem</option>
                    <option value="NKT 3 - Langka">NKT 3 - Langka</option>
                    <option value="NKT 4 - Jasa Lingkungan">NKT 4 - Jasa Lingkungan</option>
                    <option value="NKT 5 - Kebutuhan Dasar">NKT 5 - Kebutuhan Dasar</option>
                    <option value="NKT 6 - Kultural">NKT 6 - Kultural</option>
                    <option value="SKT - Tutupan Lahan">SKT - Tutupan Lahan</option>
                </select>

                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deskripsi Lapangan</label>
                <textarea id="edit-desc" class="w-full border border-gray-300 p-3 rounded-xl mb-4 h-24 focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="Tuliskan detail kondisi vegetasi/temuan..."></textarea>

                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dokumentasi Foto</label>
                <div class="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition relative overflow-hidden group">
                    <input type="file" id="edit-foto" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onchange="prosesFoto(event)">
                    
                    <div id="foto-placeholder" class="py-4">
                        <i class="fa-solid fa-cloud-arrow-up text-3xl text-gray-300 mb-2 group-hover:text-teal-500 transition"></i>
                        <p class="text-sm text-gray-500">Klik untuk mengunggah foto baru</p>
                    </div>
                    <img id="preview-foto" class="absolute inset-0 w-full h-full object-cover hidden" alt="Preview Foto">
                </div>
                <button type="button" id="btn-hapus-foto" onclick="hapusFotoPreview()" class="text-xs text-red-500 font-bold mt-2 hidden hover:underline"><i class="fa-solid fa-trash"></i> Hapus Foto Saat Ini</button>
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button onclick="tutupModalEdit()" class="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition">Batal</button>
                <button onclick="simpanEdit()" class="px-5 py-2.5 bg-[#00796B] hover:bg-[#005e53] text-white font-bold rounded-xl transition shadow-md shadow-teal-500/20"><i class="fa-solid fa-save mr-2"></i>Simpan Perubahan</button>
            </div>
        </div>
    </div>

    <nav class="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-6 z-50 shrink-0 shadow-sm">
        <div class="flex items-center gap-4">
            <img src="assets/img/forestrygislogo.png" class="h-10 w-10 object-contain" alt="Logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2873/2873836.png'">
            <div class="border-l-2 border-gray-200 pl-4">
                <h1 class="text-[19px] font-bold text-[#004D40] leading-tight">Forestry GIS</h1>
                <p class="text-[11px] text-gray-500 font-semibold tracking-wider uppercase">Spatial Data Management</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <button type="button" onclick="document.getElementById('shp-input').click()" class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm hover:bg-gray-50 flex items-center gap-2">
                <i class="fa-solid fa-plus text-[#EA580C]"></i> Layer SHP
            </button>
            <input type="file" id="shp-input" class="hidden" accept=".zip">

            <button type="button" onclick="document.getElementById('kml-input').click()" class="bg-[#E0F2F1] border border-[#A3E4D7] text-[#00796B] px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm hover:bg-[#CCFBF1] flex items-center gap-2">
                <i class="fa-solid fa-location-dot"></i>
            </button>
            <input type="file" id="kml-input" class="hidden" accept=".kml">
            
            <div class="h-10 border-l border-gray-200 mx-2"></div>
            
            <div class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition">
                <div class="text-right hidden md:block">
                    <p class="text-sm font-bold text-gray-800">Administrator</p>
                    <p class="text-xs text-[#00796B] font-medium">System Role</p>
                </div>
                <div class="h-10 w-10 rounded-full bg-[#E0F2F1] flex items-center justify-center border border-[#A3E4D7]">
                    <i class="fa-solid fa-user text-[#00796B]"></i>
                </div>
            </div>
        </div>
    </nav>

    <div class="flex flex-1 overflow-hidden">
        <aside class="w-[300px] bg-white border-r border-gray-200 flex flex-col z-40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0">
            <div class="py-4 space-y-1 border-b border-gray-100">
                <a href="javascript:void(0)" id="tab-map" onclick="switchView('map')" class="nav-active flex items-center gap-3 px-6 py-3 text-sm text-gray-600 transition">
                    <i class="fa-solid fa-map-location-dot w-5 text-center"></i> Ruang Kerja Peta
                </a>
                <a href="javascript:void(0)" id="tab-table" onclick="switchView('table')" class="flex items-center gap-3 px-6 py-3 text-sm text-gray-600 hover:bg-gray-50 font-medium transition">
                    <i class="fa-solid fa-database w-5 text-center"></i> Basis Data Poin
                </a>
            </div>

            <div class="flex-1 overflow-y-auto sidebar-scroll p-6">
                <div class="mb-4">
                    <div onclick="toggleMenu('skt-list', 'skt-chevron')" class="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition -mx-2">
                        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 m-0">
                            <i class="fa-solid fa-tree text-[#00796B]"></i> Kelas Tutupan (SKT)
                        </h3>
                        <i id="skt-chevron" class="fa-solid fa-chevron-down text-gray-400 text-xs transition-transform duration-300"></i>
                    </div>
                    <div id="skt-list" class="space-y-4 mt-3 hidden px-2">
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#064E3B] text-white text-sm shadow-sm"><i class="fa-solid fa-leaf"></i></span>
                            <p class="text-sm font-bold text-gray-800">HKT (Kepadatan Tinggi)</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#047857] text-white text-sm shadow-sm"><i class="fa-solid fa-leaf"></i></span>
                            <p class="text-sm font-bold text-gray-800">HKM (Kepadatan Sedang)</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#34D399] text-white text-sm shadow-sm"><i class="fa-solid fa-leaf"></i></span>
                            <p class="text-sm font-bold text-gray-800">HKR (Kepadatan Rendah)</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#A3E635] text-white text-sm shadow-sm"><i class="fa-solid fa-seedling"></i></span>
                            <p class="text-sm font-bold text-gray-800">HRM (Regenerasi Muda)</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#EAB308] text-white text-sm shadow-sm"><i class="fa-solid fa-seedling"></i></span>
                            <p class="text-sm font-bold text-gray-800">BT (Belukar Tua)</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#EF4444] text-white text-sm shadow-sm"><i class="fa-solid fa-triangle-exclamation"></i></span>
                            <p class="text-sm font-bold text-gray-800">LT (Lahan Terbuka)</p>
                        </div>
                    </div>
                </div>

                <div class="border-t border-gray-100 my-4"></div>

                <div class="mb-4">
                    <div onclick="toggleMenu('nkt-list', 'nkt-chevron')" class="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition -mx-2">
                        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 m-0">
                            <i class="fa-solid fa-leaf text-[#00796B]"></i> Nilai Konservasi (NKT)
                        </h3>
                        <i id="nkt-chevron" class="fa-solid fa-chevron-down text-gray-400 text-xs transition-transform duration-300"></i>
                    </div>
                    <div id="nkt-list" class="space-y-4 mt-3 hidden px-2">
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#8B5CF6] text-white text-sm shadow-sm"><i class="fa-solid fa-paw"></i></span>
                            <p class="text-sm font-bold text-gray-800">NKT 1 - Hayati</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#6366F1] text-white text-sm shadow-sm"><i class="fa-solid fa-mountain"></i></span>
                            <p class="text-sm font-bold text-gray-800">NKT 2 - Ekosistem</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#3B82F6] text-white text-sm shadow-sm"><i class="fa-solid fa-dove"></i></span>
                            <p class="text-sm font-bold text-gray-800">NKT 3 - Langka</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#0EA5E9] text-white text-sm shadow-sm"><i class="fa-solid fa-droplet"></i></span>
                            <p class="text-sm font-bold text-gray-800">NKT 4 - Jasa Lingkungan</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#F59E0B] text-white text-sm shadow-sm"><i class="fa-solid fa-house"></i></span>
                            <p class="text-sm font-bold text-gray-800">NKT 5 - Kebutuhan Dasar</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-[#D946EF] text-white text-sm shadow-sm"><i class="fa-solid fa-fire"></i></span>
                            <p class="text-sm font-bold text-gray-800">NKT 6 - Kultural</p>
                        </div>
                    </div>
                </div>

            </div>
        </aside>

        <main class="flex-1 relative bg-[#F8FAFC]">
            
            <div id="map-container" class="absolute inset-0 z-10 flex flex-col">
                <div id="map"></div>
                
                <div class="absolute bottom-6 right-6 z-[400] bg-white px-4 py-2.5 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3">
                    <i class="fa-solid fa-crosshairs text-[#00796B]"></i>
                    <div class="text-xs font-mono font-bold text-gray-700 tracking-wide" id="live-coordinate">
                        Lat: -0.17520, Lng: 110.96080
                    </div>
                </div>

                <div class="absolute top-6 left-1/2 -translate-x-1/2 z-[400] bg-white p-1.5 rounded-full shadow-lg border border-gray-100 flex gap-1 items-center">
                    <button type="button" id="btn-satelit" onclick="gantiBasemap('mapbox://styles/mapbox/satellite-streets-v12')" class="px-5 py-2 text-sm font-bold rounded-full bg-[#E8F5E9] text-[#00796B] transition-colors">Citra Satelit</button>
                    <button type="button" id="btn-jalan" onclick="gantiBasemap('mapbox://styles/mapbox/streets-v12')" class="px-5 py-2 text-sm font-bold rounded-full text-gray-500 hover:text-gray-800 transition-colors">Peta Jalan</button>
                    <button type="button" id="btn-topo" onclick="gantiBasemap('mapbox://styles/mapbox/outdoors-v12')" class="px-5 py-2 text-sm font-bold rounded-full text-gray-500 hover:text-gray-800 transition-colors">Topografi</button>
                </div>
            </div>

            <div id="table-container" class="absolute inset-0 z-20 bg-[#F8FAFC] hidden overflow-y-auto p-8">
                <div class="max-w-7xl mx-auto">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">Basis Data Observasi Lapangan</h2>
                            <p class="text-sm text-gray-500 mt-1">Daftar rekaman titik geospasial hasil sinkronisasi dari perangkat surveyor.</p>
                        </div>
                        <button class="bg-[#00796B] text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-[#005e53] transition shadow-md shadow-teal-500/20 flex items-center gap-2">
                            <i class="fa-solid fa-download"></i> Ekspor Laporan CSV
                        </button>
                    </div>

                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                                    <th class="p-4 w-1/4">Judul Observasi</th>
                                    <th class="p-4 w-1/5">Kategori / Strata</th>
                                    <th class="p-4 w-1/6">Koordinat (Lat, Lng)</th>
                                    <th class="p-4 w-1/4">Deskripsi Lapangan</th>
                                    <th class="p-4 w-1/12 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="data-table-body" class="text-sm text-gray-700 divide-y divide-gray-100">
                                </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </main>
    </div>

    <script>
        let globalDataTitik = [];
        let globalMapMarkers = []; // Menyimpan marker mapbox agar bisa dibersihkan saat re-render
        let tempFotoBase64 = null; // Menyimpan foto saat form edit dibuka

        function switchView(view) {
            const mapContainer = document.getElementById('map-container');
            const tableContainer = document.getElementById('table-container');
            const tabMap = document.getElementById('tab-map');
            const tabTable = document.getElementById('tab-table');

            tabMap.className = "flex items-center gap-3 px-6 py-3 text-sm text-gray-600 hover:bg-gray-50 font-medium transition";
            tabTable.className = "flex items-center gap-3 px-6 py-3 text-sm text-gray-600 hover:bg-gray-50 font-medium transition";

            if (view === 'map') {
                mapContainer.classList.remove('hidden');
                tableContainer.classList.add('hidden');
                tabMap.classList.add('nav-active');
                setTimeout(() => map.resize(), 100); 
            } 
            else if (view === 'table') {
                mapContainer.classList.add('hidden');
                tableContainer.classList.remove('hidden');
                tabTable.classList.add('nav-active');
                renderTable(); 
            }
        }

        function toggleMenu(listId, chevronId) {
            const list = document.getElementById(listId);
            const chevron = document.getElementById(chevronId);
            if (list.classList.contains('hidden')) {
                list.classList.remove('hidden');
                chevron.style.transform = 'rotate(180deg)';
            } else {
                list.classList.add('hidden');
                chevron.style.transform = 'rotate(0deg)';
            }
        }

        mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN_HERE';
        var currentStyle = 'mapbox://styles/mapbox/satellite-streets-v12';

        var map = new mapboxgl.Map({
            container: 'map', 
            style: currentStyle, 
            center: [110.9608, -0.1752], 
            zoom: 13,
            projection: 'globe' 
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('mousemove', (e) => {
            document.getElementById('live-coordinate').innerHTML = `Lat: ${e.lngLat.lat.toFixed(5)}, Lng: ${e.lngLat.lng.toFixed(5)}`;
        });

        function gantiBasemap(styleUrl) {
            if (currentStyle === styleUrl) return;
            currentStyle = styleUrl;
            map.setStyle(styleUrl);
            
            var gayaMati = "px-5 py-2 text-sm font-bold rounded-full text-gray-500 hover:text-gray-800 transition-colors";
            document.getElementById('btn-satelit').className = gayaMati;
            document.getElementById('btn-jalan').className = gayaMati;
            document.getElementById('btn-topo').className = gayaMati;

            var activeId = styleUrl.includes('satellite') ? 'btn-satelit' : styleUrl.includes('streets') ? 'btn-jalan' : 'btn-topo';
            document.getElementById(activeId).className = "px-5 py-2 text-sm font-bold rounded-full bg-[#E8F5E9] text-[#00796B] transition-colors";
        }

        const kategoriData = {
            'HKT (Kepadatan Tinggi)': { color: '#064E3B', icon: 'fa-leaf' },
            'HKM (Kepadatan Sedang)': { color: '#047857', icon: 'fa-leaf' },
            'HKR (Kepadatan Rendah)': { color: '#34D399', icon: 'fa-leaf' },
            'HRM (Regenerasi Muda)': { color: '#A3E635', icon: 'fa-seedling' },
            'BT (Belukar Tua)': { color: '#EAB308', icon: 'fa-seedling' },
            'LT (Lahan Terbuka)': { color: '#EF4444', icon: 'fa-triangle-exclamation' },
            'NKT 1 - Hayati': { color: '#8B5CF6', icon: 'fa-paw' },
            'NKT 2 - Ekosistem': { color: '#6366F1', icon: 'fa-mountain' },
            'NKT 3 - Langka': { color: '#3B82F6', icon: 'fa-dove' },
            'NKT 4 - Jasa Lingkungan': { color: '#0EA5E9', icon: 'fa-droplet' },
            'NKT 5 - Kebutuhan Dasar': { color: '#F59E0B', icon: 'fa-house' },
            'NKT 6 - Kultural': { color: '#D946EF', icon: 'fa-fire' },
            'SKT - Tutupan Lahan': { color: '#10B981', icon: 'fa-leaf' }
        };

        function getKategoriInfo(kategori) {
            return kategoriData[kategori] || { color: '#334155', icon: 'fa-circle-info' };
        }

        async function bukaPetaDasar() {
            document.getElementById('project-modal').style.opacity = '0';
            setTimeout(() => { document.getElementById('project-modal').style.display = 'none'; }, 500);
            
            // SIMULASI: Data Dummy Awal
            const mockData = {
                titik: [
                    { 
                        id: 'TMN-001', latitude: -0.1700, longitude: 110.9650, title: 'Temuan Hutan Rapat', kategori: 'HKT (Kepadatan Tinggi)', 
                        description: 'Kondisi tajuk sangat rapat, tidak ada bekas tebangan.',
                        foto: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=400&q=80'
                    }
                ]
            };
            
            globalDataTitik = mockData.titik;
            renderSpatialDataOnMap(globalDataTitik);
            switchView('map');
        }

        function renderSpatialDataOnMap(titikArray) {
            // Bersihkan marker lama sebelum me-render ulang
            globalMapMarkers.forEach(m => m.remove());
            globalMapMarkers = [];

            if (!titikArray) return;
            
            titikArray.forEach(p => {
                let catInfo = getKategoriInfo(p.kategori);

                const el = document.createElement('div');
                el.className = "flex items-center justify-center text-white";
                el.style.width = '24px'; 
                el.style.height = '24px';
                el.style.borderRadius = '50%';
                el.style.backgroundColor = catInfo.color;
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.4)';
                el.style.cursor = 'pointer';
                el.style.fontSize = '10px';
                el.innerHTML = `<i class="fa-solid ${catInfo.icon}"></i>`;

                let elemenFoto = p.foto ? `<img src="${p.foto}" alt="${p.title}" class="w-full h-32 object-cover">` : ``;

                let popupHTML = `
                    <div class="bg-white">
                        <div class="h-1.5 w-full" style="background-color: ${catInfo.color};"></div>
                        ${elemenFoto}
                        <div class="p-4 pt-3">
                            <div class="flex items-center gap-2 mb-3">
                                <div class="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs shrink-0" style="background-color: ${catInfo.color};">
                                    <i class="fa-solid ${catInfo.icon}"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-[14px] text-gray-800 leading-tight">${p.title}</h4>
                                    <span class="text-[10px] text-gray-500 font-bold">${p.kategori}</span>
                                </div>
                            </div>
                            <p class="text-xs text-gray-600 mb-4 pb-3 border-b border-gray-100">${p.description}</p>
                            <div class="flex gap-2">
                                <button onclick="bukaModalEdit('${p.id}')" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1"><i class="fa-solid fa-pen"></i> Edit</button>
                                <button onclick="hapusData('${p.id}')" class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1"><i class="fa-solid fa-trash"></i> Hapus</button>
                            </div>
                        </div>
                    </div>
                `;

                let marker = new mapboxgl.Marker(el)
                    .setLngLat([p.longitude, p.latitude])
                    .setPopup(new mapboxgl.Popup({ offset: 12, closeButton: true }).setHTML(popupHTML))
                    .addTo(map);
                
                globalMapMarkers.push(marker);
            });
        }

        function renderTable() {
            const tbody = document.getElementById('data-table-body');
            tbody.innerHTML = ''; 

            if (globalDataTitik.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500 font-medium bg-gray-50 rounded-lg">Belum ada data observasi geospasial yang tersinkronisasi di peladen.</td></tr>`;
                return;
            }

            globalDataTitik.forEach(p => {
                let catInfo = getKategoriInfo(p.kategori);
                let thumbnail = p.foto ? `<img src="${p.foto}" alt="${p.title}" class="w-12 h-12 rounded-lg object-cover shadow-sm border border-gray-200 shrink-0">` : `<div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 border border-gray-200"><i class="fa-solid fa-location-dot text-gray-400"></i></div>`;

                let tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50 transition";
                
                tr.innerHTML = `
                    <td class="p-4">
                        <div class="flex items-center gap-3">
                            ${thumbnail}
                            <div>
                                <p class="font-bold text-gray-800 leading-tight">${p.title}</p>
                                <p class="text-[10px] text-gray-400 font-mono mt-1">ID: ${p.id}</p>
                            </div>
                        </div>
                    </td>
                    <td class="p-4">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold text-white shadow-sm" style="background-color: ${catInfo.color}">
                            <i class="fa-solid ${catInfo.icon}"></i> ${p.kategori}
                        </span>
                    </td>
                    <td class="p-4 font-mono text-[13px] text-gray-600">
                        <p>${p.latitude.toFixed(6)}</p>
                        <p>${p.longitude.toFixed(6)}</p>
                    </td>
                    <td class="p-4 text-[13px] text-gray-600 leading-relaxed max-w-xs pr-6">
                        ${p.description}
                    </td>
                    <td class="p-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="bukaModalEdit('${p.id}')" class="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition" title="Edit Data"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="hapusData('${p.id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition" title="Hapus Data"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // ================= SISTEM EDIT DATA & FOTO (BARU) =================
        function bukaModalEdit(id) {
            const dataPoint = globalDataTitik.find(item => item.id === id);
            if (!dataPoint) return;

            document.getElementById('edit-id').value = dataPoint.id;
            document.getElementById('edit-title').value = dataPoint.title;
            document.getElementById('edit-kategori').value = dataPoint.kategori;
            document.getElementById('edit-desc').value = dataPoint.description;
            
            tempFotoBase64 = dataPoint.foto || null;
            
            // Atur tampilan preview foto
            const previewFoto = document.getElementById('preview-foto');
            const placeholder = document.getElementById('foto-placeholder');
            const btnHapus = document.getElementById('btn-hapus-foto');

            if (tempFotoBase64) {
                previewFoto.src = tempFotoBase64;
                previewFoto.classList.remove('hidden');
                placeholder.classList.add('hidden');
                btnHapus.classList.remove('hidden');
            } else {
                previewFoto.classList.add('hidden');
                placeholder.classList.remove('hidden');
                btnHapus.classList.add('hidden');
            }

            document.getElementById('edit-modal').classList.remove('hidden');
        }

        function tutupModalEdit() {
            document.getElementById('edit-modal').classList.add('hidden');
            document.getElementById('edit-foto').value = ""; // Reset input file
        }

        function prosesFoto(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                tempFotoBase64 = e.target.result; // Simpan ke memori sebagai string gambar base64
                
                const previewFoto = document.getElementById('preview-foto');
                previewFoto.src = tempFotoBase64;
                previewFoto.classList.remove('hidden');
                document.getElementById('foto-placeholder').classList.add('hidden');
                document.getElementById('btn-hapus-foto').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }

        function hapusFotoPreview() {
            tempFotoBase64 = null;
            document.getElementById('edit-foto').value = "";
            document.getElementById('preview-foto').classList.add('hidden');
            document.getElementById('foto-placeholder').classList.remove('hidden');
            document.getElementById('btn-hapus-foto').classList.add('hidden');
        }

        function simpanEdit() {
            const id = document.getElementById('edit-id').value;
            const index = globalDataTitik.findIndex(item => item.id === id);
            
            if (index !== -1) {
                // Perbarui data di dalam array memori
                globalDataTitik[index].title = document.getElementById('edit-title').value;
                globalDataTitik[index].kategori = document.getElementById('edit-kategori').value;
                globalDataTitik[index].description = document.getElementById('edit-desc').value;
                globalDataTitik[index].foto = tempFotoBase64;

                // Tutup semua pop-up yang sedang terbuka di peta
                const popups = document.getElementsByClassName('mapboxgl-popup');
                if (popups.length) popups[0].remove();

                // Re-render UI
                renderSpatialDataOnMap(globalDataTitik);
                renderTable();
                
                tutupModalEdit();
                alert("Data berhasil diperbarui!");
            }
        }

        function hapusData(id) {
            if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
                globalDataTitik = globalDataTitik.filter(item => item.id !== id);
                renderSpatialDataOnMap(globalDataTitik);
                renderTable();
            }
        }

        // ================= IMPOR SHP =================
        function handleShpImport(e) {
            var file = e.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function() {
                if (reader.readyState !== 2 || reader.error) return;
                
                document.getElementById('project-modal').style.opacity = '0';
                setTimeout(() => { document.getElementById('project-modal').style.display = 'none'; }, 500);

                shp(reader.result).then(function(geojson) {
                    const sourceId = 'shp-layer-source-' + Date.now();
                    
                    map.addSource(sourceId, { type: 'geojson', data: geojson });
                    map.addLayer({ id: sourceId + '-fill', type: 'fill', source: sourceId, paint: { 'fill-color': '#F97316', 'fill-opacity': 0.2 } });
                    map.addLayer({ id: sourceId + '-line', type: 'line', source: sourceId, paint: { 'line-color': '#EA580C', 'line-width': 2 } });

                    var bbox = turf.bbox(geojson);
                    map.fitBounds(bbox, { padding: 50, duration: 2500 });
                }).catch(function(error){
                    console.error("Gagal memuat SHP:", error);
                    alert("Gagal membaca file SHP. Pastikan formatnya .zip yang berisi .shp, .shx, .dbf, dan .prj!");
                });

                switchView('map');
            }
            reader.readAsArrayBuffer(file);
        }

        // ================= IMPOR KML TITIK =================
        function handleKmlImport(e) {
            var file = e.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById('project-modal').style.opacity = '0';
                setTimeout(() => { document.getElementById('project-modal').style.display = 'none'; }, 500);

                var kmlText = event.target.result;
                var parser = new DOMParser();
                var kmlDom = parser.parseFromString(kmlText, 'text/xml');
                var geojson = toGeoJSON.kml(kmlDom);

                if (!geojson.features || geojson.features.length === 0) {
                    alert("File KML kosong atau tidak mengandung titik yang valid.");
                    return;
                }

                let kmlPoints = [];
                geojson.features.forEach((feature, index) => {
                    if (feature.geometry && feature.geometry.type === 'Point') {
                        let title = feature.properties.name || `Titik KML ${index + 1}`;
                        let descHtml = feature.properties.description || '-';
                        let desc = descHtml.replace(/(<([^>]+)>)/ig, ''); 
                        
                        let kategoriStrata = 'SKT - Tutupan Lahan'; 
                        let titleLower = title.toLowerCase();
                        if (titleLower.includes('nkt')) kategoriStrata = 'NKT 1 - Hayati';
                        if (titleLower.includes('air') || titleLower.includes('sungai')) kategoriStrata = 'NKT 4 - Jasa Lingkungan';
                        if (titleLower.includes('makam') || titleLower.includes('leluhur')) kategoriStrata = 'NKT 6 - Kultural';
                        
                        kmlPoints.push({
                            id: `KML-${Date.now()}-${index}`,
                            latitude: feature.geometry.coordinates[1],
                            longitude: feature.geometry.coordinates[0],
                            title: title,
                            kategori: kategoriStrata,
                            description: desc,
                            foto: null 
                        });
                    }
                });

                if (kmlPoints.length > 0) {
                    globalDataTitik = [...globalDataTitik, ...kmlPoints];
                    renderSpatialDataOnMap(globalDataTitik); // Ubah agar merender ulang seluruh globalData
                    
                    var bbox = turf.bbox(geojson);
                    map.fitBounds(bbox, { padding: 50, duration: 2500 });
                    
                    switchView('map');
                    alert(`Berhasil mengimpor dan memetakan ${kmlPoints.length} titik dari file KML! Data juga telah masuk ke tabel Basis Data Poin.`);
                } else {
                    alert("Tidak ada geometri titik (Point) yang ditemukan di dalam file KML ini.");
                }
            };
            reader.readAsText(file);
        }

        document.getElementById('shp-input').onchange = handleShpImport;
        document.getElementById('shp-input-awal').onchange = handleShpImport;
        document.getElementById('kml-input').onchange = handleKmlImport;
        document.getElementById('kml-input-awal').onchange = handleKmlImport;
    </script>
</body>
</html>