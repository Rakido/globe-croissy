import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import vertex from './shaders/test/vertex.glsl'
import fragment from './shaders/test/fragment.glsl'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import gsap from 'gsap'

import map from '../static/textures/earth.jpg'
import mangoustan from '../static/elmangoustan.png'

// Importez TextureLoader correctement
import { TextureLoader } from 'three';

// Créez un chargeur de texture
const textureLoader = new TextureLoader();

/* Calculate coordinates */

function calcPosFromLatLngRad(lat, lng) {
    const phi = (lat) * (Math.PI/180)
    const theta = (lng+180) * (Math.PI/180)
    let x = -(Math.cos(phi) * Math.cos(theta))
    let z = (Math.cos(phi) * Math.sin(theta))
    let y = (Math.sin(phi))

    return {x,y,z}
}


// Function to fetch city data
const fetchFruits = () => {
	return fetch('fruits.json');
};


/**
 * DEBUG
 */
const gui = new dat.GUI()



/**
 *  BASE
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()



// Axis Helper
//const axesHelper = new THREE.AxesHelper(5);
//scene.add(axesHelper);

/**
 * Objects
 */

// Textures
//const textureLoader = new THREE.TextureLoader()
//const flagTexture = textureLoader.load('/textures/test-9.png')

// Geometry

// const globeMateriel = new THREE.MeshBasicMaterial({
//     map: new THREE.TextureLoader().load(map)
// })
// let globe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }))
// scene.add(globe)
// globe.rotation.y = -3.1
// gui.add(globe.rotation, 'y').min(-5).max(5).step(0.1).name('rotateGlobeY')

// Create a sphere geometry
const geometry = new THREE.SphereBufferGeometry(1, 30, 30)
const globeMateriel = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load(map)
})
let globe = new THREE.Mesh(geometry, globeMateriel)
const material = new THREE.MeshPhongMaterial({ color: 0xffffff }); // White color material
const sphere = new THREE.Mesh(geometry, material);
//scene.add(sphere);
//scene.add(globe);

// Shader Material
// const material = new THREE.ShaderMaterial({
//     side:  THREE.DoubleSide,
//     uniforms: { 
//         uAnimate: { value: 0},
//         time: { value: 0 },
//         uColor: { value: 0 }
//     },
//     vertexShader: vertex,
//     fragmentShader: fragment
// })
let globeModel;


// Define a function to update all three scale components


// Add a GUI control to manipulate the scale
const elGroup = new THREE.Group()

const fbxLoader = new FBXLoader()
fbxLoader.load(
    'globe-3.fbx',
    (object) => {
        // object.traverse(function (child) {
        //     if ((child as THREE.Mesh).isMesh) {
        //         // (child as THREE.Mesh).material = material
        //         if ((child as THREE.Mesh).material) {
        //             ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).transparent = false
        //         }
        //     }
        // })
        globeModel = object;
        object.position.set(0,0,0)
        //object.rotation.y = -3.1;
        //object.rotation.x = 0.2;
        //object.rotation.z = 0;
        gui.add(object.rotation, 'y').min(-5).max(5).step(0.1).name('rotateGlobeY')
        gui.add(object.rotation, 'x').min(-5).max(5).step(0.1).name('rotateGlobeX')
        gui.add(object.rotation, 'z').min(-5).max(5).step(0.1).name('rotateGlobeZ')
        object.scale.set(1.80, 1.80, 1.80)
        //object.rotation.y = 4.6
        function updateScale(value) {
            object.scale.set(value, value, value);
        }
        gui.add({ scale: 1 }, 'scale').min(0.001).max(5 ).step(0.0001).onChange(updateScale);
        elGroup.add(object)
        scene.add(object)

    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)

let pointsGroup = new THREE.Group()
let pinGroup = new THREE.Group()

async function createGlobe() {
	// Fetch city data
	const res = await fetchFruits();
	const data = await res.json();
    data.fruits.forEach( point => {
        let coords = calcPosFromLatLngRad(point.coords.lat, point.coords.lng)
        //console.log(coords)
    
        const fbxLoader = new FBXLoader()
fbxLoader.load(
    'pin.fbx',
    (object) => {
        // object.traverse(function (child) {
        //     if ((child as THREE.Mesh).isMesh) {
        //         // (child as THREE.Mesh).material = material
        //         if ((child as THREE.Mesh).material) {
        //             ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).transparent = false
        //         }
        //     }
        // })
        object.scale.set(10, 10, 10)
        object.rotation.y = 4.02
        object.position.copy(coords)
        //scene.add(object)
        object.position.y = 0.38
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)
    
        let mesh = new THREE.Mesh(
            new THREE.SphereBufferGeometry(0.05,20,20),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        )
        //console.log(point.image)
        /** PLANE TEST */
        const mangoustanTexture = textureLoader.load(point.image);
        const planeGeometry = new THREE.CircleGeometry(0.25, 32); 
        const planeMaterial = new THREE.MeshBasicMaterial({ map: mangoustanTexture, side: THREE.DoubleSide});
        const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.rotation.y = -Math.PI * 1; // Rotate the plane 90 degrees
        pinGroup.add(planeMesh)
        scene.add(planeMesh)
        planeMesh.position.copy(coords)
            
        // Set userData for each mesh
        mesh.userData.city = point.city
        console.log(point.productName)
        mesh.userData.productName = point.productName
    
        pointsGroup.add(mesh)
        elGroup.add(pointsGroup)
        scene.add(pointsGroup)
    
        mesh.position.copy(coords)
    })
    console.log(pinGroup)
    //console.log(pointsGroup)
}


createGlobe()


// let x = Math.cos(lng) * Math.sin(lat)
// let y = Math.sin(lng) * Math.sin(lat)
// let z = Math.cos(lat)


/* HANDLE EVENTS */
// Raycaster
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

// Event listener for mouse click on canvas
canvas.addEventListener('click', onClick)

function onClick(event) {
    // Calculate mouse position in normalized device coordinates
    const mouse = {
        x: (event.clientX / sizes.width) * 2 - 1,
        y: -(event.clientY / sizes.height) * 2 + 1
    };

    // Update the raycaster with the mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the raycaster
    const intersects = raycaster.intersectObjects(scene.children);

    // If there is an intersection with a mesh, handle it
    if (intersects.length > 0) {

        const mesh = intersects[0].object;
        console.log(mesh)
        mesh.scale.set(2,2,2)
        const title = mesh.userData.city; // Assuming you set userData for each mesh
        const productName = mesh.userData.productName; // Assuming you set userData for each mesh
        //positionHTMLCard(mesh, title, productName)
        
        // Perform any actions you want here
    }
}

function positionHTMLCard(mesh, title, productName) {
    console.log(`Clicked on mesh with title: ${title}`);
    // Create or update the HTML card
    let card = document.querySelector('.mesh-card')
    if (!card) {
        // Create card if not exists
        card = document.createElement('div')
        card.classList.add('mesh-card')
        document.body.appendChild(card)
    }
    // Position the card above the mesh
    const meshPosition = mesh.getWorldPosition(new THREE.Vector3())
    const screenPosition = meshPosition.project(camera)
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const x = (screenPosition.x + 1) * screenWidth / 2
    const y = -(screenPosition.y - 1) * screenHeight / 2
    card.style.left = x + 'px'
    card.style.top = y + 'px'
    // Set content of the card
    card.innerHTML = `
        <h3>${title}</h3>
        <p>${productName}</p>
        <!-- Add any other content you want -->
    `
}

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, -3)
//gui.add(camera.position, 'z').min(0).max(20).step(0.01).name('frequencyX')
//gui.add(mesh.position.y, 'x').min(-20).max(100).step(1).name("x")
scene.add(camera)
gui.add(camera.position, 'y').min(0).max(20).step(0.01).name('camX')

// Orthographic Camera
// const frutumSize = 2;
// const aspect = sizes.width / sizes.height;
// const camera = new THREE.OrthographicCamera( frutumSize * aspect / - 2, frutumSize * aspect / 2, frutumSize / 2, frutumSize / - 2, -1000, 1000 );
// camera.position.set(0, 0, -2)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor( 0xFFFFFF, 1 );

//Load background texture

/** Light */

const groupLight = new THREE.Group();

// Create blue light from the right
const blueLight = new THREE.DirectionalLight(0xFFFFFF, 1);
blueLight.position.set(10, 0, 0);
blueLight.target = sphere;
groupLight.add(blueLight)

// Create green light from the left
const greenLight = new THREE.DirectionalLight(0xFFFFFF, 1);
greenLight.position.set(0, 10, 0);
greenLight.target = sphere;
groupLight.add(greenLight)

// Create red light from the top
const redLight = new THREE.DirectionalLight(0xFFFFFF, 1);
redLight.position.set(-10, 0, 0);
redLight.target = sphere;
groupLight.add(redLight)

/**
 * Animate
 */

gui.add(pinGroup.rotation, 'x').min(-10).max(10).step(0.01).name('lightX')
gui.add(pinGroup.rotation, 'y').min(-10).max(10).step(0.01).name('lightX')
gui.add(pinGroup.rotation, 'z').min(-10).max(10).step(0.01).name('lightX')

const clock = new THREE.Clock()
//console.log(material.uniforms)
const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    // Update controls
    controls.update()
    // Render
    renderer.render(scene, camera)

    // Rotate the globeModel if it has been loaded
    if (globeModel) {
        //globeModel.rotation.y = elapsedTime * 0.1;
        //pointsGroup.rotation.y = elapsedTime * 0.1;
    }
    camera.add(groupLight)
    pinGroup.rotation.y = camera.rotation.y
    //console.log(pinGroup.rotation.y)
    
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)

    
}

tick()

document.getElementById('next').addEventListener('click', (e) => {
    // Randomly generate the rotation amount
    const randomRotation = Math.random() * Math.PI * 2; // Random rotation between 0 and 2PI

    // Create a GSAP timeline
    const tl = gsap.timeline();

    // Add a rotation animation to the timeline for globeModel
    tl.to(globeModel.rotation, {
        duration: 1, // Duration of the animation in seconds
        y: globeModel.rotation.y + randomRotation, // Rotate by the random amount
        ease: "power2.inOut" // Easing function
    });
    

    // Add a rotation animation to the timeline for pointsGroup
    tl.to(pointsGroup.rotation, {
        duration: 1, // Duration of the animation in seconds
        y: pointsGroup.rotation.y + randomRotation, // Rotate by the random amount
        ease: "power2.inOut" // Easing function
    }, 0); // Start the pointsGroup rotation animation at the same time as globeModel
}); 