let scene, camera, renderer, earth, controls;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotation = { x: 0, y: 0 };
let zoomLevel = 1.5;
const ZOOM_THRESHOLD = 3.5;
let isAnimating = false;
let animationTarget = null;

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

function init() {
    const canvas = document.getElementById('earth-canvas');
    const container = canvas.parentElement;

    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 5 / zoomLevel;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const geometry = new THREE.SphereGeometry(2, 64, 64);
    
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
        'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
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

    setupEventListeners();
    updateCoordinates();
    document.getElementById('zoom-level').textContent = zoomLevel.toFixed(2);
    animate();
}

function setupEventListeners() {
    const canvas = document.getElementById('earth-canvas');

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        isAnimating = false;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            rotation.y += deltaX * 0.005;
            rotation.x += deltaY * 0.005;

            rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.x));
            rotation.y = normalizeAngle(rotation.y);

            earth.rotation.y = rotation.y;
            earth.rotation.x = rotation.x;

            previousMousePosition = { x: e.clientX, y: e.clientY };
            updateCoordinates();
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const sensitivity = 0.001 / (zoomLevel * 0.3 + 0.7);
        const delta = e.deltaY * -sensitivity;
        zoomLevel = Math.max(0.5, Math.min(8, zoomLevel + delta));
        camera.position.z = 5 / zoomLevel;
        
        document.getElementById('zoom-level').textContent = zoomLevel.toFixed(2);
        updateCoordinates();
    });

    window.addEventListener('resize', onWindowResize);

    // Date slider functionality
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

    // Theme switcher functionality
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

    // Coordinates functionality
    const goButton = document.getElementById('go-button');
    goButton.addEventListener('click', () => {
        const latInput = document.getElementById('lat-input');
        const lonInput = document.getElementById('lon-input');
        
        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);
        
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            const latStr = latInput.value.trim();
            const lonStr = lonInput.value.trim();
            
            const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
            const lonDecimals = lonStr.includes('.') ? lonStr.split('.')[1].length : 0;
            const maxDecimals = Math.max(latDecimals, lonDecimals);
            
            const targetZoom = Math.min(8, 1.5 + maxDecimals * 0.8);
            
            animateToCoordinates(lat, lon, targetZoom);
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

function animateToCoordinates(lat, lon, targetZoom) {
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
        duration: 1500
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
    }
    
    earth.rotation.x = rotation.x;
    earth.rotation.y = rotation.y;
    camera.position.z = 5 / zoomLevel;
    
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
    render();
}

function render() {
    renderer.render(scene, camera);
}

init();
