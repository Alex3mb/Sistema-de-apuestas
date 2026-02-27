PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE jugadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE,
      saldo_total REAL DEFAULT 0,
      activo INTEGER DEFAULT 1
    );
INSERT INTO jugadores VALUES(2,'MindLag 65%',102.5,1);
INSERT INTO jugadores VALUES(3,'Pro',5.0,1);
INSERT INTO jugadores VALUES(11,'Kuroashi',0.0,1);
INSERT INTO jugadores VALUES(12,'Piquerachyo',0.0,1);
INSERT INTO jugadores VALUES(14,'Luchito',17.0,1);
INSERT INTO jugadores VALUES(15,'Lier',0.0,1);
INSERT INTO jugadores VALUES(16,'CarryDePeso',0.0,1);
INSERT INTO jugadores VALUES(17,'Fabri',17.5,1);
INSERT INTO jugadores VALUES(18,'DaykaElBully',-7.5,0);
INSERT INTO jugadores VALUES(19,'Pollowsky',12.5,1);
INSERT INTO jugadores VALUES(20,'Gohan',15.0,1);
INSERT INTO jugadores VALUES(21,'Pichulon',10.0,1);
INSERT INTO jugadores VALUES(22,'Gab',0.0,1);
INSERT INTO jugadores VALUES(23,'Huaracinos',-15.0,0);
INSERT INTO jugadores VALUES(24,'Pata Lebron',-5.0,0);
INSERT INTO jugadores VALUES(25,'Dabu',-10.0,0);
INSERT INTO jugadores VALUES(26,'Lebron',-25.0,0);
INSERT INTO jugadores VALUES(27,'Cray Cray',5.0,1);
INSERT INTO jugadores VALUES(28,'Perrito',-15.0,0);
INSERT INTO jugadores VALUES(29,'PozoMillonario',-50.0,0);
INSERT INTO jugadores VALUES(30,'Neto',0.0,1);
INSERT INTO jugadores VALUES(31,'Alec',0.0,1);
INSERT INTO jugadores VALUES(32,'BenjaminSuppButton',6.5,1);
INSERT INTO jugadores VALUES(33,'Lechuga',5.0,1);
INSERT INTO jugadores VALUES(34,'PulgaCoquetaYRota',0.0,1);
INSERT INTO jugadores VALUES(35,'TonyOño',0.0,1);
INSERT INTO jugadores VALUES(36,'PuchiCarlex',0.0,1);
INSERT INTO jugadores VALUES(37,'NoisiBoy',0.0,1);
INSERT INTO jugadores VALUES(38,'Silver',10.0,1);
INSERT INTO jugadores VALUES(39,'Cen',12.5,1);
INSERT INTO jugadores VALUES(40,'Peter',0.0,1);
INSERT INTO jugadores VALUES(41,'Estorbo',16.0,1);
INSERT INTO jugadores VALUES(42,'Kiko',10.0,1);
INSERT INTO jugadores VALUES(43,'SkyLord',10.0,1);
INSERT INTO jugadores VALUES(44,'Nando.Shi',10.0,1);
CREATE TABLE rondas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      estado TEXT DEFAULT 'activa',
      total_apuestas REAL DEFAULT 0
    );
INSERT INTO rondas VALUES(1,'2026-02-26 19:52:18','activa',0.0);
INSERT INTO rondas VALUES(2,'2026-02-26 19:53:14','activa',0.0);
INSERT INTO rondas VALUES(3,'2026-02-26 20:04:14','activa',0.0);
INSERT INTO rondas VALUES(4,'2026-02-26 20:04:43','activa',0.0);
INSERT INTO rondas VALUES(5,'2026-02-26 20:18:06','activa',0.0);
INSERT INTO rondas VALUES(6,'2026-02-26 20:23:37','activa',0.0);
INSERT INTO rondas VALUES(7,'2026-02-26 20:23:43','activa',0.0);
INSERT INTO rondas VALUES(8,'2026-02-26 20:23:51','activa',0.0);
INSERT INTO rondas VALUES(9,'2026-02-26 20:23:54','activa',0.0);
INSERT INTO rondas VALUES(10,'2026-02-26 20:24:03','activa',0.0);
INSERT INTO rondas VALUES(11,'2026-02-26 20:28:05','activa',0.0);
INSERT INTO rondas VALUES(12,'2026-02-26 20:28:32','activa',0.0);
INSERT INTO rondas VALUES(13,'2026-02-26 20:34:34','activa',0.0);
INSERT INTO rondas VALUES(14,'2026-02-26 20:35:44','activa',0.0);
INSERT INTO rondas VALUES(15,'2026-02-26 20:35:56','activa',0.0);
INSERT INTO rondas VALUES(16,'2026-02-26 20:44:50','finalizada',0.0);
INSERT INTO rondas VALUES(17,'2026-02-26 20:45:25','activa',0.0);
INSERT INTO rondas VALUES(18,'2026-02-26 20:46:55','activa',0.0);
INSERT INTO rondas VALUES(19,'2026-02-26 21:00:20','finalizada',0.0);
INSERT INTO rondas VALUES(20,'2026-02-26 21:00:54','finalizada',0.0);
INSERT INTO rondas VALUES(21,'2026-02-26 21:05:10','finalizada',0.0);
INSERT INTO rondas VALUES(22,'2026-02-26 21:08:17','finalizada',0.0);
INSERT INTO rondas VALUES(23,'2026-02-26 21:10:03','finalizada',0.0);
INSERT INTO rondas VALUES(24,'2026-02-26 21:10:43','finalizada',0.0);
INSERT INTO rondas VALUES(25,'2026-02-26 21:57:55','finalizada',0.0);
INSERT INTO rondas VALUES(26,'2026-02-26 23:54:29','finalizada',0.0);
INSERT INTO rondas VALUES(27,'2026-02-27 00:09:28','finalizada',0.0);
INSERT INTO rondas VALUES(28,'2026-02-27 03:03:49','finalizada',0.0);
INSERT INTO rondas VALUES(29,'2026-02-27 04:04:25','activa',0.0);
INSERT INTO rondas VALUES(30,'2026-02-27 06:09:34','finalizada',0.0);
INSERT INTO rondas VALUES(31,'2026-02-27 07:43:31','finalizada',0.0);
INSERT INTO rondas VALUES(32,'2026-02-27 17:19:55','finalizada',0.0);
CREATE TABLE equipos_ronda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ronda_id INTEGER,
      nombre_equipo TEXT,
      FOREIGN KEY (ronda_id) REFERENCES rondas(id) ON DELETE CASCADE
    );
INSERT INTO equipos_ronda VALUES(1,1,'A');
INSERT INTO equipos_ronda VALUES(2,1,'B');
INSERT INTO equipos_ronda VALUES(3,2,'A');
INSERT INTO equipos_ronda VALUES(4,2,'B');
INSERT INTO equipos_ronda VALUES(5,3,'A');
INSERT INTO equipos_ronda VALUES(6,3,'B');
INSERT INTO equipos_ronda VALUES(7,4,'A');
INSERT INTO equipos_ronda VALUES(8,4,'B');
INSERT INTO equipos_ronda VALUES(9,5,'A');
INSERT INTO equipos_ronda VALUES(10,5,'B');
INSERT INTO equipos_ronda VALUES(11,6,'A');
INSERT INTO equipos_ronda VALUES(12,6,'B');
INSERT INTO equipos_ronda VALUES(13,7,'A');
INSERT INTO equipos_ronda VALUES(14,7,'B');
INSERT INTO equipos_ronda VALUES(15,8,'A');
INSERT INTO equipos_ronda VALUES(16,8,'B');
INSERT INTO equipos_ronda VALUES(17,9,'A');
INSERT INTO equipos_ronda VALUES(18,9,'B');
INSERT INTO equipos_ronda VALUES(19,10,'A');
INSERT INTO equipos_ronda VALUES(20,10,'B');
INSERT INTO equipos_ronda VALUES(21,11,'A');
INSERT INTO equipos_ronda VALUES(22,11,'B');
INSERT INTO equipos_ronda VALUES(23,12,'A');
INSERT INTO equipos_ronda VALUES(24,12,'B');
INSERT INTO equipos_ronda VALUES(25,13,'A');
INSERT INTO equipos_ronda VALUES(26,13,'B');
INSERT INTO equipos_ronda VALUES(27,14,'A');
INSERT INTO equipos_ronda VALUES(28,14,'B');
INSERT INTO equipos_ronda VALUES(29,15,'A');
INSERT INTO equipos_ronda VALUES(30,15,'B');
INSERT INTO equipos_ronda VALUES(31,16,'A');
INSERT INTO equipos_ronda VALUES(32,16,'B');
INSERT INTO equipos_ronda VALUES(33,17,'A');
INSERT INTO equipos_ronda VALUES(34,17,'B');
INSERT INTO equipos_ronda VALUES(35,18,'A');
INSERT INTO equipos_ronda VALUES(36,18,'B');
INSERT INTO equipos_ronda VALUES(37,19,'A');
INSERT INTO equipos_ronda VALUES(38,19,'B');
INSERT INTO equipos_ronda VALUES(39,20,'A');
INSERT INTO equipos_ronda VALUES(40,20,'B');
INSERT INTO equipos_ronda VALUES(41,21,'A');
INSERT INTO equipos_ronda VALUES(42,21,'B');
INSERT INTO equipos_ronda VALUES(43,22,'A');
INSERT INTO equipos_ronda VALUES(44,22,'B');
INSERT INTO equipos_ronda VALUES(45,23,'A');
INSERT INTO equipos_ronda VALUES(46,23,'B');
INSERT INTO equipos_ronda VALUES(47,24,'A');
INSERT INTO equipos_ronda VALUES(48,24,'B');
INSERT INTO equipos_ronda VALUES(49,25,'A');
INSERT INTO equipos_ronda VALUES(50,25,'B');
INSERT INTO equipos_ronda VALUES(51,26,'A');
INSERT INTO equipos_ronda VALUES(52,26,'B');
INSERT INTO equipos_ronda VALUES(53,27,'A');
INSERT INTO equipos_ronda VALUES(54,27,'B');
INSERT INTO equipos_ronda VALUES(55,28,'A');
INSERT INTO equipos_ronda VALUES(56,28,'B');
INSERT INTO equipos_ronda VALUES(57,29,'A');
INSERT INTO equipos_ronda VALUES(58,29,'B');
INSERT INTO equipos_ronda VALUES(59,30,'A');
INSERT INTO equipos_ronda VALUES(60,30,'B');
INSERT INTO equipos_ronda VALUES(61,31,'A');
INSERT INTO equipos_ronda VALUES(62,31,'B');
INSERT INTO equipos_ronda VALUES(63,32,'A');
INSERT INTO equipos_ronda VALUES(64,32,'B');
CREATE TABLE apuestas_ronda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ronda_id INTEGER,
      equipo_id INTEGER,
      jugador_id INTEGER,
      monto_apuesta REAL DEFAULT 0,
      FOREIGN KEY (ronda_id) REFERENCES rondas(id) ON DELETE CASCADE,
      FOREIGN KEY (equipo_id) REFERENCES equipos_ronda(id) ON DELETE CASCADE,
      FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
    );
INSERT INTO apuestas_ronda VALUES(1,1,1,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(2,1,2,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(3,2,3,NULL,15.0);
INSERT INTO apuestas_ronda VALUES(4,2,4,NULL,15.0);
INSERT INTO apuestas_ronda VALUES(5,3,5,NULL,10.0);
INSERT INTO apuestas_ronda VALUES(6,3,6,NULL,10.0);
INSERT INTO apuestas_ronda VALUES(7,4,7,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(8,4,8,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(9,5,9,NULL,10.0);
INSERT INTO apuestas_ronda VALUES(10,5,10,NULL,10.0);
INSERT INTO apuestas_ronda VALUES(11,6,11,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(12,6,12,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(13,7,13,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(14,7,14,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(15,8,15,NULL,10.0);
INSERT INTO apuestas_ronda VALUES(16,8,16,NULL,10.0);
INSERT INTO apuestas_ronda VALUES(17,9,17,NULL,10.0);
INSERT INTO apuestas_ronda VALUES(18,9,18,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(19,10,19,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(20,10,20,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(21,11,21,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(22,11,22,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(23,12,23,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(24,12,24,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(25,13,25,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(26,13,26,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(27,14,27,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(28,14,28,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(29,15,29,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(30,15,30,NULL,5.0);
INSERT INTO apuestas_ronda VALUES(31,16,31,2,5.0);
INSERT INTO apuestas_ronda VALUES(32,16,32,3,5.0);
INSERT INTO apuestas_ronda VALUES(33,17,33,2,5.0);
INSERT INTO apuestas_ronda VALUES(34,17,34,3,5.0);
INSERT INTO apuestas_ronda VALUES(35,18,35,2,5.0);
INSERT INTO apuestas_ronda VALUES(36,18,35,9,5.0);
INSERT INTO apuestas_ronda VALUES(37,18,36,2,5.0);
INSERT INTO apuestas_ronda VALUES(38,18,36,9,5.0);
INSERT INTO apuestas_ronda VALUES(39,19,37,2,5.0);
INSERT INTO apuestas_ronda VALUES(40,19,38,3,5.0);
INSERT INTO apuestas_ronda VALUES(41,20,39,2,5.0);
INSERT INTO apuestas_ronda VALUES(42,20,40,3,5.0);
INSERT INTO apuestas_ronda VALUES(43,21,41,2,5.0);
INSERT INTO apuestas_ronda VALUES(44,21,42,3,5.0);
INSERT INTO apuestas_ronda VALUES(45,22,43,2,10.0);
INSERT INTO apuestas_ronda VALUES(46,22,44,3,10.0);
INSERT INTO apuestas_ronda VALUES(47,23,45,2,20.0);
INSERT INTO apuestas_ronda VALUES(48,23,46,3,10.0);
INSERT INTO apuestas_ronda VALUES(49,24,47,2,10.0);
INSERT INTO apuestas_ronda VALUES(50,24,48,3,10.0);
INSERT INTO apuestas_ronda VALUES(51,25,49,2,5.0);
INSERT INTO apuestas_ronda VALUES(52,25,50,3,5.0);
INSERT INTO apuestas_ronda VALUES(53,26,51,2,10.0);
INSERT INTO apuestas_ronda VALUES(54,26,52,19,10.0);
INSERT INTO apuestas_ronda VALUES(55,27,53,27,5.0);
INSERT INTO apuestas_ronda VALUES(56,27,53,20,5.0);
INSERT INTO apuestas_ronda VALUES(57,27,53,17,5.0);
INSERT INTO apuestas_ronda VALUES(58,27,54,15,5.0);
INSERT INTO apuestas_ronda VALUES(59,27,54,14,5.0);
INSERT INTO apuestas_ronda VALUES(60,27,53,16,5.0);
INSERT INTO apuestas_ronda VALUES(61,27,54,21,5.0);
INSERT INTO apuestas_ronda VALUES(62,27,53,22,5.0);
INSERT INTO apuestas_ronda VALUES(63,27,54,11,5.0);
INSERT INTO apuestas_ronda VALUES(64,27,54,2,5.0);
INSERT INTO apuestas_ronda VALUES(65,28,55,20,5.0);
INSERT INTO apuestas_ronda VALUES(66,28,55,21,10.0);
INSERT INTO apuestas_ronda VALUES(67,28,55,32,5.0);
INSERT INTO apuestas_ronda VALUES(68,28,56,39,5.0);
INSERT INTO apuestas_ronda VALUES(69,28,55,17,5.0);
INSERT INTO apuestas_ronda VALUES(70,28,56,14,5.0);
INSERT INTO apuestas_ronda VALUES(71,28,56,12,10.0);
INSERT INTO apuestas_ronda VALUES(72,28,55,41,5.0);
INSERT INTO apuestas_ronda VALUES(73,28,56,3,5.0);
INSERT INTO apuestas_ronda VALUES(74,28,56,19,5.0);
INSERT INTO apuestas_ronda VALUES(75,29,57,11,5.0);
INSERT INTO apuestas_ronda VALUES(76,29,57,21,10.0);
INSERT INTO apuestas_ronda VALUES(77,29,57,41,5.0);
INSERT INTO apuestas_ronda VALUES(78,29,58,39,5.0);
INSERT INTO apuestas_ronda VALUES(79,29,58,17,5.0);
INSERT INTO apuestas_ronda VALUES(80,29,57,32,5.0);
INSERT INTO apuestas_ronda VALUES(81,29,58,14,5.0);
INSERT INTO apuestas_ronda VALUES(82,29,58,12,10.0);
INSERT INTO apuestas_ronda VALUES(83,29,57,19,5.0);
INSERT INTO apuestas_ronda VALUES(84,29,58,2,5.0);
INSERT INTO apuestas_ronda VALUES(85,30,59,44,5.0);
INSERT INTO apuestas_ronda VALUES(86,30,59,2,5.0);
INSERT INTO apuestas_ronda VALUES(87,30,59,19,5.0);
INSERT INTO apuestas_ronda VALUES(88,30,60,12,5.0);
INSERT INTO apuestas_ronda VALUES(89,30,59,17,5.0);
INSERT INTO apuestas_ronda VALUES(90,30,60,43,5.0);
INSERT INTO apuestas_ronda VALUES(91,30,59,42,5.0);
INSERT INTO apuestas_ronda VALUES(92,30,60,39,5.0);
INSERT INTO apuestas_ronda VALUES(93,30,60,14,5.0);
INSERT INTO apuestas_ronda VALUES(94,30,60,27,5.0);
INSERT INTO apuestas_ronda VALUES(95,31,61,2,5.0);
INSERT INTO apuestas_ronda VALUES(96,31,61,42,5.0);
INSERT INTO apuestas_ronda VALUES(97,31,61,17,5.0);
INSERT INTO apuestas_ronda VALUES(98,31,62,21,5.0);
INSERT INTO apuestas_ronda VALUES(99,31,61,44,5.0);
INSERT INTO apuestas_ronda VALUES(100,31,62,43,5.0);
INSERT INTO apuestas_ronda VALUES(101,31,62,11,5.0);
INSERT INTO apuestas_ronda VALUES(102,31,61,19,5.0);
INSERT INTO apuestas_ronda VALUES(103,31,62,27,5.0);
INSERT INTO apuestas_ronda VALUES(104,31,62,12,5.0);
INSERT INTO apuestas_ronda VALUES(105,32,63,20,5.0);
INSERT INTO apuestas_ronda VALUES(106,32,63,41,5.0);
INSERT INTO apuestas_ronda VALUES(107,32,63,21,10.0);
INSERT INTO apuestas_ronda VALUES(108,32,64,39,5.0);
INSERT INTO apuestas_ronda VALUES(109,32,64,14,5.0);
INSERT INTO apuestas_ronda VALUES(110,32,64,12,10.0);
INSERT INTO apuestas_ronda VALUES(111,32,63,32,5.0);
INSERT INTO apuestas_ronda VALUES(112,32,63,17,5.0);
INSERT INTO apuestas_ronda VALUES(113,32,64,3,5.0);
INSERT INTO apuestas_ronda VALUES(114,32,64,19,5.0);
CREATE TABLE enfrentamientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ronda_id INTEGER,
      jugador_equipoA_id INTEGER,
      jugador_equipoB_id INTEGER,
      monto_enfrentamiento REAL,
      ganador_id INTEGER,
      FOREIGN KEY (ronda_id) REFERENCES rondas(id) ON DELETE CASCADE,
      FOREIGN KEY (jugador_equipoA_id) REFERENCES apuestas_ronda(id),
      FOREIGN KEY (jugador_equipoB_id) REFERENCES apuestas_ronda(id),
      FOREIGN KEY (ganador_id) REFERENCES apuestas_ronda(id)
    );
INSERT INTO enfrentamientos VALUES(1,16,31,32,5.0,31);
INSERT INTO enfrentamientos VALUES(2,17,33,34,5.0,NULL);
INSERT INTO enfrentamientos VALUES(3,18,35,37,5.0,NULL);
INSERT INTO enfrentamientos VALUES(4,18,36,38,5.0,NULL);
INSERT INTO enfrentamientos VALUES(5,19,39,40,5.0,39);
INSERT INTO enfrentamientos VALUES(6,20,41,42,5.0,41);
INSERT INTO enfrentamientos VALUES(7,21,43,44,5.0,44);
INSERT INTO enfrentamientos VALUES(8,22,45,46,10.0,45);
INSERT INTO enfrentamientos VALUES(9,23,47,48,10.0,47);
INSERT INTO enfrentamientos VALUES(10,24,49,50,10.0,50);
INSERT INTO enfrentamientos VALUES(11,25,51,52,5.0,51);
INSERT INTO enfrentamientos VALUES(12,26,53,54,10.0,53);
INSERT INTO enfrentamientos VALUES(13,27,55,58,5.0,55);
INSERT INTO enfrentamientos VALUES(14,27,56,59,5.0,56);
INSERT INTO enfrentamientos VALUES(15,27,57,61,5.0,57);
INSERT INTO enfrentamientos VALUES(16,27,60,63,5.0,60);
INSERT INTO enfrentamientos VALUES(17,27,62,64,5.0,62);
INSERT INTO enfrentamientos VALUES(18,28,65,68,5.0,65);
INSERT INTO enfrentamientos VALUES(19,28,66,70,5.0,66);
INSERT INTO enfrentamientos VALUES(20,28,67,71,5.0,67);
INSERT INTO enfrentamientos VALUES(21,28,69,73,5.0,69);
INSERT INTO enfrentamientos VALUES(22,28,72,74,5.0,72);
INSERT INTO enfrentamientos VALUES(23,29,75,78,5.0,NULL);
INSERT INTO enfrentamientos VALUES(24,29,76,79,5.0,NULL);
INSERT INTO enfrentamientos VALUES(25,29,77,81,5.0,NULL);
INSERT INTO enfrentamientos VALUES(26,29,80,82,5.0,NULL);
INSERT INTO enfrentamientos VALUES(27,29,83,84,5.0,NULL);
INSERT INTO enfrentamientos VALUES(28,30,85,88,5.0,88);
INSERT INTO enfrentamientos VALUES(29,30,86,90,5.0,90);
INSERT INTO enfrentamientos VALUES(30,30,87,92,5.0,92);
INSERT INTO enfrentamientos VALUES(31,30,89,93,5.0,93);
INSERT INTO enfrentamientos VALUES(32,30,91,94,5.0,94);
INSERT INTO enfrentamientos VALUES(33,31,95,98,5.0,95);
INSERT INTO enfrentamientos VALUES(34,31,96,100,5.0,96);
INSERT INTO enfrentamientos VALUES(35,31,97,101,5.0,97);
INSERT INTO enfrentamientos VALUES(36,31,99,103,5.0,99);
INSERT INTO enfrentamientos VALUES(37,31,102,104,5.0,102);
INSERT INTO enfrentamientos VALUES(38,32,105,108,5.0,105);
INSERT INTO enfrentamientos VALUES(39,32,107,110,10.0,107);
INSERT INTO enfrentamientos VALUES(40,32,111,109,5.0,111);
INSERT INTO enfrentamientos VALUES(41,32,112,113,5.0,112);
INSERT INTO enfrentamientos VALUES(42,32,106,114,5.0,106);
PRAGMA writable_schema=ON;
CREATE TABLE IF NOT EXISTS sqlite_sequence(name,seq);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('jugadores',44);
INSERT INTO sqlite_sequence VALUES('rondas',32);
INSERT INTO sqlite_sequence VALUES('equipos_ronda',64);
INSERT INTO sqlite_sequence VALUES('apuestas_ronda',114);
INSERT INTO sqlite_sequence VALUES('enfrentamientos',42);
PRAGMA writable_schema=OFF;
COMMIT;
