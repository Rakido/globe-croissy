import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { TextureLoader } from 'three';
import gsap from 'gsap'

import map from '../static/textures/earth.jpg'
import mangoustan from '../static/elmangoustan.png'

const canvasEl = document.querySelector('#globe-3d')
const containerEl = document.querySelector(".globe-wrapper");

let renderer, scene, camera, controls, rayCaster, pointer;
let globeGroup, globeModel, groupLight, globeSelectionOuterMesh;

const params = {
    strokeColor: "#111111",
    defaultColor: "#9a9591",
    hoverColor: "#00C9A2",
    strokeWidth: 2,
    hiResScalingFactor: 2,
    lowResScalingFactor: .7
}

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

let isTouchScreen = false;
let isHoverable = true;

const textureLoader = new THREE.TextureLoader();


// Function to fetch city data
const fetchFruits = () => {
    return fetch('fruits.json');
};


initScene();
createControls();

window.addEventListener("resize", updateSize);

function initScene() {
    
    renderer = new THREE.WebGLRenderer({canvas: canvasEl, alpha: true});
    
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
            object.scale.set(1.80, 1.80, 1.80)
            scene.add(object)

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
        //fruits.push(point)
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
        mesh.userData.productName = point.productName
        globeGroup.add(mesh)
        globeGroup.add(planeMesh, globeModel)
    
        mesh.position.copy(coords)
    })
}

function createLights() {
    // Create a directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 0, 5); // Adjust position as needed
    scene.add(directionalLight);

    // You can add more lights as needed, e.g., ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
}

function createOrbitControls() {
    controls = new OrbitControls(camera, canvasEl);
    controls.enablePan = false;
    // controls.enableZoom = false;
    controls.enableDamping = true;
    controls.minPolarAngle = .46 * Math.PI;
    controls.maxPolarAngle = .46 * Math.PI;
    controls.autoRotate = true;
    controls.autoRotateSpeed *= 1.2;

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
    const gui = new dat.GUI();
	
}

function render() {
    controls.update();

    if (isHoverable) {
        rayCaster.setFromCamera(pointer, camera);
        
    }

    if (isTouchScreen && isHoverable) {
        isHoverable = false;
    }

    renderer.render(scene, camera);
}


function updateSize() {
    const side = Math.min(500, Math.min(window.innerWidth, window.innerHeight) - 50);
    containerEl.style.width = side + "px";
    containerEl.style.height = side + "px";
    renderer.setSize(side, side);
}