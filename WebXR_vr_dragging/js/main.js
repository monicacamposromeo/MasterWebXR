import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let camera, scene, renderer;
let controller1, controllerGrip1, controller2, controllerGrip2;
let group;
const intersected = [];

let bones;
let boxes = [];
let skinnedMesh, skeleton, skeletonHelper;

let raycaster;
const tempMatrix = new THREE.Matrix4();
const pointer = new THREE.Vector2();
let anIntersectableObject;
let intersectObject;
let intersectPoint;

init();
animate();

function init() {

    scene = new THREE.Scene();

    let dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    scene.add(dirLight);

    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.3);
    scene.add(hemiLight);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 60;

    raycaster = new THREE.Raycaster();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);


    document.body.appendChild(VRButton.createButton(renderer));

    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    controller1.addEventListener('move', onMove);
    controller1.name = "derecha";
    controller1.last_position = controller1.position;
    controller1.last_rotation = controller1.rotation;
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    controller2.addEventListener('move', onMove);
    controller2.name = "izquierda";
    controller2.last_position = controller2.position;
    controller2.last_rotation = controller2.rotation;
    scene.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);


    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, - 1)]);

    const line = new THREE.Line(geometry);
    line.name = 'line';
    line.scale.z = 100;

    controller1.add(line.clone());
    controller2.add(line.clone());

    group = new THREE.Group();
    scene.add(group);

    initSkinnedMesh();

    window.addEventListener('resize', onWindowResize);
}

function onSelectStart(event) {
    const controller = event.target;

    const intersections = getIntersections(controller);
    if (intersections.length > 0) {
        const intersection = intersections[0];
        const object = intersection.object;
        object.material.emissive.b = 1;
        controller.attach(object);
        controller.userData.selected = object;
    }
}

function onSelectEnd(event) {
    const controller = event.target;
    if (controller.userData.selected !== undefined) {
        const object = controller.userData.selected;
        object.material.emissive.b = 0;
        object.selected = false;
        group.attach(object);
        controller.userData.selected = undefined;
    }
}

function onMove(event) {
    const controller = event.target;
    if (controller.userData.selected !== undefined) {
        let object = controller.userData.selected;
        group.attach(object);
        update_skeleton(object);
        update_boxes(object);
        controller.attach(object);
    }
}

function getIntersections(controller) {
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, - 1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(group.children, false);
}

function initSkinnedMesh() {

    const segmentHeight = 5;
    const segmentCount = 4;
    const height = segmentHeight * segmentCount;
    const halfHeight = height * 0.5;

    const sizing = {
        segmentHeight,
        segmentCount,
        height,
        halfHeight
    };

    const geometry = createGeometry(sizing);

    const material = new THREE.MeshStandardMaterial({
        color: 0x156289,
        emissive: 0x072534,
        side: THREE.DoubleSide,
        flatShading: true,
        wireframe: true
    });

    const bones = createBones(sizing);

    skeleton = new THREE.Skeleton(bones);
    skinnedMesh = new THREE.SkinnedMesh(geometry, material);
    skinnedMesh.position.z = -30;

    const rootBone = skeleton.bones[0];

    skinnedMesh.add(rootBone);
    skinnedMesh.bind(skeleton);
    scene.add(skinnedMesh);

    skeletonHelper = new THREE.SkeletonHelper(skinnedMesh);
    skeletonHelper.material.linewidth = 5;
    scene.add(skeletonHelper);

    const aBoxGeometry = new THREE.BoxGeometry(7, 2, 7);
    let bone_anterior = [];
    bone_anterior['x'] = skinnedMesh.position.x;
    bone_anterior['y'] = skinnedMesh.position.y;
    bone_anterior['z'] = skinnedMesh.position.z;
    for (let index in skeleton.bones) {
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        let object = new THREE.Mesh(aBoxGeometry, material);
        bone_anterior['x'] = bone_anterior['x'] + skeleton.bones[index].position.x;
        bone_anterior['y'] = bone_anterior['y'] + skeleton.bones[index].position.y;
        bone_anterior['z'] = bone_anterior['z'] + skeleton.bones[index].position.z;
        object.position.x = bone_anterior['x'];
        object.position.y = bone_anterior['y'];
        object.position.z = bone_anterior['z'];
        object.HexNotSelected = material.emissive.getHex(0x00ff00);
        object.HexSelected = 0xff0000;
        object.currentIntersected = false;
        object.isIntersectable = true;
        object.bone_index = index;
        object.castShadow = true;
        object.receiveShadow = true;
        object.selected = false;
        boxes.push(object);
        group.add(object);
    }
}

function createGeometry(sizing) {
    let box = new THREE.BoxGeometry( 5, sizing.height , 5, 5, sizing.segmentCount * 1);
    /*new THREE.CylinderGeometry(
        2.5, // radiusTop
        2.5, // radiusBottom
        sizing.height, // height
        8, // radiusSegments
        sizing.segmentCount * 1, // heightSegments
        false // openEnded
);*/

    const position = box.attributes.position;

    const vertex = new THREE.Vector3();

    const skinIndices = [];
    const skinWeights = [];

    for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);

        const y = (vertex.y + sizing.halfHeight);

        const skinIndex = Math.floor(y / sizing.segmentHeight);
        const skinWeight = (y % sizing.segmentHeight) / sizing.segmentHeight;

        skinIndices.push(skinIndex, skinIndex + 1, 0, 0);
        skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
    }

    box.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    box.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    return box;

}

function createBones(sizing) {
    bones = [];

    let prevBone = new THREE.Bone();
    bones.push(prevBone);
    prevBone.position.y = - sizing.halfHeight;

    for (let i = 0; i < sizing.segmentCount; i++) {
        const bone = new THREE.Bone();
        bone.position.y = sizing.segmentHeight;
        bones.push(bone);
        prevBone.add(bone);
        prevBone = bone;
    }
    return bones;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function update_skeleton(box) {

    let xHelper = skinnedMesh.position.x;
    let yHelper = skinnedMesh.position.y;
    let zHelper = skinnedMesh.position.z;
    for (let index = 0; index < box.bone_index; index++) {
        xHelper += skeleton.bones[index].position.x;
        yHelper += skeleton.bones[index].position.y;
        zHelper += skeleton.bones[index].position.z;
    }
    skeleton.bones[box.bone_index].position.x = box.position.x - xHelper;
    skeleton.bones[box.bone_index].position.y = box.position.y - yHelper;
    skeleton.bones[box.bone_index].position.z = box.position.z - zHelper;

    /*
     let box = boxes[(bone_index > 0) ? bone_index-1: bone_index];
     console.log("boxes", boxes);
     console.log("current object position", boxes[bone_index].position.y);
     console.log("object_position", object_position)
     skeleton.bones[bone_index].position.x = object_position.x - box.position.x;
     skeleton.bones[bone_index].position.y = object_position.y - box.position.y;
     skeleton.bones[bone_index].position.z = object_position.z - box.position.z;*/
}

function update_boxes(box) {
    let position = [];
    position['x'] = box.position.x;
    position['y'] = box.position.y;
    position['z'] = box.position.z;
    for (let index in skeleton.bones) {
        if (index > box.bone_index) {
            position['x'] = position['x'] + skeleton.bones[index].position.x;
            position['y'] = position['y'] + skeleton.bones[index].position.y;
            position['z'] = position['z'] + skeleton.bones[index].position.z;
            boxes[index].position.x = position['x'];
            boxes[index].position.y = position['y'];
            boxes[index].position.z = position['z'];
        }
    }
}

function intersectObjects(controller) {
    // Do not highlight when already selected
    //    if ( controller.userData.selected !== undefined ){}
    const intersections = getIntersections(controller);
    if (intersections.length > 0) {
        const intersection = intersections[0];
        const object = intersection.object;
        object.material.emissive.r = 1;
        intersected.push(object);
    }
}

function cleanIntersected() {
    while (intersected.length) {
        const object = intersected.pop();
        object.material.emissive.r = 0;
    }
}


function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    cleanIntersected();

    intersectObjects(controller1);
    intersectObjects(controller2);

    renderer.render(scene, camera);
}