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
let globeGroup, globeModel;

// Paramètres pour le placement des images des fruits sur le globe
const params = {
    imagePinSize: 0.15,
    imagePinTranslateY: 0.2
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

    camera = new THREE.OrthographicCamera(-1.7, 1.7, 1.7, -1.7, 0, 5);
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
    render();
    //Suppresion de gsap.ticker.add qui entre en conflit avec request animation frame (askip mieux de passer par RAF)
    // gsap.ticker.add(render);
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
    // Chargement du globe
    fbxLoader.load('globe.fbx', (globe) => {
        globe.scale.set(1, 1, 1);
        globe.rotation.y = Math.PI;
        globeGroup.add(globe);
    });

    // Supposons que fetchFruits est une fonction qui récupère vos données de fruits
    const res = await fetchFruits(); // Assurez-vous que cette fonction est bien définie et renvoie les données attendues
    const data = await res.json();

    data.fruits.forEach((fruit, index) => {
        fruits.push(fruit); // Ajoute chaque fruit au tableau pour un accès ultérieur
        let coords = calcPosFromLatLngRad(fruit.coords.lat, fruit.coords.lng);
        addPin(coords, fruit.image, fruit, index);
    });
}

async function addPin(coords, imageUrl, fruitInfo, index) {
    fbxLoader.load('pins.fbx', (pin) => {
        const position = new THREE.Vector3(coords.x, coords.y, coords.z);
        pin.position.copy(position);
        pin.scale.set(0.6, 0.6, 0.6);
        pin.lookAt(new THREE.Vector3(0, 3.2, 0)); // Oriente le repère vers le centre du globe
        globeGroup.add(pin);


        // Assurez-vous que le raycaster puisse détecter ce pin
        pin.userData = {
            isPin: true,
            isSelected: index === 0, // true pour le premier pin, false pour les autres
            fruitInfo: { ...fruitInfo, index }
        };

        // Chargement et ajout de la texture de fruit
        const texture = textureLoader.load(imageUrl, (texture) => {
            const imageMap = new THREE.CircleGeometry(params.imagePinSize, 32);
            const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
            const fruitImageMesh = new THREE.Mesh(imageMap, material);
            fruitImageMesh.position.y += params.imagePinTranslateY; // Position ajustée par rapport au pin
            fruitImageMesh.rotation.y = 1.5; // Ajustement de la rotation si nécessaire
            pin.userData.isPin = true; // Ajoute une propriété personnalisée pour identifier les pins
            pin.add(fruitImageMesh); // Ajoute l'image du fruit comme enfant du pin
        });

        // Si c'est le premier pin, appliquez immédiatement une animation de scale
        if (index === 0) {
            gsap.to(pin.scale, {
                x: 1.2, // Ou toute autre valeur de scale désirée
                y: 1.2,
                z: 1.2,
                duration: 1,
                ease: "power2.inOut"
            });
        }
    });
}


canvasEl.addEventListener('click', (event) => {
    // Conversion des coordonnées du clic en coordonnées normalisées pour le raycasting
    const bounds = canvasEl.getBoundingClientRect(); // Obtient les dimensions du canvas et sa position relative à la zone d'affichage

    // Calcule les coordonnées normalisées de la souris par rapport à la position et taille du canvas
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

    // Effectuer le raycasting pour détecter les objets cliqués
    rayCaster.setFromCamera(pointer, camera);

    const intersects = rayCaster.intersectObjects(globeGroup.children, true);


    for (let i = 0; i < intersects.length; i++) {
        const object = intersects[i].object;

        // Utilise le parent si l'objet intersecté est marqué comme un pin
        if (object.parent && object.parent.userData.isPin) {
            // Extrait les informations du fruit associées au pin
            const fruitInfo = object.parent.userData;
            // Trouvez l'index du fruit cliqué
            const clickedFruitIndex = fruits.findIndex((fruit, index) => {

                return index === object.parent.userData.fruitInfo.index;
            });

            // Mettez à jour les cartes de produit avec le fruit cliqué et le fruit suivant
            rotateGlobeAndAnimateCards(clickedFruitIndex);

            break;
        }
    }
});


//Fonction pour écouter l'état de survol de mes pins
function checkHover() {
    rayCaster.setFromCamera(pointer, camera);
    const intersects = rayCaster.intersectObjects(globeGroup.children, true);

    if (intersects.length > 0) {
        let intersectedGroup = null;

        // Recherche des objets intersectés pour trouver le groupe du pin
        for (let i = 0; i < intersects.length; i++) {
            const object = intersects[i].object;

            // Utilise le parent si l'objet intersecté est marqué comme un pin
            if (object.parent && object.parent.userData.isPin && !object.parent.userData.isSelected) {
                intersectedGroup = object.parent;
                break;
            }
        }

        // Si un groupe de pin est trouvé dans les intersections
        if (intersectedGroup) {
            // Animer l'échelle du pin survolé
            gsap.to(intersectedGroup.scale, {
                duration: 0.3,
                ease: "back(1.3).inOut",
                x: 0.72,
                y: 0.72,
                z: 0.72
            });

            // Réinitialiser l'échelle des autres pins qui ne sont pas sélectionnés
            globeGroup.children.forEach(child => {
                if (child.userData.isPin && child !== intersectedGroup && !child.userData.isSelected) {
                    gsap.to(child.scale, {
                        duration: 0.3,
                        ease: "back(1.3).inOut",
                        x: 0.6,
                        y: 0.6,
                        z: 0.6
                    });
                }
            });
        }
    } else {
        // Aucune intersection trouvée, réinitialiser l'échelle de tous les pins non sélectionnés
        globeGroup.children.forEach(child => {
            if (child.userData.isPin && !child.userData.isSelected) {
                gsap.to(child.scale, {
                    duration: 0.3,
                    ease: "back(1.3).inOut",
                    x: 0.6,
                    y: 0.6,
                    z: 0.6
                });
            }
        });
    }
}




window.addEventListener('mousemove', event => {
    const bounds = canvasEl.getBoundingClientRect(); // Obtient les dimensions du canvas et sa position relative à la zone d'affichage
    // Calcule les coordonnées normalisées de la souris par rapport à la position et taille du canvas
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
});


// Ajout des lights
function createLights() {
    // Création de lumières directionnelles
    const ambientLight = new THREE.AmbientLight(0xFDF2E8, 0.4);
    scene.add(ambientLight);

    const rightLight = new THREE.SpotLight(0xFDF2E8, 0.8);
    rightLight.position.set(30, -5, -25);
    camera.add(rightLight);

    const frontSoftLight = new THREE.SpotLight(0xFDF2E8, 0.1);
    frontSoftLight.position.set(0, 5, 70);
    camera.add(frontSoftLight);

    const leftLight = new THREE.SpotLight(0xF2A873, 1, 100, Math.PI, 1, 0.2);
    leftLight.position.set(-40, 5, 30);
    camera.add(leftLight);

    const leftHardLight = new THREE.SpotLight(0xF2A873, 0.5, 100, Math.PI / 3, 1, 0.2);
    leftHardLight.position.set(-20, -65, 70);
    camera.add(leftHardLight);

    const backLight = new THREE.SpotLight(0xF2A873, 0.5);
    backLight.position.set(0, 50, -10);
    camera.add(backLight);


    // N'oubliez pas d'ajouter la caméra à la scène après avoir attaché les lumières
    scene.add(camera);
}

//Création de l'orbit controle
function createOrbitControls() {
    // Configuration des contrôles de navigation
    controls = new OrbitControls(camera, canvasEl);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.minPolarAngle = .46 * Math.PI;
    controls.maxPolarAngle = .46 * Math.PI;
    controls.autoRotate = true; // AutoRotate est activé par défaut
    controls.autoRotateSpeed *= 0;

    // Start du drag
    controls.addEventListener("start", () => {
        controls.autoRotate = false; // Désactive l'autoRotate quand on commence à draguer
        isHoverable = false;
        pointer = new THREE.Vector2(-1, -1);
        gsap.to(globeGroup.scale, {
            duration: .3,
            x: .9,
            y: .9,
            z: .9,
            ease: "back(1.3).inOut",
        });
        gsap.to(globeGroup.rotation, {
            duration: .3,
            x: "-0.05",
            ease: "back(1.3).inOut",
        });
    });

    //Fin du drag
    controls.addEventListener("end", () => {
        setTimeout(() => {
            controls.autoRotate = true; // Réactive l'autoRotate après 5 secondes
        }, 5000); // 5000 millisecondes équivalent à 5 secondes

        gsap.to(globeGroup.scale, {
            duration: .6,
            x: 1,
            y: 1,
            z: 1,
            ease: "back(1.8).inOut",
            onComplete: () => {
                isHoverable = true;
            }
        });
        gsap.to(globeGroup.rotation, {
            duration: .6,
            x: "0",
            ease: "back(1.8).inOut",
        });
    });
}



function createControls() {
    // Création d'interfaces utilisateur pour la rotation du globe
}


function rotateGlobe(fruit) {
    const latRad = (fruit.coords.lat * Math.PI) / 180;
    const lngRad = (fruit.coords.lng * Math.PI) / 180;

    // Convertir les coordonnées lat/long en vecteur directionnel
    // Note: Ceci est une simplification et peut nécessiter des ajustements basés sur votre modèle de globe
    const x = Math.cos(latRad) * Math.cos(lngRad);
    const z = Math.cos(latRad) * Math.sin(lngRad);

    const targetAngleY = Math.atan2(x, z);

    // Appliquer la rotation au globe pour aligner le fruit avec la direction de la caméra
    // Note: Cela ne tient pas compte des rotations existantes du globe et peut nécessiter des ajustements
    gsap.to(globeGroup.rotation, {
        y: targetAngleY,
        duration: 1,
        ease: "power4.inOut"
    });

    // Test update les controls et orientation camera
    controls.update();

    // Parcourir tous les pins pour mettre à jour leur état isSelected et appliquer des animations de scale
    globeGroup.children.forEach((child, index) => {
        if (child.userData.isPin) {
            if (child.userData.fruitInfo && child.userData.fruitInfo.index === currentFruitIndex) {
                // Marquer le pin comme sélectionné
                child.userData.isSelected = true;

                // Appliquer une animation de scale sur ce pin
                gsap.to(child.scale, {
                    x: 1.1,
                    y: 1.1,
                    z: 1.1,
                    duration: 1,
                    ease: "power2.inOut"
                });
            } else {
                // Retirer le marqueur isSelected des autres pins
                child.userData.isSelected = false;

                // Réinitialiser le scale des autres pins
                gsap.to(child.scale, {
                    x: 0.6,
                    y: 0.6,
                    z: 0.6,
                    duration: 1,
                    ease: "power2.inOut"
                });
            }
        }
    });
}


// Sélection des éléments de carte nécessaires dans le HTML
let frontCard = document.querySelector('.front');
let backCard = document.querySelector('.behind');
const cards = document.querySelector('.cards');

let currentFruitIndex = 0; // Index initial du fruit affiché


//Modification des datas dans les cards produits
const updateCardContents = (card, fruit) => {

    card.innerHTML = `
        <div class="card">
            <img src="${fruit.image}" alt="" width="100" height="100">
            <h3>${fruit.productName}</h3>
            <span class="origin">${fruit.city}</span>
        </div>
    `;
};




const rotateGlobeAndAnimateCards = (direction) => {
    // Vérifier si directionOrIndex est un nombre (un index)
    if (typeof direction === "number") {
        // Utiliser directement l'index pour trouver le fruit correspondant
        currentFruitIndex = direction;
    } else {
        // Sinon, c'est une chaîne représentant la direction, donc calculer l'index basé sur cette direction
        switch (direction) {
            case "next":
                currentFruitIndex = (currentFruitIndex + 1) % fruits.length;
                break;
            case "prev":
                currentFruitIndex = (currentFruitIndex - 1 + fruits.length) % fruits.length;
                break;
            case "random":
                currentFruitIndex = Math.floor(Math.random() * fruits.length);
                break;
        }
    }

    const fruit = fruits[currentFruitIndex];
    rotateGlobe(fruit); // Oriente le globe vers le nouveau fruit

    gsap.to(frontCard, {
        duration: 0.2,
        rotate: "60deg",
        ease: "power2.inOut",
        onComplete: () => {
            // Mise à jour des contenus des cartes
            updateCardContents(frontCard, fruit); // Carte de devant avec le fruit actuel

            gsap.to(frontCard, {
                scale: 1,
                rotate: "0deg",
                duration: 0.2,
                ease: "power2.inOut",
            });
        }
    });

    gsap.to(backCard, {
        duration: 0.2,
        rotate: "-18deg",
        ease: "power2.inOut",
        onComplete: () => {
            // Mise à jour des contenus des cartes
            let nextFruitIndex = (currentFruitIndex + 1) % fruits.length;
            updateCardContents(backCard, fruits[nextFruitIndex]); // Carte arrière avec le prochain fruit

            gsap.to(backCard, {
                scale: 1,
                duration: 0.2,
                rotate: "-5deg",
                ease: "power2.inOut",
            });
        }
    });

    gsap.to([frontCard.querySelector('img'), backCard.querySelector('img')], {
        duration: 0.6,
        rotate: "-18deg",
        opacity: 0,
        scale: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
            // Mise à jour des contenus des cartes ici si nécessaire

            // Lancez une nouvelle animation pour réinitialiser la rotation et l'opacité
            gsap.to([frontCard.querySelector('img'), backCard.querySelector('img')], {
                duration: 0.6,
                rotate: "0deg",
                opacity: 1,
                scale: 1,
                ease: "power2.inOut",
            });
        }
    });
};


// Fonction pour ajouter temporairement la classe 'click'
function addTemporaryClass(element, className, duration) {
    element.classList.add(className);
    setTimeout(() => {
        element.classList.remove(className);
    }, duration);
}

// Fonction pour ajouter temporairement la classe 'click'
const addTemporaryClassToAllCircles = (className, duration) => {
    const circles = document.querySelectorAll('.globe-wrapper .canvas-container .globe-pattern .circle');
    circles.forEach(circle => {
        addTemporaryClass(circle, className, duration);
    });
};

// Initialisation des écouteurs d'événements
document.getElementById('next').addEventListener('click', () => {
    rotateGlobeAndAnimateCards("next");
    controls.autoRotate = false;
    addTemporaryClassToAllCircles("click", 300);
});

document.getElementById('prev').addEventListener('click', () => {
    rotateGlobeAndAnimateCards("prev");
    controls.autoRotate = false;
    addTemporaryClassToAllCircles("click", 300);
});

document.getElementById('random').addEventListener('click', () => {
    rotateGlobeAndAnimateCards("random");
    controls.autoRotate = false;
    addTemporaryClassToAllCircles("click", 300);
});

// Gestion du clic sur la carte arrière
backCard.addEventListener('click', () => {
    rotateGlobeAndAnimateCards("next");
    addTemporaryClassToAllCircles("click", 300);
    controls.autoRotate = false;
});

// Ajoutez un gestionnaire d'événement de survol à la carte arrière
backCard.addEventListener('mouseenter', () => {
    // Appliquez une rotation sur le survol avec GSAP
    gsap.to(backCard, {
        rotate: "-7deg",
        duration: 0.2,
        ease: "power2.inOut"
    });
});

// Ajoutez un gestionnaire d'événement pour quand la souris quitte la carte
backCard.addEventListener('mouseleave', () => {
    // Revenez à la rotation originale avec GSAP
    gsap.to(backCard, {
        rotate: "-5deg", // Assurez-vous que cette valeur correspond à l'état de base de la carte après les animations
        duration: 0.2,
        ease: "power2.inOut"
    });
});

// Fonction appelée lorsque la carte de derrière est cliquée, pour déplacer la carte et tourner le globe
const moveCard = (card) => {
    // Ajout de la classe 'is-moving' à la carte de devant
    let frontCard = document.querySelector('.front');

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
    }, 500);

    // Appel de la fonction pour tourner le globe vers le fruit sélectionné
    rotateGlobe(randomFruit);
}

// Ajout d'un écouteur d'événement de clic à la carte de derrière pour déclencher l'animation et la rotation du globe
backCard.addEventListener('click', () => {
    rotateGlobeAndAnimateCards();
});




// Initialiser le rendu
var lastTime = 0; // Initialisez lastTime en dehors de la fonction render

function render(time) {
    // Mise à jour des contrôles et de la scène
    controls.update();

    // Vérifier le survol uniquement si le globe est interactif
    if (isHoverable) {
        checkHover(); // Appel de la fonction de vérification du survol
    }

    // Gérer l'interaction tactile séparément si nécessaire
    if (isTouchScreen && isHoverable) {
        isHoverable = false;
    }

    const rotationSpeed = 0.0003; // Vitesse de rotation, ajustez selon le besoin

    if (controls.autoRotate) {
        // Calculer le delta de temps en secondes
        lastTime = time * 0.001; // Mettre à jour lastTime pour le prochain frame
        // Appliquer la rotation basée sur le delta de temps
        globeGroup.rotation.y += rotationSpeed;
    }

    // Rendu de la scène
    renderer.render(scene, camera);

    // Render ici Frame par Frame
    requestAnimationFrame(render);
}



function updateSize() {
    // Mise à jour de la taille de la fenêtre
    const side = Math.min(900, Math.min(window.innerWidth, window.innerHeight));
    containerEl.style.width = side + "px";
    containerEl.style.height = side + "px";
    renderer.setSize(side, side);
}
