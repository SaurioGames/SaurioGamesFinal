<?php
class Partida {
    private $conn;
    private $table = "Partida";

    public $id_partida;
    public $puntaje_partida;
    public $cant_jugadores;
    public $estado;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getAll() {
        $query = "SELECT * FROM " . $this->table;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    public function getById($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id_partida = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create() {
        $query = "INSERT INTO " . $this->table . " (fecha_inicio, cant_jugadores, estado, rondas_jugadas) VALUES (NOW(), ?, ?, 0)";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$this->cant_jugadores, $this->estado]);
    }

    public function update() {
        $query = "UPDATE " . $this->table . " SET puntaje_partida = :puntaje_partida, cant_jugadores = :cant_jugadores, estado = :estado WHERE id_partida = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":puntaje_partida", $this->puntaje_partida);
        $stmt->bindParam(":cant_jugadores", $this->cant_jugadores);
        $stmt->bindParam(":estado", $this->estado);
        $stmt->bindParam(":id", $this->id_partida);
        return $stmt->execute();
    }

    public function delete() {
        $query = "DELETE FROM " . $this->table . " WHERE id_partida = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id_partida);
        return $stmt->execute();
    }

    public function eliminar() {
        try {
            // Comenzar transacción
            $this->conn->beginTransaction();

            // Eliminar registros relacionados en RecintoFinal
            $query = "DELETE FROM RecintoFinal WHERE id_partida = :id_partida";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id_partida', $this->id_partida);
            $stmt->execute();

            // Eliminar registros relacionados en JugadorPartida
            $query = "DELETE FROM JugadorPartida WHERE id_partida = :id_partida";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id_partida', $this->id_partida);
            $stmt->execute();

            // Finalmente eliminar la partida
            $query = "DELETE FROM Partida WHERE id_partida = :id_partida";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id_partida', $this->id_partida);
            $stmt->execute();

            // Confirmar transacción
            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            // Si hay error, hacer rollback
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            throw $e;
        }
    }

    public function finalizar() {
        $query = "UPDATE " . $this->table . " SET fecha_fin = NOW(), estado = 'finalizada', rondas_jugadas = 2 WHERE id_partida = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id_partida);
        return $stmt->execute();
    }
}
