// Variables globales
let data = [];
let processedData = {};

// Función para cargar y procesar los datos
async function loadData() {
    try {
        const rawData = await d3.csv("n_movies_clean.csv");
        
        // Procesar los datos del dataset limpio
        data = rawData.map(d => {
            // Usar datos ya procesados del dataset limpio
            let genres = [];
            try {
                // Convertir la lista de géneros desde string
                if (d.genres_list && d.genres_list !== '[]') {
                    genres = JSON.parse(d.genres_list.replace(/'/g, '"'));
                }
            } catch (e) {
                genres = [d.primary_genre || 'Unknown'];
            }
            
            // Convertir directores y actores desde string
            let directores = [];
            let actores = [];
            try {
                if (d.directores && d.directores !== '[]') {
                    directores = JSON.parse(d.directores.replace(/'/g, '"'));
                }
                if (d.actores && d.actores !== '[]') {
                    actores = JSON.parse(d.actores.replace(/'/g, '"'));
                }
            } catch (e) {
                directores = [];
                actores = [];
            }
            
            return {
                title: d.title,
                year: +d.start_year || null,
                endYear: +d.end_year || null,
                certificate: d.certificate,
                duration: +d.duration_minutes || null,
                genres: genres,
                primaryGenre: d.primary_genre || 'Unknown',
                rating: +d.rating_numeric || null,
                description: d.description,
                votes: +d.votes_numeric || 0,
                contentType: d.content_type,
                directores: directores,
                actores: actores,
                seriesDuration: +d.series_duration_years || 0,
                genreCount: +d.genre_count || 0,
                directorCount: +d.director_count || 0,
                actorCount: +d.actor_count || 0
            };
        }).filter(d => d.rating !== null && d.rating > 0); // Filtrar elementos sin rating válido
        
        console.log('Datos cargados del dataset limpio:', data.length, 'elementos');
        
        // Mostrar estadísticas del dataset limpio
        showDataStats();
        
        processData();
        createVisualizations();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showError('Error al cargar los datos. Por favor, verifica que el archivo n_movies_clean.csv esté disponible.');
    }
}

// Función para mostrar estadísticas del dataset limpio
function showDataStats() {
    const statsContainer = document.querySelector('#overview-viz');
    if (statsContainer) {
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.95);
            padding: 12px;
            border-radius: 8px;
            font-size: 12px;
            color: #2c3e50;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15);
            max-width: 220px;
            z-index: 1000;
            border-left: 4px solid #74b9ff;
        `;
        
        // Estadísticas mejoradas del dataset limpio
        const movies = data.filter(d => d.contentType === 'Movie').length;
        const series = data.filter(d => d.contentType === 'TV Series').length;
        const miniseries = data.filter(d => d.contentType === 'Miniseries').length;
        const avgRating = d3.mean(data, d => d.rating).toFixed(1);
        const avgDuration = d3.mean(data.filter(d => d.duration), d => d.duration).toFixed(0);
        
        statsDiv.innerHTML = `
            <strong>📊 Dataset Limpio</strong><br>
            <small>
                🎬 Películas: ${movies}<br>
                📺 Series TV: ${series}<br>
                🎭 Miniseries: ${miniseries}<br>
                ⭐ Rating promedio: ${avgRating}<br>
                ⏱️ Duración promedio: ${avgDuration} min<br>
                <strong>Total: ${data.length} títulos</strong>
            </small>
        `;
        
        // Remover estadísticas anteriores si existen
        const existing = statsContainer.querySelector('.data-stats');
        if (existing) existing.remove();
        
        statsDiv.className = 'data-stats';
        statsContainer.appendChild(statsDiv);
        
        // Auto-remover después de 12 segundos
        setTimeout(() => {
            if (statsDiv.parentNode) {
                statsDiv.remove();
            }
        }, 12000);
    }
}

// Función para procesar datos para diferentes visualizaciones
function processData() {
    // Distribución de ratings
    processedData.ratingDistribution = d3.bin()
        .domain([5, 10])
        .thresholds(20)(data.map(d => d.rating));
    
    // Géneros más populares
    const genreCounts = {};
    
    data.forEach(d => {
        d.genres.forEach(genre => {
            if (genre && genre !== 'Unknown' && genre.trim() !== '') {
                const cleanGenre = genre.trim();
                genreCounts[cleanGenre] = (genreCounts[cleanGenre] || 0) + 1;
            }
        });
    });
    
    processedData.genreData = Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    // Top contenido
    processedData.topContent = data
        .filter(d => d.votes > 1000)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 15);
    
    // Datos para scatter plot duración vs rating
    processedData.durationRating = data.filter(d => d.duration && d.duration > 0);
    
    // Nuevos datos para visualizaciones mejoradas
    // Distribución por tipo de contenido
    processedData.contentTypeData = [
        { type: 'Movie', count: data.filter(d => d.contentType === 'Movie').length },
        { type: 'TV Series', count: data.filter(d => d.contentType === 'TV Series').length },
        { type: 'Miniseries', count: data.filter(d => d.contentType === 'Miniseries').length },
        { type: 'Unknown', count: data.filter(d => !d.contentType || d.contentType === 'Unknown').length }
    ].filter(d => d.count > 0);
    
    // Análisis de directores más prolíficos
    const directorCounts = {};
    data.forEach(d => {
        if (d.directores && d.directores.length > 0) {
            d.directores.forEach(director => {
                if (director && director.trim() !== '') {
                    const cleanDirector = director.trim();
                    directorCounts[cleanDirector] = (directorCounts[cleanDirector] || 0) + 1;
                }
            });
        }
    });
    
    processedData.topDirectors = Object.entries(directorCounts)
        .map(([director, count]) => ({ director, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    // Evolución temporal mejorada
    const yearCounts = {};
    data.forEach(d => {
        if (d.year && d.year >= 1950 && d.year <= 2024) {
            const decade = Math.floor(d.year / 10) * 10;
            yearCounts[decade] = (yearCounts[decade] || 0) + 1;
        }
    });
    
    processedData.timelineData = Object.entries(yearCounts)
        .map(([decade, count]) => ({ decade: +decade, count }))
        .sort((a, b) => a.decade - b.decade);
}

// Función para mostrar errores
function showError(message) {
    document.querySelectorAll('.visualization').forEach(viz => {
        viz.innerHTML = `<div class="error">${message}</div>`;
    });
}

// Crear todas las visualizaciones
function createVisualizations() {
    createOverviewViz();
    createRatingsHistogram();
    createGenresChart();
    createContentTypeChart(); // Nueva visualización
    createDurationScatter();
    createTopContentList();
    setupInteractiveViz();
}

// 1. Visualización de resumen
function createOverviewViz() {
    const container = d3.select("#overview-viz");
    container.html(""); // Limpiar contenido anterior
    
    const width = 450;
    const height = 350;
    
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);
    
    // Crear gradiente para las cards
    const cardDefs = svg.append("defs");
    const gradient = cardDefs.append("linearGradient")
        .attr("id", "cardGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
    
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("style", "stop-color:#74b9ff;stop-opacity:0.8");
    
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("style", "stop-color:#0984e3;stop-opacity:0.9");
    
    // Estadísticas generales mejoradas con el dataset limpio
    const stats = [
        { label: "Total de Títulos", value: data.length },
        { label: "Rating Promedio", value: d3.mean(data, d => d.rating).toFixed(1) },
        { label: "Géneros Únicos", value: new Set(data.flatMap(d => d.genres)).size },
        { 
            label: "Películas vs Series", 
            value: `${Math.round((data.filter(d => d.contentType === 'Movie').length / data.length) * 100)}% Movies` 
        }
    ];
    
    // Usar grid simple sin animaciones
    const cardWidth = 180;
    const cardHeight = 120;
    const margin = 30;
    
    const cards = svg.selectAll(".stat-card")
        .data(stats)
        .enter()
        .append("g")
        .attr("class", "stat-card")
        .attr("transform", (d, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = margin + col * (cardWidth + margin);
            const y = margin + row * (cardHeight + margin);
            return `translate(${x}, ${y})`;
        });

    cards.append("rect")
        .attr("width", cardWidth)
        .attr("height", cardHeight)
        .attr("rx", 10)
        .attr("fill", "url(#cardGradient)");    cards.append("text")
        .attr("x", cardWidth / 2)
        .attr("y", cardHeight / 2 - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .text(d => d.value);
    
    cards.append("text")
        .attr("x", cardWidth / 2)
        .attr("y", cardHeight / 2 + 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "white")
        .text(d => d.label);
}

// 2. Histograma de ratings
function createRatingsHistogram() {
    const container = d3.select("#ratings-viz");
    container.html("");
    
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;
    
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleLinear()
        .domain([5, 10])
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(processedData.ratingDistribution, d => d.length)])
        .nice()
        .range([height, 0]);
    
    // Definir gradiente para las barras
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "ratingGradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", height)
        .attr("x2", 0).attr("y2", 0);
    
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#ff7675");
    
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#fd79a8");
    
    // Crear barras
    g.selectAll(".bar")
        .data(processedData.ratingDistribution)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0))
        .attr("width", d => x(d.x1) - x(d.x0) - 1)
        .attr("y", d => y(d.length))
        .attr("height", d => height - y(d.length))
        .attr("fill", "url(#ratingGradient)")
        .on("mouseover", function(event, d) {
            showTooltip(event, `Rating: ${d.x0.toFixed(1)}-${d.x1.toFixed(1)}<br>Cantidad: ${d.length}`);
        })
        .on("mouseout", hideTooltip);
    
    // Ejes con etiquetas mejoradas
    const xAxis = g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
    // Estilo del eje X
    xAxis.selectAll("text")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("fill", "#7f8c8d");
    
    xAxis.selectAll("line")
        .style("stroke", "#ddd");
    
    xAxis.select(".domain")
        .style("stroke", "#ccc");
    
    // Etiqueta del eje X
    xAxis.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", 35)
        .style("text-anchor", "middle")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50")
        .text("Rating IMDb");
    
    const yAxis = g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));
    
    // Estilo del eje Y
    yAxis.selectAll("text")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("fill", "#7f8c8d");
    
    yAxis.selectAll("line")
        .style("stroke", "#ddd");
    
    yAxis.select(".domain")
        .style("stroke", "#ccc");
    
    // Etiqueta del eje Y
    yAxis.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -31)
        .attr("x", -height /2)
        .style("text-anchor", "middle")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50")
        .text("Cantidad de Títulos");
}

// 3. Gráfico de géneros
function createGenresChart() {
    console.log('Iniciando createGenresChart...');
    const container = d3.select("#genres-viz");
    container.html("");
    
    // Debug: verificar datos
    console.log('Datos de géneros:', processedData.genreData);
    console.log('Cantidad de géneros:', processedData.genreData ? processedData.genreData.length : 'undefined');
    
    if (!processedData.genreData || processedData.genreData.length === 0) {
        container.append("div")
            .attr("class", "error")
            .text("No hay datos de géneros disponibles");
        return;
    }
    
    const margin = { top: 40, right: 40, bottom: 80, left: 140 };
    const baseDimensions = getResponsiveDimensions(550, 450, '#genres-viz');
    const width = baseDimensions.width - margin.left - margin.right;
    const height = baseDimensions.height - margin.top - margin.bottom;
    
    // Ajustar márgenes para móviles
    if (window.innerWidth <= 768) {
        margin.left = Math.min(120, margin.left);
        margin.bottom = Math.min(60, margin.bottom);
    }
    
    // Crear SVG mejorado
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .style("max-width", "100%")
        .style("height", "auto");
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Título del gráfico
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("font-family", "Playfair Display, serif")
        .style("font-size", "18px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50")
        .text("Géneros Más Populares");
    
    // Escalas
    const maxCount = d3.max(processedData.genreData, d => d.count);
    console.log('Valor máximo de count:', maxCount);
    
    const x = d3.scaleLinear()
        .domain([0, maxCount])
        .nice()
        .range([0, width]);
    
    const y = d3.scaleBand()
        .domain(processedData.genreData.map(d => d.genre))
        .range([0, height])
        .padding(0.1);
    
    console.log('Escala X domain:', x.domain());
    console.log('Escala Y domain:', y.domain());
    console.log('Ancho de banda Y:', y.bandwidth());
    
    // Gradiente para las barras
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "genreGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
    
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("style", "stop-color:#667eea;stop-opacity:0.8");
    
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("style", "stop-color:#764ba2;stop-opacity:0.9");
    
    // Colores alternativos para variedad
    const colors = [
        'url(#genreGradient)', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
        '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
    ];
    
    // Crear barras mejoradas
    const bars = g.selectAll(".genre-bar")
        .data(processedData.genreData)
        .enter().append("rect")
        .attr("class", "genre-bar")
        .attr("x", 0)
        .attr("y", d => y(d.genre))
        .attr("width", 0) // Empezar con ancho 0 para animación
        .attr("height", y.bandwidth())
        .attr("fill", (d, i) => colors[i % colors.length])
        .attr("stroke", "none")
        .attr("rx", 4) // Bordes redondeados
        .style("opacity", 0.9)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .style("opacity", 1)
                .attr("stroke", "#2c3e50")
                .attr("stroke-width", 2);
            showTooltip(event, `
                <strong>${d.genre}</strong><br>
                ${d.count} títulos
            `);
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .style("opacity", 0.9)
                .attr("stroke", "none");
            hideTooltip();
        });
    
    // Animar las barras
    bars.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr("width", d => x(d.count));
    
    console.log('Barras creadas:', bars.size());
    
    // Ejes con mejor estilo
    const xAxis = g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickFormat(d => d === 0 ? "0" : d3.format("~s")(d))
            .ticks(6));
    
    // Estilo del eje X
    xAxis.selectAll("text")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("fill", "#7f8c8d");
    
    xAxis.selectAll("line")
        .style("stroke", "#ddd");
    
    xAxis.select(".domain")
        .style("stroke", "#ccc");
    
    const yAxis = g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));
    
    // Estilo del eje Y
    yAxis.selectAll("text")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("fill", "#2c3e50")
        .style("font-weight", "500");
    
    yAxis.selectAll("line")
        .style("stroke", "#ddd");
    
    yAxis.select(".domain")
        .style("stroke", "#ccc");
    
    // Etiqueta del eje X mejorada
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .style("text-anchor", "middle")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50")
        .text("Número de Títulos");
    
    console.log('Gráfico de géneros completado');
}

// 4. Nuevo gráfico de distribución por tipo de contenido
function createContentTypeChart() {
    const container = d3.select("#content-type-viz");
    if (container.empty()) {
        console.log('Container #content-type-viz no encontrado, saltando visualización');
        return;
    }
    
    container.html("");
    
    const margin = { top: 50, right: 120, bottom: 50, left: 120 }; // Aumentado right y left margins
    const baseDimensions = getResponsiveDimensions(400, 400, '#content-type-viz');
    const width = baseDimensions.width - margin.left - margin.right;
    const height = baseDimensions.height - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;
    
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .style("max-width", "100%")
        .style("height", "auto");
    
    const g = svg.append("g")
        .attr("transform", `translate(${(width + margin.left + margin.right) / 2}, ${(height + margin.top + margin.bottom) / 2})`);
    
    // Título
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-family", "Playfair Display, serif")
        .style("font-size", "18px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50")
        .text("Distribución por Tipo de Contenido");
    
    // Configurar escalas de color
    const colorScale = d3.scaleOrdinal()
        .domain(processedData.contentTypeData.map(d => d.type))
        .range(['#e74c3c', '#3498db', '#9b59b6', '#95a5a6']);
    
    // Configurar pie
    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);
    
    const arc = d3.arc()
        .innerRadius(radius * 0.5) // Aumentado de 0.4 a 0.5 para más espacio central
        .outerRadius(radius * 0.8);
    
    const outerArc = d3.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);
    
    // Crear arcos
    const arcs = g.selectAll(".arc")
        .data(pie(processedData.contentTypeData))
        .enter().append("g")
        .attr("class", "arc");
    
    // Crear paths de los arcos
    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => colorScale(d.data.type))
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("opacity", 0.9)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .style("opacity", 1)
                .attr("transform", "scale(1.05)");
            
            const percentage = ((d.data.count / data.length) * 100).toFixed(1);
            showTooltip(event, `
                <strong>${d.data.type}</strong><br>
                ${d.data.count} títulos<br>
                ${percentage}% del total
            `);
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .style("opacity", 0.9)
                .attr("transform", "scale(1)");
            hideTooltip();
        });
    
    // Agregar etiquetas
    arcs.append("text")
        .attr("transform", function(d) {
            const pos = outerArc.centroid(d);
            pos[0] = radius * 1.1 * (midAngle(d) < Math.PI ? 1 : -1); // Aumentado de 1 a 1.1
            return `translate(${pos})`;
        })
        .attr("dy", ".35em")
        .style("text-anchor", function(d) {
            return midAngle(d) < Math.PI ? "start" : "end";
        })
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50")
        .text(d => `${d.data.type} (${d.data.count})`);
    
    // Líneas conectoras
    arcs.append("polyline")
        .attr("stroke", "#999")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("points", function(d) {
            const pos = outerArc.centroid(d);
            pos[0] = radius * 1.05 * (midAngle(d) < Math.PI ? 1 : -1); // Ajustado para coincidir
            return [arc.centroid(d), outerArc.centroid(d), pos];
        });
    
    // Función auxiliar para calcular ángulo medio
    function midAngle(d) {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }
    
    // Estadísticas en el centro
    const statsGroup = g.append("g")
        .attr("class", "center-stats");
    
    statsGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.3em") // Ajustado de -0.5em a -0.3em
        .style("font-family", "Playfair Display, serif")
        .style("font-size", "20px") // Reducido de 24px a 20px
        .style("font-weight", "bold")
        .style("fill", "#2c3e50")
        .text(data.length);
    
    statsGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.2em") // Ajustado de 1em a 1.2em para mejor espaciado
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px") // Reducido de 14px a 12px
        .style("fill", "#7f8c8d")
        .text("Total títulos");
}

// 5. Scatter plot duración vs rating (función anterior con número actualizado)
function createDurationScatter() {
    const container = d3.select("#duration-viz");
    container.html("");
    
    const margin = { top: 50, right: 60, bottom: 80, left: 80 };
    const baseDimensions = getResponsiveDimensions(550, 400, '#duration-viz');
    const width = baseDimensions.width - margin.left - margin.right;
    const height = baseDimensions.height - margin.top - margin.bottom;
    
    // Ajustar márgenes para móviles
    if (window.innerWidth <= 768) {
        margin.left = Math.min(60, margin.left);
        margin.right = Math.min(40, margin.right);
        margin.bottom = Math.min(60, margin.bottom);
    }
    
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .style("max-width", "100%")
        .style("height", "auto");
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Filtrar y limitar datos para mejorar rendimiento
    const filteredData = processedData.durationRating
        .filter(d => d.duration && d.rating && d.votes > 1000) // Solo contenido con suficientes votos
        .sort((a, b) => b.votes - a.votes) // Ordenar por popularidad
        .slice(0, 300); // Limitar a 300 puntos máximo
    
    // Crear título mejorado
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-family", "Playfair Display, serif")
        .style("font-size", "18px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50")
        .text("Duración vs Rating");
    
    // Subtítulo
    svg.append("text")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "13px")
        .style("font-weight", "400")
        .style("fill", "#7f8c8d")
        .text("Top 300 títulos por popularidad");
    
    const x = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d.duration))
        .nice()
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d.rating))
        .nice()
        .range([height, 0]);
    
    // Escala para el tamaño de los puntos basada en votos
    const sizeScale = d3.scaleSqrt()
        .domain(d3.extent(filteredData, d => d.votes))
        .range([3, 8]);
    
    // Gradiente para los puntos
    const defs = svg.append("defs");
    const gradient = defs.append("radialGradient")
        .attr("id", "dotGradient")
        .attr("cx", "30%")
        .attr("cy", "30%");
    
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("style", "stop-color:#74b9ff;stop-opacity:0.9");
    
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("style", "stop-color:#0984e3;stop-opacity:0.7");
    
    // Crear puntos con mejor performance
    const dots = g.selectAll(".dot")
        .data(filteredData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.duration))
        .attr("cy", d => y(d.rating))
        .attr("r", 0) // Empezar con radio 0 para animación
        .attr("fill", "url(#dotGradient)")
        .attr("stroke", "#0984e3")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            // Destacar el punto
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", sizeScale(d.votes) * 1.5)
                .attr("stroke-width", 2);
            
            showTooltip(event, `
                <strong>${d.title}</strong><br>
                Duración: ${d.duration} min<br>
                Rating: ${d.rating}<br>
                Votos: ${d.votes.toLocaleString()}
            `);
        })
        .on("mouseout", function(event, d) {
            // Restaurar el punto
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", sizeScale(d.votes))
                .attr("stroke-width", 0.5);
            
            hideTooltip();
        });
    
    // Animar la aparición de los puntos de forma eficiente
    dots.transition()
        .duration(400)
        .delay((d, i) => Math.min(i * 2, 500)) // Limitar delay máximo
        .attr("r", d => sizeScale(d.votes));
    
    // Ejes con mejor estilo y posicionamiento
    const xAxis = g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => `${d}`));
    
    xAxis.selectAll("text")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("fill", "#7f8c8d");
    
    xAxis.selectAll("line")
        .style("stroke", "#ddd");
    
    xAxis.select(".domain")
        .style("stroke", "#ccc");
    
    const yAxis = g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d => `${d}★`));
    
    yAxis.selectAll("text")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("fill", "#7f8c8d");
    
    yAxis.selectAll("line")
        .style("stroke", "#ddd");
    
    yAxis.select(".domain")
        .style("stroke", "#ccc");
    
    // Etiquetas de ejes mejoradas
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 60)
        .style("text-anchor", "middle")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50")
        .text("Duración (minutos)");
    
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -55)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#2c3e50")
        .text("Rating IMDb");
    
    // Agregar línea de tendencia si hay suficientes datos
    if (filteredData.length > 10) {
        const regression = calculateLinearRegression(filteredData);
        if (regression) {
            const line = d3.line()
                .x(d => x(d.duration))
                .y(d => y(d.rating));
            
            const lineData = [
                { duration: d3.min(filteredData, d => d.duration), rating: regression.slope * d3.min(filteredData, d => d.duration) + regression.intercept },
                { duration: d3.max(filteredData, d => d.duration), rating: regression.slope * d3.max(filteredData, d => d.duration) + regression.intercept }
            ];
            
            g.append("path")
                .datum(lineData)
                .attr("fill", "none")
                .attr("stroke", "#e74c3c")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5")
                .attr("opacity", 0.6)
                .attr("d", line);
            
            // Leyenda para la línea de tendencia
            const legend = g.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${width - 120}, 20)`);
            
            legend.append("line")
                .attr("x1", 0)
                .attr("x2", 20)
                .attr("y1", 0)
                .attr("y2", 0)
                .attr("stroke", "#e74c3c")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5");
            
            legend.append("text")
                .attr("x", 25)
                .attr("y", 0)
                .attr("dy", "0.35em")
                .style("font-family", "Inter, sans-serif")
                .style("font-size", "11px")
                .style("fill", "#7f8c8d")
                .text("Tendencia");
        }
    }
    
    // Agregar información adicional
    const info = g.append("g")
        .attr("class", "chart-info")
        .attr("transform", `translate(10, 20)`);
    
}

// Función auxiliar para obtener dimensiones responsivas
function getResponsiveDimensions(baseWidth, baseHeight, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return { width: baseWidth, height: baseHeight };
    
    const containerWidth = container.getBoundingClientRect().width;
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024;
    
    let width, height;
    
    if (isMobile) {
        width = Math.min(containerWidth - 40, baseWidth * 0.7);
        height = baseHeight * 0.8;
    } else if (isTablet) {
        width = Math.min(containerWidth - 60, baseWidth * 0.85);
        height = baseHeight * 0.9;
    } else {
        width = Math.min(containerWidth - 80, baseWidth);
        height = baseHeight;
    }
    
    return { width: Math.max(300, width), height: Math.max(200, height) };
}

// Función para calcular regresión lineal simple
function calculateLinearRegression(data) {
    const n = data.length;
    if (n < 2) return null;
    
    const sumX = d3.sum(data, d => d.duration);
    const sumY = d3.sum(data, d => d.rating);
    const sumXY = d3.sum(data, d => d.duration * d.rating);
    const sumXX = d3.sum(data, d => d.duration * d.duration);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
}

// 6. Lista de top contenido mejorada
function createTopContentList() {
    const container = d3.select("#top-content-viz");
    container.html("");
    
    // Crear título para la sección
    container.append("h3")
        .style("color", "#2c3e50")
        .style("margin-bottom", "1rem")
        .style("font-family", "Playfair Display, serif")
        .text("🏆 Top Contenido Mejor Calificado");
    
    const listContainer = container.append("div")
        .style("max-height", "400px")
        .style("overflow-y", "auto")
        .style("padding-right", "8px");
    
    const items = listContainer.selectAll(".top-content-item")
        .data(processedData.topContent)
        .enter()
        .append("div")
        .attr("class", "top-content-item")
        .style("background", "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)")
        .style("border-radius", "8px")
        .style("padding", "1rem")
        .style("margin-bottom", "0.75rem")
        .style("border-left", "4px solid #74b9ff")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")
        .style("transition", "transform 0.2s ease")
        .on("mouseover", function() {
            d3.select(this).style("transform", "translateY(-2px)");
        })
        .on("mouseout", function() {
            d3.select(this).style("transform", "translateY(0px)");
        });

    // Título y tipo de contenido
    const headerDiv = items.append("div")
        .style("display", "flex")
        .style("justify-content", "space-between")
        .style("align-items", "flex-start")
        .style("margin-bottom", "0.5rem");
    
    headerDiv.append("h4")
        .style("color", "#2c3e50")
        .style("margin", "0")
        .style("font-family", "Playfair Display, serif")
        .style("font-size", "1.1rem")
        .text(d => d.title);
    
    headerDiv.append("span")
        .style("background", d => d.contentType === 'Movie' ? '#e74c3c' : d.contentType === 'TV Series' ? '#3498db' : '#9b59b6')
        .style("color", "white")
        .style("padding", "2px 8px")
        .style("border-radius", "12px")
        .style("font-size", "0.75rem")
        .style("font-weight", "600")
        .text(d => d.contentType || 'Movie');
    
    // Rating y estadísticas
    items.append("div")
        .style("display", "flex")
        .style("gap", "1rem")
        .style("margin", "0.5rem 0")
        .style("color", "#666")
        .style("font-size", "0.9rem")
        .html(d => {
            const year = d.year ? d.year : 'N/A';
            const endYear = d.endYear && d.endYear !== d.year ? `-${d.endYear}` : '';
            const duration = d.duration ? `${d.duration} min` : 'N/A';
            return `
                <span style="font-weight: 600; color: #f39c12;">⭐ ${d.rating}</span>
                <span>📅 ${year}${endYear}</span>
                <span>⏱️ ${duration}</span>
                <span>🗳️ ${d.votes.toLocaleString()}</span>
            `;
        });
    
    // Géneros
    items.append("div")
        .style("margin", "0.5rem 0")
        .style("color", "#666")
        .html(d => `<strong>🎭 Géneros:</strong> ${d.genres.slice(0, 3).join(', ')}`);
    
    // Directores y actores (si están disponibles)
    items.filter(d => d.directores && d.directores.length > 0)
        .append("div")
        .style("margin", "0.25rem 0")
        .style("color", "#666")
        .style("font-size", "0.85rem")
        .html(d => `<strong>🎬 Director(es):</strong> ${d.directores.slice(0, 2).join(', ')}`);
    
    items.filter(d => d.actores && d.actores.length > 0)
        .append("div")
        .style("margin", "0.25rem 0")
        .style("color", "#666")
        .style("font-size", "0.85rem")
        .html(d => `<strong>🎭 Actores:</strong> ${d.actores.slice(0, 3).join(', ')}`);
    
    // Descripción
    items.append("p")
        .style("margin-top", "0.75rem")
        .style("margin-bottom", "0")
        .style("color", "#555")
        .style("font-size", "0.85rem")
        .style("line-height", "1.4")
        .style("font-style", "italic")
        .text(d => d.description ? d.description.substring(0, 120) + "..." : "Sin descripción disponible");
}

// 7. Configurar visualización interactiva
function setupInteractiveViz() {
    const genreFilter = d3.select("#genre-filter");
    const ratingRange = d3.select("#rating-range");
    const ratingValue = d3.select("#rating-value");
    
    // Poblar selector de géneros
    const allGenres = [...new Set(data.flatMap(d => d.genres))].sort();
    genreFilter.selectAll("option")
        .data(allGenres)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);
    
    // Configurar eventos
    ratingRange.on("input", function() {
        ratingValue.text(this.value);
        updateInteractiveViz();
    });
    
    genreFilter.on("change", updateInteractiveViz);
    
    // Crear visualización inicial
    updateInteractiveViz();
}

// Actualizar visualización interactiva - Mejorado
function updateInteractiveViz() {
    const selectedGenre = d3.select("#genre-filter").property("value");
    const minRating = +d3.select("#rating-range").property("value");
    
    let filteredData = data.filter(d => d.rating >= minRating);
    
    if (selectedGenre !== "all") {
        filteredData = filteredData.filter(d => d.genres.includes(selectedGenre));
    }
    
    const container = d3.select("#interactive-viz");
    container.html("");
    
    if (filteredData.length === 0) {
        container.append("div")
            .attr("class", "loading")
            .text("No hay datos que coincidan con los filtros seleccionados");
        return;
    }
    
    // Dimensiones responsivas para el gráfico
    const containerWidth = container.node().getBoundingClientRect().width;
    const margin = { top: 30, right: 40, bottom: 60, left: 60 };
    const width = Math.max(400, containerWidth - 40) - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .style("max-width", "100%")
        .style("height", "auto");
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Título del gráfico
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .text("Distribución por Rating");
    
    // Agrupar por rating (redondeado)
    const ratingGroups = d3.rollup(
        filteredData,
        v => v.length,
        d => Math.round(d.rating * 2) / 2 // Redondear a 0.5
    );
    
    const ratingData = Array.from(ratingGroups, ([rating, count]) => ({ rating, count }))
        .sort((a, b) => a.rating - b.rating);
    
    const x = d3.scaleBand()
        .domain(ratingData.map(d => d.rating))
        .range([0, width])
        .padding(0.15);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(ratingData, d => d.count)])
        .nice()
        .range([height, 0]);
    
    // Gradiente para las barras
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "interactiveBarGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
    
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("style", "stop-color:#4facfe;stop-opacity:1");
    
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("style", "stop-color:#00f2fe;stop-opacity:1");
    
    // Crear barras
    g.selectAll(".interactive-bar")
        .data(ratingData)
        .enter().append("rect")
        .attr("class", "interactive-bar")
        .attr("x", d => x(d.rating))
        .attr("width", x.bandwidth())
        .attr("y", height)
        .attr("height", 0)
        .attr("fill", "url(#interactiveBarGradient)")
        .on("mouseover", function(event, d) {
            showTooltip(event, `Rating: ${d.rating}<br>Cantidad: ${d.count}`);
        })
        .on("mouseout", hideTooltip)
        .transition()
        .duration(600)
        .delay((d, i) => i * 50)
        .attr("y", d => y(d.count))
        .attr("height", d => height - y(d.count));
    
    // Ejes con estilos
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px");
    
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px");
    
    // Etiquetas de los ejes
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Cantidad de Títulos");
    
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style("text-anchor", "middle")
        .text("Rating");
    
    // Actualizar Top 10
    updateTop10List(filteredData, selectedGenre);
}

// Función para actualizar el Top 10 - Mejorada con dataset limpio
function updateTop10List(filteredData, selectedGenre) {
    const top10Container = d3.select("#top-10-list");
    const titleElement = d3.select("#top-10-title");
    
    // Actualizar título
    const genreText = selectedGenre === "all" ? "Todos los Géneros" : selectedGenre;
    titleElement.text(`🏆 Top 10 - ${genreText}`);
    
    // Obtener top 10 ordenado por rating y luego por votos
    const top10Data = filteredData
        .filter(d => d.votes > 100) // Filtrar contenido con votos suficientes
        .sort((a, b) => {
            // Primero por rating, luego por votos
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.votes - a.votes;
        })
        .slice(0, 10);
    
    // Limpiar contenedor
    top10Container.html("");
    
    if (top10Data.length === 0) {
        top10Container.append("div")
            .attr("class", "no-results")
            .text("No hay suficientes títulos para mostrar un Top 10");
        return;
    }
    
    // Crear lista de elementos sin estilos inline
    const listItems = top10Container.selectAll(".top10-item")
        .data(top10Data)
        .enter()
        .append("div")
        .attr("class", "top10-item");
    
    // Número de ranking
    listItems.append("div")
        .attr("class", "ranking-number")
        .text((d, i) => `#${i + 1}`);
    
    // Contenido principal
    const contentDiv = listItems.append("div")
        .attr("class", "item-content");
    
    // Título con tipo de contenido
    const titleDiv = contentDiv.append("div")
        .attr("class", "item-title-container")
        .style("display", "flex")
        .style("justify-content", "space-between")
        .style("align-items", "center");
    
    titleDiv.append("div")
        .attr("class", "item-title")
        .text(d => d.title);
    
    titleDiv.append("span")
        .attr("class", "content-type-badge")
        .style("background", d => d.contentType === 'Movie' ? '#e74c3c' : d.contentType === 'TV Series' ? '#3498db' : '#9b59b6')
        .style("color", "white")
        .style("padding", "2px 6px")
        .style("border-radius", "8px")
        .style("font-size", "0.7rem")
        .style("font-weight", "600")
        .text(d => d.contentType === 'Movie' ? '🎬' : d.contentType === 'TV Series' ? '📺' : '🎭');
    
    // Información adicional mejorada
    contentDiv.append("div")
        .attr("class", "item-info")
        .html(d => {
            const year = d.year ? d.year : 'N/A';
            const endYear = d.endYear && d.endYear !== d.year ? `-${d.endYear}` : '';
            const duration = d.duration ? `${d.duration} min` : 'N/A';
            const genres = d.genres.slice(0, 2).join(', '); // Mostrar solo los primeros 2 géneros
            return `${year}${endYear} • ${duration} • ${genres}`;
        });
    
    // Directores (si están disponibles)
    contentDiv.selectAll(null)
        .data(d => d.directores && d.directores.length > 0 ? [d] : [])
        .enter()
        .append("div")
        .attr("class", "item-director")
        .style("font-size", "0.8rem")
        .style("color", "#666")
        .style("margin-top", "2px")
        .html(d => `🎬 ${d.directores.slice(0, 2).join(', ')}`);
    
    // Rating y votos
    const ratingDiv = listItems.append("div")
        .attr("class", "item-rating");
    
    ratingDiv.append("div")
        .html(d => `★ ${d.rating}`);
    
    ratingDiv.append("div")
        .text(d => `${d.votes.toLocaleString()} votos`);
}

// Funciones auxiliares para tooltips
function showTooltip(event, content) {
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    
    tooltip.transition()
        .duration(200)
        .style("opacity", .9);
    
    tooltip.html(content)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function hideTooltip() {
    d3.selectAll(".tooltip").remove();
}

// Intersection Observer para animaciones de scroll
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    document.querySelectorAll('.story-section').forEach(section => {
        observer.observe(section);
    });
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando aplicación...');
    setupScrollAnimations();
    loadData();
    
    // Agregar listener para redimensionamiento responsivo
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            // Solo recrear visualizaciones si el cambio es significativo
            const newWidth = window.innerWidth;
            if (Math.abs(newWidth - (window.lastWidth || newWidth)) > 100) {
                console.log('Redimensionando visualizaciones...');
                if (data.length > 0) {
                    createVisualizations();
                }
                window.lastWidth = newWidth;
            }
        }, 300);
    });
    
    window.lastWidth = window.innerWidth;
});