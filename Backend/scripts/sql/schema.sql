DROP DATABASE IF EXISTS Museo;

CREATE DATABASE IF NOT EXISTS Museo;

USE Museo;

-- Tabla de Usuarios
CREATE TABLE Usuario (
    usuario_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    tipo ENUM('miembro', 'administrador', 'usuario') NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    comentario VARCHAR(1000)
);

CREATE TABLE Miembro (
    usuario_id INT PRIMARY KEY,
    tarjeta_numero VARCHAR(20),
    tarjeta_nombre VARCHAR(100),
    tarjeta_expiracion DATE,
    codigo_seguridad VARCHAR(10),
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id) ON DELETE CASCADE
);

CREATE TABLE Administrador (
    usuario_id INT PRIMARY KEY,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id) ON DELETE CASCADE
);

CREATE TABLE PreguntaSeguridad (
    pregunta_id INT PRIMARY KEY AUTO_INCREMENT,
    pregunta_texto VARCHAR(255) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE RespuestaSeguridad (
    usuario_id INT NOT NULL, 
    pregunta_id INT NOT NULL,
    respuesta VARCHAR(255) NOT NULL,  
    PRIMARY KEY (usuario_id, pregunta_id),
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id) ON DELETE CASCADE,
    FOREIGN KEY (pregunta_id) REFERENCES PreguntaSeguridad(pregunta_id) ON DELETE RESTRICT
);

-- Tabla de membresías
CREATE TABLE Membresia (
    membresia_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,  
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    monto DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    codigo_generado VARCHAR(10) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES Miembro(usuario_id) ON DELETE RESTRICT
);

-- Tabla de ventas (obra_id es ObjectId de MongoDB, sin FK a MySQL)
CREATE TABLE Venta (
    venta_id INT PRIMARY KEY AUTO_INCREMENT,
    obra_id VARCHAR(255) NOT NULL,
    comprador_id INT NOT NULL,        
    obra_nombre VARCHAR(255) NOT NULL DEFAULT '',
    artista_nombre VARCHAR(255) NOT NULL DEFAULT '',
    precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
    porcentaje_ganancia DECIMAL(5,2) DEFAULT 5,
    fecha_reserva DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_venta DATETIME NULL,        
    estado ENUM('reservada', 'vendida', 'cancelada') NOT NULL,
    FOREIGN KEY (comprador_id) REFERENCES Miembro(usuario_id) ON DELETE RESTRICT
);

CREATE TABLE Factura (
    factura_id INT PRIMARY KEY AUTO_INCREMENT,
    venta_id INT NOT NULL UNIQUE,
    admin_id INT NOT NULL,            
    obra_nombre VARCHAR(255) NOT NULL DEFAULT '',
    artista_nombre VARCHAR(255) NOT NULL DEFAULT '',
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    precio_obra DECIMAL(10,2) NOT NULL,  
    iva DECIMAL(10,2) NOT NULL,          
    porcentaje_ganancia DECIMAL(5,2) NOT NULL,  
    ganancia_museo DECIMAL(10,2) NOT NULL,      
    total DECIMAL(10,2) NOT NULL,               
    direccion_envio TEXT NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES Venta(venta_id) ON DELETE RESTRICT,
    FOREIGN KEY (admin_id) REFERENCES Administrador(usuario_id) ON DELETE RESTRICT
);

-- Tabla Multimedia para almacenar fotos binarias (asociadas a obras/artistas en MongoDB)
CREATE TABLE Multimedia (
    multimedia_id INT PRIMARY KEY AUTO_INCREMENT,
    entidad_tipo VARCHAR(50) NOT NULL,
    entidad_id VARCHAR(255) DEFAULT NULL,
    archivo MEDIUMBLOB NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entidad (entidad_tipo, entidad_id)
);
