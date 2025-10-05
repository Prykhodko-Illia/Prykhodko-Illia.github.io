let scene, camera, renderer, earth, controls, stars, distantStars, nebulaClouds;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotation = { x: 0, y: 0 };
let zoomLevel = 1.5;
const ZOOM_THRESHOLD = 2.3;
let isAnimating = false;
let animationTarget = null;
let currentMode = '250m';
let currentYear = 2024;
let isLoadingImage = false;
let lastFetchPosition = null;
let debounceTimer = null;
let is2DMode = false;

const textures = {
    '250m': 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
    '1km': 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
    '2km': 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg'
};

function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

function shortestAnglePath(from, to) {
    from = normalizeAngle(from);
    to = normalizeAngle(to);
    
    let delta = to - from;
    
    if (delta > Math.PI) {
        delta -= 2 * Math.PI;
    } else if (delta < -Math.PI) {
        delta += 2 * Math.PI;
    }
    
    return from + delta;
}

function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    const starColors = [
        { r: 1.0, g: 1.0, b: 1.0 },
        { r: 0.8, g: 0.9, b: 1.0 },
        { r: 1.0, g: 0.95, b: 0.8 },
        { r: 0.9, g: 0.95, b: 1.0 },
        { r: 1.0, g: 0.9, b: 0.85 }
    ];
    
    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const radius = 40 + Math.random() * 120;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        const colorChoice = starColors[Math.floor(Math.random() * starColors.length)];
        colors[i3] = colorChoice.r;
        colors[i3 + 1] = colorChoice.g;
        colors[i3 + 2] = colorChoice.b;
        
        sizes[i] = Math.random() * 1.5 + 0.3;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const starMaterial = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });
    
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    
    const distantStarGeometry = new THREE.BufferGeometry();
    const distantCount = 5000;
    const distantPositions = new Float32Array(distantCount * 3);
    const distantColors = new Float32Array(distantCount * 3);
    
    for (let i = 0; i < distantCount; i++) {
        const i3 = i * 3;
        const radius = 150 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        distantPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        distantPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        distantPositions[i3 + 2] = radius * Math.cos(phi);
        
        const brightness = Math.random() * 0.5 + 0.3;
        distantColors[i3] = brightness;
        distantColors[i3 + 1] = brightness;
        distantColors[i3 + 2] = brightness;
    }
    
    distantStarGeometry.setAttribute('position', new THREE.BufferAttribute(distantPositions, 3));
    distantStarGeometry.setAttribute('color', new THREE.BufferAttribute(distantColors, 3));
    
    const distantStarMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
    });
    
    distantStars = new THREE.Points(distantStarGeometry, distantStarMaterial);
    scene.add(distantStars);
    
    const nebulaGeometry = new THREE.BufferGeometry();
    const nebulaCount = 800;
    const nebulaPositions = new Float32Array(nebulaCount * 3);
    const nebulaColors = new Float32Array(nebulaCount * 3);
    const nebulaSizes = new Float32Array(nebulaCount);
    
    const nebulaColorPalette = [
        { r: 0.4, g: 0.2, b: 0.6 },
        { r: 0.2, g: 0.4, b: 0.7 },
        { r: 0.5, g: 0.3, b: 0.8 },
        { r: 0.3, g: 0.5, b: 0.9 }
    ];
    
    for (let i = 0; i < nebulaCount; i++) {
        const i3 = i * 3;
        const radius = 60 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        nebulaPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        nebulaPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        nebulaPositions[i3 + 2] = radius * Math.cos(phi);
        
        const nebulaColor = nebulaColorPalette[Math.floor(Math.random() * nebulaColorPalette.length)];
        const intensity = Math.random() * 0.3 + 0.1;
        nebulaColors[i3] = nebulaColor.r * intensity;
        nebulaColors[i3 + 1] = nebulaColor.g * intensity;
        nebulaColors[i3 + 2] = nebulaColor.b * intensity;
        
        nebulaSizes[i] = Math.random() * 8 + 3;
    }
    
    nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
    nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
    nebulaGeometry.setAttribute('size', new THREE.BufferAttribute(nebulaSizes, 1));
    
    const nebulaMaterial = new THREE.PointsMaterial({
        size: 5,
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });
    
    nebulaClouds = new THREE.Points(nebulaGeometry, nebulaMaterial);
    scene.add(nebulaClouds);
}

function animateStars() {
    if (stars) {
        const time = Date.now() * 0.0001;
        const sizes = stars.geometry.attributes.size.array;
        
        for (let i = 0; i < sizes.length; i++) {
            const baseSize = 0.3 + Math.random() * 1.5;
            sizes[i] = baseSize + Math.sin(time * 2 + i) * 0.2;
        }
        
        stars.geometry.attributes.size.needsUpdate = true;
        stars.rotation.y += 0.0001;
    }
    
    if (distantStars) {
        distantStars.rotation.y += 0.00005;
        distantStars.rotation.x += 0.00002;
    }
    
    if (nebulaClouds) {
        nebulaClouds.rotation.y -= 0.00008;
        nebulaClouds.rotation.z += 0.00003;
    }
}

function init() {
    const canvas = document.getElementById('earth-canvas');
    const container = canvas.parentElement;

    document.getElementById('loading-overlay').style.display = 'none';

    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = Math.max(2.1, 5 / zoomLevel);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const geometry = new THREE.SphereGeometry(2, 64, 64);
    
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
        textures[currentMode],
        () => {
            render();
        }
    );
    
    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpScale: 0.05,
    });

    earth = new THREE.Mesh(geometry, material);
    rotation = { x: 0, y: 0 };
    earth.rotation.x = rotation.x;
    earth.rotation.y = rotation.y;
    scene.add(earth);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
  
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    createStarfield();

    setupEventListeners();
    updateCoordinates();
    document.getElementById('zoom-level').textContent = zoomLevel.toFixed(2);
    animate();
}

function changeTexture(mode) {
    currentMode = mode;
    if (zoomLevel < ZOOM_THRESHOLD) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(textures[mode], (texture) => {
            earth.material.map = texture;
            earth.material.needsUpdate = true;
            render();
        });
    } else {
        document.getElementById('loading-overlay').style.display = 'flex';
        if (is2DMode) {
            document.getElementById('earth-image').style.display = 'none';
        }
        fetchAPIImage();
    }
}

async function fetchAPIImage(exactLat = null, exactLon = null) {
    if (isLoadingImage) {
        console.log('Already loading, skipping request');
        return;
    }
    
    isLoadingImage = true;
    
    let lat, lon;
    
    if (exactLat !== null && exactLon !== null) {
        lat = exactLat;
        lon = exactLon;
    } else {
        lat = (rotation.x * 180 / Math.PI);
        lon = (-rotation.y * 180 / Math.PI) - 90;
        
        while (lon > 180) lon -= 360;
        while (lon < -180) lon += 360;
    }

    const year = currentYear;
    const date = `${year}-01-01`;
    
    let apiZoom;
    if (zoomLevel < 4) {
        apiZoom = 4;
    } else {
        apiZoom = 6;
    }
    
    const maxZoomByType = {
        '2km': 5,
        '1km': 6,
        '250m': 8
    };
    
    const maxApiZoom = maxZoomByType[currentMode] || 8;
    apiZoom = Math.min(maxApiZoom, apiZoom);
    
    const decimalPlaces = Math.min(6, Math.max(2, Math.floor(apiZoom * 0.5) + 2));

    const data = {
        lat: lat.toFixed(decimalPlaces),
        lon: lon.toFixed(decimalPlaces),
        time: date,
        type: currentMode,
        zoom: apiZoom
    };

    console.log('Fetching API image with:', data, 'Current position:', {lat, lon}, 'ZoomLevel:', zoomLevel, 'API Zoom:', apiZoom);

    lastFetchPosition = { lat: rotation.x, lon: rotation.y, zoom: zoomLevel };

    try {
        const response = await fetch("https://nasa-fetcher.onrender.com/at", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error("HTTP error " + response.status);

        const blob = await response.blob();
        const imgURL = URL.createObjectURL(blob);
        
        if (!is2DMode) {
            switchTo2DMode();
        }
        const img = document.getElementById('earth-image');
        img.onload = () => {
            document.getElementById('earth-image').style.display = 'block';
            document.getElementById('loading-overlay').style.display = 'none';
            isLoadingImage = false;
        };
        img.src = imgURL;

    } catch (err) {
        console.error("Error fetching image:", err);
        document.getElementById('loading-overlay').style.display = 'none';
        isLoadingImage = false;
    }
}

function switchTo2DMode() {
    if (is2DMode) return;
    is2DMode = true;
    document.getElementById('earth-canvas').style.display = 'none';
    document.getElementById('earth-image').style.display = 'none';
}

function switchTo3DMode() {
    if (!is2DMode) return;
    is2DMode = false;
    document.getElementById('earth-canvas').style.display = 'block';
    document.getElementById('earth-image').style.display = 'none';
    render();
}

function checkZoomMode() {
    if (zoomLevel >= ZOOM_THRESHOLD) {
        if (!lastFetchPosition || 
            Math.abs(lastFetchPosition.zoom - zoomLevel) > 0.3 ||
            Math.abs(lastFetchPosition.lat - rotation.x) > 0.05 ||
            Math.abs(lastFetchPosition.lon - rotation.y) > 0.05) {
            
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            
            debounceTimer = setTimeout(() => {
                if (!isLoadingImage && !isDragging && zoomLevel >= ZOOM_THRESHOLD) {
                    document.getElementById('loading-overlay').style.display = 'flex';
                    if (is2DMode) {
                        document.getElementById('earth-image').style.display = 'none';
                    }
                    fetchAPIImage();
                }
            }, 300);
        }
    } else {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        if (lastFetchPosition || is2DMode) {
            lastFetchPosition = null;
            if (is2DMode) {
                switchTo3DMode();
            }
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(textures[currentMode], (texture) => {
                earth.material.map = texture;
                earth.material.needsUpdate = true;
                render();
            });
        }
    }
}

function setupEventListeners() {
    const canvas = document.getElementById('earth-canvas');
    const container = canvas.parentElement;

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        isAnimating = false;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    container.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            const rotationSensitivity = 0.005 / Math.pow(zoomLevel, 0.6);

            rotation.y += deltaX * rotationSensitivity;
            rotation.x += deltaY * rotationSensitivity;

            rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.x));
            rotation.y = normalizeAngle(rotation.y);

            if (!is2DMode) {
                earth.rotation.y = rotation.y;
                earth.rotation.x = rotation.x;
            }

            previousMousePosition = { x: e.clientX, y: e.clientY };
            updateCoordinates();
        }
    });

    container.addEventListener('mouseup', () => {
        if (isDragging && zoomLevel >= ZOOM_THRESHOLD && is2DMode) {
            document.getElementById('loading-overlay').style.display = 'flex';
            document.getElementById('earth-image').style.display = 'none';
            fetchAPIImage();
        } else if (isDragging && zoomLevel >= ZOOM_THRESHOLD) {
            checkZoomMode();
        }
        isDragging = false;
    });

    container.addEventListener('mouseleave', () => {
        if (isDragging && zoomLevel >= ZOOM_THRESHOLD && is2DMode) {
            document.getElementById('loading-overlay').style.display = 'flex';
            document.getElementById('earth-image').style.display = 'none';
            fetchAPIImage();
        } else if (isDragging && zoomLevel >= ZOOM_THRESHOLD) {
            checkZoomMode();
        }
        isDragging = false;
    });

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        if (isAnimating) return;
        
        const sensitivity = 0.001 / (zoomLevel * 0.3 + 0.7);
        const delta = e.deltaY * -sensitivity;
        const oldZoomLevel = zoomLevel;
        zoomLevel = Math.max(0.5, Math.min(8, zoomLevel + delta));
        
        if (!is2DMode) {
            camera.position.z = Math.max(2.1, 5 / zoomLevel);
        }
        
        checkZoomMode();
        
        document.getElementById('zoom-level').textContent = zoomLevel.toFixed(2);
        updateCoordinates();
    });

    window.addEventListener('resize', onWindowResize);

      const dateSlider = document.getElementById('date-slider');
    const dateDisplay = document.getElementById('current-date-display');
    const dateFormatToggle = document.getElementById('date-format-toggle');
    
    const START_DATE = new Date(1975, 0, 1);
    const END_DATE = new Date(2025, 9, 6);
    const TOTAL_DAYS = Math.floor((END_DATE - START_DATE) / (1000 * 60 * 60 * 24));
    
    dateSlider.max = TOTAL_DAYS;
    dateSlider.value = TOTAL_DAYS;
    
    function getDateFromSlider(dayOffset) {
        const date = new Date(START_DATE);
        date.setDate(date.getDate() + dayOffset);
        return date;
    }
    
    function updateSliderBackground() {
        const value = dateSlider.value;
        const max = dateSlider.max;
        const percentage = (value / max) * 100;
        const computedStyle = getComputedStyle(document.body);
        const primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
        const borderColor = computedStyle.getPropertyValue('--border-color').trim();
        dateSlider.style.background = `linear-gradient(to right, ${primaryColor} 0%, ${primaryColor} ${percentage}%, ${borderColor} ${percentage}%, ${borderColor} 100%)`;
    }
    
    function updateDateDisplay() {
        const dayOffset = parseInt(dateSlider.value);
        const date = getDateFromSlider(dayOffset);
        const useISO = dateFormatToggle.checked;
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        if (useISO) {
            const monthStr = month.toString().padStart(2, '0');
            const dayStr = day.toString().padStart(2, '0');
            dateDisplay.textContent = `${year}-${monthStr}-${dayStr}`;
        } else {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                'July', 'August', 'September', 'October', 'November', 'December'];
            dateDisplay.textContent = `${monthNames[month - 1]} ${day}, ${year}`;
        }
        
        updateSliderBackground();
    }
    
    dateSlider.addEventListener('input', updateDateDisplay);
    dateFormatToggle.addEventListener('change', updateDateDisplay);
    
    updateDateDisplay();

    const yearSlider = document.getElementById('year');
    const yearDisplay = document.getElementById('current-year-display');
    yearSlider.addEventListener('input', (e) => {
        currentYear = parseInt(e.target.value);
        yearDisplay.textContent = currentYear;
        if (zoomLevel >= ZOOM_THRESHOLD) {
            document.getElementById('loading-overlay').style.display = 'flex';
            if (is2DMode) {
                document.getElementById('earth-image').style.display = 'none';
            }
            fetchAPIImage();
        }
    });

    const themeIcons = document.querySelectorAll('.style-icon');
    themeIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const theme = icon.getAttribute('data-theme');
            
            themeIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            
            document.body.classList.remove('theme-space', 'theme-spaceship');
            document.body.classList.add(`theme-${theme}`);
            
            updateSliderBackground();
        });
    });

    const modeRadios = document.querySelectorAll('input[name="mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            changeTexture(e.target.value);
        });
    });

    const goButton = document.getElementById('go-button');
    goButton.addEventListener('click', () => {
        const latInput = document.getElementById('lat-input');
        const lonInput = document.getElementById('lon-input');
        
        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);
        
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            const targetZoom = 4;
            
            animateToCoordinates(lat, lon, targetZoom, true);
        } else {
            alert('Please enter valid coordinates.\nLatitude: -90 to 90\nLongitude: -180 to 180');
        }
    });

    const latInput = document.getElementById('lat-input');
    const lonInput = document.getElementById('lon-input');
    
    latInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        
        if (pastedText.includes(',')) {
            const parts = pastedText.split(',').map(part => part.trim());
            if (parts.length === 2) {
                const lat = parseFloat(parts[0]);
                const lon = parseFloat(parts[1]);
                
                if (!isNaN(lat) && !isNaN(lon)) {
                    latInput.value = parts[0];
                    lonInput.value = parts[1];
                    return;
                }
            }
        }
        
        latInput.value = pastedText;
    });
}

function animateToCoordinates(lat, lon, targetZoom, shouldFetchAPI = false) {
    const inputLat = lat;
    const inputLon = lon;
    
    lat = lat;
    lon = -(lon + 90);
    const targetRotX = lat * Math.PI / 180;
    const targetRotY = lon * Math.PI / 180;
    const finalTargetRotY = shortestAnglePath(rotation.y, targetRotY);
    
    isAnimating = true;
    animationTarget = {
        startRotX: rotation.x,
        startRotY: rotation.y,
        startZoom: zoomLevel,
        targetRotX: targetRotX,
        targetRotY: finalTargetRotY,
        targetZoom: targetZoom,
        progress: 0,
        duration: 1500,
        exactLat: shouldFetchAPI ? inputLat : null,
        exactLon: shouldFetchAPI ? inputLon : null
    };
}

function updateAnimation(deltaTime) {
    if (!isAnimating || !animationTarget) return;
    
    animationTarget.progress += deltaTime / animationTarget.duration;
    
    if (animationTarget.progress >= 1) {
        animationTarget.progress = 1;
        isAnimating = false;
    }
    
    const t = easeInOutCubic(animationTarget.progress);
    
    rotation.x = animationTarget.startRotX + (animationTarget.targetRotX - animationTarget.startRotX) * t;
    rotation.y = animationTarget.startRotY + (animationTarget.targetRotY - animationTarget.startRotY) * t;
    zoomLevel = animationTarget.startZoom + (animationTarget.targetZoom - animationTarget.startZoom) * t;
    
    if (animationTarget.progress >= 1) {
        rotation.y = normalizeAngle(rotation.y);
        
        if (zoomLevel >= ZOOM_THRESHOLD) {
            if (animationTarget.exactLat !== null && animationTarget.exactLon !== null) {
                document.getElementById('loading-overlay').style.display = 'flex';
                if (is2DMode) {
                    document.getElementById('earth-image').style.display = 'none';
                }
                fetchAPIImage(animationTarget.exactLat, animationTarget.exactLon);
            } else {
                checkZoomMode();
            }
        }
    }
    
    if (!is2DMode) {
        earth.rotation.x = rotation.x;
        earth.rotation.y = rotation.y;
        camera.position.z = Math.max(2.1, 5 / zoomLevel);
    }
    
    document.getElementById('zoom-level').textContent = zoomLevel.toFixed(2);
    updateCoordinates();
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateCoordinates() {
    const lat = (rotation.x * 180 / Math.PI).toFixed(2);
    let lon = (-rotation.y * 180 / Math.PI) - 90;
    
    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;
    
    document.getElementById('lat-display').textContent = lat;
    document.getElementById('lon-display').textContent = lon.toFixed(2);
}

function onWindowResize() {
    const container = document.querySelector('.sphere-block');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    updateAnimation(deltaTime);
    animateStars();
    if (!is2DMode) {
        render();
    }
}

function render() {
    renderer.render(scene, camera);
}

init();
