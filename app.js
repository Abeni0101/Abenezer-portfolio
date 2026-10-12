// ==========================================================
// 1. THREE.JS & APPLE STUDIO LIGHTING SETUP
// ==========================================================
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();

// Camera positioned specifically for product presentation
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 14);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Apple-level photorealistic rendering requirements
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// SENIOR DEV SECRET: RoomEnvironment generates perfect studio reflections
// on metallic and glass surfaces without needing an external HDRI file.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
scene.environment = pmremGenerator.fromScene(new THREE.RoomEnvironment()).texture;

// Supplemental Lighting to make the screen/edges pop
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// ==========================================================
// 2. ROBUST 3D MODEL LOADER (AUTO-SCALING ALGORITHM)
// ==========================================================
const phoneGroup = new THREE.Group();
scene.add(phoneGroup);

const loader = new THREE.GLTFLoader();

// => LOAD YOUR MODEL HERE
loader.load(
    'model.glb', 
    (gltf) => {
        const model = gltf.scene;
        
        // --- SENIOR DEV: AUTO-SCALING ALGORITHM ---
        // This fixes the "tiny model" issue. It mathematically scales the 
        // imported model to exactly fit the viewport height.
        
        // 1. Calculate the bounding box of the imported model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        
        // 2. Find the largest dimension (usually height, but could be width)
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // 3. Define the ideal target size in Three.js units (e.g., 7 units tall)
        const targetSize = 7.0; 
        
        // 4. Calculate ratio and apply scale
        const scaleRatio = targetSize / maxDim;
        model.scale.setScalar(scaleRatio);
        
        // 5. Recompute the bounding box AFTER scaling
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        
        // 6. Center the model perfectly at (0,0,0) so it rotates cleanly
        model.position.sub(scaledCenter);
        
        // Enhance materials
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.envMapIntensity = 1.5; // Boost reflections
                child.material.needsUpdate = true;
            }
        });

        // Add to our group
        phoneGroup.add(model);
        
        // Once loaded, start animations
        initAppleScrollAnimations();
    },
    undefined,
    (error) => {
        console.error("Could not load 'model.glb'. Make sure the file is in the same folder.");
        // Fallback procedural box just so the screen isn't empty
        const geo = new THREE.BoxGeometry(3.5, 7.5, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.1, metalness: 0.8 });
        phoneGroup.add(new THREE.Mesh(geo, mat));
        initAppleScrollAnimations();
    }
);


// ==========================================================
// 3. CINEMATIC APPLE GSAP SCROLL PHYSICS
// ==========================================================
gsap.registerPlugin(ScrollTrigger);

function initAppleScrollAnimations() {
    // Reveal Hero Text
    gsap.to("#hero-title", { opacity: 1, y: 0, duration: 1.5, ease: "power4.out", delay: 0.2 });
    gsap.to("#hero-subtitle", { opacity: 1, y: 0, duration: 1.5, ease: "power4.out", delay: 0.4 });

    // Initial Phone Orientation (Straight on)
    phoneGroup.rotation.set(0, 0, 0);
    phoneGroup.position.set(0, -1, 0);

    // Create Main Story Timeline
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.0, // Smooth scrubbing (Apple standard)
        }
    });

    // 1. Hero -> Design (Rotate to show Titanium Side)
    tl.to(phoneGroup.rotation, { x: 0, y: Math.PI / 2 + 0.1, z: 0, ease: "power1.inOut" }, 0)
      .to(phoneGroup.position, { x: 3.5, y: 0, z: 2, ease: "power1.inOut" }, 0)
      // Fade out hero text
      .to("#hero-title, #hero-subtitle", { opacity: 0, y: -20, ease: "power1.in" }, 0);

    // Fade in Design Text
    tl.fromTo("#design .scroll-text", { opacity: 0, y: 50 }, { opacity: 1, y: 0, ease: "power1.out" }, 0.2)
      .to("#design .scroll-text", { opacity: 0, y: -50, ease: "power1.in" }, 0.4);

    // 2. Design -> Camera (Rotate to show Back)
    tl.to(phoneGroup.rotation, { x: 0.2, y: Math.PI + 0.3, z: 0, ease: "power1.inOut" }, 0.4)
      .to(phoneGroup.position, { x: -3.5, y: 0, z: 0, ease: "power1.inOut" }, 0.4);

    // Fade in Camera Text
    tl.fromTo("#camera .scroll-text", { opacity: 0, y: 50 }, { opacity: 1, y: 0, ease: "power1.out" }, 0.6)
      .to("#camera .scroll-text", { opacity: 0, y: -50, ease: "power1.in" }, 0.8);

    // 3. Camera -> Performance Section (Move phone away as we scroll to the Bento Box grid)
    tl.to(phoneGroup.rotation, { x: 0, y: Math.PI * 2, z: 0, ease: "power1.inOut" }, 0.8)
      .to(phoneGroup.position, { x: 0, y: 10, z: -10, ease: "power1.inOut" }, 0.8);

    // UI Color Transitions (Light/Dark Mode toggle on the Nav bar)
    ScrollTrigger.create({
        trigger: "#performance",
        start: "top center",
        onEnter: () => {
            document.body.style.backgroundColor = "#000";
            document.getElementById("navbar").classList.remove("light-mode", "text-black");
            document.getElementById("ribbon").classList.remove("light-mode", "text-black");
        },
        onLeaveBack: () => {
            // Restore dark environment for the 3D model
            document.body.style.backgroundColor = "#000";
        }
    });
}

// ==========================================================
// 4. SUBTLE MOUSE PARALLAX
// ==========================================================
let targetX = 0;
let targetY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    targetX = (event.clientX - windowHalfX) * 0.0005;
    targetY = (event.clientY - windowHalfY) * 0.0005;
});

function animate() {
    requestAnimationFrame(animate);

    // Apple's floaty physics
    if (phoneGroup) {
        phoneGroup.rotation.y += 0.05 * (targetX - phoneGroup.rotation.y + phoneGroup.userData.baseRotY || 0);
        phoneGroup.rotation.x += 0.05 * (targetY - phoneGroup.rotation.x + phoneGroup.userData.baseRotX || 0);
    }

    renderer.render(scene, camera);
}
animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});