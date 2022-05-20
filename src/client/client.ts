import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GUI } from 'dat.gui'
import { io } from 'socket.io-client'

let vertices: number[];
let indices: number[];
indices = [];
vertices = [];

const scene = new THREE.Scene();
let mesh: THREE.Mesh;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 4;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
const gridHelper = new THREE.GridHelper(10, 10);
gridHelper.position.y = -0.5;
scene.add(gridHelper);
let geometry = new THREE.BufferGeometry();


window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function buildMesh() {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute( vertices, 3 ));
    geometry.setIndex(indices);
    const material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    animate();
}

const socket = io();
socket.on('connect', function () {
    console.log('connect');
});
socket.on('disconnect', function (message: any) {
    console.log('disconnect ' + message);
});

socket.on('stream vertices', (verts:number[]) => {
    verts.forEach( v => {
        vertices.push(v);
    });
});
socket.on('stream indices', (inds:number[]) => {
    inds.forEach( i => {
        indices.push(i);
    });
    buildMesh();
});
 
socket.on('update vertices', (vertices) => {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
});
socket.on('update indices', (indices) => {
    geometry.setIndex(indices);
});

function startStreaming() {
    var type = params.type;
    console.log(type);
    if (mesh !== null) {
        scene.remove(mesh);
        vertices = [];
        indices = [];
      }
    socket.emit('request mesh', type);
}

function startCollapsing() {
    socket.emit('request simplify');
}


const gui = new GUI();

const cubeFolder = gui.addFolder('Mesh');
//add list to select mesh
const modelsFolder = gui.addFolder('Select Model');

//add button to start mesh streaming
var params = { 
    stream: () => startStreaming(),
    simplify: () => startCollapsing(),
    type: ['isocahedron', 'gourd', 'monkey']
};

gui
    .add(params,'stream')
    .name('stream mesh from server')
    .listen();

gui
    .add(params,'simplify')
    .name('simplify mesh')
    .listen();

gui
    .add(params, 'type', [
        'isocahedron',
        'gourd',
        'monkey'
    ])
    .name('select model')
    .listen();

const animate = function () {
    requestAnimationFrame(animate);
    controls.update();
    render();
}

const render = function () {
    // geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
}

animate();
