<?php

// Definimos constantes para los datos de conexión a la base de datos
const DB_HOST = 'ct_mysql';
const DB_NAME = 'SaurioGamesBD'; 
const DB_USER = 'usuario';
const DB_PASS = 'clave123'; 

// Definimos una clase llamada Database para manejar la conexión a la base de datos
class Database {
    // Propiedades privadas para almacenar los datos de conexión
    private $host = DB_HOST; // Almacena el host de la base de datos
    private $db_name = DB_NAME; // Almacena el nombre de la base de datos
    private $username = DB_USER; // Almacena el nombre de usuario
    private $password = DB_PASS; // Almacena la contrasena
    private $conn; // Aquí se guardará el objeto de conexión PDO

    // Método público para establecer la conexión a la base de datos
    public function connect() {
        $this->conn = null; // Inicializamos la conexión como null

        try {
            // Intentamos crear una nueva instancia de PDO para conectarnos a MySQL
            $this->conn = new PDO(
                "mysql:host=".$this->host.";dbname=".$this->db_name, // Cadena de conexión con host y nombre de la base
                $this->username, // Usuario
                $this->password  // contrasena
            );
            // Configuramos PDO para que lance excepciones en caso de error
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Establecemos el conjunto de caracteres a UTF-8 para soportar caracteres especiales
            $this->conn->exec("SET NAMES utf8mb4");
        } catch(PDOException $e) {
            // Si ocurre un error, mostramos un mensaje con la descripción
            echo "Error de conexión: " . $e->getMessage();
        }
        // Devolvemos el objeto de conexión (o null si falló)
        return $this->conn;
    }

    // Alias para compatibilidad con index.php
    public function getConnection() {
        return $this->connect();
    }
}
?>
