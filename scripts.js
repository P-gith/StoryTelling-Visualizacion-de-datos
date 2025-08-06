// Variables globales
let data = [];
let processedData = {};

// Función para cargar y procesar los datos
async function loadData() {
    try {
        const rawData = await d3.csv("n_movies.csv");
        
        // Procesar los datos
        data = rawData.map(d => {
            // Limpiar géneros - remover comillas y dividir por comas
            let genres = [];
            if (d.genre) {
                // Remover comillas dobles al inicio y final
                let genreString = d.genre.replace(/^"/, '').replace(/"$/, '');
                // Dividir por comas y limpiar espacios
                genres = genreString.split(',').map(g => g.trim()).filter(g => g.length > 0);
            }
            
            // Convertir rating a número
            const rating = d.rating && d.rating !== '' ? +d.rating : null;
            
            // Extraer duración en minutos
            let duration = null;
            if (d.duration && d.duration.includes('min')) {
                const match = d.duration.match(/(\d+)/);
                if (match) duration = +match[1];
            }
            
            // Limpiar votos - remover comillas y comas
            let votes = 0;
            if (d.votes) {
                const votesString = d.votes.replace(/[",]/g, '');
                votes = +votesString || 0;
            }
            
            // Extraer año de inicio
            let year = null;
            if (d.year) {
                const yearMatch = d.year.match(/(\d{4})/);
                if (yearMatch) year = +yearMatch[1];
            }
            
            return {
                title: d.title,
                year: year,
                certificate: d.certificate,
                duration: duration,
                genres: genres,
                primaryGenre: genres[0] || 'Unknown',
                rating: rating,
                description: d.description,
                votes: votes,
                stars: d.stars
            };
        }).filter(d => d.rating !== null); // Filtrar elementos sin rating
        
        console.log('Datos cargados antes de limpiar:', data.length, 'elementos');
        
        // Limpiar datos duplicados
        data = removeDuplicates(data);
        
        // Limpiar datos inconsistentes
        data = cleanInconsistentData(data);
        
        console.log('Datos después de limpiar duplicados e inconsistencias:', data.length, 'elementos');
        
        // Mostrar estadísticas de limpieza
        showDataCleaningStats();
        
        processData();
        createVisualizations();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showError('Error al cargar los datos. Por favor, verifica que el archivo n_movies.csv esté disponible.');
    }
}

// Función para eliminar duplicados del dataset
function removeDuplicates(data) {
    const seen = new Map();
    const cleaned = [];
    
    data.forEach(item => {
        // Crear una clave única basada en título y año (si está disponible)
        const key = `${item.title.toLowerCase().trim()}|${item.year || 'unknown'}`;
        
        if (!seen.has(key)) {
            seen.set(key, item);
            cleaned.push(item);
        } else {
            // Si encontramos un duplicado, mantenemos el que tenga más votos
            const existing = seen.get(key);
            if (item.votes > existing.votes) {
                // Reemplazar en el array cleaned
                const index = cleaned.findIndex(d => d === existing);
                if (index !== -1) {
                    cleaned[index] = item;
                    seen.set(key, item);
                }
            }
        }
    });
    
    console.log(`Eliminados ${data.length - cleaned.length} duplicados`);
    return cleaned;
}

// Función para limpiar datos inconsistentes
function cleanInconsistentData(data) {
    const cleaned = data.filter(item => {
        // Filtrar títulos vacíos o inválidos
        if (!item.title || item.title.trim() === '' || item.title.length < 2) {
            return false;
        }
        
        // Filtrar ratings fuera del rango válido
        if (item.rating < 1 || item.rating > 10) {
            return false;
        }
        
        // Filtrar duraciones negativas o extremadamente altas (más de 10 horas)
        if (item.duration && (item.duration < 0 || item.duration > 600)) {
            return false;
        }
        
        // Filtrar años fuera del rango razonable
        if (item.year && (item.year < 1900 || item.year > new Date().getFullYear() + 5)) {
            return false;
        }
        
        return true;
    });
    
    console.log(`Eliminados ${data.length - cleaned.length} elementos con datos inconsistentes`);
    return cleaned;
}

// Función para mostrar estadísticas de limpieza de datos
function showDataCleaningStats() {
    // Verificar calidad de los datos
    const statsContainer = document.querySelector('#overview-viz');
    if (statsContainer) {
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.9);
            padding: 10px;
            border-radius: 8px;
            font-size: 12px;
            color: #2c3e50;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 200px;
            z-index: 1000;
        `;
        
        const missingData = {
            duration: data.filter(d => !d.duration).length,
            year: data.filter(d => !d.year).length,
            genres: data.filter(d => !d.genres || d.genres.length === 0).length,
            description: data.filter(d => !d.description).length
        };
        
        statsDiv.innerHTML = `
            <strong>📊 Calidad de Datos</strong><br>
            <small>
                Sin duración: ${missingData.duration}<br>
                Sin año: ${missingData.year}<br>
                Sin géneros: ${missingData.genres}<br>
                Sin descripción: ${missingData.description}<br>
                <strong>Total limpio: ${data.length}</strong>
            </small>
        `;
        
        // Remover estadísticas anteriores si existen
        const existing = statsContainer.querySelector('.data-stats');
        if (existing) existing.remove();
        
        statsDiv.className = 'data-stats';
        statsContainer.appendChild(statsDiv);
        
        // Auto-remover después de 10 segundos
        setTimeout(() => {
            if (statsDiv.parentNode) {
                statsDiv.remove();
            }
        }, 10000);
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
    
    // Estadísticas generales
    const stats = [
        { label: "Total de Títulos", value: data.length },
        { label: "Rating Promedio", value: d3.mean(data, d => d.rating).toFixed(1) },
        { label: "Géneros Únicos", value: new Set(data.flatMap(d => d.genres)).size },
        { label: "Rating Máximo", value: d3.max(data, d => d.rating).toFixed(1) }
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
        .attr("fill", "url(#cardGradient)");
    
    cards.append("text")
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
    
    // Ejes
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", 35)
        .style("text-anchor", "middle")
        .text("Rating IMDb");
    
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -25)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
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

// 4. Scatter plot duración vs rating
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

// 5. Lista de top contenido
function createTopContentList() {
    const container = d3.select("#top-content-viz");
    container.html("");
    
    const listContainer = container.append("div")
        .style("max-height", "400px")
        .style("overflow-y", "auto");
    
    const items = listContainer.selectAll(".top-content-item")
        .data(processedData.topContent)
        .enter()
        .append("div")
        .attr("class", "top-content-item");
    
    items.append("h4")
        .style("color", "#2c3e50")
        .style("margin-bottom", "0.5rem")
        .text(d => d.title);
    
    items.append("p")
        .style("margin", "0.25rem 0")
        .style("color", "#666")
        .html(d => `<strong>Rating:</strong> ${d.rating} ⭐ | <strong>Votos:</strong> ${d.votes.toLocaleString()}`);
    
    items.append("p")
        .style("margin", "0.25rem 0")
        .style("color", "#666")
        .html(d => `<strong>Género:</strong> ${d.primaryGenre} | <strong>Año:</strong> ${d.year || 'N/A'}`);
    
    items.append("p")
        .style("margin-top", "0.5rem")
        .style("color", "#555")
        .style("font-size", "0.9rem")
        .style("line-height", "1.4")
        .text(d => d.description ? d.description.substring(0, 150) + "..." : "Sin descripción disponible");
}

// 6. Configurar visualización interactiva
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

// Función para actualizar el Top 10 - Mejorada
// Función para actualizar el Top 10 - Mejorada
function updateTop10List(filteredData, selectedGenre) {
    const top10Container = d3.select("#top-10-list");
    const titleElement = d3.select("#top-10-title");
    
    // Actualizar título
    const genreText = selectedGenre === "all" ? "Todos los Géneros" : selectedGenre;
    titleElement.text(`Top 10 - ${genreText}`);
    
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
    
    // Título
    contentDiv.append("div")
        .attr("class", "item-title")
        .text(d => d.title);
    
    // Información adicional
    contentDiv.append("div")
        .attr("class", "item-info")
        .html(d => {
            const year = d.year ? d.year : 'N/A';
            const duration = d.duration ? `${d.duration} min` : 'N/A';
            const genres = d.genres.slice(0, 2).join(', '); // Mostrar solo los primeros 2 géneros
            return `${year} • ${duration} • ${genres}`;
        });
    
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