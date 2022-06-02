import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GUI } from 'dat.gui'
import { io } from 'socket.io-client'

const vertices = new Float32Array(32000 * 3 );
const indices = new Array(100000 * 3);
let updates: number[];
updates = [];
let initialvertices = 0;
let addPoint=0
let check: number[];
check = [];

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
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices)
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
	initialvertices = verts.length;

	let i=0
	verts.forEach( v => {
		vertices[i] = v;
		i++;
	});
});
socket.on('stream indices', (inds:number[]) => {
	inds.forEach( f => {
		indices[addPoint] = f;
		addPoint++;
	});
	buildMesh();
});
 
socket.on('update vertices', (vertices) => {
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
});
socket.on('update indices', (indices) => {
  geometry.setIndex(indices);
});

socket.on('stream updates', (updates2) => {
  geometry.setIndex(indices);
});

socket.on('stream vsplit', (updates2, vertices2, indices2) => {
	for(let i = 0; i < indices.length; i++) {
		indices[i]++;
	}

	for(let i = 0; i < indices.length; i++) {
		if(indices[i] > vertices2[0]) {
			indices[i]++;
		}
	}

	//update indices of faces with vertex change not part of vsplit
	for(let i = 0; i < indices.length; i+=3) {
		for(let j = 0; j < updates2.length; j+=3) {
			let control = [updates2[j], updates2[j+1], updates2[j+2]]
			check = [indices[i], indices[i+1], indices[i+2]]

			if(control.every(r => check.includes(r))){
				console.log('Found', control, 'in', check);
				if(indices[i] === (vertices2[1] + 1)) {
					console.log('0')
					indices[i] = vertices2[0] + 1
				} else if(indices[i+1] === (vertices2[1] + 1)) {
					console.log('1')
					indices[i+1] = vertices2[0] + 1
				} else if(indices[i+2] === (vertices2[1] + 1)) {
					console.log('2')
					indices[i+2] = vertices2[0] + 1
				}
			}
		}
	}

	check = []

	//update vertices
	vertices.copyWithin(vertices2[0]*3 + 3, vertices2[0]*3);

	let newVert = vertices2[0]*3;

	vertices[newVert] = vertices2[2]
	vertices[newVert + 1] = vertices2[3]
	vertices[newVert + 2] = vertices2[4]

	//add new faces
	for(let i = 0; i < 6; i++) {
		indices[addPoint] = indices2[i];
		addPoint++;
	}

	console.log(vertices)
	console.log(indices)
	console.log(updates2)
	console.log(vertices2)
	console.log(indices2)

	for(let i = 0; i < indices.length; i++) {
		indices[i]--;
	}

	buildMesh()
});

function startStreaming() {
	var type = params.type;

	/*if (mesh !== null) {
			scene.remove(mesh);
			vertices = [];
			indices = [];
		}*/
	socket.emit('request mesh', type);
}

function startCollapsing() {
	socket.emit('request simplify');
}

function shiftRight(array: Float32Array) {
	array.set(array.subarray(0, -3), 3)
	array.fill(0, 0, 3)
	return array
}


const gui = new GUI();

const cubeFolder = gui.addFolder('Mesh');
//add list to select mesh
const modelsFolder = gui.addFolder('Select Model');

//add button to start mesh streaming
var params = { 
	stream: () => startStreaming(),
	simplify: () => startCollapsing(),
	type: ['cube', 'icosahedron', 'gourd', 'monkey']
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
		'cube',
		'icosahedron',
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
	renderer.render(scene, camera);
}

animate();
