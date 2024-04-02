// Importation des styles CSS et des modules nécessaires
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

// Paramètres pour le placement des images des fruits sur le globe
const params = {
    imagePinSize: 0.16,
    imagePinTranslateY: 0.248
}

// Paramètres pour la rotation du globe pour le débogage
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

// Fonction pour récupérer les données des fruits
const fetchFruits = () => {
    return fetch('fruits.json');
};
const fruits = []

initScene();
createControls();

// Gestionnaire de redimensionnement de la fenêtre
window.addEventListener("resize", updateSize);

function initScene() {
    // Initialisation du rendu, de la scène et de la caméra
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    camera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0, 3);
    camera.position.z = 1.5;

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

// Calcul des coordonnées à partir de la latitude et de la longitude
function calcPosFromLatLngRad(lat, lng) {
    const phi = (lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    let x = -(Math.cos(phi) * Math.cos(theta))
    let z = (Math.cos(phi) * Math.sin(theta))
    let y = (Math.sin(phi))

    return { x, y, z }
}

async function createGlobe() {
    // Chargement du modèle 3D du globe
    fbxLoader.load(
        'globe.fbx',
        (object) => {
            object.scale.set(0.0018, 0.0018, 0.0018);
            object.rotation.y = Math.PI
            globeModel = object;
            globeGroup.add(globeModel)
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% chargé')
        },
        (error) => {
            console.log(error)
        }
    )

    // Récupération des données des fruits
    const res = await fetchFruits();
    const data = await res.json();
    // data.fruits.forEach(point => {
    //     fruits.push(point)

    //     let coords = calcPosFromLatLngRad(point.coords.lat, point.coords.lng)

    //     // Chargement du repère (pin)
    //     fbxLoader.load(
    //         'pins.fbx',
    //         (object) => {
    //             object.position.copy(coords)
    //             object.scale.set(0.002, 0.002, 0.002)

    //             // Orienter le repère vers le centre du globe
    //             object.lookAt(new THREE.Vector3(0, 3, 0));
    //             globeGroup.add(object)
    //         },
    //         (xhr) => {
    //             console.log((xhr.loaded / xhr.total) * 100 + '% chargé')
    //         },
    //         (error) => {
    //             console.log(error)
    //         }
    //     )

    //     /** TEST DE PLAN */
    //     const fruitImageTexture = textureLoader.load(point.image);

    //     const imageMap = new THREE.CircleGeometry(params.imagePinSize, 32, 32);
    //     const imageMapTexture = new THREE.MeshBasicMaterial({ map: fruitImageTexture, side: THREE.DoubleSide });
    //     const imageMapMesh = new THREE.Mesh(imageMap, imageMapTexture);

    //     // Mise à jour de la rotation et de la position de l'image
    //     imageMapMesh.position.copy(coords)
    //     imageMapMesh.position.y += params.imagePinTranslateY;

    //     // Finalement, ajout du repère au globeGroup
    //     globeGroup.add(imageMapMesh)
    // })

    data.fruits.forEach(point => {
        fruits.push(point);
        let coords = calcPosFromLatLngRad(point.coords.lat, point.coords.lng);

        // Chargement du repère (pin)
        fbxLoader.load(
            'pins.fbx',
            (pin) => {
                pin.position.copy(coords);
                pin.scale.set(1, 1, 1);

                // Orienter le repère vers le centre du globe
                pin.lookAt(new THREE.Vector3(0, 3, 0));

                // Charger la texture de fruit et l'ajouter comme enfant du pin
                const fruitImageTexture = textureLoader.load(point.image, (texture) => {
                    const imageMap = new THREE.CircleGeometry(params.imagePinSize, 32);
                    const imageMapTexture = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                    const imageMapMesh = new THREE.Mesh(imageMap, imageMapTexture);

                    // Ajuster la position de la texture relativement au pin
                    imageMapMesh.position.y += params.imagePinTranslateY;
                    imageMapMesh.rotation.y = 1.5;
                    imageMapMesh.scale.set(1, 1, 1);

                    // Ajouter la texture de fruit comme enfant du pin pour qu'elle se déplace avec
                    pin.add(imageMapMesh);
                });
                globeGroup.add(pin);

            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% chargé');
            },
            (error) => {
                console.log('Erreur lors du chargement du pin :', error);
            }
        );
    });

}

function createLights() {
    // Création de lumières directionnelles
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
    // Configuration des contrôles de navigation
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
    // Création d'interfaces utilisateur pour la rotation du globe
    gui.add(debugParams, 'rotationX', 0, Math.PI * 2).name('Rotation X');
    gui.add(debugParams, 'rotationY', 0, Math.PI * 2).name('Rotation Y');
    gui.add(debugParams, 'rotationZ', 0, Math.PI * 2).name('Rotation Z');
}

function render() {
    // Mise à jour et rendu de la scène
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
    // Mise à jour de la taille de la fenêtre
    const side = Math.min(800, Math.min(window.innerWidth, window.innerHeight) - 50);
    containerEl.style.width = side + "px";
    containerEl.style.height = side + "px";
    renderer.setSize(side, side);
}

// Les sections suivantes du code gèrent les animations et interactions avec les cartes des fruits, mais sont trop longues pour les inclure toutes ici. La logique générale est de permettre à l'utilisateur de cliquer sur une carte pour voir les détails d'un fruit spécifique, tout en tournant le globe pour centrer le fruit sélectionné dans la vue de la caméra.

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

// Sélection des éléments de carte nécessaires dans le HTML
let frontCard = document.querySelector('.front');
let backCard = document.querySelector('.behind');
const cards = document.querySelector('.cards');

// Animation pour la première carte cliquée
const rotateGlobeAndAnimateCards = () => {
    // Choix d'un fruit aléatoire dans la liste des fruits
    const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];

    // Ajout de la classe 'is-moving' à la carte de devant pour lancer l'animation
    frontCard.classList.add('is-moving');

    // Après 1 seconde, enlève la carte de devant, retire la classe 'behind' de la carte de derrière, et ajoute la classe 'front'
    setTimeout(() => {
        frontCard.remove();
        backCard.classList.remove('behind');
        backCard.classList.add('front');

        // Création d'une nouvelle div pour la prochaine carte de derrière
        const newBackCard = document.createElement('div');
        newBackCard.classList.add('card-product', 'behind');

        // Ajout du contenu HTML à la nouvelle carte, incluant l'image et les informations du fruit
        newBackCard.innerHTML = `
            <div class="card">
                <img src=/${randomFruit.image}" alt="" width="100">
                <h3>${randomFruit.productName}</h3>
                <span class="origin">${randomFruit.city}</span>
            </div>
        `;

        // Ajout d'un écouteur d'événement de clic à la nouvelle carte de derrière (pour la fonctionnalité de boucle)
        cards.appendChild(newBackCard);
        newBackCard.addEventListener('click', () => moveCard(newBackCard, randomFruit)); // Passage de randomFruit ici
    }, 1000);

    // Appel de la fonction pour tourner le globe vers le fruit sélectionné
    rotateGlobe(randomFruit);
}

// Ajout d'un écouteur d'événement de clic sur le bouton 'next' pour tourner le globe
document.getElementById('next').addEventListener('click', (e) => {
    rotateGlobe();
});

// Fonction appelée lorsque la carte de derrière est cliquée, pour déplacer la carte et tourner le globe
const moveCard = (card) => {
    // Ajout de la classe 'is-moving' à la carte de devant
    let frontCard = document.querySelector('.front');
    let backCard = document.querySelector('.behind');

    // Sélection d'un fruit aléatoire
    const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];
    frontCard.classList.add('is-moving');

    // Après 1 seconde, enlève la carte de devant, ajoute les classes correspondantes pour la transition des cartes
    setTimeout(() => {
        frontCard.remove();
        card.classList.remove('behind');
        card.classList.add('front');

        // Création et ajout d'une nouvelle carte de derrière pour la prochaine transition
        const newBackCard = document.createElement('div');
        newBackCard.classList.add('card-product', 'behind');
        newBackCard.innerHTML = `
            <div class="card">
                <img src="/${randomFruit.image}" alt="" width="100">
                <h3>${randomFruit.productName}</h3>
                <span class="origin">${randomFruit.city}</span>
            </div>
        `;

        // Ajout d'un écouteur d'événement de clic à la nouvelle carte de derrière
        cards.appendChild(newBackCard);
        newBackCard.addEventListener('click', () => moveCard(newBackCard, randomFruit)); // Passage de randomFruit ici
    }, 1000);

    // Appel de la fonction pour tourner le globe vers le fruit sélectionné
    rotateGlobe(randomFruit);
}

// Ajout d'un écouteur d'événement de clic à la carte de derrière pour déclencher l'animation et la rotation du globe
backCard.addEventListener('click', () => {
    rotateGlobeAndAnimateCards();
});
