<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
	http_response_code(200);
	exit();
}

// Helper simple para responder JSON
function send_json($data, $status = 200)
{
	http_response_code($status);
	echo json_encode($data);
}

require_once "Database.php";
require_once "Usuario.php";
require_once "Partida.php";

$database = new Database();
$db = $database->connect();

// Si no hay conexión, respondemos error o
if (!$db) {
	send_json(["message" => "No se pudo conectar a la base de datos"], 500);
	exit();
}

$usuarios = new Usuario($db);
$partida = new Partida($db);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
	case 'GET':
		// ?nombre=...  devuelve 1 usuario por nombre o correo. Sin nombre, lista todos
		if (isset($_GET['nombre'])) {
			$nombre = trim((string)($_GET['nombre'] ?? ''));
			if ($nombre === '') {
				send_json(["message" => "Nombre inválido"], 400);
				break;
			}
			$user = $usuarios->getByNombreUsuario($nombre);
			if (!$user) { $user = $usuarios->getByCorreo($nombre); }
			send_json($user ?: ["message" => "Usuario no encontrado"]);
			break;
		}
		$stmt = $usuarios->getAll();
		send_json($stmt->fetchAll(PDO::FETCH_ASSOC));
		break;

	case 'POST':
		$raw = file_get_contents('php://input');
		$input = json_decode($raw, true);
		if (!is_array($input)) {
			send_json(["message" => "JSON inválido"], 400);
			break;
		}

		$action = isset($_GET['action']) ? strtolower($_GET['action']) : null;
		$entity = isset($_GET['entity']) ? strtolower($_GET['entity']) : null;

		if ($action === 'login') {
			try {
				if (!isset($input['nombre_usuario'], $input['contrasena'])) {
					send_json(["message" => "Faltan credenciales"], 400);
					break;
				}
				$identifier = (string)$input['nombre_usuario'];
				$plainPassword = (string)$input['contrasena'];
				$user = $usuarios->getByNombreUsuario($identifier);
				if (!$user) { $user = $usuarios->getByCorreo($identifier); }
				if (!$user) { send_json(["message" => "Usuario o contrasena incorrecta"], 401); break; }
				$stored = $user['contrasena'] ?? '';
				if ($plainPassword === $stored) {
					unset($user['contrasena']);
					send_json($user);
				} else {
					send_json(["message" => "Usuario o contrasena incorrecta"], 401);
				}
			} catch (Throwable $e) {
				send_json(["message" => "Error interno", "error" => $e->getMessage()], 500);
			}
			break;
		}

		if ($entity === 'usuarios') {
			try {
				if (!isset($input['correo'], $input['nombre_usuario'], $input['contrasena'])) {
					send_json(["message" => "Faltan campos requeridos"], 400);
					break;
				}
				$usuarios->correo = (string)$input['correo'];
				$usuarios->nombre_usuario = (string)$input['nombre_usuario'];
				$usuarios->contrasena = (string)$input['contrasena'];
				if ($usuarios->create()) { send_json(["message" => "Usuario creado"], 201); }
				else { send_json(["message" => "Error al crear usuario"], 500); }
			} catch (Throwable $e) {
				send_json(["message" => "Error interno", "error" => $e->getMessage()], 500);
			}
			break;
		}

        if ($entity === 'partida') {
            try {
                $partida->puntaje_partida = isset($input['puntaje_partida']) ? (int)$input['puntaje_partida'] : 0;
                $partida->cant_jugadores = isset($input['cant_jugadores']) ? (int)$input['cant_jugadores'] : 2;
                $partida->estado = isset($input['estado']) ? (string)$input['estado'] : 'iniciada';
                if ($partida->create()) {
                    $id = method_exists($db, 'lastInsertId') ? $db->lastInsertId() : null;
                    send_json(["message" => "Partida creada", "id" => $id], 201);
                } else {
                    send_json(["message" => "Error al crear partida"], 500);
                }
            } catch (Throwable $e) {
                send_json(["message" => "Error interno", "error" => $e->getMessage()], 500);
            }
            break;
        }

        // Eliminar partida
        if ($action === 'eliminar') {
            try {
                if (!isset($input['id_partida'])) {
                    send_json(["message" => "Falta el ID de la partida"], 400);
                    break;
                }
                
                $id_partida = (int)$input['id_partida'];
                $partida->id_partida = $id_partida;
                
                if ($partida->eliminar()) {
                    send_json(['success' => true, 'message' => 'Partida eliminada exitosamente']);
                } else {
                    throw new Exception('Error al eliminar la partida');
                }
            } catch (Throwable $e) {
                send_json(['success' => false, 'error' => $e->getMessage()], 500);
            }
            break;
        }		// Crear partida con jugadores
		if ($action === 'crear_partida') {
			try {
				$cant_jugadores = $input['cant_jugadores'] ?? 0;
				$jugadores = $input['jugadores'] ?? [];

				$db->beginTransaction();

				// Crear una nueva instancia de Partida
				$nuevaPartida = new Partida($db);
				$nuevaPartida->cant_jugadores = $cant_jugadores;
				$nuevaPartida->estado = 'iniciada';

				if ($nuevaPartida->create()) {
					$id_partida = $db->lastInsertId();

					// Insertar los jugadores
					foreach ($jugadores as $jugador) {
						$usuarioExistente = $usuarios->getByNombre($jugador['nombre']);

						if (!$usuarioExistente) {
							$usuarios->nombre_usuario = $jugador['nombre'];
							$usuarios->correo = strtolower(str_replace(' ', '', $jugador['nombre'])) . '@temp.com';
							$usuarios->contrasena = $jugador['nombre'] . '123';
							$usuarios->create();
							$id_usuario = $db->lastInsertId();
						} else {
							$id_usuario = $usuarioExistente['id_usuario'];
						}

						// Insertar en JugadorPartida
						$stmt = $db->prepare("
							INSERT INTO JugadorPartida (id_partida, id_usuario, numero_jugador, es_admin)
							VALUES (?, ?, ?, ?)
						");
						$es_admin = isset($jugador['esAdmin']) && $jugador['esAdmin'] ? 1 : 0;
						$stmt->execute([$id_partida, $id_usuario, $jugador['numero'], $es_admin]);
					}

					$db->commit();
					send_json(['success' => true, 'id_partida' => $id_partida, 'message' => 'Partida creada exitosamente'], 201);
				} else {
					throw new Exception('Error al crear la partida');
				}
			} catch (Throwable $e) {
				if ($db->inTransaction()) {
					$db->rollBack();
				}
				send_json(['success' => false, 'error' => $e->getMessage()], 500);
			}
			break;
		}

		// Finalizar partida
		if ($action === 'finalizar_partida') {
			try {
				$id_partida = $input['id_partida'] ?? 0;
				$scores = $input['scores'] ?? [];
				$jugadores = $input['jugadores'] ?? [];

				$db->beginTransaction();

				// Finalizar la partida
				$partida->id_partida = $id_partida;
				$partida->finalizar();

				// Guardar cada jugador y sus puntos
				foreach ($scores as $score) {
					$usuarioData = $usuarios->getByNombre($score['nombre']);

					if (!$usuarioData) {
						throw new Exception("Usuario no encontrado: " . $score['nombre']);
					}

					$id_usuario = $usuarioData['id_usuario'];

					// Actualizar JugadorPartida con los puntos
					$stmt = $db->prepare("
						UPDATE JugadorPartida SET
							puntaje_final = ?,
							puntos_bosque = ?,
							puntos_prado = ?,
							puntos_pradera = ?,
							puntos_trio = ?,
							puntos_rey = ?,
							puntos_isla = ?,
							puntos_rio = ?,
							puntos_trex = ?
						WHERE id_partida = ? AND id_usuario = ?
					");

					$stmt->execute([
						$score['score'],
						$score['breakdown']['bosque'],
						$score['breakdown']['prado'],
						$score['breakdown']['praderaAmor'],
						$score['breakdown']['trioFrondoso'],
						$score['breakdown']['reySelva'],
						$score['breakdown']['islaSolitario'],
						$score['breakdown']['rio'],
						$score['breakdown']['tRexBonus'],
						$id_partida,
						$id_usuario
					]);

					// Guardar los recintos finales
					$jugador = array_filter($jugadores, function($j) use ($score) {
						return $j['nombre'] === $score['nombre'];
					});
					$jugador = reset($jugador);

					if ($jugador && isset($jugador['tablero'])) {
						foreach ($jugador['tablero'] as $tipo_recinto => $dinosaurios) {
							if (count($dinosaurios) > 0) {
								$stmt = $db->prepare("
									INSERT INTO RecintoFinal (id_partida, id_usuario, tipo_recinto, dinosaurios)
									VALUES (?, ?, ?, ?)
									ON DUPLICATE KEY UPDATE dinosaurios = VALUES(dinosaurios)
								");

								$stmt->execute([
									$id_partida,
									$id_usuario,
									$tipo_recinto,
									json_encode($dinosaurios)
								]);
							}
						}
					}
				}

				$db->commit();
				send_json(['success' => true, 'id_partida' => $id_partida, 'message' => 'Partida finalizada y guardada exitosamente']);
			} catch (Throwable $e) {
				if ($db->inTransaction()) {
					$db->rollBack();
				}
				send_json(['success' => false, 'error' => $e->getMessage()], 500);
			}
			break;
		}

		send_json(["message" => "Acción o entidad no soportada"], 400);
		break;

	
		default:
		send_json(["message" => "Método no permitido"], 405);
		break;
}
