<?php
header('Content-Type: application/json; charset=UTF-8');

$host = "localhost";
$user = "root";
$pass = "";
$db   = "forestrygis";

try {
    $conn = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Ambil semua data titik temuan
    $stmtTitik = $conn->query("SELECT * FROM tabel_temuan");
    $titik = $stmtTitik->fetchAll(PDO::FETCH_ASSOC);

    // Ambil data poligon dan urutkan berdasarkan titik sudutnya
    $stmtPoly = $conn->query("SELECT * FROM tabel_poligon ORDER BY urutan ASC");
    $poligon = $stmtPoly->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => [
            "titik" => $titik,
            "poligon" => $poligon
        ]
    ]);

} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>