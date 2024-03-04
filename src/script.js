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


// Instance array to later stock the fruits data
const fruits = []

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

let globeModel;


// Define a function to update all three scale components


// Add a GUI control to manipulate the scale
const elGroup = new THREE.Group()

const fbxLoader = new FBXLoader()
    fbxLoader.load(
    'globe-2.fbx',
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
let meshesGroup = new THREE.Group()

async function createGlobe() {
	// Fetch city data
	const res = await fetchFruits();
	const data = await res.json();
    data.fruits.forEach( point => {
        fruits.push(point)
        let coords = calcPosFromLatLngRad(point.coords.lat, point.coords.lng)

        const fbxLoader = new FBXLoader()
// fbxLoader.load(
//     'pin.fbx',
//     (object) => {
//         // object.traverse(function (child) {
//         //     if ((child as THREE.Mesh).isMesh) {
//         //         // (child as THREE.Mesh).material = material
//         //         if ((child as THREE.Mesh).material) {
//         //             ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).transparent = false
//         //         }
//         //     }
//         // })
//         object.scale.set(10, 10, 10)
//         object.rotation.y = 4.02
//         object.position.copy(coords)
//         //scene.add(object)
//         object.position.y = 0.38
//     },
//     (xhr) => {
//         console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
//     },
//     (error) => {
//         console.log(error)
//     }
// )
    
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
        
        //scene.add(planeMesh)
        planeMesh.position.copy(coords)
            
        // Set userData for each mesh
        mesh.userData.city = point.city
        //console.log(point.productName)
        mesh.userData.productName = point.productName
        meshesGroup.add(mesh)
        pointsGroup.add(meshesGroup, planeMesh, globeModel)
        scene.add(pointsGroup)
    
        mesh.position.copy(coords)
    })
    //console.log(pinGroup)
    //console.log(pointsGroup)
    // Add pointsGroup and pinGroup to elGroup after they are populated with children
    elGroup.add(pointsGroup)
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

        // const mesh = intersects[0].object;
        // console.log(mesh)
        // //mesh.scale.set(2,2,2)
        // const title = mesh.userData.city; // Assuming you set userData for each mesh
        //const productName = mesh.userData.productName; // Assuming you set userData for each mesh
        //positionHTMLCard(mesh, title, productName)
        
        // Perform any actions you want here
    }
}

// function positionHTMLCard(mesh, title, productName) {
//     console.log(`Clicked on mesh with title: ${title}`);
//     // Create or update the HTML card
//     let card = document.querySelector('.mesh-card')
//     if (!card) {
//         // Create card if not exists
//         card = document.createElement('div')
//         card.classList.add('mesh-card')
//         document.body.appendChild(card)
//     }
//     // Position the card above the mesh
//     const meshPosition = mesh.getWorldPosition(new THREE.Vector3())
//     const screenPosition = meshPosition.project(camera)
//     const screenWidth = window.innerWidth
//     const screenHeight = window.innerHeight
//     const x = (screenPosition.x + 1) * screenWidth / 2
//     const y = -(screenPosition.y - 1) * screenHeight / 2
//     card.style.left = x + 'px'
//     card.style.top = y + 'px'
//     // Set content of the card
//     card.innerHTML = `
//         <h3>${title}</h3>
//         <p>${productName}</p>
//         <!-- Add any other content you want -->
//     `
// }

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

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

// Renderer
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
const rightLight = new THREE.DirectionalLight(0xFFFFFF, 1);
rightLight.position.set(10, 0, 0);
rightLight.target = sphere;
groupLight.add(rightLight)

// Create green light from the left
const topLight = new THREE.DirectionalLight(0xFFFFFF, 1);
topLight.position.set(0, 10, 0);
topLight.target = sphere;
groupLight.add(topLight)

// Create red light from the top
const leftLight = new THREE.DirectionalLight(0xFFFFFF, 1);
leftLight.position.set(-10, 0, 0);
leftLight.target = sphere;
groupLight.add(leftLight)

/**
 * Animate
 */


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
    //console.log(pinGroup.rotation.y)
    
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)

    
}

tick()


scene.add(elGroup)

const rotateGlobe = (fruit) => {

    const fruitPos = calcPosFromLatLngRad(fruit.coords.lat, fruit.coords.lng)
    const angle = Math.atan2(fruitPos.z, fruitPos.x);
    //const randomMesh = meshesArray[Math.floor(Math.random()*meshesArray.length)];
    const randomRotation = Math.random() * Math.PI * 2; // Random rotation between 0 and 2PI
    
    // Update camera position
    controls.update(); // Ensure the controls are up to date with the camera position
    console.log(fruitPos)
    //const targetDirection = randomMesh.position.clone().sub(camera.position).normalize();

    // Calculate the angle between the camera direction and the y-axis
    //const angle = Math.atan2(targetDirection.z, targetDirection.x);

    gsap.to(elGroup.rotation, {
        duration: 1,
        y: angle * Math.PI / 2, // Adjust for starting orientation
        ease: "power2.inOut"
    });
}

const rotateGlobeAndAnimateCards = () => {
    const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];

    // Add 'is-moving' class to front card
   
    frontCard.classList.add('is-moving');

    // After 1 second, remove front card element, remove 'behind' class from back card, add 'front' class to back card
    setTimeout(() => {
        frontCard.remove();
        backCard.classList.remove('behind');
        backCard.classList.add('front');

        // Create a new div for the next back card
        const newBackCard = document.createElement('div');
        newBackCard.classList.add('card-product', 'behind');
        newBackCard.innerHTML = `
            <div class="card">
                <img src="../static/dragon.png" alt="" width="100">
                <h3>${randomFruit.productName}</h3>
            </div>
        `;

        // Add click event listener to the new back card (for loop functionality)
        cards.appendChild(newBackCard);
        newBackCard.addEventListener('click', () => moveCard(newBackCard, randomFruit)); // Pass randomFruit here
    }, 1000);

    rotateGlobe(randomFruit);
}

document.getElementById('next').addEventListener('click', (e) => {
    rotateGlobe();    
}); 


// Select the card elements
let frontCard = document.querySelector('.front');
let backCard = document.querySelector('.behind');
const cards = document.querySelector('.cards')

backCard.addEventListener('click', () => {
    rotateGlobeAndAnimateCards()
});

const moveCard = (card) => {
    // Add 'is-moving' class to front card
    let frontCard = document.querySelector('.front');
    let backCard = document.querySelector('.behind');

    const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];
    frontCard.classList.add('is-moving');

    // After 1 second, remove front card element, remove 'behind' class from back card, add 'front' class to back card
    setTimeout(() => {
        frontCard.remove();
        card.classList.remove('behind');
        card.classList.add('front');

        // Create a new div for the next back card
        const newBackCard = document.createElement('div');
        newBackCard.classList.add('card-product', 'behind');
        newBackCard.innerHTML = `
            <div class="card">
                <img src="../static/dragon.png" alt="" width="100">
                <h3>${randomFruit.productName}</h3>
                <h3>${randomFruit.city}</h3>
            </div>
        `;

        // Add click event listener to the new back card (for loop functionality)
        cards.appendChild(newBackCard);
        newBackCard.addEventListener('click', () => moveCard(newBackCard, randomFruit)); // Pass randomFruit here
    }, 1000);

    rotateGlobe(randomFruit);
}