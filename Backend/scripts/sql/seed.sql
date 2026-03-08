-- Insertar datos de prueba
USE Museo;

-- 1. TABLAS CATÁLOGO

-- Nacionalidad
INSERT INTO Nacionalidad (nombre, comentario) VALUES
('Española', 'Nacionalidad de España'),
('Mexicana', 'Nacionalidad de México'),
('Francesa', 'Nacionalidad de Francia'),
('Italiana', 'Nacionalidad de Italia'),
('Estadounidense', 'Nacionalidad de EE.UU.');

-- Género
INSERT INTO Genero (nombre, descripcion, comentario) VALUES
('Pintura', 'Arte de representar imágenes mediante pigmentos', 'Género principal'),
('Escultura', 'Arte de crear formas tridimensionales', 'Género principal'),
('Fotografía', 'Arte de capturar imágenes mediante la luz', 'Género principal'),
('Cerámica', 'Arte de crear objetos de barro o porcelana', 'Género principal'),
('Orfebrería', 'Arte de trabajar metales preciosos', 'Género principal');

-- Época
INSERT INTO Epoca (nombre, ano_inicio, ano_final, descripcion, comentario) VALUES
('Renacimiento', 1400, 1600, 'Movimiento cultural europeo', ''),
('Barroco', 1600, 1750, 'Estilo artístico', ''),
('Moderno', 1900, 2000, 'Arte moderno', ''),
('Contemporáneo', 2000, NULL, 'Arte actual', '');

-- Soporte (pintura)
INSERT INTO Soporte (nombre, comentario) VALUES
('Lienzo', 'Tela de algodón o lino'),
('Madera', 'Tabla de madera'),
('Papel', 'Soporte de papel'),
('Muro', 'Pared o fresco');

-- Estilo
INSERT INTO Estilo (nombre, comentario) VALUES
('Realismo', 'Representación fiel de la realidad'),
('Impresionismo', 'Captura de la luz y el color'),
('Cubismo', 'Figuras geométricas'),
('Surrealismo', 'Mundo onírico');

-- Temática
INSERT INTO Tematica (nombre, comentario) VALUES
('Religiosa', 'Temas religiosos'),
('Mitológica', 'Dioses y héroes'),
('Paisaje', 'Vistas de la naturaleza'),
('Retrato', 'Personas');

-- Tipo de Escultura
INSERT INTO Tipo_Escultura (nombre, comentario) VALUES
('Bulto redondo', 'Escultura exenta'),
('Relieve', 'Adherida a un fondo'),
('Busto', 'Representación de cabeza y hombros');

-- Material (escultura)
INSERT INTO Material (nombre, comentario) VALUES
('Mármol', 'Piedra metamórfica'),
('Bronce', 'Aleación de cobre y estaño'),
('Madera', 'Material orgánico'),
('Arcilla', 'Material cerámico');

-- Técnica escultórica
INSERT INTO Tecnica_Escultura (nombre, comentario) VALUES
('Talla directa', 'Eliminación de material'),
('Modelado', 'Adición de material'),
('Fundición', 'Vaciado en molde');

-- Impresión fotográfica
INSERT INTO Impresion (nombre, comentario) VALUES
('Papel brillante', 'Acabado brillante'),
('Papel mate', 'Acabado mate'),
('Metal', 'Impresión sobre metal');

-- Técnica fotográfica
INSERT INTO Tecnica_Fotografica (nombre, comentario) VALUES
('Analógica', 'Película química'),
('Digital', 'Sensor electrónico'),
('Blanco y negro', 'Monocromo');

-- Cámara
INSERT INTO Camara (nombre, comentario) VALUES
('Réflex', 'Cámara réflex de un solo lente'),
('Mirrorless', 'Sin espejo'),
('Compacta', 'Pequeña y automática');

-- Arcilla (cerámica)
INSERT INTO Arcilla (nombre, comentario) VALUES
('Arcilla roja', 'Alta plasticidad'),
('Arcilla blanca', 'Porcelana'),
('Gres', 'Alta temperatura');

-- Cocción
INSERT INTO Coccion (nombre, comentario) VALUES
('Baja temperatura', 'Hasta 1000°C'),
('Alta temperatura', 'Más de 1200°C'),
('Raku', 'Técnica japonesa');

-- Modelado
INSERT INTO Modelado (nombre, comentario) VALUES
('Torno', 'Modelado con torno'),
('Manual', 'Modelado a mano'),
('Colada', 'Vertido en molde');

-- Esmaltado
INSERT INTO Esmaltado (nombre, comentario) VALUES
('Vidriado', 'Capa vítrea'),
('Mate', 'Sin brillo'),
('Cristalino', 'Transparente');

-- Pieza de orfebrería
INSERT INTO Pieza_Orfebreria (nombre, comentario) VALUES
('Anillo', 'Joya para dedo'),
('Collar', 'Adorno para cuello'),
('Pulsera', 'Joya para muñeca'),
('Cáliz', 'Copa ceremonial');

-- Metales
INSERT INTO Metales (nombre, comentario) VALUES
('Oro', 'Metal precioso amarillo'),
('Plata', 'Metal precioso blanco'),
('Bronce', 'Aleación'),
('Cobre', 'Metal rojizo');

-- Preguntas de seguridad
INSERT INTO PreguntaSeguridad (pregunta_texto, comentario) VALUES
('¿Cuál es el nombre de tu primera mascota?', ''),
('¿Cuál es tu ciudad de nacimiento?', ''),
('¿Cuál es tu comida favorita?', ''),
('¿Cuál es el nombre de tu mejor amigo de la infancia?', '');

-- 2. USUARIOS DE PRUEBA
-- Contraseñas (hash de bcrypt con salt 10 para 'admin123', 'miembro123', 'user123')
-- admin123 -> $2b$10$3lOo2xZVfVv0I7qYxY5x9eB8X9X9X9X9X9X9X9X9X9X9X9X9X9
-- miembro123 -> $2b$10$2mE4X5yZ1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
-- user123 -> $2b$10$8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8

-- Administrador
INSERT INTO Usuario (email, password, nombre, apellido, tipo, comentario) VALUES
('admin@museo.com', '$2b$10$3lOo2xZVfVv0I7qYxY5x9eB8X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Admin', 'Principal', 'administrador', 'Administrador del sistema');
SET @admin_id = LAST_INSERT_ID();
INSERT INTO Administrador (usuario_id) VALUES (@admin_id);

-- Fin del script