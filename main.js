import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

// Camera
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(5, 2, 8);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = false;
controls.enableRotate = false; // DISABLE rotation - scroll controls it
controls.minDistance = 4;
controls.maxDistance = 15;
controls.maxPolarAngle = Math.PI / 2 + 0.2;
controls.target.set(0, 0.5, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(5, 8, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 50;
mainLight.shadow.camera.left = -10;
mainLight.shadow.camera.right = 10;
mainLight.shadow.camera.top = 10;
mainLight.shadow.camera.bottom = -10;
scene.add(mainLight);

// BMW Blue rim lights
const rimLight1 = new THREE.PointLight(0x1c69d4, 2, 20);
rimLight1.position.set(-3, 2, 3);
scene.add(rimLight1);

const rimLight2 = new THREE.PointLight(0x4a9eff, 1.5, 20);
rimLight2.position.set(3, 2, -3);
scene.add(rimLight2);

// Spotlight from top
const spotLight = new THREE.SpotLight(0xffffff, 1, 30, Math.PI / 6, 0.5);
spotLight.position.set(0, 10, 0);
spotLight.castShadow = true;
scene.add(spotLight);

// Ground plane with garage texture
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grid helper for garage feel
const gridHelper = new THREE.GridHelper(50, 50, 0x1c69d4, 0x2a2a2a);
gridHelper.material.opacity = 0.3;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Load BMW E30 model
let car = null;
let carGroup = new THREE.Group();
scene.add(carGroup);

const loader = new GLTFLoader();
loader.load(
    '/low_poly_car_-_bmw_e30_1985_white.glb',
    (gltf) => {
        car = gltf.scene;

        // Center and scale model
        const box = new THREE.Box3().setFromObject(car);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        car.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        car.scale.setScalar(scale);

        // Enable shadows
        car.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Enhance materials
                if (child.material) {
                    child.material.envMapIntensity = 0.8;
                }
            }
        });

        carGroup.add(car);

        // Remove loading state
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');

        console.log('BMW E30 модель загружена');
    },
    (progress) => {
        const percent = (progress.loaded / progress.total * 100).toFixed(0);
        console.log(`Загрузка: ${percent}%`);
    },
    (error) => {
        console.error('Ошибка загрузки модели:', error);
    }
);

// Video element
const video = document.getElementById('video-overlay');
let videoPlaying = false;
let videoStartTime = 0;

// Scroll-based rotation
let scrollProgress = 0;
let targetRotation = 0;
const ROTATION_RANGE = Math.PI * 2; // 360 degrees

function updateScroll() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;

    const heroHeight = heroSection.offsetHeight;
    const scrollTop = window.scrollY;

    // Calculate scroll progress (0 to 1)
    scrollProgress = Math.max(0, Math.min(scrollTop / heroHeight, 1));

    // Map scroll to rotation
    targetRotation = scrollProgress * ROTATION_RANGE;

    console.log('Scroll:', scrollTop, 'Progress:', scrollProgress.toFixed(2), 'Rotation:', (targetRotation * 180 / Math.PI).toFixed(0) + '°');
}

// Video transition logic
function checkVideoTransition() {
    if (!car) return;

    // Normalize rotation to 0-2π range
    const normalizedRotation = ((carGroup.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // Check if car is facing back (around π radians, ±30° tolerance)
    const backAngle = Math.PI;
    const tolerance = Math.PI / 6; // 30 degrees
    const isBackFacing = Math.abs(normalizedRotation - backAngle) < tolerance;

    if (isBackFacing && !videoPlaying && scrollProgress > 0.4 && scrollProgress < 0.6) {
        // Start video
        videoPlaying = true;
        videoStartTime = Date.now();
        video.classList.add('active');
        video.currentTime = 0;
        video.play().catch(err => console.log('Autoplay blocked:', err));

        console.log('Video started');
    }

    // Stop video after 5 seconds
    if (videoPlaying && Date.now() - videoStartTime > 5000) {
        videoPlaying = false;
        video.classList.remove('active');
        video.pause();

        console.log('Video stopped');
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Smooth rotation interpolation
    if (carGroup) {
        carGroup.rotation.y += (targetRotation - carGroup.rotation.y) * 0.1;
    }

    // Check video transition
    checkVideoTransition();

    // Update controls
    controls.update();

    // Render
    renderer.render(scene, camera);
}

// Event listeners
window.addEventListener('scroll', updateScroll);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Mobile touch optimization
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (isMobile) {
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    renderer.setPixelRatio(1); // Reduce pixel ratio on mobile
}

// Initial setup
document.body.classList.add('loading');
updateScroll();
animate();

console.log('BMW E30 сайт инициализирован');
