import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { TextureLoader } from 'three';
import gsap from 'gsap'

import map from '../static/textures/earth.jpg'

const canvasEl = document.querySelector('#globe-3d')
const containerEl = document.querySelector(".globe-wrapper");

let renderer, scene, camera, controls, rayCaster, pointer;
let globeGroup, globeModel, groupLight, globeSelectionOuterMesh;

const params = {
    imagePinSize:0.16,
    imagePinTranslateY: 0.248
}

// Define rotation variables
const debugParams = {
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
};

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

let isTouchScreen = false;
let isHoverable = true;

const textureLoader = new THREE.TextureLoader();
const fbxLoader = new FBXLoader();

const gui = new dat.GUI();


// Function to fetch city data
const fetchFruits = () => {
    return fetch('fruits.json');
};
const fruits = []

initScene();
createControls();

window.addEventListener("resize", updateSize);

function initScene() {
    
    renderer = new THREE.WebGLRenderer({canvas: canvasEl, alpha: true, antialias: true});
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    camera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0, 3);
    camera.position.z = 1.3;

    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    rayCaster = new THREE.Raycaster();
    rayCaster.far = 1.15;
    pointer = new THREE.Vector2(-1, -1);

    createOrbitControls();
    
    createGlobe();
    createLights();

    updateSize();

    gsap.ticker.add(render);
}


/* Calculate coordinates */
function calcPosFromLatLngRad(lat, lng) {
    const phi = (lat) * (Math.PI/180)
    const theta = (lng+180) * (Math.PI/180)
    let x = -(Math.cos(phi) * Math.cos(theta))
    let z = (Math.cos(phi) * Math.sin(theta))
    let y = (Math.sin(phi))

    return {x,y,z}
}


async function createGlobe() {
    
    fbxLoader.load(
    'globe-sync-2.fbx',
        (object) => {
            object.scale.set(0.0018, 0.0018, 0.0018); 
            object.rotation.y = Math.PI
            globeModel = object;
            globeGroup.add(globeModel)

        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )

	// Fetch city data
	const res = await fetchFruits();
	const data = await res.json();
    console.log(data.fruits)
    data.fruits.forEach( point => {
        fruits.push(point)
        
        let coords = calcPosFromLatLngRad(point.coords.lat, point.coords.lng)

        fbxLoader.load(
        'pins.fbx',
            (object) => {
                object.position.copy(coords)
                object.scale.set(0.002, 0.002, 0.002)
                
                globeGroup.add(object)
    
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
            },
            (error) => {
                console.log(error)
            }
        )
       
        // let cityDot = new THREE.Mesh(
        //     new THREE.SphereBufferGeometry(0.05,20,20),
        //     new THREE.MeshBasicMaterial({ color: 0xff0000 })
        // )
        //cityDot.position.copy(coords)
        //cityDot.userData.city = point.city
        //cityDot.userData.productName = point.productName
        /** PLANE TEST */
        const fruitImageTexture = textureLoader.load(point.image);

        const imageMap = new THREE.CircleGeometry(params.imagePinSize, 32, 32); 
        const imageMapTexture = new THREE.MeshBasicMaterial({ map: fruitImageTexture, side: THREE.DoubleSide});
        const imageMapMesh = new THREE.Mesh(imageMap, imageMapTexture);
        
        // Update rotation and position of the image
        imageMapMesh.rotation.y = Math.PI * 0.5;
        imageMapMesh.position.x -= 0.01;
        imageMapMesh.position.copy(coords)
        imageMapMesh.position.y += params.imagePinTranslateY;
            
        // Set userData for each mesh
        
        globeGroup.add(imageMapMesh)
    
       
    })
}

function createLights() {
    // Create a directional light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const rightLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rightLight.position.set(10, 0, 0);
    scene.add(rightLight);

    const leftLight = new THREE.DirectionalLight(0xffffff, 0.5);
    leftLight.position.set(-10, 0, 0);
    scene.add(leftLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);
}

function createOrbitControls() {
    controls = new OrbitControls(camera, canvasEl);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.minPolarAngle = .46 * Math.PI;
    controls.maxPolarAngle = .46 * Math.PI;
    controls.autoRotate = true;
    controls.autoRotateSpeed *= 1;

    controls.addEventListener("start", () => {
        isHoverable = false;
        pointer = new THREE.Vector2(-1, -1);
        gsap.to(globeGroup.scale, {
            duration: .3,
            x: .9,
            y: .9,
            z: .9,
            ease: "power1.inOut"
        })
    });
    controls.addEventListener("end", () => {
        // isHoverable = true;
        gsap.to(globeGroup.scale, {
            duration: .6,
            x: 1,
            y: 1,
            z: 1,
            ease: "back(1.7).out",
            onComplete: () => {
                isHoverable = true;
            }
        })
    });
}







function createControls() {
    gui.add(debugParams, 'rotationX', 0, Math.PI * 2).name('Rotation X');
    gui.add(debugParams, 'rotationY', 0, Math.PI * 2).name('Rotation Y');
    gui.add(debugParams, 'rotationZ', 0, Math.PI * 2).name('Rotation Z');
}



function render() {
    controls.update();
    
    // if (globeModel) {
    //     globeModel.rotation.set(debugParams.rotationX, debugParams.rotationY, debugParams.rotationZ);
    // }

    if (isHoverable) {
        rayCaster.setFromCamera(pointer, camera);
        
    }

    if (isTouchScreen && isHoverable) {
        isHoverable = false;
    }

    renderer.render(scene, camera);
}


function updateSize() {
    const side = Math.min(800, Math.min(window.innerWidth, window.innerHeight) - 50);
    containerEl.style.width = side + "px";
    containerEl.style.height = side + "px";
    renderer.setSize(side, side);
}




// ANIMATION AND INTERACTION CRACRA // 

const rotateGlobe = (fruit) => {
    // We get x,y,z coordinates from the latitude and longitude of a randomFruit 
    const fruitPos = calcPosFromLatLngRad(fruit.coords.lat, fruit.coords.lng)
    
    // C'est là ou sa bloque
    const angle = Math.atan2(fruitPos.z, fruitPos.x);

    
    controls.update(); // Ensure the controls are up to date with the camera position

   // Et c'est surtout la où sa bloque, quelle est la bonne calculation de la rotation de y pour que le randomFruit tombe en face de la caméra
    gsap.to(globeGroup.rotation, {
        duration: 1,
        y: angle * Math.PI / 2, 
        ease: "power2.inOut"
    });
}


// Select the card elements we'll need in HTML
let frontCard = document.querySelector('.front');
let backCard = document.querySelector('.behind');
const cards = document.querySelector('.cards')

// Animation for the first clicked card

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
                <img src=/${randomFruit.image}" alt="" width="100">
                <h3>${randomFruit.productName}</h3>
                <span class="origin">${randomFruit.city}</span>
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

// When the back card is clicked, move the card and rotate the globe
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
                <img src="/${randomFruit.image}" alt="" width="100">
                <h3>${randomFruit.productName}</h3>
                <span class="origin">${randomFruit.city}</span>
            </div>
        `;

        // Add click event listener to the new back card (for loop functionality)
        cards.appendChild(newBackCard);
        newBackCard.addEventListener('click', () => moveCard(newBackCard, randomFruit)); // Pass randomFruit here
    }, 1000);

    rotateGlobe(randomFruit);
}

// Add all our events
backCard.addEventListener('click', () => {
    rotateGlobeAndAnimateCards()
});