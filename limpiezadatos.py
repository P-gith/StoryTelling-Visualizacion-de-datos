import pandas as pd
import numpy as np
import re
import ast

def limpiar_datos_peliculas(archivo_entrada='n_movies.csv', archivo_salida='n_movies_clean.csv'):
    """
    Limpia el dataset de películas y series
    """
    print("🎬 Iniciando limpieza de datos de películas y series...")
    
    # Cargar el dataset
    df = pd.read_csv(archivo_entrada)
    print(f"📊 Dataset cargado: {len(df)} registros")
    
    # 1. SEPARAR DIRECTORES DE ACTORES EN LA COLUMNA 'STARS'
    print("\n🎭 Separando directores de actores...")
    
    def separar_directores_actores(stars_text):
        """Separa directores de actores en la columna stars"""
        if pd.isna(stars_text) or stars_text == '[]':
            return [], []
        
        try:
            # Convertir string a lista si es necesario
            if isinstance(stars_text, str):
                # Limpiar el formato de string de lista
                stars_list = ast.literal_eval(stars_text)
            else:
                stars_list = stars_text
            
            directores = []
            actores = []
            
            # Verificar si tiene el patrón de director | Stars: actores
            tiene_separador = any('|' in str(item) for item in stars_list)
            
            if tiene_separador:
                # Hay directores y actores separados
                director_mode = True
                
                for item in stars_list:
                    item = str(item).strip()
                    
                    # Si encontramos '|', terminan los directores
                    if '|' in item:
                        director_mode = False
                        continue
                    
                    # Si encontramos 'Stars:', empiezan los actores
                    if 'Stars:' in item:
                        continue
                    
                    # Si estamos en modo directores
                    if director_mode and item and item != '':
                        director_clean = item.rstrip(', ')
                        if director_clean:
                            directores.append(director_clean)
                    
                    # Si estamos en modo actores
                    elif not director_mode and item and item != '':
                        actor_clean = item.rstrip(', ')
                        if actor_clean:
                            actores.append(actor_clean)
            else:
                # Solo actores, no hay separador
                actores = [item.rstrip(', ') for item in stars_list if str(item).strip()]
            
            return directores, actores
            
        except Exception as e:
            # En caso de error, devolver listas vacías
            return [], []
    
    # Aplicar la separación
    df[['directores', 'actores']] = df['stars'].apply(
        lambda x: pd.Series(separar_directores_actores(x))
    )
    
    # 2. LIMPIAR COLUMNA DE VOTOS
    print("🗳️ Limpiando columna de votos...")
    
    def limpiar_votos(votos):
        """Convierte votos a formato numérico"""
        if pd.isna(votos) or votos == '':
            return np.nan
        
        # Si ya es un número, devolverlo
        if isinstance(votos, (int, float)):
            return votos
        
        # Si es string, limpiar comas y convertir
        if isinstance(votos, str):
            # Remover comas y comillas
            votos_clean = re.sub(r'[,"\'"]', '', str(votos))
            try:
                return int(votos_clean)
            except:
                return np.nan
        
        return np.nan
    
    df['votes_numeric'] = df['votes'].apply(limpiar_votos)
    
    # 3. EXTRAER DURACIÓN EN MINUTOS
    print("⏱️ Extrayendo duración en minutos...")
    
    def extraer_duracion_minutos(duracion):
        """Extrae la duración en minutos"""
        if pd.isna(duracion) or duracion == '':
            return np.nan
        
        # Buscar números seguidos de 'min'
        match = re.search(r'(\d+)\s*min', str(duracion))
        if match:
            return int(match.group(1))
        
        return np.nan
    
    df['duration_minutes'] = df['duration'].apply(extraer_duracion_minutos)
    
    # 4. LIMPIAR RATINGS
    print("⭐ Limpiando ratings...")
    
    def limpiar_rating(rating):
        """Convierte rating a formato numérico"""
        if pd.isna(rating) or rating == '':
            return np.nan
        
        try:
            return float(rating)
        except:
            return np.nan
    
    df['rating_numeric'] = df['rating'].apply(limpiar_rating)
    
    # 5. EXTRAER AÑO DE INICIO Y FIN
    print("📅 Extrayendo años de inicio y fin...")
    
    def extraer_anos(year_text):
        """Extrae año de inicio y fin de la serie/película"""
        if pd.isna(year_text):
            return np.nan, np.nan
        
        year_str = str(year_text).strip('()')
        
        # Caso: (2020–2023) o (2020-2023)
        if '–' in year_str or '-' in year_str:
            parts = re.split(r'[–-]', year_str)
            if len(parts) == 2:
                try:
                    start_year = int(parts[0].strip())
                    end_part = parts[1].strip()
                    
                    # Si termina con "– " significa que está en curso
                    if end_part == '' or end_part == ' ':
                        return start_year, np.nan
                    else:
                        end_year = int(end_part)
                        return start_year, end_year
                except:
                    pass
        
        # Caso: (2022) - un solo año
        try:
            single_year = int(year_str)
            return single_year, single_year
        except:
            return np.nan, np.nan
    
    df[['start_year', 'end_year']] = df['year'].apply(
        lambda x: pd.Series(extraer_anos(x))
    )
    
    # 6. CREAR COLUMNA DE TIPO (PELÍCULA VS SERIE)
    print("🎞️ Identificando tipo de contenido...")
    
    def identificar_tipo(year_text, duration_min):
        """Identifica si es película o serie"""
        if pd.isna(year_text):
            return 'Unknown'
        
        year_str = str(year_text)
        
        # Si contiene "–" y no tiene año final, probablemente es serie en curso
        if ('–' in year_str and year_str.endswith('– )')) or ('–' in year_str and year_str.endswith('–')):
            return 'TV Series'
        
        # Si tiene rango de años, es serie
        if '–' in year_str or '-' in year_str:
            return 'TV Series'
        
        # Si la duración es muy larga (>200 min), probablemente es miniserie
        if pd.notna(duration_min) and duration_min > 200:
            return 'Miniseries'
        
        # Si tiene un solo año, probablemente es película
        return 'Movie'
    
    df['content_type'] = df.apply(lambda row: identificar_tipo(row['year'], row['duration_minutes']), axis=1)
    
    # 7. LIMPIAR GÉNEROS
    print("🎭 Limpiando géneros...")
    
    def limpiar_generos(genre_text):
        """Limpia y separa géneros"""
        if pd.isna(genre_text) or genre_text == '':
            return []
        
        # Remover comillas y separar por comas
        genres = str(genre_text).strip('"').split(',')
        genres_clean = [g.strip() for g in genres if g.strip()]
        
        return genres_clean
    
    df['genres_list'] = df['genre'].apply(limpiar_generos)
    
    # Obtener el género principal (primer género)
    df['primary_genre'] = df['genres_list'].apply(lambda x: x[0] if x else 'Unknown')
    
    # 8. CREAR MÉTRICAS ADICIONALES
    print("📊 Creando métricas adicionales...")
    
    # Número de géneros
    df['genre_count'] = df['genres_list'].apply(len)
    
    # Número de directores y actores
    df['director_count'] = df['directores'].apply(len)
    df['actor_count'] = df['actores'].apply(len)
    
    # Duración de la serie (años)
    df['series_duration_years'] = df['end_year'] - df['start_year']
    df['series_duration_years'] = df['series_duration_years'].fillna(0)
    
    # 9. LIMPIEZA FINAL
    print("🧹 Limpieza final...")
    
    # Remover filas completamente vacías en columnas clave
    df_clean = df.dropna(subset=['title'], how='all')
    
    # Reorganizar columnas
    columnas_finales = [
        'title', 'start_year', 'end_year', 'content_type', 'certificate', 
        'duration_minutes', 'primary_genre', 'genres_list', 'genre_count',
        'rating_numeric', 'description', 'directores', 'director_count', 
        'actores', 'actor_count', 'votes_numeric', 'series_duration_years'
    ]
    
    # Agregar columnas originales que no están en la lista final
    columnas_originales = ['year', 'duration', 'genre', 'rating', 'stars', 'votes']
    df_final = df_clean[columnas_finales + columnas_originales].copy()
    
    # 10. ESTADÍSTICAS DE LIMPIEZA
    print("\n📈 Estadísticas de limpieza:")
    print(f"   • Registros originales: {len(df)}")
    print(f"   • Registros después de limpieza: {len(df_final)}")
    print(f"   • Registros con rating válido: {df_final['rating_numeric'].notna().sum()}")
    print(f"   • Registros con votos válidos: {df_final['votes_numeric'].notna().sum()}")
    print(f"   • Registros con duración válida: {df_final['duration_minutes'].notna().sum()}")
    print(f"   • Películas: {(df_final['content_type'] == 'Movie').sum()}")
    print(f"   • Series de TV: {(df_final['content_type'] == 'TV Series').sum()}")
    print(f"   • Miniseries: {(df_final['content_type'] == 'Miniseries').sum()}")
    
    # Mostrar distribución de géneros principales
    print(f"\n🎭 Top 10 géneros principales:")
    genre_counts = df_final['primary_genre'].value_counts().head(10)
    for genre, count in genre_counts.items():
        print(f"   • {genre}: {count}")
    
    # 11. GUARDAR RESULTADO
    df_final.to_csv(archivo_salida, index=False, encoding='utf-8')
    print(f"\n✅ Dataset limpio guardado como: {archivo_salida}")
    
    return df_final

def mostrar_ejemplos_limpieza(df_clean, n=5):
    """Muestra ejemplos de los datos limpiados"""
    print(f"\n📋 Ejemplos de datos limpiados (primeros {n} registros):")
    print("="*100)
    
    for i in range(min(n, len(df_clean))):
        row = df_clean.iloc[i]
        print(f"\n🎬 {i+1}. {row['title']}")
        print(f"   📅 Año: {row['start_year']}-{row['end_year'] if pd.notna(row['end_year']) else 'En curso'}")
        print(f"   🎞️ Tipo: {row['content_type']}")
        print(f"   ⏱️ Duración: {row['duration_minutes']} min" if pd.notna(row['duration_minutes']) else "   ⏱️ Duración: No disponible")
        print(f"   🎭 Género principal: {row['primary_genre']}")
        print(f"   ⭐ Rating: {row['rating_numeric']}" if pd.notna(row['rating_numeric']) else "   ⭐ Rating: No disponible")
        print(f"   🗳️ Votos: {row['votes_numeric']:,}" if pd.notna(row['votes_numeric']) else "   🗳️ Votos: No disponible")
        print(f"   🎬 Directores: {row['directores'][:2]}{'...' if len(row['directores']) > 2 else ''}")
        print(f"   🎭 Actores: {row['actores'][:3]}{'...' if len(row['actores']) > 3 else ''}")

if __name__ == "__main__":
    # Ejecutar limpieza
    df_limpio = limpiar_datos_peliculas()
    
    # Mostrar ejemplos
    mostrar_ejemplos_limpieza(df_limpio)
    
    print("\n🎉 ¡Limpieza de datos completada exitosamente!")
    print("📄 El archivo limpio está listo para análisis y visualización.")
