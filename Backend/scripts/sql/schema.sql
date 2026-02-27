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

-- Tabla de generos de obras
CREATE TABLE Genero(
    genero_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    comentario VARCHAR(1000)
);

-- Tablas para Artista y sus relaciones
CREATE TABLE Nacionalidad(
    nacionalidad_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Artista(
    artista_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    biografia TEXT,
    fecha_nacimiento DATE,
    nacionalidad_id INT NOT NULL,
    foto_url VARCHAR(255) NOT NULL DEFAULT 'Frontend/images',
    porcentaje_ganancia DECIMAL(10,2) NOT NULL DEFAULT 5,
    comentario VARCHAR(1000),
    FOREIGN KEY (nacionalidad_id) REFERENCES Nacionalidad(nacionalidad_id) 
    ON DELETE RESTRICT
);

CREATE TABLE Artista_Genero (
    artista_id INT NOT NULL,
    genero_id INT NOT NULL,
    comentario VARCHAR(1000),
    PRIMARY KEY (artista_id, genero_id),
    FOREIGN KEY (artista_id) REFERENCES Artista(artista_id) ON DELETE CASCADE,
    FOREIGN KEY (genero_id) REFERENCES Genero(genero_id) ON DELETE RESTRICT
);

-- Tablas para Obras y sus relaciones
CREATE TABLE Epoca(
    epoca_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    ano_inicio INT NOT NULL,
    ano_final INT,
    descripcion TEXT NOT NULL,
    comentario VARCHAR(1000)
);

CREATE TABLE Obra(
    obra_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL DEFAULT 'Sin Titulo',
    codigo_inventario VARCHAR(10) UNIQUE NOT NULL,
    artista_id INT NOT NULL,
    genero_id INT NOT NULL,
    epoca_id INT NOT NULL,
    precio_venta DECIMAL(10,2) NOT NULL,
    alto DECIMAL(10,2) NOT NULL DEFAULT 0,
    ancho DECIMAL(10,2) NOT NULL DEFAULT 0,
    fecha_creacion DATE NOT NULL,
    estado ENUM('Disponible', 'Reservada', 'Vendida') NOT NULL,
    foto_url VARCHAR(255) NOT NULL DEFAULT 'Frontend/images',
    descripcion TEXT,
    comentario VARCHAR(1000),
    FOREIGN KEY (artista_id) REFERENCES Artista(artista_id)
    ON DELETE RESTRICT,
    FOREIGN KEY (genero_id) REFERENCES Genero(genero_id)
    ON DELETE RESTRICT,
    FOREIGN KEY (epoca_id) REFERENCES Epoca(epoca_id)
    ON DELETE RESTRICT
);

-- Especialidades de obra

-- Orfebreria
CREATE TABLE Pieza_Orfebreria(
    pieza_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    comentario VARCHAR(1000)
);

CREATE TABLE Metales(
    metal_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Orfebreria(
    obra_id INT,
    profundidad DECIMAL(10,2) NOT NULL DEFAULT 0,
    diametro DECIMAL(10,2) NOT NULL DEFAULT 0,
    peso DECIMAL(10,2) NOT NULL,
    pieza_id INT NOT NULL,
    metal_predominante_id INT NOT NULL,

    PRIMARY KEY(obra_id),

    FOREIGN KEY (obra_id) REFERENCES Obra(obra_id)
    ON DELETE CASCADE,

    FOREIGN KEY (pieza_id) REFERENCES Pieza_Orfebreria(pieza_id)
    ON DELETE RESTRICT,

    FOREIGN KEY (metal_predominante_id) REFERENCES Metales(metal_id)
    ON DELETE RESTRICT
);

CREATE TABLE Orfebreria_Metales (
    obra_id INT NOT NULL,
    metal_id INT NOT NULL,
    comentario VARCHAR(1000),
    PRIMARY KEY (obra_id, metal_id),
    FOREIGN KEY (obra_id) REFERENCES Orfebreria(obra_id) ON DELETE CASCADE,
    FOREIGN KEY (metal_id) REFERENCES Metales(metal_id) ON DELETE RESTRICT
);

-- Pintura
CREATE TABLE Soporte(
    soporte_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Pintura(
    obra_id INT,
    soporte_id INT NOT NULL,

    PRIMARY KEY (obra_id),

    FOREIGN KEY (obra_id) REFERENCES Obra(obra_id)
    ON DELETE CASCADE,

    FOREIGN KEY (soporte_id) REFERENCES Soporte(soporte_id)
    ON DELETE RESTRICT
);

CREATE TABLE Estilo(
    estilo_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Tematica(
    tematica_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Pintura_Estilo (
    obra_id INT NOT NULL,
    estilo_id INT NOT NULL,
    comentario VARCHAR(1000),
    PRIMARY KEY (obra_id, estilo_id),
    FOREIGN KEY (obra_id) REFERENCES Pintura(obra_id) ON DELETE CASCADE,
    FOREIGN KEY (estilo_id) REFERENCES Estilo(estilo_id) ON DELETE RESTRICT
);

CREATE TABLE Pintura_Tematica (
    obra_id INT NOT NULL,
    tematica_id INT NOT NULL,
    comentario VARCHAR(1000),
    PRIMARY KEY (obra_id, tematica_id),
    FOREIGN KEY (obra_id) REFERENCES Pintura(obra_id) ON DELETE CASCADE,
    FOREIGN KEY (tematica_id) REFERENCES Tematica(tematica_id) ON DELETE RESTRICT
);

-- Escultura
CREATE TABLE Tipo_Escultura(
    tipo_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Escultura(
    obra_id INT NOT NULL,
    peso DECIMAL(10,2) NOT NULL DEFAULT 0,
    profundidad DECIMAL(10,2) NOT NULL DEFAULT 0,
    tipo_id INT NOT NULL,

    PRIMARY KEY (obra_id),

    FOREIGN KEY (obra_id) REFERENCES Obra(obra_id)
    ON DELETE CASCADE,

    FOREIGN KEY (tipo_id) REFERENCES Tipo_Escultura(tipo_id)
    ON DELETE RESTRICT
);

CREATE TABLE Material(
    material_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Tecnica_Escultura(
    tecnica_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Escultura_Material (
    obra_id INT NOT NULL,
    material_id INT NOT NULL,
    comentario VARCHAR(1000),
    PRIMARY KEY (obra_id, material_id),
    FOREIGN KEY (obra_id) REFERENCES Escultura(obra_id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES Material(material_id) ON DELETE RESTRICT
);

CREATE TABLE Escultura_Tecnica (
    obra_id INT NOT NULL,
    tecnica_id INT NOT NULL,
    comentario VARCHAR(1000),
    PRIMARY KEY (obra_id, tecnica_id),
    FOREIGN KEY (obra_id) REFERENCES Escultura(obra_id) ON DELETE CASCADE,
    FOREIGN KEY (tecnica_id) REFERENCES Tecnica_Escultura(tecnica_id) ON DELETE RESTRICT
);

-- Ceramica
CREATE TABLE Coccion(
    coccion_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
); 

CREATE TABLE Arcilla(
    arcilla_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Modelado(
    modelado_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Esmaltado(
    esmaltado_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Ceramica(
    obra_id INT NOT NULL,
    profundidad DECIMAL(10,2) NOT NULL DEFAULT 0,
    diametro DECIMAL(10,2) NOT NULL DEFAULT 0,
    funcionalidad VARCHAR(1000) NOT NULL DEFAULT 'Desconocido',
    coccion_id INT NOT NULL,
    arcilla_id INT NOT NULL,
    modelado_id INT NOT NULL,
    esmaltado_id INT NOT NULL,

    PRIMARY KEY (obra_id),

    FOREIGN KEY (coccion_id) REFERENCES Coccion(coccion_id)
    ON DELETE RESTRICT,

    FOREIGN KEY (arcilla_id) REFERENCES Arcilla(arcilla_id)
    ON DELETE RESTRICT,

    FOREIGN KEY (modelado_id) REFERENCES Modelado(modelado_id)
    ON DELETE RESTRICT,

    FOREIGN KEY (esmaltado_id) REFERENCES Esmaltado(esmaltado_id)
    ON DELETE RESTRICT
);

-- Fotografia 
CREATE TABLE Impresion(
    impresion_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Tecnica_Fotografica(
    tecnica_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Camara(
    camara_id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    comentario VARCHAR(1000)
);

CREATE TABLE Fotografia(
    obra_id INT NOT NULL,
    tiraje MEDIUMINT NOT NULL DEFAULT 1,
    obturacion VARCHAR(10) NOT NULL,
    apertura VARCHAR(10) NOT NULL,
    iso INT NOT NULL,
    resolucion VARCHAR(50) NOT NULL,
    fecha_captura DATE NOT NULL,
    impresion_id INT NOT NULL,
    camara_id INT NOT NULL,
    tecnica_id INT NOT NULL,

    PRIMARY KEY (obra_id),

    FOREIGN KEY (obra_id) REFERENCES Obra(obra_id)
    ON DELETE CASCADE,

    FOREIGN KEY (impresion_id) REFERENCES Impresion(impresion_id)
    ON DELETE RESTRICT,

    FOREIGN KEY (camara_id) REFERENCES Camara(camara_id)
    ON DELETE RESTRICT,

    FOREIGN KEY (tecnica_id) REFERENCES Tecnica_Fotografica(tecnica_id)
    ON DELETE RESTRICT
);

-- Tabla de compras
CREATE TABLE Membresia (
    membresia_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,  
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    monto DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    codigo_generado VARCHAR(10) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES Miembro(usuario_id) ON DELETE RESTRICT
);

CREATE TABLE Venta (
    venta_id INT PRIMARY KEY AUTO_INCREMENT,
    obra_id INT NOT NULL,
    comprador_id INT NOT NULL,        
    fecha_reserva DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_venta DATETIME NULL,        
    estado ENUM('reservada', 'vendida', 'cancelada') NOT NULL,
    FOREIGN KEY (obra_id) REFERENCES Obra(obra_id) ON DELETE RESTRICT,
    FOREIGN KEY (comprador_id) REFERENCES Miembro(usuario_id) ON DELETE RESTRICT
);

CREATE TABLE Factura (
    factura_id INT PRIMARY KEY AUTO_INCREMENT,
    venta_id INT NOT NULL UNIQUE,
    admin_id INT NOT NULL,            
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