import * as THREE from 'three';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {XRControllerModelFactory} from 'three/addons/webxr/XRControllerModelFactory.js';

let camera, scene, renderer;

let skinnedMesh, skeleton, bones, skeletonHelper, controllerGrip1, controller1;
const controllerModelFactory = new XRControllerModelFactory();
                        
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
    
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    
    controller1 = renderer.xr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    scene.add( controller1 );
    
    controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    scene.add( controllerGrip1 );

    window.addEventListener( 'resize', onWindowResize );
        
    initSkinnedMesh();

}

function getIntersections( controller ) {
    raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
    tempMatrix.identity().extractRotation( controller.matrixWorld );
    raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );
    return raycaster.intersectObjects( group.children, false );
}

function onSelectStart(){
    
}

function onSelectEnd(){
    
}

function initSkinnedMesh() {

    const segmentHeight = 6;
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


    const bones = createBones( sizing );
    
    skeleton = new THREE.Skeleton( bones );
    
    skinnedMesh = new THREE.SkinnedMesh( geometry, material );

    const rootBone = skeleton.bones[ 0 ];
    
    skinnedMesh.add( rootBone );

    skinnedMesh.bind( skeleton );

    scene.add( skinnedMesh );
    
//    skeletonHelper = new THREE.SkeletonHelper( skinnedMesh );
//    skeletonHelper.material.linewidth = 5;
//    scene.add( skeletonHelper );

}

function createGeometry( sizing ) {

    const geometry = new THREE.CylinderGeometry(
            5, // radiusTop
            5, // radiusBottom
            sizing.height, // height
            8, // radiusSegments
            sizing.segmentCount * 1, // heightSegments
            true // openEnded
    );

    const position = geometry.attributes.position;

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

    geometry.setAttribute( 'skinIndex', new THREE.Uint16BufferAttribute( skinIndices, 4 ) );
    geometry.setAttribute( 'skinWeight', new THREE.Float32BufferAttribute( skinWeights, 4 ) );

    return geometry;

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

function animate() {

    requestAnimationFrame( animate );
    getIntersections(controllerGrip1);
    // skeleton.bones[ 0 ].position.x += 0.03;
    // skeleton.bones[ 1 ].rotation.y += 0.02;
    // skeleton.bones[ 2 ].position.x += 0.04;
    // skeleton.bones[ 3 ].position.z += 0.04;
    // skeleton.bones[ 4 ].rotation.z += 0.04;

    renderer.render( scene, camera );

}
