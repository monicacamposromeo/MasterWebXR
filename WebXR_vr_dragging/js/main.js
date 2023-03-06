import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let camera, scene, renderer;
let controller1, controllerGrip1;
let group;

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
    
    let dirLight = new THREE.DirectionalLight ( 0xffffff, 0.5 );
    scene.add( dirLight );
        
    let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.3 );
    scene.add( hemiLight );
    
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.z = 60;
    
    raycaster = new THREE.Raycaster();
    
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    window.addEventListener( 'resize', onWindowResize );
    
    initSkinnedMesh();
    
    document.body.appendChild( VRButton.createButton( renderer ) );
    
    controller1 = renderer.xr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    scene.add( controller1 );
    
    const controllerModelFactory = new XRControllerModelFactory();
    controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    scene.add( controllerGrip1 );
        
    window.addEventListener( 'pointerdown', onPointerDown );
    window.addEventListener( 'pointerup', onPointerUp );
    window.addEventListener( 'mousemove', onPointerMove );
}

function onSelectStart(){
    
}

function onSelectEnd(){
    
}

function getIntersections( controller ) {
    raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
    tempMatrix.identity().extractRotation( controller.matrixWorld );
    raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );
    return raycaster.intersectObjects( boxes, false );
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

    const geometry = createGeometry( sizing );
    
    const material = new THREE.MeshStandardMaterial( {
            color: 0x156289,
            emissive: 0x072534,
            side: THREE.DoubleSide,
            flatShading: true,
            wireframe: true
    } );

    const bones = createBones(sizing);
    
    skeleton = new THREE.Skeleton(bones);
    skinnedMesh = new THREE.SkinnedMesh( geometry, material );
    
    const rootBone = skeleton.bones[0];
    
    skinnedMesh.add( rootBone );
    skinnedMesh.bind( skeleton );
    scene.add( skinnedMesh );
    
    skeletonHelper = new THREE.SkeletonHelper( skinnedMesh );
    skeletonHelper.material.linewidth = 5;
    scene.add( skeletonHelper );
    
    const aBoxGeometry = new THREE.BoxGeometry( 7, 2, 7 );
    let bone_anterior = [];
    bone_anterior['x'] = 0;
    bone_anterior['y'] = 0;
    bone_anterior['z'] = 0;
    for (let index in skeleton.bones){
        const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
        let object = new THREE.Mesh( aBoxGeometry, material );
        bone_anterior['x'] = bone_anterior['x'] + skeleton.bones[index].position.x;
        bone_anterior['y'] = bone_anterior['y'] + skeleton.bones[index].position.y;
        bone_anterior['z'] = bone_anterior['z'] + skeleton.bones[index].position.z;
        object.position.x = bone_anterior['x'];
        object.position.y = bone_anterior['y'];
        object.position.z = bone_anterior['z'];
        object.HexNotSelected = material.emissive.getHex(0x00ff00);
        object.HexSelected =  0xff0000;
        object.currentIntersected = false;
        object.isIntersectable = true;
        object.bone_index = index;
        scene.add(object);
        boxes.push(object);
    }
}

function createGeometry( sizing ) {
    let box = new THREE.BoxGeometry(5, sizing.height, 5);
    
    const position = box.attributes.position;

    const vertex = new THREE.Vector3();

    const skinIndices = [];
    const skinWeights = [];
    
    for ( let i = 0; i < position.count; i ++ ) {
        vertex.fromBufferAttribute( position, i );

        const y = ( vertex.y + sizing.halfHeight );

        const skinIndex = Math.floor( y / sizing.segmentHeight );
        const skinWeight = ( y % sizing.segmentHeight ) / sizing.segmentHeight;

        skinIndices.push( skinIndex, skinIndex + 1, 0, 0 );
        skinWeights.push( 1 - skinWeight, skinWeight, 0, 0 );
    }
    
    box.setAttribute( 'skinIndex', new THREE.Uint16BufferAttribute( skinIndices, 4 ) );
    box.setAttribute( 'skinWeight', new THREE.Float32BufferAttribute( skinWeights, 4 ) );
    return box;

}

function createBones( sizing ) {
    bones = [];

    let prevBone = new THREE.Bone();
    bones.push( prevBone );
    prevBone.position.y = - sizing.halfHeight;

    for ( let i = 0; i < sizing.segmentCount; i ++ ) {
        const bone = new THREE.Bone();
        bone.position.y = sizing.segmentHeight;
        bones.push( bone );
        prevBone.add( bone );
        prevBone = bone;
    }
    return bones;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onPointerDown( event ) {
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const found = raycaster.intersectObjects(scene.children, true);
    
    if (found.length) {
        intersectObject = found[0].object;
        console.log(intersectObject);
        if(intersectObject.isIntersectable === true){
            intersectObject.currentIntersected = true;
            intersectObject.material.emissive.setHex(intersectObject.HexSelected);
        }
    }
}

function onPointerUp( event ) {
    if(intersectObject){
        intersectObject.currentIntersected = false;
        intersectObject.material.emissive.setHex(intersectObject.HexNotSelected);
    }
}

function onPointerMove(event){
    if(intersectObject && intersectObject.currentIntersected){
        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const found = raycaster.intersectObjects(scene.children, true);
        if (found.length) {
            intersectPoint = found[0].point;
            intersectObject.position.x = intersectPoint.x;
            intersectObject.position.y = intersectPoint.y;
            
            update_skeleton();
            
            update_boxes();
        }
    }
}

function update_skeleton(){
    let xHelper = 0;
    let yHelper = 0;
    for (let index = 0; index< intersectObject.bone_index; index++){
        xHelper += skeleton.bones[index].position.x;
        yHelper += skeleton.bones[index].position.y;
    }
    skeleton.bones[intersectObject.bone_index].position.x = intersectPoint.x - xHelper;
    skeleton.bones[intersectObject.bone_index].position.y = intersectPoint.y - yHelper;
}

function update_boxes(){
    let position = [];
    position['x'] = intersectPoint.x;
    position['y'] = intersectPoint.y;
    position['z'] = 0;
    console.log(position);
    for (let index in skeleton.bones){
        if(index > intersectObject.bone_index){
            position['x'] = position['x'] + skeleton.bones[index].position.x;
            position['y'] = position['y'] + skeleton.bones[index].position.y;
            position['z'] = position['z'] + skeleton.bones[index].position.z;
            boxes[index].position.x = position['x'];
            boxes[index].position.y = position['y'];
            boxes[index].position.z = position['z'];
        }
    }
}

function animate() {
    // requestAnimationFrame( animate );
    // renderer.render( scene, camera );
    
    // getIntersections(controller1);

    renderer.setAnimationLoop( render );
}