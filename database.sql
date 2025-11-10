-- Borrar base de datos si existe (para empezar limpio)
DROP DATABASE IF EXISTS SaurioGamesBD;

-- Crear base de datos con UTF8MB4
CREATE DATABASE SaurioGamesBD CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE SaurioGamesBD;

-- Tabla de usuarios
CREATE TABLE Usuario (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nombre_usuario VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de partidas
CREATE TABLE Partida (
    id_partida INT PRIMARY KEY AUTO_INCREMENT,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME,
    cant_jugadores INT NOT NULL,
    estado VARCHAR(20) NOT NULL,
    rondas_jugadas INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de jugadores en partidas
CREATE TABLE JugadorPartida (
    id_partida INT NOT NULL,
    id_usuario INT NOT NULL,
    numero_jugador INT NOT NULL,
    es_admin BOOLEAN NOT NULL DEFAULT FALSE,
    puntaje_final INT,
    puntos_bosque INT DEFAULT 0,
    puntos_prado INT DEFAULT 0,
    puntos_pradera INT DEFAULT 0,
    puntos_trio INT DEFAULT 0,
    puntos_rey INT DEFAULT 0,
    puntos_isla INT DEFAULT 0,
    puntos_rio INT DEFAULT 0,
    puntos_trex INT DEFAULT 0,
    PRIMARY KEY (id_partida, id_usuario),
    FOREIGN KEY (id_partida) REFERENCES Partida(id_partida) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de recintos finales
CREATE TABLE RecintoFinal (
    id_partida INT NOT NULL,
    id_usuario INT NOT NULL,
    tipo_recinto ENUM(
        'bosqueSemejanza',
        'pradoDiferencia',
        'praderaAmor',
        'trioFrondoso',
        'reySelva',
        'islaSolitario',
        'rio'
    ) NOT NULL,
    dinosaurios JSON,
    PRIMARY KEY (id_partida, id_usuario, tipo_recinto),
    FOREIGN KEY (id_partida, id_usuario)
        REFERENCES JugadorPartida(id_partida, id_usuario)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert de prueba
INSERT INTO Usuario (correo, nombre_usuario, contrasena)
VALUES ('usuario@ejemplo.com', 'fran', '1234');

-- Verificar datos
SELECT * FROM Usuario;
