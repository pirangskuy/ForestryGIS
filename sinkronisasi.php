<?php
// Izinkan akses lintas platform (CORS) agar aplikasi HP bisa mengirim data
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Konfigurasi Database Laragon
$host = "localhost";
$user = "root";
$pass = ""; // Default Laragon tidak pakai password
$db   = "forestrygis";

try {
    $conn = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Koneksi peladen gagal: " . $e->getMessage()]);
    exit();
}

// Tangkap paket JSON yang dikirim dari aplikasi React Native
$data_masuk = json_decode(file_get_contents("php://input"), true);

if ($data_masuk) {
    try {
        // Mulai transaksi (jika salah satu gagal, semua dibatalkan)
        $conn->beginTransaction();

        // 1. Proses Data Titik Temuan
        if (isset($data_masuk['titik']) && is_array($data_masuk['titik'])) {
            $stmtTitik = $conn->prepare("INSERT INTO tabel_temuan (id, latitude, longitude, title, description, kategori, foto) VALUES (:id, :lat, :lng, :title, :desc, :kategori, :foto) ON DUPLICATE KEY UPDATE title=:title, description=:desc, kategori=:kategori, foto=:foto");
            
            foreach ($data_masuk['titik'] as $titik) {
                $stmtTitik->execute([
                    ':id' => $titik['id'],
                    ':lat' => $titik['coordinate']['latitude'],
                    ':lng' => $titik['coordinate']['longitude'],
                    ':title' => $titik['title'],
                    ':desc' => $titik['description'],
                    ':kategori' => $titik['kategori'],
                    ':foto' => $titik['foto']
                ]);
            }
        }

        // 2. Proses Data Poligon
        if (isset($data_masuk['poligon']) && is_array($data_masuk['poligon'])) {
            $stmtPoly = $conn->prepare("INSERT INTO tabel_poligon (urutan, latitude, longitude) VALUES (:urutan, :lat, :lng)");
            
            foreach ($data_masuk['poligon'] as $index => $poly) {
                $stmtPoly->execute([
                    ':urutan' => $index,
                    ':lat' => $poly['latitude'],
                    ':lng' => $poly['longitude']
                ]);
            }
        }

        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Data berhasil disimpan di peladen"]);

    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => "Gagal mengeksekusi kueri: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Tidak ada data yang diterima"]);
}
?>