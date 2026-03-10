# Metodología para la resolución de ejercicios de ANOVA

Esta guía presenta los pasos sistemáticos para resolver problemas de Análisis de Varianza (ANOVA) en sus tres versiones principales: **modelo completamente aleatorizado (un factor)**, **modelo de bloques aleatorizados (dos factores sin interacción)** y **modelo de cuadrado latino (tres factores)**. También se incluye la metodología general aplicable a todos ellos y las pruebas post-hoc.

---

## Metodología general (válida para todos los modelos)

1. **Identificar el diseño experimental**  
   - Determinar el número de factores (uno, dos o tres).  
   - Reconocer si hay bloques, filas, columnas o tratamientos.  
   - Verificar si el diseño es balanceado (igual número de observaciones por grupo).

2. **Plantear las hipótesis**  
   - Para cada factor:  
     \[
     H_0: \mu_1 = \mu_2 = \dots = \mu_k \quad \text{(todas las medias son iguales)}
     \]
     \[
     H_1: \text{al menos dos de las medias son diferentes}
     \]

3. **Calcular las sumas de cuadrados**  
   - \( SST \) (total), \( SSTR \) (tratamientos), \( SSBL \) (bloques, si existen), \( SSC \) (columnas, en cuadrado latino) y \( SSE \) (error).  
   - Las fórmulas específicas dependen del modelo (ver secciones siguientes).

4. **Calcular los grados de libertad**  
   - Asociados a cada fuente de variación.

5. **Calcular los cuadrados medios**  
   \[
   MS = \frac{SS}{gl}
   \]

6. **Calcular el estadístico \( F \)** para cada factor  
   \[
   F = \frac{MS_{\text{factor}}}{MS_{\text{error}}}
   \]

7. **Obtener el valor crítico de la tabla \( F \)**  
   - Con \(\alpha\) dado (generalmente 0,05) y los grados de libertad del numerador y denominador.

8. **Decidir si se rechaza \( H_0 \)**  
   - Si \( F_{\text{calc}} > F_{\text{crítico}} \) o el p‑valor \( < \alpha \), se rechaza la hipótesis nula.

9. **Realizar pruebas post‑hoc** (si el factor tiene más de dos niveles y resultó significativo)  
   - Por ejemplo: Tukey, Duncan, Bonferroni.

10. **Verificar los supuestos**  
    - Normalidad de los residuos (gráfico Q‑Q, Shapiro–Wilk).  
    - Homocedasticidad (prueba de Levene, gráfico de residuos vs. predichos).  
    - Independencia (asegurada por el diseño aleatorio).

---

## 1. Modelo completamente aleatorizado (un factor)

### Características
- Una variable independiente (factor) con \(k\) niveles o tratamientos.
- Se tienen \(n_i\) observaciones por nivel (\(i = 1,\dots,k\)).
- Total de datos: \(N = \sum_{i=1}^k n_i\).

### Procedimiento paso a paso

1. **Calcular las medias muestrales**  
   \[
   \bar{x}_i = \frac{1}{n_i}\sum_{j=1}^{n_i} x_{ij}, \qquad 
   \bar{\bar{x}} = \frac{1}{N}\sum_{i=1}^k\sum_{j=1}^{n_i} x_{ij}
   \]

2. **Sumas de cuadrados**  
   \[
   SST = \sum_{i=1}^k\sum_{j=1}^{n_i} (x_{ij} - \bar{\bar{x}})^2
   \]
   \[
   SSTR = \sum_{i=1}^k n_i (\bar{x}_i - \bar{\bar{x}})^2
   \]
   \[
   SSE = SST - SSTR
   \]

3. **Grados de libertad**  
   \[
   gl_{trat} = k-1,\qquad gl_{error} = N-k,\qquad gl_{total} = N-1
   \]

4. **Cuadrados medios**  
   \[
   MSTR = \frac{SSTR}{k-1},\qquad MSE = \frac{SSE}{N-k}
   \]

5. **Estadístico \(F\)**  
   \[
   F = \frac{MSTR}{MSE}
   \]

6. **Regla de decisión**  
   - Rechazar \(H_0\) si \(F > F_{\alpha,\,k-1,\,N-k}\) (valor de tabla).

7. **Pruebas post‑hoc** (si \(F\) es significativo)  
   - Por ejemplo, comparaciones múltiples de Tukey o Duncan.

---

## 2. Modelo de bloques aleatorizados (dos factores sin interacción)

### Características
- Un factor de interés (tratamientos) con \(c\) niveles.
- Un factor de bloque con \(r\) niveles.
- Una observación por combinación bloque‑tratamiento (diseño balanceado).
- Total de datos: \(N = r \times c\).

### Procedimiento paso a paso

1. **Calcular las medias**  
   \[
   \bar{x}_{.j} = \frac{1}{r}\sum_{i=1}^r x_{ij} \quad (\text{media del tratamiento } j)
   \]
   \[
   \bar{x}_{i.} = \frac{1}{c}\sum_{j=1}^c x_{ij} \quad (\text{media del bloque } i)
   \]
   \[
   \bar{\bar{x}} = \frac{1}{rc}\sum_{i=1}^r\sum_{j=1}^c x_{ij}
   \]

2. **Sumas de cuadrados**  
   \[
   SST = \sum_{i=1}^r\sum_{j=1}^c (x_{ij} - \bar{\bar{x}})^2
   \]
   \[
   SSTR = r\sum_{j=1}^c (\bar{x}_{.j} - \bar{\bar{x}})^2
   \]
   \[
   SSBL = c\sum_{i=1}^r (\bar{x}_{i.} - \bar{\bar{x}})^2
   \]
   \[
   SSE = SST - SSTR - SSBL
   \]

3. **Grados de libertad**  
   \[
   gl_{trat} = c-1,\qquad gl_{bloq} = r-1,\qquad gl_{error} = (r-1)(c-1),\qquad gl_{total} = rc-1
   \]

4. **Cuadrados medios**  
   \[
   MSTR = \frac{SSTR}{c-1},\qquad MSBL = \frac{SSBL}{r-1},\qquad MSE = \frac{SSE}{(r-1)(c-1)}
   \]

5. **Estadísticos \(F\)**  
   \[
   F_{\text{trat}} = \frac{MSTR}{MSE},\qquad F_{\text{bloq}} = \frac{MSBL}{MSE}
   \]

6. **Regla de decisión**  
   - Comparar cada \(F\) con el valor crítico \(F_{\alpha,\,gl_{\text{numerador}},\,gl_{\text{error}}}\).

7. **Pruebas post‑hoc** (si el factor de interés es significativo)  
   - Similar al caso anterior, aplicadas a las medias de los tratamientos.

---

## 3. Modelo de cuadrado latino (tres factores)

### Características
- Tres factores: filas, columnas y tratamientos (letras latinas).
- Todos con el mismo número de niveles \(r\).
- Una observación por celda, formando una matriz \(r \times r\).
- Total de datos: \(N = r^2\).

### Procedimiento paso a paso

1. **Calcular las medias**  
   - Media de cada fila: \(\bar{x}_{i.} = \frac{1}{r}\sum_{j=1}^r x_{ij}\).  
   - Media de cada columna: \(\bar{x}_{.j} = \frac{1}{r}\sum_{i=1}^r x_{ij}\).  
   - Media de cada tratamiento: \(\bar{x}_{(t)} = \frac{1}{r}\sum_{\text{celdas con tratamiento } t} x_{ij}\).  
   - Media global: \(\bar{\bar{x}} = \frac{1}{r^2}\sum_{i=1}^r\sum_{j=1}^r x_{ij}\).

2. **Sumas de cuadrados**  
   \[
   SST = \sum_{i=1}^r\sum_{j=1}^r (x_{ij} - \bar{\bar{x}})^2
   \]
   \[
   SSFilas = r\sum_{i=1}^r (\bar{x}_{i.} - \bar{\bar{x}})^2
   \]
   \[
   SSColumnas = r\sum_{j=1}^r (\bar{x}_{.j} - \bar{\bar{x}})^2
   \]
   \[
   SSTR = r\sum_{t=1}^r (\bar{x}_{(t)} - \bar{\bar{x}})^2
   \]
   \[
   SSE = SST - SSFilas - SSColumnas - SSTR
   \]

3. **Grados de libertad**  
   \[
   gl_{filas} = gl_{columnas} = gl_{trat} = r-1
   \]
   \[
   gl_{error} = (r-1)(r-2),\qquad gl_{total} = r^2-1
   \]

4. **Cuadrados medios**  
   \[
   MSFilas = \frac{SSFilas}{r-1},\quad MSColumnas = \frac{SSColumnas}{r-1},\quad MSTR = \frac{SSTR}{r-1},\quad MSE = \frac{SSE}{(r-1)(r-2)}
   \]

5. **Estadísticos \(F\)**  
   \[
   F_{\text{filas}} = \frac{MSFilas}{MSE},\quad F_{\text{col}} = \frac{MSColumnas}{MSE},\quad F_{\text{trat}} = \frac{MSTR}{MSE}
   \]

6. **Regla de decisión**  
   - Comparar cada \(F\) con \(F_{\alpha,\,r-1,\,(r-1)(r-2)}\).

7. **Pruebas post‑hoc** (si el factor de interés, normalmente el de tratamientos, es significativo)  
   - Aplicar, por ejemplo, la prueba de Duncan a las medias de los tratamientos.

---

## Pruebas post‑hoc (ejemplo con Duncan)

Cuando el ANOVA rechaza la igualdad de medias para un factor con más de dos niveles, se utilizan pruebas de comparaciones múltiples. La **prueba de Duncan** sigue estos pasos:

1. Ordenar las medias de mayor a menor: \(\bar{x}_{(1)} \ge \bar{x}_{(2)} \ge \dots \ge \bar{x}_{(k)}\).
2. Calcular el error estándar de una media:
   \[
   S_{\bar{x}} = \sqrt{\frac{MSE}{n}}
   \]
   donde \(n\) es el número de observaciones por grupo (en diseños balanceados).
3. Obtener de la tabla de rangos estudentizados de Duncan los valores \(q_{\alpha}(p, gl_{error})\) para \(p = 2, 3, \dots, k\).
4. Calcular los rangos mínimos significativos (RMS):
   \[
   RMS_p = q_{\alpha}(p, gl_{error}) \cdot S_{\bar{x}}
   \]
5. Comparar la diferencia entre dos medias separadas por \(p\) posiciones con \(RMS_p\). Si la diferencia es mayor que el RMS, se declaran significativamente diferentes.

---

## Tabla resumen de fórmulas por modelo

| Concepto               | Un factor                            | Bloques aleatorizados                           | Cuadrado latino                                              |
|------------------------|--------------------------------------|-------------------------------------------------|--------------------------------------------------------------|
| **SST**                | \(\sum (x - \bar{\bar{x}})^2\)       | \(\sum (x - \bar{\bar{x}})^2\)                  | \(\sum (x - \bar{\bar{x}})^2\)                               |
| **SSTR**               | \(\sum n_i(\bar{x}_i-\bar{\bar{x}})^2\) | \(r\sum (\bar{x}_{.j}-\bar{\bar{x}})^2\)       | \(r\sum (\bar{x}_{(t)}-\bar{\bar{x}})^2\)                    |
| **SSBL / SSFilas**     | –                                    | \(c\sum (\bar{x}_{i.}-\bar{\bar{x}})^2\)       | \(r\sum (\bar{x}_{i.}-\bar{\bar{x}})^2\)                     |
| **SSColumnas**         | –                                    | –                                               | \(r\sum (\bar{x}_{.j}-\bar{\bar{x}})^2\)                     |
| **SSE**                | \(SST - SSTR\)                       | \(SST - SSTR - SSBL\)                           | \(SST - SSFilas - SSColumnas - SSTR\)                        |
| **gl\_trat**           | \(k-1\)                              | \(c-1\)                                         | \(r-1\)                                                       |
| **gl\_bloq / filas**   | –                                    | \(r-1\)                                         | \(r-1\)                                                       |
| **gl\_col**            | –                                    | –                                               | \(r-1\)                                                       |
| **gl\_error**          | \(N-k\)                              | \((r-1)(c-1)\)                                  | \((r-1)(r-2)\)                                                |
| **Fórmula de \(F\)**   | \(\frac{MSTR}{MSE}\)                  | \(\frac{MSTR}{MSE}\) y \(\frac{MSBL}{MSE}\)     | \(\frac{MSTR}{MSE}\), \(\frac{MSFilas}{MSE}\), \(\frac{MSColumnas}{MSE}\) |

---

## Notas finales

- Los cálculos se facilitan enormemente con software estadístico (SPSS, R, Excel), pero la comprensión de las fórmulas es esencial para interpretar correctamente los resultados.
- Siempre verifique los supuestos antes de aceptar las conclusiones del ANOVA.
- En diseños no balanceados (distinto número de observaciones por grupo), las fórmulas de las sumas de cuadrados se ajustan ligeramente; se recomienda usar software especializado en esos casos.